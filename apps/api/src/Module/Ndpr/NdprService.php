<?php

declare(strict_types=1);

namespace Lodgik\Module\Ndpr;

use Doctrine\ORM\EntityManagerInterface;
use Lodgik\Entity\Booking;
use Lodgik\Entity\DataRequest;
use Lodgik\Entity\Employee;
use Lodgik\Entity\Guest;
use Lodgik\Service\ZeptoMailService;
use Psr\Log\LoggerInterface;

final class NdprService
{
    private string $storagePath;
    private string $appUrl;

    public function __construct(
        private readonly EntityManagerInterface $em,
        private readonly ZeptoMailService $mailer,
        private readonly LoggerInterface $logger,
    ) {
        $this->storagePath = rtrim($_ENV['STORAGE_PATH'] ?? '/www/wwwroot/lodgik/storage', '/');
        $this->appUrl      = rtrim($_ENV['APP_URL'] ?? 'https://api.lodgik.co', '/');
    }

    // ── Request Management ────────────────────────────────────────

    /** @return DataRequest[] */
    public function listRequests(string $tenantId, ?string $status = null, ?string $type = null, int $page = 1, int $perPage = 30): array
    {
        $qb = $this->em->createQueryBuilder()
            ->select('r')
            ->from(DataRequest::class, 'r')
            ->where('r.tenantId = :tid')
            ->setParameter('tid', $tenantId)
            ->orderBy('r.createdAt', 'DESC')
            ->setFirstResult(($page - 1) * $perPage)
            ->setMaxResults($perPage);

        if ($status) $qb->andWhere('r.status = :status')->setParameter('status', $status);
        if ($type)   $qb->andWhere('r.type = :type')->setParameter('type', $type);

        $items = $qb->getQuery()->getResult();
        $total = (int) (clone $qb)
            ->select('COUNT(r.id)')
            ->resetDQLPart('orderBy')
            ->setFirstResult(0)->setMaxResults(null)
            ->getQuery()->getSingleScalarResult();

        return ['items' => array_map(fn(DataRequest $r) => $r->toArray(), $items), 'total' => $total];
    }

    public function createRequest(
        string  $type,
        string  $subjectType,
        string  $subjectId,
        string  $tenantId,
        string  $requestedById,
        string  $requestedByName,
        ?string $propertyId = null,
    ): DataRequest {
        if (!in_array($type, ['export', 'erasure'], true)) {
            throw new \DomainException("Invalid request type '{$type}'. Must be 'export' or 'erasure'.");
        }
        if (!in_array($subjectType, ['guest', 'employee'], true)) {
            throw new \DomainException("Invalid subject type '{$subjectType}'. Must be 'guest' or 'employee'.");
        }

        // Resolve subject name
        $subjectName = $this->resolveSubjectName($subjectType, $subjectId);

        // Block duplicate pending/processing requests for the same subject
        $existing = $this->em->createQueryBuilder()
            ->select('COUNT(r.id)')
            ->from(DataRequest::class, 'r')
            ->where('r.tenantId = :tid')
            ->andWhere('r.subjectId = :sid')
            ->andWhere('r.type = :type')
            ->andWhere('r.status IN (:statuses)')
            ->setParameter('tid', $tenantId)
            ->setParameter('sid', $subjectId)
            ->setParameter('type', $type)
            ->setParameter('statuses', ['pending', 'processing'])
            ->getQuery()->getSingleScalarResult();

        if ((int) $existing > 0) {
            throw new \DomainException("A {$type} request for this subject is already pending or in progress.");
        }

        $request = new DataRequest(
            type:             $type,
            subjectType:      $subjectType,
            subjectId:        $subjectId,
            subjectName:      $subjectName,
            requestedById:    $requestedById,
            requestedByName:  $requestedByName,
            tenantId:         $tenantId,
            propertyId:       $propertyId,
        );

        $this->em->persist($request);
        $this->em->flush();

        $this->logger->info("NDPR {$type} request created for {$subjectType} {$subjectId} by {$requestedByName}");

        return $request;
    }

    /**
     * Process a pending request (export or erasure).
     * Only property_admin may call this.
     */
    public function processRequest(string $requestId, string $tenantId, string $processorName): DataRequest
    {
        $request = $this->findOrFail($requestId, $tenantId);

        if ($request->getStatus() !== 'pending') {
            throw new \DomainException("Only pending requests can be processed. Current status: {$request->getStatus()}");
        }

        $request->markProcessing();
        $this->em->flush();

        try {
            if ($request->getType() === 'export') {
                $downloadUrl = $this->executeExport($request);
                $request->markComplete($downloadUrl);
            } else {
                $this->executeErasure($request);
                $request->markComplete();
            }
        } catch (\Throwable $e) {
            $request->reject('Processing failed: ' . $e->getMessage());
            $this->logger->error("NDPR processing failed for request {$requestId}: " . $e->getMessage());
        }

        $this->em->flush();

        $this->logger->info("NDPR request {$requestId} processed by {$processorName} — status: {$request->getStatus()}");

        return $request;
    }

    public function rejectRequest(string $requestId, string $tenantId, string $reason): DataRequest
    {
        $request = $this->findOrFail($requestId, $tenantId);

        if (!in_array($request->getStatus(), ['pending', 'processing'], true)) {
            throw new \DomainException("Only pending or processing requests can be rejected.");
        }

        $request->reject($reason);
        $this->em->flush();

        return $request;
    }

    // ── Export ────────────────────────────────────────────────────

    private function executeExport(DataRequest $request): string
    {
        $data = $request->getSubjectType() === 'guest'
            ? $this->buildGuestExport($request->getSubjectId(), $request->getTenantId())
            : $this->buildEmployeeExport($request->getSubjectId(), $request->getTenantId());

        $data['_meta'] = [
            'export_type'    => 'NDPR Data Export',
            'subject_type'   => $request->getSubjectType(),
            'subject_name'   => $request->getSubjectName(),
            'exported_at'    => (new \DateTimeImmutable())->format('Y-m-d H:i:s'),
            'request_id'     => $request->getId(),
            'requested_by'   => $request->getRequestedByName(),
        ];

        // Write to storage
        $dir      = $this->storagePath . '/ndpr-exports';
        if (!is_dir($dir)) mkdir($dir, 0750, true);

        $filename = 'export-' . $request->getId() . '-' . date('Ymd') . '.json';
        $filepath = $dir . '/' . $filename;
        file_put_contents($filepath, json_encode($data, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE));

        // Return a download URL — served by a dedicated route
        return $this->appUrl . '/api/compliance/exports/' . $filename;
    }

    private function buildGuestExport(string $guestId, string $tenantId): array
    {
        $guest = $this->em->find(Guest::class, $guestId);
        if (!$guest || $guest->getTenantId() !== $tenantId) {
            throw new \RuntimeException('Guest not found');
        }

        // Fetch booking history
        $bookings = $this->em->createQueryBuilder()
            ->select('b')
            ->from(Booking::class, 'b')
            ->where('b.guestId = :gid')
            ->andWhere('b.tenantId = :tid')
            ->setParameter('gid', $guestId)
            ->setParameter('tid', $tenantId)
            ->orderBy('b.createdAt', 'DESC')
            ->getQuery()->getResult();

        return [
            'personal_information' => [
                'name'          => $guest->getFullName(),
                'email'         => $guest->getEmail(),
                'phone'         => $guest->getPhone(),
                'nationality'   => $guest->getNationality(),
                'id_type'       => $guest->getIdType(),
                'id_number'     => $guest->getIdNumber(),
                'date_of_birth' => $guest->getDateOfBirth()?->format('Y-m-d'),
                'gender'        => $guest->getGender(),
                'address'       => $guest->getAddress(),
                'city'          => $guest->getCity(),
                'state'         => $guest->getState(),
                'country'       => $guest->getCountry(),
                'company_name'  => $guest->getCompanyName(),
            ],
            'stay_history' => array_map(fn(Booking $b) => [
                'reference'    => $b->getBookingReference(),
                'check_in'     => $b->getCheckIn()->format('Y-m-d'),
                'check_out'    => $b->getCheckOut()->format('Y-m-d'),
                'status'       => $b->getStatus()->value,
                'created_at'   => $b->getCreatedAt()->format('Y-m-d H:i:s'),
            ], $bookings),
            'account_summary' => [
                'total_stays'    => $guest->getTotalStays(),
                'total_spent'    => $guest->getTotalSpent(),
                'vip_status'     => $guest->getVipStatus(),
                'last_visit_at'  => $guest->getLastVisitAt()?->format('Y-m-d'),
                'member_since'   => $guest->getCreatedAt()->format('Y-m-d'),
            ],
        ];
    }

    private function buildEmployeeExport(string $employeeId, string $tenantId): array
    {
        $emp = $this->em->find(Employee::class, $employeeId);
        if (!$emp || $emp->getTenantId() !== $tenantId) {
            throw new \RuntimeException('Employee not found');
        }

        return [
            'personal_information' => [
                'name'           => $emp->getFullName(),
                'email'          => $emp->getEmail(),
                'phone'          => $emp->getPhone(),
                'date_of_birth'  => $emp->getDateOfBirth()?->format('Y-m-d'),
                'gender'         => $emp->getGender(),
                'address'        => $emp->getAddress(),
            ],
            'employment_information' => [
                'staff_id'         => $emp->getStaffId(),
                'job_title'        => $emp->getJobTitle(),
                'hire_date'        => $emp->getHireDate()->format('Y-m-d'),
                'employment_type'  => $emp->getEmploymentType()->value,
                'employment_status'=> $emp->getEmploymentStatus()->value,
                'termination_date' => $emp->getTerminationDate()?->format('Y-m-d'),
            ],
            'financial_information' => [
                'bank_name'           => $emp->getBankName(),
                'bank_account_number' => $emp->getBankAccountNumber(),
                'bank_account_name'   => $emp->getBankAccountName(),
                'gross_salary_kobo'   => $emp->getGrossSalary(),
            ],
        ];
    }

    // ── Erasure ───────────────────────────────────────────────────

    private function executeErasure(DataRequest $request): void
    {
        if ($request->getSubjectType() === 'guest') {
            $this->eraseGuest($request->getSubjectId(), $request->getTenantId());
        } else {
            $this->eraseEmployee($request->getSubjectId(), $request->getTenantId());
        }
    }

    private function eraseGuest(string $guestId, string $tenantId): void
    {
        $guest = $this->em->find(Guest::class, $guestId);
        if (!$guest || $guest->getTenantId() !== $tenantId) {
            throw new \RuntimeException('Guest not found');
        }

        // Anonymise all PII — preserve booking history structure
        $conn = $this->em->getConnection();
        $conn->executeStatement(
            "UPDATE guests SET
                first_name   = 'Deleted',
                last_name    = 'User',
                email        = CONCAT('erased-', id, '@ndpr.invalid'),
                phone        = NULL,
                id_type      = NULL,
                id_number    = NULL,
                date_of_birth= NULL,
                gender       = NULL,
                address      = NULL,
                city         = NULL,
                state        = NULL,
                notes        = NULL,
                preferences  = NULL,
                company_name = NULL,
                gdpr_erased  = TRUE
            WHERE id = :id AND tenant_id = :tid",
            ['id' => $guestId, 'tid' => $tenantId]
        );

        $this->logger->info("NDPR erasure completed for guest {$guestId}");
    }

    private function eraseEmployee(string $employeeId, string $tenantId): void
    {
        $emp = $this->em->find(Employee::class, $employeeId);
        if (!$emp || $emp->getTenantId() !== $tenantId) {
            throw new \RuntimeException('Employee not found');
        }

        $conn = $this->em->getConnection();
        $conn->executeStatement(
            "UPDATE employees SET
                first_name            = 'Deleted',
                last_name             = 'Employee',
                email                 = CONCAT('erased-', id, '@ndpr.invalid'),
                phone                 = NULL,
                date_of_birth         = NULL,
                gender                = NULL,
                address               = NULL,
                bank_account_number   = NULL,
                bank_account_name     = NULL,
                bank_name             = NULL,
                nin                   = NULL,
                tax_id                = NULL,
                pension_pin           = NULL,
                nhf_id                = NULL,
                notes                 = NULL,
                gdpr_erased           = TRUE
            WHERE id = :id AND tenant_id = :tid",
            ['id' => $employeeId, 'tid' => $tenantId]
        );

        $this->logger->info("NDPR erasure completed for employee {$employeeId}");
    }

    // ── Helpers ───────────────────────────────────────────────────

    private function findOrFail(string $id, string $tenantId): DataRequest
    {
        $r = $this->em->createQueryBuilder()
            ->select('r')
            ->from(DataRequest::class, 'r')
            ->where('r.id = :id AND r.tenantId = :tid')
            ->setParameter('id', $id)
            ->setParameter('tid', $tenantId)
            ->getQuery()->getOneOrNullResult();

        if ($r === null) throw new \RuntimeException('Data request not found', 404);
        return $r;
    }

    private function resolveSubjectName(string $subjectType, string $subjectId): string
    {
        if ($subjectType === 'guest') {
            $guest = $this->em->find(Guest::class, $subjectId);
            return $guest ? $guest->getFullName() : 'Unknown Guest';
        }
        $emp = $this->em->find(Employee::class, $subjectId);
        return $emp ? $emp->getFullName() : 'Unknown Employee';
    }
}

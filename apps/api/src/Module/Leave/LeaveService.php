<?php

declare(strict_types=1);

namespace Lodgik\Module\Leave;

use Doctrine\ORM\EntityManagerInterface;
use Lodgik\Entity\LeaveBalance;
use Lodgik\Entity\LeaveRequest;
use Lodgik\Entity\LeaveType;
use Lodgik\Enum\LeaveRequestStatus;
use Lodgik\Repository\LeaveBalanceRepository;
use Lodgik\Repository\LeaveRequestRepository;
use Lodgik\Repository\LeaveTypeRepository;
use Psr\Log\LoggerInterface;

final class LeaveService
{
    public function __construct(
        private readonly EntityManagerInterface $em,
        private readonly LeaveTypeRepository $typeRepo,
        private readonly LeaveBalanceRepository $balRepo,
        private readonly LeaveRequestRepository $reqRepo,
        private readonly LoggerInterface $logger,
    ) {}

    // ─── Leave Types ────────────────────────────────────────────

    /** @return LeaveType[] */
    public function listLeaveTypes(): array { return $this->typeRepo->findActive(); }

    public function createLeaveType(string $key, string $name, int $defaultDays, string $tenantId, bool $isPaid = true): LeaveType
    {
        $lt = new LeaveType($key, $name, $defaultDays, $tenantId);
        $lt->setIsPaid($isPaid);
        $this->em->persist($lt);
        $this->em->flush();
        return $lt;
    }

    // ─── Leave Balance ──────────────────────────────────────────

    /** @return LeaveBalance[] */
    public function getBalances(string $employeeId, int $year): array
    {
        return $this->balRepo->findByEmployee($employeeId, $year);
    }

    /** Initialize leave balances for an employee using default entitlements */
    public function initializeBalances(string $employeeId, int $year, string $tenantId): void
    {
        $types = $this->typeRepo->findActive();
        foreach ($types as $lt) {
            $existing = $this->balRepo->findOne($employeeId, $lt->getId(), $year);
            if ($existing) continue;

            $bal = new LeaveBalance($employeeId, $lt->getId(), $year, (string) $lt->getDefaultDays(), $tenantId);
            $this->em->persist($bal);
        }
        $this->em->flush();
    }

    // ─── Leave Request ──────────────────────────────────────────

    public function submitRequest(string $employeeId, string $leaveTypeId, string $startDate, string $endDate, string $tenantId, ?string $reason = null): LeaveRequest
    {
        $start = new \DateTimeImmutable($startDate);
        $end = new \DateTimeImmutable($endDate);

        if ($end < $start) throw new \RuntimeException('End date must be after start date');

        // Calculate working days (simple: exclude weekends)
        $days = $this->calculateWorkingDays($start, $end);
        if ($days <= 0) throw new \RuntimeException('No working days in the selected range');

        // Check overlap
        if ($this->reqRepo->hasOverlap($employeeId, $startDate, $endDate)) {
            throw new \RuntimeException('Leave request overlaps with an existing request');
        }

        // Check balance
        $year = (int) $start->format('Y');
        $balance = $this->balRepo->findOne($employeeId, $leaveTypeId, $year);
        if ($balance) {
            $remaining = (float) $balance->getRemainingDays();
            if ($days > $remaining) {
                throw new \RuntimeException("Insufficient leave balance. Available: {$remaining} days, requested: {$days} days");
            }
        }

        $req = new LeaveRequest($employeeId, $leaveTypeId, $start, $end, (string) $days, $tenantId);
        if ($reason) $req->setReason($reason);
        $this->em->persist($req);
        $this->em->flush();

        $this->logger->info("Leave request submitted: employee=$employeeId, type=$leaveTypeId, days=$days");
        return $req;
    }

    public function approveRequest(string $requestId, string $reviewedBy, ?string $notes = null): LeaveRequest
    {
        $req = $this->reqRepo->find($requestId);
        if (!$req) throw new \RuntimeException('Leave request not found');
        if ($req->getStatus() !== LeaveRequestStatus::PENDING) {
            throw new \RuntimeException('Only pending requests can be approved');
        }

        $req->setStatus(LeaveRequestStatus::APPROVED);
        $req->setReviewedBy($reviewedBy);
        $req->setReviewedAt(new \DateTimeImmutable());
        if ($notes) $req->setReviewNotes($notes);

        // Deduct from balance
        $year = (int) $req->getStartDate()->format('Y');
        $balance = $this->balRepo->findOne($req->getEmployeeId(), $req->getLeaveTypeId(), $year);
        if ($balance) {
            $balance->deduct((float) $req->getDaysRequested());
        }

        $this->em->flush();
        $this->logger->info("Leave approved: request=$requestId, days={$req->getDaysRequested()}");
        return $req;
    }

    public function rejectRequest(string $requestId, string $reviewedBy, ?string $notes = null): LeaveRequest
    {
        $req = $this->reqRepo->find($requestId);
        if (!$req) throw new \RuntimeException('Leave request not found');
        if ($req->getStatus() !== LeaveRequestStatus::PENDING) {
            throw new \RuntimeException('Only pending requests can be rejected');
        }

        $req->setStatus(LeaveRequestStatus::REJECTED);
        $req->setReviewedBy($reviewedBy);
        $req->setReviewedAt(new \DateTimeImmutable());
        if ($notes) $req->setReviewNotes($notes);

        $this->em->flush();
        return $req;
    }

    public function cancelRequest(string $requestId): LeaveRequest
    {
        $req = $this->reqRepo->find($requestId);
        if (!$req) throw new \RuntimeException('Leave request not found');

        $wasApproved = $req->getStatus() === LeaveRequestStatus::APPROVED;
        $req->setStatus(LeaveRequestStatus::CANCELLED);

        // Restore balance if was approved
        if ($wasApproved) {
            $year = (int) $req->getStartDate()->format('Y');
            $balance = $this->balRepo->findOne($req->getEmployeeId(), $req->getLeaveTypeId(), $year);
            if ($balance) {
                $balance->restore((float) $req->getDaysRequested());
            }
        }

        $this->em->flush();
        return $req;
    }

    // ─── Queries ────────────────────────────────────────────────

    /** @return LeaveRequest[] */
    public function getEmployeeRequests(string $employeeId, ?int $year = null): array
    {
        return $this->reqRepo->findByEmployee($employeeId, $year);
    }

    /** @return LeaveRequest[] */
    public function getPendingRequests(): array
    {
        return $this->reqRepo->findPending();
    }

    public function getAllRequests(string $tenantId, string $propertyId, ?int $year = null, ?string $status = null): array
    {
        $qb = $this->em->createQueryBuilder()
            ->select('r')
            ->from(LeaveRequest::class, 'r')
            ->where('r.tenantId = :tid')
            ->setParameter('tid', $tenantId)
            ->orderBy('r.createdAt', 'DESC');
        if ($year) {
            $from = new \DateTimeImmutable("{$year}-01-01");
            $to   = new \DateTimeImmutable("{$year}-12-31");
            $qb->andWhere('r.startDate BETWEEN :from AND :to')
               ->setParameter('from', $from)
               ->setParameter('to', $to);
        }
        if ($status) {
            $statusEnum = \Lodgik\Enum\LeaveRequestStatus::from($status);
            $qb->andWhere('r.status = :status')->setParameter('status', $statusEnum);
        }
        return $qb->getQuery()->getResult();
    }

    public function getRequest(string $id): ?LeaveRequest
    {
        return $this->reqRepo->find($id);
    }

    // ─── Helpers ────────────────────────────────────────────────

    /** Calculate working days between two dates (Mon-Fri) */
    private function calculateWorkingDays(\DateTimeImmutable $start, \DateTimeImmutable $end): float
    {
        $days = 0;
        $current = $start;
        while ($current <= $end) {
            $dow = (int) $current->format('N'); // 1=Mon, 7=Sun
            if ($dow <= 5) $days++;
            $current = $current->modify('+1 day');
        }
        return $days;
    }
}

<?php

declare(strict_types=1);

namespace Lodgik\Module\Employee;

use Doctrine\ORM\EntityManagerInterface;
use Lodgik\Entity\Department;
use Lodgik\Entity\Employee;
use Lodgik\Enum\EmploymentType;
use Lodgik\Enum\EmploymentStatus;
use Lodgik\Repository\DepartmentRepository;
use Lodgik\Repository\EmployeeRepository;
use Psr\Log\LoggerInterface;

final class EmployeeService
{
    public function __construct(
        private readonly EntityManagerInterface $em,
        private readonly EmployeeRepository $empRepo,
        private readonly DepartmentRepository $deptRepo,
        private readonly LoggerInterface $logger,
    ) {}

    // ─── Department CRUD ────────────────────────────────────────

    /** @return Department[] */
    public function listDepartments(?string $propertyId = null): array
    {
        return $this->deptRepo->findByProperty($propertyId);
    }

    public function createDepartment(string $name, string $tenantId, ?string $propertyId = null, ?string $description = null): Department
    {
        $dept = new Department($name, $tenantId, $propertyId);
        if ($description) $dept->setDescription($description);
        $this->em->persist($dept);
        $this->em->flush();
        return $dept;
    }

    public function updateDepartment(string $id, array $data): Department
    {
        $dept = $this->deptRepo->find($id);
        if (!$dept) throw new \RuntimeException('Department not found');
        if (isset($data['name'])) $dept->setName($data['name']);
        if (array_key_exists('description', $data)) $dept->setDescription($data['description']);
        if (isset($data['head_employee_id'])) $dept->setHeadEmployeeId($data['head_employee_id']);
        if (isset($data['is_active'])) $dept->setIsActive((bool)$data['is_active']);
        $this->em->flush();
        return $dept;
    }

    public function getDepartment(string $id): ?Department
    {
        return $this->deptRepo->find($id);
    }

    // ─── Employee CRUD ──────────────────────────────────────────

    /**
     * @return array{items: array, total: int}
     */
    public function listEmployees(
        ?string $propertyId = null,
        ?string $departmentId = null,
        ?string $status = null,
        ?string $search = null,
        int $page = 1,
        int $limit = 20,
    ): array {
        $result = $this->empRepo->listEmployees($propertyId, $departmentId, $status, $search, $page, $limit);
        return [
            'items' => array_map(fn(Employee $e) => $e->toArray(), $result['items']),
            'total' => $result['total'],
        ];
    }

    public function createEmployee(array $data, string $tenantId): Employee
    {
        $required = ['property_id', 'first_name', 'last_name', 'job_title', 'hire_date'];
        foreach ($required as $f) {
            if (empty($data[$f])) throw new \InvalidArgumentException("$f is required");
        }

        // Auto-generate staff_id if not provided
        if (empty($data['staff_id'])) {
            $initials = strtoupper(substr($data['first_name'], 0, 1) . substr($data['last_name'], 0, 1));
            $seq      = str_pad((string) random_int(1000, 9999), 4, '0', STR_PAD_LEFT);
            $data['staff_id'] = "EMP-{$initials}{$seq}";
        }

        $emp = new Employee(
            propertyId: $data['property_id'],
            firstName:  $data['first_name'],
            lastName:   $data['last_name'],
            staffId:    $data['staff_id'],
            jobTitle:   $data['job_title'],
            hireDate:   new \DateTimeImmutable($data['hire_date']),
            tenantId:   $tenantId,
        );

        if (!empty($data['user_id']))          $emp->setUserId($data['user_id']);
        if (!empty($data['department_id']))    $emp->setDepartmentId($data['department_id']);
        if (!empty($data['email']))            $emp->setEmail($data['email']);
        if (!empty($data['phone']))            $emp->setPhone($data['phone']);
        if (!empty($data['gross_salary']))     $emp->setGrossSalary((string)$data['gross_salary']);
        if (!empty($data['bank_name']))        $emp->setBankName($data['bank_name']);
        if (!empty($data['bank_account_number'])) $emp->setBankAccountNumber($data['bank_account_number']);
        if (!empty($data['bank_account_name']))   $emp->setBankAccountName($data['bank_account_name']);
        if (!empty($data['date_of_birth']))    $emp->setDateOfBirth(new \DateTimeImmutable($data['date_of_birth']));
        if (!empty($data['gender']))           $emp->setGender($data['gender']);
        if (!empty($data['address']))          $emp->setAddress($data['address']);
        if (!empty($data['nin']))              $emp->setNin($data['nin']);
        if (!empty($data['tax_id']))           $emp->setTaxId($data['tax_id']);
        if (!empty($data['pension_pin']))      $emp->setPensionPin($data['pension_pin']);
        if (!empty($data['nhf_id']))           $emp->setNhfId($data['nhf_id']);
        if (!empty($data['emergency_contact_name']))  $emp->setEmergencyContactName($data['emergency_contact_name']);
        if (!empty($data['emergency_contact_phone'])) $emp->setEmergencyContactPhone($data['emergency_contact_phone']);
        if (!empty($data['notes']))            $emp->setNotes($data['notes']);

        // New Phase A fields
        if (!empty($data['employment_type']))  $emp->setEmploymentType(EmploymentType::from($data['employment_type']));
        if (!empty($data['contract_start']))   $emp->setContractStart(new \DateTimeImmutable($data['contract_start']));
        if (!empty($data['contract_end']))     $emp->setContractEnd(new \DateTimeImmutable($data['contract_end']));
        if (isset($data['notice_period_days'])) $emp->setNoticePeriodDays((int)$data['notice_period_days']);
        if (!empty($data['reporting_to']))     $emp->setReportingTo($data['reporting_to']);
        if (!empty($data['work_location']))    $emp->setWorkLocation($data['work_location']);
        if (!empty($data['work_schedule']))    $emp->setWorkSchedule($data['work_schedule']);

        $this->em->persist($emp);
        $this->em->flush();
        return $emp;
    }


    public function getEmployee(string $id): ?Employee
    {
        return $this->empRepo->find($id);
    }

    public function updateEmployee(string $id, array $data): Employee
    {
        $emp = $this->em->find(Employee::class, $id);
        if (!$emp) throw new \InvalidArgumentException('Employee not found');

        if (isset($data['first_name']))          $emp->setFirstName($data['first_name']);
        if (isset($data['last_name']))           $emp->setLastName($data['last_name']);
        if (isset($data['email']))               $emp->setEmail($data['email'] ?: null);
        if (isset($data['phone']))               $emp->setPhone($data['phone'] ?: null);
        if (isset($data['job_title']))           $emp->setJobTitle($data['job_title']);
        if (isset($data['department_id']))       $emp->setDepartmentId($data['department_id'] ?: null);
        if (isset($data['gross_salary']))        $emp->setGrossSalary((string)$data['gross_salary']);
        if (isset($data['bank_name']))           $emp->setBankName($data['bank_name'] ?: null);
        if (isset($data['bank_account_number'])) $emp->setBankAccountNumber($data['bank_account_number'] ?: null);
        if (isset($data['bank_account_name']))   $emp->setBankAccountName($data['bank_account_name'] ?: null);
        if (isset($data['date_of_birth']))       $emp->setDateOfBirth($data['date_of_birth'] ? new \DateTimeImmutable($data['date_of_birth']) : null);
        if (isset($data['gender']))              $emp->setGender($data['gender'] ?: null);
        if (isset($data['address']))             $emp->setAddress($data['address'] ?: null);
        if (isset($data['nin']))                 $emp->setNin($data['nin'] ?: null);
        if (isset($data['tax_id']))              $emp->setTaxId($data['tax_id'] ?: null);
        if (isset($data['pension_pin']))         $emp->setPensionPin($data['pension_pin'] ?: null);
        if (isset($data['nhf_id']))              $emp->setNhfId($data['nhf_id'] ?: null);
        if (isset($data['emergency_contact_name']))  $emp->setEmergencyContactName($data['emergency_contact_name'] ?: null);
        if (isset($data['emergency_contact_phone'])) $emp->setEmergencyContactPhone($data['emergency_contact_phone'] ?: null);
        if (isset($data['notes']))               $emp->setNotes($data['notes'] ?: null);

        // Phase A fields
        if (!empty($data['employment_type']))   $emp->setEmploymentType(EmploymentType::from($data['employment_type']));
        if (array_key_exists('contract_start', $data)) $emp->setContractStart($data['contract_start'] ? new \DateTimeImmutable($data['contract_start']) : null);
        if (array_key_exists('contract_end', $data))   $emp->setContractEnd($data['contract_end'] ? new \DateTimeImmutable($data['contract_end']) : null);
        if (isset($data['notice_period_days'])) $emp->setNoticePeriodDays((int)$data['notice_period_days']);
        if (isset($data['reporting_to']))        $emp->setReportingTo($data['reporting_to'] ?: null);
        if (isset($data['work_location']))       $emp->setWorkLocation($data['work_location'] ?: null);
        if (!empty($data['work_schedule']))      $emp->setWorkSchedule($data['work_schedule']);

        $this->em->flush();
        return $emp;
    }


    public function terminate(string $id, string $reason, string $terminationDate): Employee
    {
        $emp = $this->empRepo->find($id);
        if (!$emp) throw new \RuntimeException('Employee not found');
        $emp->setEmploymentStatus(EmploymentStatus::TERMINATED);
        $emp->setTerminationDate(new \DateTimeImmutable($terminationDate));
        $emp->setNotes(($emp->getNotes() ? $emp->getNotes() . "\n" : '') . "Terminated: $reason");
        $this->em->flush();
        return $emp;
    }

    /** @return Employee[] */
    public function getByUserId(string $userId): ?Employee
    {
        return $this->em->getRepository(Employee::class)->findOneBy(['userId' => $userId]);
    }

    public function getActiveByProperty(string $propertyId): array
    {
        return $this->empRepo->findActiveByProperty($propertyId);
    }

    /** Get employee count per department */
    public function getDepartmentCounts(): array
    {
        $rows = $this->em->getConnection()->fetchAllAssociative(
            'SELECT department_id, COUNT(*) as count FROM employees WHERE deleted_at IS NULL AND employment_status IN (?, ?) GROUP BY department_id',
            ['active', 'probation']
        );
        $counts = [];
        foreach ($rows as $r) $counts[$r['department_id'] ?? 'unassigned'] = (int) $r['count'];
        return $counts;
    }
}

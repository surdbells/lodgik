<?php

declare(strict_types=1);

namespace Lodgik\Module\Employee;

use Doctrine\ORM\EntityManagerInterface;
use Lodgik\Entity\Department;
use Lodgik\Entity\Employee;
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
        $staffId = $data['staff_id'] ?? $this->empRepo->generateStaffId($tenantId);

        $emp = new Employee(
            propertyId: $data['property_id'],
            firstName: $data['first_name'],
            lastName: $data['last_name'],
            staffId: $staffId,
            jobTitle: $data['job_title'],
            hireDate: new \DateTimeImmutable($data['hire_date'] ?? 'today'),
            tenantId: $tenantId,
        );

        if (isset($data['department_id'])) $emp->setDepartmentId($data['department_id']);
        if (isset($data['user_id'])) $emp->setUserId($data['user_id']);
        if (isset($data['email'])) $emp->setEmail($data['email']);
        if (isset($data['phone'])) $emp->setPhone($data['phone']);
        if (isset($data['gross_salary'])) $emp->setGrossSalary($data['gross_salary']);
        if (isset($data['employment_status'])) $emp->setEmploymentStatus(EmploymentStatus::from($data['employment_status']));

        // Bank details
        if (isset($data['bank_name'])) $emp->setBankName($data['bank_name']);
        if (isset($data['bank_account_number'])) $emp->setBankAccountNumber($data['bank_account_number']);
        if (isset($data['bank_account_name'])) $emp->setBankAccountName($data['bank_account_name']);

        // Personal
        if (isset($data['date_of_birth'])) $emp->setDateOfBirth(new \DateTimeImmutable($data['date_of_birth']));
        if (isset($data['gender'])) $emp->setGender($data['gender']);
        if (isset($data['address'])) $emp->setAddress($data['address']);
        if (isset($data['emergency_contact_name'])) $emp->setEmergencyContactName($data['emergency_contact_name']);
        if (isset($data['emergency_contact_phone'])) $emp->setEmergencyContactPhone($data['emergency_contact_phone']);

        // Tax IDs
        if (isset($data['nin'])) $emp->setNin($data['nin']);
        if (isset($data['tax_id'])) $emp->setTaxId($data['tax_id']);
        if (isset($data['pension_pin'])) $emp->setPensionPin($data['pension_pin']);
        if (isset($data['nhf_id'])) $emp->setNhfId($data['nhf_id']);

        $this->em->persist($emp);
        $this->em->flush();

        $this->logger->info("Employee created: {$emp->getStaffId()} ({$emp->getFullName()})");
        return $emp;
    }

    public function getEmployee(string $id): ?Employee
    {
        return $this->empRepo->find($id);
    }

    public function updateEmployee(string $id, array $data): Employee
    {
        $emp = $this->empRepo->find($id);
        if (!$emp) throw new \RuntimeException('Employee not found');

        $fields = [
            'first_name' => 'setFirstName', 'last_name' => 'setLastName',
            'email' => 'setEmail', 'phone' => 'setPhone',
            'job_title' => 'setJobTitle', 'department_id' => 'setDepartmentId',
            'user_id' => 'setUserId',
            'gross_salary' => 'setGrossSalary',
            'bank_name' => 'setBankName', 'bank_account_number' => 'setBankAccountNumber',
            'bank_account_name' => 'setBankAccountName',
            'gender' => 'setGender', 'address' => 'setAddress',
            'emergency_contact_name' => 'setEmergencyContactName',
            'emergency_contact_phone' => 'setEmergencyContactPhone',
            'nin' => 'setNin', 'tax_id' => 'setTaxId',
            'pension_pin' => 'setPensionPin', 'nhf_id' => 'setNhfId',
            'notes' => 'setNotes',
        ];

        foreach ($fields as $key => $setter) {
            if (array_key_exists($key, $data)) $emp->$setter($data[$key]);
        }

        if (isset($data['employment_status'])) {
            $emp->setEmploymentStatus(EmploymentStatus::from($data['employment_status']));
        }
        if (isset($data['date_of_birth'])) {
            $emp->setDateOfBirth($data['date_of_birth'] ? new \DateTimeImmutable($data['date_of_birth']) : null);
        }
        if (isset($data['termination_date'])) {
            $emp->setTerminationDate($data['termination_date'] ? new \DateTimeImmutable($data['termination_date']) : null);
        }

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

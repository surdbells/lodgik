<?php

declare(strict_types=1);

namespace Lodgik\Repository;

use Lodgik\Entity\Employee;
use Lodgik\Enum\EmploymentStatus;

/** @extends BaseRepository<Employee> */
final class EmployeeRepository extends BaseRepository
{
    protected function getEntityClass(): string { return Employee::class; }

    /**
     * @return array{items: Employee[], total: int}
     */
    public function listEmployees(
        ?string $propertyId = null,
        ?string $departmentId = null,
        ?string $status = null,
        ?string $search = null,
        int $page = 1,
        int $limit = 20,
    ): array {
        $qb = $this->createQueryBuilder('e')
            ->where('e.deletedAt IS NULL');

        if ($propertyId) $qb->andWhere('e.propertyId = :pid')->setParameter('pid', $propertyId);
        if ($departmentId) $qb->andWhere('e.departmentId = :did')->setParameter('did', $departmentId);
        if ($status) $qb->andWhere('e.employmentStatus = :st')->setParameter('st', $status);
        if ($search) {
            $s = '%' . strtolower(trim($search)) . '%';
            $qb->andWhere('LOWER(e.firstName) LIKE :s OR LOWER(e.lastName) LIKE :s OR LOWER(e.staffId) LIKE :s OR LOWER(e.email) LIKE :s')
               ->setParameter('s', $s);
        }

        $total = (int) (clone $qb)->select('COUNT(e.id)')->getQuery()->getSingleScalarResult();
        $items = $qb->orderBy('e.lastName', 'ASC')->addOrderBy('e.firstName', 'ASC')
            ->setFirstResult(($page - 1) * $limit)->setMaxResults($limit)->getQuery()->getResult();

        return ['items' => $items, 'total' => $total];
    }

    /** @return Employee[] */
    public function findActiveByProperty(string $propertyId): array
    {
        return $this->createQueryBuilder('e')
            ->where('e.propertyId = :pid')
            ->andWhere('e.deletedAt IS NULL')
            ->andWhere('e.employmentStatus IN (:active)')
            ->setParameter('pid', $propertyId)
            ->setParameter('active', [EmploymentStatus::ACTIVE->value, EmploymentStatus::PROBATION->value])
            ->orderBy('e.lastName', 'ASC')
            ->getQuery()->getResult();
    }

    public function findByUserId(string $userId): ?Employee
    {
        return $this->createQueryBuilder('e')
            ->where('e.userId = :uid')
            ->andWhere('e.deletedAt IS NULL')
            ->setParameter('uid', $userId)
            ->setMaxResults(1)
            ->getQuery()->getOneOrNullResult();
    }

    public function generateStaffId(string $tenantId): string
    {
        $count = (int) $this->createQueryBuilder('e')
            ->select('COUNT(e.id)')
            ->getQuery()->getSingleScalarResult();
        return sprintf('EMP-%04d', $count + 1);
    }
}

<?php

declare(strict_types=1);

namespace Lodgik\Repository;

use Lodgik\Entity\Department;

/** @extends BaseRepository<Department> */
final class DepartmentRepository extends BaseRepository
{
    protected function getEntityClass(): string { return Department::class; }

    /** @return Department[] */
    public function findByProperty(?string $propertyId = null): array
    {
        $qb = $this->createQueryBuilder('d')->orderBy('d.name', 'ASC');
        if ($propertyId) $qb->andWhere('d.propertyId = :pid')->setParameter('pid', $propertyId);
        return $qb->getQuery()->getResult();
    }

    /** @return Department[] */
    public function findActive(): array
    {
        return $this->createQueryBuilder('d')
            ->where('d.isActive = true')
            ->orderBy('d.name', 'ASC')
            ->getQuery()->getResult();
    }
}

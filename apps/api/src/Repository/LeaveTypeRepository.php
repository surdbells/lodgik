<?php

declare(strict_types=1);

namespace Lodgik\Repository;

use Lodgik\Entity\LeaveType;

/** @extends BaseRepository<LeaveType> */
final class LeaveTypeRepository extends BaseRepository
{
    protected function getEntityClass(): string { return LeaveType::class; }

    /** @return LeaveType[] */
    public function findActive(): array
    {
        return $this->createQueryBuilder('lt')
            ->where('lt.isActive = true')
            ->orderBy('lt.name', 'ASC')
            ->getQuery()->getResult();
    }

    public function findByKey(string $key): ?LeaveType
    {
        return $this->createQueryBuilder('lt')
            ->where('lt.typeKey = :k')
            ->setParameter('k', $key)
            ->setMaxResults(1)
            ->getQuery()->getOneOrNullResult();
    }
}

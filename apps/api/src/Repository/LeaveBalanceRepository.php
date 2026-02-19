<?php

declare(strict_types=1);

namespace Lodgik\Repository;

use Lodgik\Entity\LeaveBalance;

/** @extends BaseRepository<LeaveBalance> */
final class LeaveBalanceRepository extends BaseRepository
{
    protected function getEntityClass(): string { return LeaveBalance::class; }

    /** @return LeaveBalance[] */
    public function findByEmployee(string $employeeId, int $year): array
    {
        return $this->createQueryBuilder('lb')
            ->where('lb.employeeId = :eid')
            ->andWhere('lb.year = :y')
            ->setParameter('eid', $employeeId)
            ->setParameter('y', $year)
            ->getQuery()->getResult();
    }

    public function findOne(string $employeeId, string $leaveTypeId, int $year): ?LeaveBalance
    {
        return $this->createQueryBuilder('lb')
            ->where('lb.employeeId = :eid')
            ->andWhere('lb.leaveTypeId = :ltid')
            ->andWhere('lb.year = :y')
            ->setParameter('eid', $employeeId)
            ->setParameter('ltid', $leaveTypeId)
            ->setParameter('y', $year)
            ->setMaxResults(1)
            ->getQuery()->getOneOrNullResult();
    }
}

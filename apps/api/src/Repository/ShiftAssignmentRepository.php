<?php

declare(strict_types=1);

namespace Lodgik\Repository;

use Lodgik\Entity\ShiftAssignment;

/** @extends BaseRepository<ShiftAssignment> */
final class ShiftAssignmentRepository extends BaseRepository
{
    protected function getEntityClass(): string { return ShiftAssignment::class; }

    /** @return ShiftAssignment[] */
    public function findByDateRange(string $from, string $to, ?string $employeeId = null): array
    {
        $qb = $this->createQueryBuilder('sa')
            ->where('sa.shiftDate BETWEEN :from AND :to')
            ->setParameter('from', $from)
            ->setParameter('to', $to)
            ->orderBy('sa.shiftDate', 'ASC');
        if ($employeeId) $qb->andWhere('sa.employeeId = :eid')->setParameter('eid', $employeeId);
        return $qb->getQuery()->getResult();
    }

    public function findForEmployeeOnDate(string $employeeId, string $date): ?ShiftAssignment
    {
        return $this->createQueryBuilder('sa')
            ->where('sa.employeeId = :eid')
            ->andWhere('sa.shiftDate = :d')
            ->setParameter('eid', $employeeId)
            ->setParameter('d', $date)
            ->setMaxResults(1)
            ->getQuery()->getOneOrNullResult();
    }
}

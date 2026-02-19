<?php

declare(strict_types=1);

namespace Lodgik\Repository;

use Lodgik\Entity\PayrollItem;

/** @extends BaseRepository<PayrollItem> */
final class PayrollItemRepository extends BaseRepository
{
    protected function getEntityClass(): string { return PayrollItem::class; }

    /** @return PayrollItem[] */
    public function findByPeriod(string $periodId): array
    {
        return $this->createQueryBuilder('pi')
            ->where('pi.payrollPeriodId = :pid')
            ->setParameter('pid', $periodId)
            ->orderBy('pi.employeeName', 'ASC')
            ->getQuery()->getResult();
    }

    public function findByPeriodAndEmployee(string $periodId, string $employeeId): ?PayrollItem
    {
        return $this->createQueryBuilder('pi')
            ->where('pi.payrollPeriodId = :pid')
            ->andWhere('pi.employeeId = :eid')
            ->setParameter('pid', $periodId)
            ->setParameter('eid', $employeeId)
            ->setMaxResults(1)
            ->getQuery()->getOneOrNullResult();
    }

    public function deleteByPeriod(string $periodId): int
    {
        return (int) $this->createQueryBuilder('pi')
            ->delete()
            ->where('pi.payrollPeriodId = :pid')
            ->setParameter('pid', $periodId)
            ->getQuery()->execute();
    }
}

<?php

declare(strict_types=1);

namespace Lodgik\Repository;

use Lodgik\Entity\PayrollPeriod;

/** @extends BaseRepository<PayrollPeriod> */
final class PayrollPeriodRepository extends BaseRepository
{
    protected function getEntityClass(): string { return PayrollPeriod::class; }

    /** @return PayrollPeriod[] */
    public function findByProperty(string $propertyId, ?int $year = null): array
    {
        $qb = $this->createQueryBuilder('pp')
            ->where('pp.propertyId = :pid')
            ->setParameter('pid', $propertyId)
            ->orderBy('pp.year', 'DESC')
            ->addOrderBy('pp.month', 'DESC');
        if ($year) $qb->andWhere('pp.year = :y')->setParameter('y', $year);
        return $qb->getQuery()->getResult();
    }

    public function findByPeriod(string $propertyId, int $year, int $month): ?PayrollPeriod
    {
        return $this->createQueryBuilder('pp')
            ->where('pp.propertyId = :pid')
            ->andWhere('pp.year = :y')
            ->andWhere('pp.month = :m')
            ->setParameter('pid', $propertyId)
            ->setParameter('y', $year)
            ->setParameter('m', $month)
            ->setMaxResults(1)
            ->getQuery()->getOneOrNullResult();
    }
}

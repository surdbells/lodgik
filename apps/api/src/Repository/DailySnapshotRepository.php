<?php

declare(strict_types=1);

namespace Lodgik\Repository;

use Lodgik\Entity\DailySnapshot;

/** @extends BaseRepository<DailySnapshot> */
final class DailySnapshotRepository extends BaseRepository
{
    protected function getEntityClass(): string
    {
        return DailySnapshot::class;
    }

    /** @return DailySnapshot[] */
    public function getRange(string $propertyId, string $from, string $to): array
    {
        return $this->createQueryBuilder('s')
            ->where('s.propertyId = :prop')
            ->andWhere('s.snapshotDate >= :from AND s.snapshotDate <= :to')
            ->setParameter('prop', $propertyId)
            ->setParameter('from', $from)
            ->setParameter('to', $to)
            ->orderBy('s.snapshotDate', 'ASC')
            ->getQuery()
            ->getResult();
    }

    public function findByDate(string $propertyId, string $date): ?DailySnapshot
    {
        return $this->findOneBy(['propertyId' => $propertyId, 'snapshotDate' => new \DateTimeImmutable($date)]);
    }
}

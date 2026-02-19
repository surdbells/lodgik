<?php

declare(strict_types=1);

namespace Lodgik\Repository;

use Lodgik\Entity\Shift;

/** @extends BaseRepository<Shift> */
final class ShiftRepository extends BaseRepository
{
    protected function getEntityClass(): string { return Shift::class; }

    /** @return Shift[] */
    public function findActive(): array
    {
        return $this->createQueryBuilder('s')
            ->where('s.isActive = true')
            ->orderBy('s.startTime', 'ASC')
            ->getQuery()->getResult();
    }
}

<?php

declare(strict_types=1);

namespace Lodgik\Repository;

use Lodgik\Entity\TaxBracket;

/** @extends BaseRepository<TaxBracket> */
final class TaxBracketRepository extends BaseRepository
{
    protected function getEntityClass(): string { return TaxBracket::class; }

    /** @return TaxBracket[] ordered by sort_order */
    public function findAllOrdered(): array
    {
        return $this->createQueryBuilder('tb')
            ->orderBy('tb.sortOrder', 'ASC')
            ->getQuery()->getResult();
    }
}

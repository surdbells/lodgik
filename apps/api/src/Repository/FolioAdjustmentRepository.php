<?php

declare(strict_types=1);

namespace Lodgik\Repository;

use Lodgik\Entity\FolioAdjustment;

/** @extends BaseRepository<FolioAdjustment> */
final class FolioAdjustmentRepository extends BaseRepository
{
    protected function getEntityClass(): string { return FolioAdjustment::class; }

    /** @return FolioAdjustment[] */
    public function findByFolio(string $folioId): array
    {
        return $this->createQueryBuilder('a')
            ->where('a.folioId = :fid')->setParameter('fid', $folioId)
            ->orderBy('a.createdAt', 'ASC')
            ->getQuery()->getResult();
    }

    public function sumByFolio(string $folioId): string
    {
        $r = $this->createQueryBuilder('a')
            ->select('COALESCE(SUM(a.amount), 0)')
            ->where('a.folioId = :fid')->setParameter('fid', $folioId)
            ->getQuery()->getSingleScalarResult();
        return number_format((float)$r, 2, '.', '');
    }
}

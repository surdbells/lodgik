<?php

declare(strict_types=1);

namespace Lodgik\Repository;

use Lodgik\Entity\FolioCharge;

/** @extends BaseRepository<FolioCharge> */
final class FolioChargeRepository extends BaseRepository
{
    protected function getEntityClass(): string { return FolioCharge::class; }

    /** @return FolioCharge[] */
    public function findByFolio(string $folioId): array
    {
        return $this->createQueryBuilder('c')
            ->where('c.folioId = :fid')->setParameter('fid', $folioId)
            ->orderBy('c.chargeDate', 'ASC')->addOrderBy('c.createdAt', 'ASC')
            ->getQuery()->getResult();
    }

    public function sumByFolio(string $folioId): string
    {
        $r = $this->createQueryBuilder('c')
            ->select('COALESCE(SUM(c.lineTotal), 0)')
            ->where('c.folioId = :fid')->setParameter('fid', $folioId)
            ->andWhere('c.isVoided = false')
            ->getQuery()->getSingleScalarResult();
        return number_format((float)$r, 2, '.', '');
    }
}

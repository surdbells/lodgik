<?php

declare(strict_types=1);

namespace Lodgik\Repository;

use Lodgik\Entity\Folio;

/** @extends BaseRepository<Folio> */
final class FolioRepository extends BaseRepository
{
    protected function getEntityClass(): string { return Folio::class; }

    public function findByBooking(string $bookingId): ?Folio
    {
        return $this->createQueryBuilder('f')
            ->where('f.bookingId = :bid')->setParameter('bid', $bookingId)
            ->setMaxResults(1)->getQuery()->getOneOrNullResult();
    }

    public function findByProperty(string $propertyId, ?string $status = null, int $page = 1, int $limit = 20): array
    {
        $qb = $this->createQueryBuilder('f')
            ->where('f.propertyId = :pid')->setParameter('pid', $propertyId);
        if ($status) $qb->andWhere('f.status = :s')->setParameter('s', $status);
        $countQb = (clone $qb)->select('COUNT(f.id)');
        $total = (int) $countQb->getQuery()->getSingleScalarResult();
        $items = $qb->orderBy('f.createdAt', 'DESC')->setFirstResult(($page - 1) * $limit)->setMaxResults($limit)->getQuery()->getResult();
        return ['items' => $items, 'total' => $total];
    }

    public function generateFolioNumber(string $tenantId): string
    {
        $date = date('Ymd');
        $qb = $this->createQueryBuilder('f')
            ->select('COUNT(f.id)')
            ->where('f.tenantId = :t')->setParameter('t', $tenantId)
            ->andWhere('f.folioNumber LIKE :prefix')->setParameter('prefix', "FL-{$date}-%");
        $count = (int)$qb->getQuery()->getSingleScalarResult();
        return sprintf('FL-%s-%03d', $date, $count + 1);
    }

    /** Phase 3: Return all folios linked to a corporate group booking. */
    public function findByGroupBooking(string $groupBookingId): array
    {
        return $this->createQueryBuilder('f')
            ->where('f.groupBookingId = :gbid')
            ->setParameter('gbid', $groupBookingId)
            ->orderBy('f.createdAt', 'ASC')
            ->getQuery()
            ->getResult();
    }
}

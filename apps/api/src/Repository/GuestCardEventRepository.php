<?php
declare(strict_types=1);
namespace Lodgik\Repository;

use Lodgik\Entity\GuestCardEvent;

/** @extends BaseRepository<GuestCardEvent> */
final class GuestCardEventRepository extends BaseRepository
{
    protected function getEntityClass(): string { return GuestCardEvent::class; }

    public function findByCard(string $cardId, int $limit = 50): array
    {
        return $this->createQueryBuilder('e')
            ->where('e.cardId = :cid')
            ->setParameter('cid', $cardId)
            ->orderBy('e.scannedAt', 'DESC')
            ->setMaxResults($limit)
            ->getQuery()->getResult();
    }

    public function findByBooking(string $bookingId): array
    {
        return $this->createQueryBuilder('e')
            ->where('e.bookingId = :bid')
            ->setParameter('bid', $bookingId)
            ->orderBy('e.scannedAt', 'ASC')
            ->getQuery()->getResult();
    }

    public function findByGuest(string $guestId, int $limit = 100): array
    {
        return $this->createQueryBuilder('e')
            ->where('e.guestId = :gid')
            ->setParameter('gid', $guestId)
            ->orderBy('e.scannedAt', 'DESC')
            ->setMaxResults($limit)
            ->getQuery()->getResult();
    }

    public function findRecent(string $propertyId, int $limit = 50): array
    {
        return $this->createQueryBuilder('e')
            ->where('e.propertyId = :pid')
            ->setParameter('pid', $propertyId)
            ->orderBy('e.scannedAt', 'DESC')
            ->setMaxResults($limit)
            ->getQuery()->getResult();
    }

    public function findByPropertyFiltered(
        string  $propertyId,
        ?string $eventType  = null,
        ?string $dateFrom   = null,
        ?string $dateTo     = null,
        ?string $guestId    = null,
        ?string $scanPointType = null,
        int     $page       = 1,
        int     $limit      = 50,
    ): array {
        $qb = $this->createQueryBuilder('e')
            ->where('e.propertyId = :pid')
            ->setParameter('pid', $propertyId)
            ->orderBy('e.scannedAt', 'DESC');

        if ($eventType)    { $qb->andWhere('e.eventType = :et')->setParameter('et', $eventType); }
        if ($guestId)      { $qb->andWhere('e.guestId = :gid')->setParameter('gid', $guestId); }
        if ($scanPointType){ $qb->andWhere('e.scanPointType = :spt')->setParameter('spt', $scanPointType); }
        if ($dateFrom)     { $qb->andWhere('e.scannedAt >= :df')->setParameter('df', new \DateTimeImmutable($dateFrom)); }
        if ($dateTo)       { $qb->andWhere('e.scannedAt <= :dt')->setParameter('dt', new \DateTimeImmutable($dateTo . ' 23:59:59')); }

        return $this->paginate($qb, $page, $limit);
    }
}

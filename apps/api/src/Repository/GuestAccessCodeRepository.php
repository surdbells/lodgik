<?php

declare(strict_types=1);

namespace Lodgik\Repository;

use Lodgik\Entity\GuestAccessCode;

/** @extends BaseRepository<GuestAccessCode> */
final class GuestAccessCodeRepository extends BaseRepository
{
    protected function getEntityClass(): string { return GuestAccessCode::class; }

    public function findActiveByCode(string $code): ?GuestAccessCode
    {
        return $this->createQueryBuilder('ac')
            ->where('ac.code = :code')->andWhere('ac.isActive = true')
            ->andWhere('ac.expiresAt > :now')
            ->setParameter('code', $code)
            ->setParameter('now', new \DateTimeImmutable())
            ->setMaxResults(1)->getQuery()->getOneOrNullResult();
    }

    public function findActiveByBooking(string $bookingId): ?GuestAccessCode
    {
        return $this->createQueryBuilder('ac')
            ->where('ac.bookingId = :bid')->andWhere('ac.isActive = true')
            ->setParameter('bid', $bookingId)
            ->setMaxResults(1)->getQuery()->getOneOrNullResult();
    }

    public function deactivateForBooking(string $bookingId): void
    {
        $this->createQueryBuilder('ac')->update()
            ->set('ac.isActive', 'false')
            ->where('ac.bookingId = :bid')
            ->setParameter('bid', $bookingId)
            ->getQuery()->execute();
    }
}

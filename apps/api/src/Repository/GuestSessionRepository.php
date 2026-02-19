<?php

declare(strict_types=1);

namespace Lodgik\Repository;

use Lodgik\Entity\GuestSession;

/** @extends BaseRepository<GuestSession> */
final class GuestSessionRepository extends BaseRepository
{
    protected function getEntityClass(): string { return GuestSession::class; }

    public function findActiveByToken(string $token): ?GuestSession
    {
        return $this->createQueryBuilder('gs')
            ->where('gs.token = :token')->andWhere('gs.isActive = true')
            ->andWhere('gs.expiresAt > :now')
            ->setParameter('token', $token)
            ->setParameter('now', new \DateTimeImmutable())
            ->setMaxResults(1)->getQuery()->getOneOrNullResult();
    }

    public function invalidateForBooking(string $bookingId): void
    {
        $this->createQueryBuilder('gs')->update()
            ->set('gs.isActive', 'false')
            ->where('gs.bookingId = :bid')
            ->setParameter('bid', $bookingId)
            ->getQuery()->execute();
    }
}

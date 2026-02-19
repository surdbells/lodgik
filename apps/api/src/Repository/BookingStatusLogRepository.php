<?php

declare(strict_types=1);

namespace Lodgik\Repository;

use Lodgik\Entity\BookingStatusLog;

/** @extends BaseRepository<BookingStatusLog> */
final class BookingStatusLogRepository extends BaseRepository
{
    protected function getEntityClass(): string
    {
        return BookingStatusLog::class;
    }

    /** @return BookingStatusLog[] */
    public function getHistory(string $bookingId, int $limit = 20): array
    {
        return $this->createQueryBuilder('l')
            ->where('l.bookingId = :bid')
            ->setParameter('bid', $bookingId)
            ->orderBy('l.createdAt', 'DESC')
            ->setMaxResults($limit)
            ->getQuery()
            ->getResult();
    }
}

<?php

declare(strict_types=1);

namespace Lodgik\Repository;

use Lodgik\Entity\RoomStatusLog;

/**
 * @extends BaseRepository<RoomStatusLog>
 */
final class RoomStatusLogRepository extends BaseRepository
{
    protected function getEntityClass(): string
    {
        return RoomStatusLog::class;
    }

    /**
     * Get status history for a room.
     *
     * @return RoomStatusLog[]
     */
    public function getHistory(string $roomId, int $limit = 20): array
    {
        return $this->createQueryBuilder('l')
            ->where('l.roomId = :roomId')
            ->setParameter('roomId', $roomId)
            ->orderBy('l.createdAt', 'DESC')
            ->setMaxResults($limit)
            ->getQuery()
            ->getResult();
    }
}

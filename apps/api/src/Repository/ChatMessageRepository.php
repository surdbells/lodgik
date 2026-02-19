<?php

declare(strict_types=1);

namespace Lodgik\Repository;

use Lodgik\Entity\ChatMessage;

/** @extends BaseRepository<ChatMessage> */
final class ChatMessageRepository extends BaseRepository
{
    protected function getEntityClass(): string { return ChatMessage::class; }

    /** @return ChatMessage[] */
    public function findByBooking(string $bookingId, int $limit = 50, int $offset = 0): array
    {
        return $this->createQueryBuilder('cm')
            ->where('cm.bookingId = :bid')
            ->setParameter('bid', $bookingId)
            ->orderBy('cm.createdAt', 'ASC')
            ->setMaxResults($limit)->setFirstResult($offset)
            ->getQuery()->getResult();
    }

    /** @return ChatMessage[] Unread messages for a booking from a given sender type */
    public function findUnread(string $bookingId, string $forSenderType): array
    {
        // Unread messages sent by the OTHER party
        $opposite = $forSenderType === 'guest' ? 'staff' : 'guest';
        return $this->createQueryBuilder('cm')
            ->where('cm.bookingId = :bid')
            ->andWhere('cm.senderType = :st')
            ->andWhere('cm.isRead = false')
            ->setParameter('bid', $bookingId)
            ->setParameter('st', $opposite)
            ->orderBy('cm.createdAt', 'ASC')
            ->getQuery()->getResult();
    }

    public function markReadForBooking(string $bookingId, string $senderType): int
    {
        return (int) $this->createQueryBuilder('cm')->update()
            ->set('cm.isRead', 'true')
            ->set('cm.readAt', ':now')
            ->where('cm.bookingId = :bid')
            ->andWhere('cm.senderType = :st')
            ->andWhere('cm.isRead = false')
            ->setParameter('bid', $bookingId)
            ->setParameter('st', $senderType)
            ->setParameter('now', new \DateTimeImmutable())
            ->getQuery()->execute();
    }

    /** @return array{booking_id:string, unread:int}[] Active chats with unread count */
    public function findActiveChats(string $propertyId): array
    {
        return $this->createQueryBuilder('cm')
            ->select('cm.bookingId as booking_id, SUM(CASE WHEN cm.isRead = false AND cm.senderType = \'guest\' THEN 1 ELSE 0 END) as unread, MAX(cm.createdAt) as last_message_at')
            ->where('cm.propertyId = :pid')
            ->setParameter('pid', $propertyId)
            ->groupBy('cm.bookingId')
            ->orderBy('last_message_at', 'DESC')
            ->getQuery()->getResult();
    }
}

<?php

declare(strict_types=1);

namespace Lodgik\Repository;

use Lodgik\Entity\Notification;

/** @extends BaseRepository<Notification> */
final class NotificationRepository extends BaseRepository
{
    protected function getEntityClass(): string { return Notification::class; }

    /** @return Notification[] */
    public function findForRecipient(string $recipientId, bool $unreadOnly = false, int $limit = 50): array
    {
        $qb = $this->createQueryBuilder('n')
            ->where('n.recipientId = :rid')
            ->setParameter('rid', $recipientId)
            ->orderBy('n.createdAt', 'DESC')
            ->setMaxResults($limit);
        if ($unreadOnly) $qb->andWhere('n.isRead = false');
        return $qb->getQuery()->getResult();
    }

    public function countUnread(string $recipientId): int
    {
        return (int) $this->createQueryBuilder('n')
            ->select('COUNT(n.id)')
            ->where('n.recipientId = :rid')
            ->andWhere('n.isRead = false')
            ->setParameter('rid', $recipientId)
            ->getQuery()->getSingleScalarResult();
    }

    public function markAllRead(string $recipientId): int
    {
        return (int) $this->createQueryBuilder('n')
            ->update()
            ->set('n.isRead', 'true')
            ->set('n.readAt', ':now')
            ->where('n.recipientId = :rid')
            ->andWhere('n.isRead = false')
            ->setParameter('rid', $recipientId)
            ->setParameter('now', new \DateTimeImmutable())
            ->getQuery()->execute();
    }
}

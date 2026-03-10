<?php

declare(strict_types=1);

namespace Lodgik\Repository;

use Lodgik\Entity\Notification;

/** @extends BaseRepository<Notification> */
final class NotificationRepository extends BaseRepository
{
    protected function getEntityClass(): string { return Notification::class; }

    /**
     * Returns notifications for a specific user AND broadcast ('all') notifications
     * for the same tenant, so staff see both personal and property-wide alerts.
     *
     * @return Notification[]
     */
    public function findForRecipient(
        string $recipientId,
        bool $unreadOnly = false,
        int $limit = 50,
        ?string $tenantId = null,
    ): array {
        $qb = $this->createQueryBuilder('n')
            ->where('n.recipientId IN (:ids)')
            ->setParameter('ids', [$recipientId, 'all'])
            ->orderBy('n.createdAt', 'DESC')
            ->setMaxResults($limit);

        if ($tenantId) {
            $qb->andWhere('n.tenantId = :tid')->setParameter('tid', $tenantId);
        }

        if ($unreadOnly) {
            $qb->andWhere('n.isRead = false');
        }

        return $qb->getQuery()->getResult();
    }

    public function countUnread(string $recipientId, ?string $tenantId = null): int
    {
        $qb = $this->createQueryBuilder('n')
            ->select('COUNT(n.id)')
            ->where('n.recipientId IN (:ids)')
            ->andWhere('n.isRead = false')
            ->setParameter('ids', [$recipientId, 'all']);

        if ($tenantId) {
            $qb->andWhere('n.tenantId = :tid')->setParameter('tid', $tenantId);
        }

        return (int) $qb->getQuery()->getSingleScalarResult();
    }

    public function markAllRead(string $recipientId, ?string $tenantId = null): int
    {
        $qb = $this->createQueryBuilder('n')
            ->update()
            ->set('n.isRead', 'true')
            ->set('n.readAt', ':now')
            ->where('n.recipientId IN (:ids)')
            ->andWhere('n.isRead = false')
            ->setParameter('ids', [$recipientId, 'all'])
            ->setParameter('now', new \DateTimeImmutable());

        if ($tenantId) {
            $qb->andWhere('n.tenantId = :tid')->setParameter('tid', $tenantId);
        }

        return (int) $qb->getQuery()->execute();
    }
}

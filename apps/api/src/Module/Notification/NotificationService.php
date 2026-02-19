<?php

declare(strict_types=1);

namespace Lodgik\Module\Notification;

use Doctrine\ORM\EntityManagerInterface;
use Lodgik\Entity\DeviceToken;
use Lodgik\Entity\Notification;
use Lodgik\Repository\DeviceTokenRepository;
use Lodgik\Repository\NotificationRepository;
use Psr\Log\LoggerInterface;

final class NotificationService
{
    public function __construct(
        private readonly EntityManagerInterface $em,
        private readonly NotificationRepository $notifRepo,
        private readonly DeviceTokenRepository $tokenRepo,
        private readonly LoggerInterface $logger,
    ) {}

    // ─── Notifications ──────────────────────────────────────────

    public function create(string $propertyId, string $recipientType, string $recipientId, string $channel, string $title, string $tenantId, ?string $body = null, ?array $data = null): Notification
    {
        $n = new Notification($propertyId, $recipientType, $recipientId, $channel, $title, $tenantId);
        if ($body) $n->setBody($body);
        if ($data) $n->setData($data);
        $this->em->persist($n);
        $this->em->flush();

        // Attempt push notification
        $this->sendPush($recipientId, $title, $body, $data);

        return $n;
    }

    /** Convenience: notify staff of new service request */
    public function notifyServiceRequest(string $propertyId, string $title, string $guestName, string $roomNumber, string $tenantId): void
    {
        $this->create($propertyId, 'staff', 'all', 'service_request', "🛎️ $title from $guestName (Room $roomNumber)", $tenantId, "New service request requires attention.");
    }

    /** Convenience: notify staff of new chat message */
    public function notifyChatMessage(string $propertyId, string $guestName, string $roomNumber, string $tenantId): void
    {
        $this->create($propertyId, 'staff', 'all', 'chat', "💬 New message from $guestName (Room $roomNumber)", $tenantId);
    }

    /** @return Notification[] */
    public function listForRecipient(string $recipientId, bool $unreadOnly = false, int $limit = 50): array
    {
        return $this->notifRepo->findForRecipient($recipientId, $unreadOnly, $limit);
    }

    public function countUnread(string $recipientId): int
    {
        return $this->notifRepo->countUnread($recipientId);
    }

    public function markRead(string $id): ?Notification
    {
        $n = $this->notifRepo->find($id);
        if (!$n) return null;
        $n->markRead();
        $this->em->flush();
        return $n;
    }

    public function markAllRead(string $recipientId): int
    {
        return $this->notifRepo->markAllRead($recipientId);
    }

    // ─── Device Tokens ──────────────────────────────────────────

    public function registerToken(string $ownerType, string $ownerId, string $token, string $platform, string $tenantId): DeviceToken
    {
        // Upsert: deactivate old token if exists
        $existing = $this->tokenRepo->findByToken($token);
        if ($existing) {
            $existing->markUsed();
            $this->em->flush();
            return $existing;
        }

        $dt = new DeviceToken($ownerType, $ownerId, $token, $platform, $tenantId);
        $this->em->persist($dt);
        $this->em->flush();
        return $dt;
    }

    public function removeToken(string $token): void
    {
        $dt = $this->tokenRepo->findByToken($token);
        if ($dt) {
            $dt->setIsActive(false);
            $this->em->flush();
        }
    }

    // ─── FCM Push (stub — implement with Firebase Admin SDK) ────

    private function sendPush(string $recipientId, string $title, ?string $body, ?array $data): void
    {
        $tokens = $this->tokenRepo->findActiveForOwner($recipientId);
        if (empty($tokens)) return;

        // TODO: Integrate Firebase Admin SDK for actual push delivery
        // For now, log the push attempt
        $this->logger->info("Push notification: to=$recipientId tokens=" . count($tokens) . " title=$title");

        foreach ($tokens as $dt) {
            $dt->markUsed();
        }
        $this->em->flush();
    }
}

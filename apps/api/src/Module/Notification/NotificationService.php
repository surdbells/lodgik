<?php

declare(strict_types=1);

namespace Lodgik\Module\Notification;

use Doctrine\ORM\EntityManagerInterface;
use Lodgik\Entity\DeviceToken;
use Lodgik\Entity\Notification;
use Lodgik\Repository\DeviceTokenRepository;
use Lodgik\Repository\NotificationRepository;
use Lodgik\Service\FcmService;
use Psr\Log\LoggerInterface;

final class NotificationService
{
    public function __construct(
        private readonly EntityManagerInterface $em,
        private readonly NotificationRepository $notifRepo,
        private readonly DeviceTokenRepository $tokenRepo,
        private readonly LoggerInterface $logger,
        private readonly ?FcmService $fcm = null,
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


    // ─── Emergency Broadcast ────────────────────────────────────

    /**
     * Broadcast a high-priority push + in-app notification to ALL registered
     * device tokens for a property. Used for FIRE_INCIDENT and SECURITY_BREACH.
     *
     * Every active staff token scoped to this tenant receives the notification.
     * The notification is also persisted with recipient_id = 'broadcast' so
     * it appears in the admin notification feed.
     */
    public function broadcastAll(
        string $propertyId,
        string $tenantId,
        string $title,
        string $body,
        string $channel = 'emergency',
        ?array $data    = null,
    ): int {
        // Persist a record visible to managers
        $n = new Notification($propertyId, 'staff', 'broadcast', $channel, $title, $tenantId);
        $n->setBody($body);
        if ($data) $n->setData($data);
        $this->em->persist($n);
        $this->em->flush();

        // Push to every active token for this tenant
        $allTokens = $this->tokenRepo->findActiveForTenant($tenantId);
        if (empty($allTokens)) {
            $this->logger->warning("[Broadcast] No active tokens for tenant={$tenantId}");
            return 0;
        }

        $fcmTokens = array_map(fn(DeviceToken $dt) => $dt->getToken(), $allTokens);

        $sent = 0;
        if ($this->fcm && $this->fcm->isEnabled()) {
            $sent = $this->fcm->sendToTokens($fcmTokens, $title, $body, array_merge($data ?? [], [
                'channel'     => $channel,
                'property_id' => $propertyId,
                'priority'    => 'high',
            ]));
        } else {
            $sent = count($fcmTokens);
            $this->logger->info("[Broadcast-dev] Would push to {$sent} tokens — title={$title}");
        }

        $this->logger->warning("[Broadcast] {$channel} sent to {$sent}/" . count($fcmTokens) . " tokens — property={$propertyId}");

        foreach ($allTokens as $dt) {
            $dt->markUsed();
        }
        $this->em->flush();

        return $sent;
    }

    // ─── FCM Push ─────────────────────────────────────────────

    private function sendPush(string $recipientId, string $title, ?string $body, ?array $data): void
    {
        $tokens = $this->tokenRepo->findActiveForOwner($recipientId);
        if (empty($tokens)) {
            // Also try 'all' tokens for broadcast notifications
            if ($recipientId !== 'all') return;
            // For 'all' staff, we'd need property-scoped tokens — skip for now
            return;
        }

        $fcmTokens = array_map(fn(DeviceToken $dt) => $dt->getToken(), $tokens);

        if ($this->fcm && $this->fcm->isEnabled()) {
            $sent = $this->fcm->sendToTokens($fcmTokens, $title, $body, $data);
            $this->logger->info("[Push] FCM sent to {$sent}/" . count($fcmTokens) . " tokens for recipient={$recipientId}");
        } else {
            $this->logger->info("[Push-dev] Would send to " . count($fcmTokens) . " tokens: title={$title}");
        }

        foreach ($tokens as $dt) {
            $dt->markUsed();
        }
        $this->em->flush();
    }
}

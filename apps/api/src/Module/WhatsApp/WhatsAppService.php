<?php
declare(strict_types=1);
namespace Lodgik\Module\WhatsApp;

use Doctrine\ORM\EntityManagerInterface;
use Lodgik\Entity\WhatsAppMessage;
use Lodgik\Entity\WhatsAppTemplate;
use Psr\Log\LoggerInterface;

final class WhatsAppService
{
    public function __construct(
        private readonly EntityManagerInterface $em,
        private readonly TermiiClient $termii,
        private readonly LoggerInterface $logger,
    ) {}

    // ─── Template Management ──────────────────────────────────
    public function listTemplates(string $tenantId, ?string $type = null): array
    {
        $criteria = ['tenantId' => $tenantId, 'isActive' => true];
        if ($type) $criteria['messageType'] = $type;
        return array_map(fn($t) => $t->toArray(), $this->em->getRepository(WhatsAppTemplate::class)->findBy($criteria, ['name' => 'ASC']));
    }

    public function createTemplate(string $name, string $type, string $body, array $paramNames, string $tenantId, string $lang = 'en'): WhatsAppTemplate
    {
        $t = new WhatsAppTemplate($name, $type, $body, $paramNames, $tenantId);
        $t->setLanguage($lang);
        $this->em->persist($t);
        $this->em->flush();
        return $t;
    }

    public function updateTemplate(string $id, array $data): WhatsAppTemplate
    {
        $t = $this->em->find(WhatsAppTemplate::class, $id);
        if (isset($data['name'])) $t->setName($data['name']);
        if (isset($data['body'])) $t->setBody($data['body']);
        if (isset($data['param_names'])) $t->setParamNames($data['param_names']);
        if (isset($data['is_active'])) $t->setIsActive((bool)$data['is_active']);
        $this->em->flush();
        return $t;
    }

    // ─── Send Messages ────────────────────────────────────────
    public function sendFromTemplate(string $propertyId, string $tenantId, string $messageType, string $phone, array $params, ?string $recipientName = null, ?string $bookingId = null, ?string $guestId = null): WhatsAppMessage
    {
        $template = $this->em->getRepository(WhatsAppTemplate::class)->findOneBy([
            'tenantId' => $tenantId,
            'messageType' => $messageType,
            'isActive' => true,
        ]);

        if (!$template) {
            $body = $this->getFallbackBody($messageType, $params);
        } else {
            $body = $template->render($params);
        }

        return $this->send($propertyId, $tenantId, $phone, $messageType, $body, $recipientName, $bookingId, $guestId, $template?->getId());
    }

    public function sendCustom(string $propertyId, string $tenantId, string $phone, string $message, ?string $recipientName = null): WhatsAppMessage
    {
        return $this->send($propertyId, $tenantId, $phone, 'custom', $message, $recipientName);
    }

    private function send(string $propertyId, string $tenantId, string $phone, string $type, string $body, ?string $recipientName = null, ?string $bookingId = null, ?string $guestId = null, ?string $templateId = null): WhatsAppMessage
    {
        $msg = new WhatsAppMessage($propertyId, 'outbound', $phone, $type, $body, $tenantId);
        if ($recipientName) $msg->setRecipientName($recipientName);
        if ($bookingId) $msg->setBookingId($bookingId);
        if ($guestId) $msg->setGuestId($guestId);
        if ($templateId) $msg->setTemplateId($templateId);

        $this->em->persist($msg);

        // Call Termii API
        try {
            $result = $this->termii->sendWhatsApp($phone, $body);
            if ($result['success'] ?? false) {
                $msg->markSent($result['message_id'] ?? $result['pinId'] ?? 'unknown');
                if (isset($result['balance'])) {
                    $msg->setCost((string)(($result['balance_before'] ?? 0) - ($result['balance'] ?? 0)));
                }
            } else {
                $msg->markFailed($result['message'] ?? $result['error'] ?? 'Unknown Termii error');
                $this->logger->warning('[WhatsApp] Send failed', ['phone' => $phone, 'error' => $result]);
            }
        } catch (\Throwable $e) {
            $msg->markFailed($e->getMessage());
            $this->logger->error('[WhatsApp] Exception', ['phone' => $phone, 'error' => $e->getMessage()]);
        }

        $this->em->flush();
        return $msg;
    }

    // ─── OTP ──────────────────────────────────────────────────
    public function sendOtp(string $propertyId, string $tenantId, string $phone, ?string $recipientName = null): array
    {
        $msg = new WhatsAppMessage($propertyId, 'outbound', $phone, 'otp', 'OTP Verification', $tenantId);
        if ($recipientName) $msg->setRecipientName($recipientName);
        $this->em->persist($msg);

        try {
            $result = $this->termii->sendOtp($phone);
            if ($result['success'] ?? false) {
                $msg->markSent($result['pinId'] ?? 'unknown');
                $this->em->flush();
                return ['success' => true, 'pin_id' => $result['pinId'] ?? null, 'message_id' => $msg->getId()];
            } else {
                $msg->markFailed($result['message'] ?? 'OTP send failed');
                $this->em->flush();
                return ['success' => false, 'error' => $result['message'] ?? 'Failed'];
            }
        } catch (\Throwable $e) {
            $msg->markFailed($e->getMessage());
            $this->em->flush();
            return ['success' => false, 'error' => $e->getMessage()];
        }
    }

    public function verifyOtp(string $pinId, string $pin): array
    {
        try {
            $result = $this->termii->verifyOtp($pinId, $pin);
            return [
                'success' => ($result['verified'] ?? false) === true || ($result['verified'] ?? '') === 'True',
                'data' => $result,
            ];
        } catch (\Throwable $e) {
            return ['success' => false, 'error' => $e->getMessage()];
        }
    }

    // ─── Webhook (Delivery Reports) ───────────────────────────
    public function handleWebhook(array $payload): void
    {
        $msgId = $payload['message_id'] ?? $payload['pinId'] ?? null;
        if (!$msgId) return;

        $msg = $this->em->getRepository(WhatsAppMessage::class)->findOneBy(['providerMessageId' => $msgId]);
        if (!$msg) return;

        $status = strtolower($payload['status'] ?? '');
        match ($status) {
            'delivered', 'sent-delivered' => $msg->markDelivered(),
            'read' => $msg->markRead(),
            'failed', 'rejected' => $msg->markFailed($payload['reason'] ?? 'Delivery failed'),
            default => null,
        };
        $this->em->flush();
    }

    // ─── Message History ──────────────────────────────────────
    public function listMessages(string $propertyId, ?string $phone = null, ?string $type = null, int $page = 1, int $limit = 20): array
    {
        $qb = $this->em->createQueryBuilder()->select('m')->from(WhatsAppMessage::class, 'm')
            ->where('m.propertyId = :p')->setParameter('p', $propertyId)->orderBy('m.createdAt', 'DESC');
        if ($phone) $qb->andWhere('m.recipientPhone = :ph')->setParameter('ph', $phone);
        if ($type) $qb->andWhere('m.messageType = :t')->setParameter('t', $type);
        $qb->setFirstResult(($page - 1) * $limit)->setMaxResults($limit);
        return array_map(fn($m) => $m->toArray(), $qb->getQuery()->getResult());
    }

    public function getMessageStats(string $propertyId): array
    {
        $rows = $this->em->createQueryBuilder()->select('m.status, COUNT(m.id) as cnt')
            ->from(WhatsAppMessage::class, 'm')
            ->where('m.propertyId = :p')->setParameter('p', $propertyId)
            ->groupBy('m.status')->getQuery()->getResult();
        return array_column($rows, 'cnt', 'status');
    }

    public function getBalance(): array
    {
        try {
            return $this->termii->getBalance();
        } catch (\Throwable $e) {
            return ['success' => false, 'error' => $e->getMessage()];
        }
    }

    // ─── Auto-Trigger Hooks ───────────────────────────────────
    public function onBookingConfirmed(string $propertyId, string $tenantId, array $booking): void
    {
        $phone = $booking['guest_phone'] ?? null;
        if (!$phone) return;
        $this->sendFromTemplate($propertyId, $tenantId, 'booking_confirmation', $phone, [
            'guest_name' => $booking['guest_name'] ?? 'Guest',
            'hotel_name' => $booking['hotel_name'] ?? 'Hotel',
            'room_number' => $booking['room_number'] ?? '',
            'check_in' => $booking['check_in'] ?? '',
            'check_out' => $booking['check_out'] ?? '',
            'booking_ref' => $booking['booking_ref'] ?? '',
        ], $booking['guest_name'] ?? null, $booking['id'] ?? null, $booking['guest_id'] ?? null);
    }

    public function onCheckIn(string $propertyId, string $tenantId, array $booking): void
    {
        $phone = $booking['guest_phone'] ?? null;
        if (!$phone) return;
        $this->sendFromTemplate($propertyId, $tenantId, 'check_in_welcome', $phone, [
            'guest_name' => $booking['guest_name'] ?? 'Guest',
            'hotel_name' => $booking['hotel_name'] ?? 'Hotel',
            'room_number' => $booking['room_number'] ?? '',
            'wifi_code' => $booking['wifi_code'] ?? 'Available at front desk',
        ], $booking['guest_name'] ?? null, $booking['id'] ?? null, $booking['guest_id'] ?? null);
    }

    public function onCheckOut(string $propertyId, string $tenantId, array $booking): void
    {
        $phone = $booking['guest_phone'] ?? null;
        if (!$phone) return;
        $this->sendFromTemplate($propertyId, $tenantId, 'check_out_thanks', $phone, [
            'guest_name' => $booking['guest_name'] ?? 'Guest',
            'hotel_name' => $booking['hotel_name'] ?? 'Hotel',
        ], $booking['guest_name'] ?? null, $booking['id'] ?? null, $booking['guest_id'] ?? null);
    }

    public function onVisitorCodeCreated(string $propertyId, string $tenantId, array $visitor): void
    {
        $phone = $visitor['visitor_phone'] ?? null;
        if (!$phone) return;
        $this->sendFromTemplate($propertyId, $tenantId, 'visitor_code', $phone, [
            'visitor_name' => $visitor['visitor_name'] ?? 'Visitor',
            'host_name' => $visitor['guest_name'] ?? 'Guest',
            'code' => $visitor['code'] ?? '',
            'hotel_name' => $visitor['hotel_name'] ?? 'Hotel',
            'expires_at' => $visitor['expires_at'] ?? '',
        ], $visitor['visitor_name'] ?? null);
    }

    // ─── Fallback Templates ───────────────────────────────────
    private function getFallbackBody(string $type, array $params): string
    {
        $p = fn(string $k) => $params[$k] ?? '';
        return match ($type) {
            'booking_confirmation' => "Hello {$p('guest_name')}! Your booking at {$p('hotel_name')} is confirmed.\nRoom: {$p('room_number')}\nCheck-in: {$p('check_in')}\nRef: {$p('booking_ref')}\nThank you!",
            'check_in_welcome' => "Welcome to {$p('hotel_name')}, {$p('guest_name')}!\nRoom: {$p('room_number')}\nWiFi: {$p('wifi_code')}\nEnjoy your stay!",
            'check_out_thanks' => "Thank you for staying at {$p('hotel_name')}, {$p('guest_name')}! We hope to welcome you again soon.",
            'payment_receipt' => "Payment of {$p('amount')} received. Ref: {$p('reference')}. Thank you, {$p('guest_name')}!",
            'visitor_code' => "Hi {$p('visitor_name')}, you have a gate pass from {$p('host_name')} at {$p('hotel_name')}.\nCode: {$p('code')}\nValid until: {$p('expires_at')}",
            'reminder' => "Reminder: {$p('message')}",
            default => $params['message'] ?? 'Message from Lodgik Hotel',
        };
    }
}

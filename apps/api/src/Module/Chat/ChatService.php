<?php

declare(strict_types=1);

namespace Lodgik\Module\Chat;

use Doctrine\ORM\EntityManagerInterface;
use Lodgik\Entity\ChatMessage;
use Lodgik\Module\Notification\NotificationService;
use Lodgik\Repository\ChatMessageRepository;
use Psr\Log\LoggerInterface;

final class ChatService
{
    public function __construct(
        private readonly EntityManagerInterface $em,
        private readonly ChatMessageRepository $repo,
        private readonly LoggerInterface $logger,
        private readonly ?NotificationService $notifService = null,
    ) {}

    public function sendMessage(string $bookingId, string $propertyId, string $senderType, string $senderId, string $senderName, string $message, string $tenantId, ?string $imageUrl = null, string $department = 'reception'): ChatMessage
    {
        if (!in_array($senderType, ['guest', 'staff'], true)) throw new \RuntimeException('Invalid sender type');
        if (!in_array($department, ['reception', 'kitchen', 'bar', 'general'], true)) $department = 'reception';

        $msg = new ChatMessage($bookingId, $propertyId, $senderType, $senderId, $senderName, $message, $tenantId);
        $msg->setDepartment($department);
        if ($imageUrl) {
            $msg->setMessageType('image');
            $msg->setImageUrl($imageUrl);
        }
        $this->em->persist($msg);
        $this->em->flush();

        // Notify the other party
        if ($senderType === 'guest') {
            $this->notifService?->notifyChatMessage($propertyId, $senderName, '', $tenantId);
        }

        return $msg;
    }

    /** @return ChatMessage[] */
    public function getMessages(string $bookingId, int $limit = 50, int $offset = 0): array
    {
        return $this->repo->findByBooking($bookingId, $limit, $offset);
    }

    /** Mark all messages from opposite party as read */
    public function markRead(string $bookingId, string $readerType): int
    {
        // Reader is 'guest' → mark 'staff' messages as read, and vice versa
        $senderToMark = $readerType === 'guest' ? 'staff' : 'guest';
        return $this->repo->markReadForBooking($bookingId, $senderToMark);
    }

    /** @return array[] Active chats with unread counts for staff dashboard */
    public function getActiveChats(string $propertyId): array
    {
        return $this->repo->findActiveChats($propertyId);
    }

    /** Active chats enriched with guest name, room number, booking ref, last message */
    public function getActiveChatsEnriched(string $propertyId): array
    {
        $raw = $this->repo->findActiveChats($propertyId);
        if (empty($raw)) return [];

        $bookingIds = array_column($raw, 'booking_id');
        $conn = $this->em->getConnection();

        // Fetch booking + guest + room info in one query
        $placeholders = implode(',', array_fill(0, count($bookingIds), '?'));
        $bookingInfo = $conn->fetchAllAssociativeIndexed(
            "SELECT b.id, b.booking_ref, g.first_name, g.last_name, r.room_number, b.guest_id
             FROM bookings b
             LEFT JOIN guests g ON g.id = b.guest_id
             LEFT JOIN rooms r ON r.id = b.room_id
             WHERE b.id IN ($placeholders)",
            $bookingIds
        );

        // Fetch last message per booking
        $lastMessages = $conn->fetchAllAssociativeIndexed(
            "SELECT DISTINCT ON (booking_id) booking_id, message, sender_type, created_at
             FROM chat_messages
             WHERE booking_id IN ($placeholders)
             ORDER BY booking_id, created_at DESC",
            $bookingIds
        );

        return array_map(function ($chat) use ($bookingInfo, $lastMessages) {
            $bid = $chat['booking_id'];
            $info = $bookingInfo[$bid] ?? [];
            $last = $lastMessages[$bid] ?? [];
            return [
                'booking_id' => $bid,
                'booking_ref' => $info['booking_ref'] ?? '',
                'guest_name' => trim(($info['first_name'] ?? '') . ' ' . ($info['last_name'] ?? '')) ?: 'Guest',
                'guest_id' => $info['guest_id'] ?? '',
                'room_number' => $info['room_number'] ?? '',
                'unread_count' => (int) ($chat['unread'] ?? 0),
                'last_message' => $last['message'] ?? '',
                'last_sender' => $last['sender_type'] ?? '',
                'last_message_at' => $chat['last_message_at'] ?? $last['created_at'] ?? '',
            ];
        }, $raw);
    }

    /** Get currently occupied rooms with guest info (for starting new conversations) */
    public function getOccupiedGuests(string $propertyId): array
    {
        $conn = $this->em->getConnection();
        return $conn->fetchAllAssociative(
            "SELECT b.id as booking_id, b.booking_ref, b.guest_id,
                    g.first_name, g.last_name, g.phone,
                    r.room_number, b.check_in, b.check_out
             FROM bookings b
             JOIN guests g ON g.id = b.guest_id
             LEFT JOIN rooms r ON r.id = b.room_id
             WHERE b.property_id = ? AND b.status = 'checked_in' AND b.deleted_at IS NULL
             ORDER BY r.room_number ASC",
            [$propertyId]
        );
    }

    public function getUnreadCount(string $bookingId, string $forType): int
    {
        return count($this->repo->findUnread($bookingId, $forType));
    }
}

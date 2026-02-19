<?php

declare(strict_types=1);

namespace Lodgik\Module\Chat;

use Doctrine\ORM\EntityManagerInterface;
use Lodgik\Entity\ChatMessage;
use Lodgik\Repository\ChatMessageRepository;
use Psr\Log\LoggerInterface;

final class ChatService
{
    public function __construct(
        private readonly EntityManagerInterface $em,
        private readonly ChatMessageRepository $repo,
        private readonly LoggerInterface $logger,
    ) {}

    public function sendMessage(string $bookingId, string $propertyId, string $senderType, string $senderId, string $senderName, string $message, string $tenantId, ?string $imageUrl = null): ChatMessage
    {
        if (!in_array($senderType, ['guest', 'staff'], true)) throw new \RuntimeException('Invalid sender type');

        $msg = new ChatMessage($bookingId, $propertyId, $senderType, $senderId, $senderName, $message, $tenantId);
        if ($imageUrl) {
            $msg->setMessageType('image');
            $msg->setImageUrl($imageUrl);
        }
        $this->em->persist($msg);
        $this->em->flush();
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

    public function getUnreadCount(string $bookingId, string $forType): int
    {
        return count($this->repo->findUnread($bookingId, $forType));
    }
}

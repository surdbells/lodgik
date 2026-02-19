<?php

declare(strict_types=1);

namespace Lodgik\Tests\Unit\Module\GuestExperience;

use Lodgik\Entity\GuestSession;
use Lodgik\Entity\GuestAccessCode;
use Lodgik\Entity\TabletDevice;
use Lodgik\Entity\ServiceRequest;
use Lodgik\Entity\ChatMessage;
use Lodgik\Entity\Notification;
use Lodgik\Entity\DeviceToken;
use Lodgik\Enum\ServiceRequestStatus;
use Lodgik\Enum\ServiceRequestCategory;
use PHPUnit\Framework\TestCase;

final class Phase4ATest extends TestCase
{
    // ─── GuestAccessCode ────────────────────────────────────────

    public function testAccessCodeCreation(): void
    {
        $ac = new GuestAccessCode('b1', 'g1', 'p1', '123456', new \DateTimeImmutable('+30 days'), 't1');
        $this->assertEquals('123456', $ac->getCode());
        $this->assertEquals('b1', $ac->getBookingId());
        $this->assertEquals('g1', $ac->getGuestId());
        $this->assertTrue($ac->isActive());
    }

    public function testAccessCodeExpiry(): void
    {
        $ac = new GuestAccessCode('b1', 'g1', 'p1', '654321', new \DateTimeImmutable('+30 days'), 't1');
        $this->assertFalse($ac->getExpiresAt() < new \DateTimeImmutable());
    }

    public function testAccessCodeUsage(): void
    {
        $ac = new GuestAccessCode('b1', 'g1', 'p1', '111222', new \DateTimeImmutable('+1 hour'), 't1');
        $ac->setLastUsedAt(new \DateTimeImmutable());
        $this->assertNotNull($ac->getLastUsedAt());
    }

    public function testAccessCodeToArray(): void
    {
        $ac = new GuestAccessCode('b1', 'g1', 'p1', '999888', new \DateTimeImmutable('+7 days'), 't1');
        $ac->onPrePersist();
        $arr = $ac->toArray();
        $this->assertEquals('999888', $arr['code']);
        $this->assertArrayHasKey('expires_at', $arr);
    }

    // ─── GuestSession ───────────────────────────────────────────

    public function testGuestSessionCreation(): void
    {
        $gs = new GuestSession('g1', 'b1', 'p1', 'abc123token', 'access_code', new \DateTimeImmutable('+72 hours'), 't1');
        $this->assertEquals('g1', $gs->getGuestId());
        $this->assertEquals('abc123token', $gs->getToken());
        $this->assertEquals('access_code', $gs->getAuthMethod());
        $this->assertTrue($gs->isActive());
    }

    public function testGuestSessionWithRoom(): void
    {
        $gs = new GuestSession('g1', 'b1', 'p1', 'xyz789', 'otp', new \DateTimeImmutable('+24 hours'), 't1');
        $gs->setRoomId('r1');
        $gs->setDeviceType('mobile');
        $this->assertEquals('r1', $gs->getRoomId());
        $this->assertEquals('mobile', $gs->getDeviceType());
    }

    public function testGuestSessionDeactivation(): void
    {
        $gs = new GuestSession('g1', 'b1', 'p1', 'token123', 'access_code', new \DateTimeImmutable('+72 hours'), 't1');
        $gs->setIsActive(false);
        $this->assertFalse($gs->isActive());
    }

    // ─── TabletDevice ───────────────────────────────────────────

    public function testTabletDeviceCreation(): void
    {
        $td = new TabletDevice('p1', 'r1', 'Room 101 Tablet', 'dt_abc123', 't1');
        $this->assertEquals('Room 101 Tablet', $td->getName());
        $this->assertEquals('dt_abc123', $td->getDeviceToken());
        $this->assertTrue($td->isActive());
        $this->assertNull($td->getCurrentBookingId());
    }

    public function testTabletBindToBooking(): void
    {
        $td = new TabletDevice('p1', 'r1', 'Room 101 Tablet', 'dt_abc123', 't1');
        $td->setCurrentBookingId('b1');
        $td->setCurrentGuestId('g1');
        $this->assertEquals('b1', $td->getCurrentBookingId());
        $this->assertEquals('g1', $td->getCurrentGuestId());
    }

    public function testTabletUnbind(): void
    {
        $td = new TabletDevice('p1', 'r1', 'Room 101 Tablet', 'dt_abc123', 't1');
        $td->setCurrentBookingId('b1');
        $td->setCurrentBookingId(null);
        $td->setCurrentGuestId(null);
        $this->assertNull($td->getCurrentBookingId());
    }

    // ─── ServiceRequest ─────────────────────────────────────────

    public function testServiceRequestCreation(): void
    {
        $sr = new ServiceRequest('p1', 'b1', 'g1', ServiceRequestCategory::ROOM_SERVICE, 'Extra towels', 't1');
        $this->assertEquals('Extra towels', $sr->getTitle());
        $this->assertEquals(ServiceRequestCategory::ROOM_SERVICE, $sr->getCategory());
        $this->assertEquals(ServiceRequestStatus::PENDING, $sr->getStatus());
        $this->assertEquals(2, $sr->getPriority());
    }

    public function testServiceRequestWorkflow(): void
    {
        $sr = new ServiceRequest('p1', 'b1', 'g1', ServiceRequestCategory::HOUSEKEEPING, 'Room cleaning', 't1');
        
        $sr->setStatus(ServiceRequestStatus::ACKNOWLEDGED);
        $sr->setAcknowledgedAt(new \DateTimeImmutable());
        $this->assertEquals(ServiceRequestStatus::ACKNOWLEDGED, $sr->getStatus());

        $sr->setStatus(ServiceRequestStatus::IN_PROGRESS);
        $sr->setAssignedTo('staff-1');
        $this->assertEquals('staff-1', $sr->getAssignedTo());

        $sr->setStatus(ServiceRequestStatus::COMPLETED);
        $sr->setCompletedAt(new \DateTimeImmutable());
        $this->assertNotNull($sr->getCompletedAt());
    }

    public function testServiceRequestRating(): void
    {
        $sr = new ServiceRequest('p1', 'b1', 'g1', ServiceRequestCategory::FOOD, 'Room service order', 't1');
        $sr->setGuestRating(5);
        $sr->setGuestFeedback('Excellent service!');
        $this->assertEquals(5, $sr->getGuestRating());
        $this->assertEquals('Excellent service!', $sr->getGuestFeedback());
    }

    public function testServiceRequestToArray(): void
    {
        $sr = new ServiceRequest('p1', 'b1', 'g1', ServiceRequestCategory::MAINTENANCE, 'Fix AC', 't1');
        $sr->setDescription('AC is not cooling properly');
        $sr->setPriority(1);
        $sr->onPrePersist();
        $arr = $sr->toArray();
        $this->assertEquals('maintenance', $arr['category']);
        $this->assertEquals('Maintenance', $arr['category_label']);
        $this->assertEquals('🔧', $arr['category_icon']);
        $this->assertEquals('pending', $arr['status']);
        $this->assertEquals(1, $arr['priority']);
    }

    // ─── ChatMessage ────────────────────────────────────────────

    public function testChatMessageCreation(): void
    {
        $cm = new ChatMessage('b1', 'p1', 'guest', 'g1', 'John Doe', 'Hello, I need help', 't1');
        $this->assertEquals('guest', $cm->getSenderType());
        $this->assertEquals('Hello, I need help', $cm->getMessage());
        $this->assertFalse($cm->isRead());
    }

    public function testChatMessageWithImage(): void
    {
        $cm = new ChatMessage('b1', 'p1', 'staff', 's1', 'Manager', 'Here is the menu', 't1');
        $cm->setImageUrl('https://example.com/menu.jpg');
        $this->assertEquals('https://example.com/menu.jpg', $cm->getImageUrl());
    }

    public function testChatMessageMarkRead(): void
    {
        $cm = new ChatMessage('b1', 'p1', 'guest', 'g1', 'Guest', 'Message', 't1');
        $cm->markRead();
        $this->assertTrue($cm->isRead());
        $this->assertNotNull($cm->getReadAt());
    }

    public function testChatMessageToArray(): void
    {
        $cm = new ChatMessage('b1', 'p1', 'guest', 'g1', 'Jane', 'Hi there', 't1');
        $cm->onPrePersist();
        $arr = $cm->toArray();
        $this->assertEquals('guest', $arr['sender_type']);
        $this->assertEquals('Jane', $arr['sender_name']);
        $this->assertEquals('text', $arr['message_type']);
    }

    // ─── Notification ───────────────────────────────────────────

    public function testNotificationCreation(): void
    {
        $n = new Notification('p1', 'staff', 'u1', 'service_request', 'New request from Room 101', 't1');
        $this->assertEquals('staff', $n->getRecipientType());
        $this->assertEquals('service_request', $n->getChannel());
        $this->assertFalse($n->isRead());
    }

    public function testNotificationMarkRead(): void
    {
        $n = new Notification('p1', 'guest', 'g1', 'chat', 'New message', 't1');
        $n->markRead();
        $this->assertTrue($n->isRead());
    }

    public function testNotificationWithData(): void
    {
        $n = new Notification('p1', 'staff', 'u1', 'service_request', 'Urgent request', 't1');
        $n->setBody('AC broken in Room 305');
        $n->setData(['request_id' => 'sr-123', 'room' => '305']);
        $this->assertEquals('sr-123', $n->getData()['request_id']);
    }

    public function testNotificationToArray(): void
    {
        $n = new Notification('p1', 'staff', 'u1', 'chat', 'New chat', 't1');
        $n->setBody('Guest in 201 needs help');
        $n->onPrePersist();
        $arr = $n->toArray();
        $this->assertArrayHasKey('channel', $arr);
        $this->assertArrayHasKey('is_read', $arr);
        $this->assertFalse($arr['is_read']);
    }

    // ─── DeviceToken ────────────────────────────────────────────

    public function testDeviceTokenCreation(): void
    {
        $dt = new DeviceToken('staff', 'u1', 'fcm_token_abc123', 'android', 't1');
        $this->assertEquals('staff', $dt->getOwnerType());
        $this->assertEquals('android', $dt->getPlatform());
        $this->assertTrue($dt->isActive());
    }

    public function testDeviceTokenMarkUsed(): void
    {
        $dt = new DeviceToken('guest', 'g1', 'fcm_xyz', 'ios', 't1');
        $dt->markUsed();
        $dt->onPrePersist();
        $this->assertNotNull($dt->toArray()['last_used_at']);
    }

    public function testDeviceTokenDeactivate(): void
    {
        $dt = new DeviceToken('staff', 'u1', 'fcm_old', 'web', 't1');
        $dt->setIsActive(false);
        $this->assertFalse($dt->isActive());
    }

    // ─── Enums ──────────────────────────────────────────────────

    public function testServiceRequestStatusEnum(): void
    {
        $this->assertCount(5, ServiceRequestStatus::values());
        $this->assertEquals('Pending', ServiceRequestStatus::PENDING->label());
        $this->assertEquals('#22c55e', ServiceRequestStatus::COMPLETED->color());
    }

    public function testServiceRequestCategoryEnum(): void
    {
        $this->assertCount(8, ServiceRequestCategory::values());
        $this->assertEquals('Room Service', ServiceRequestCategory::ROOM_SERVICE->label());
        $this->assertEquals('🛎️', ServiceRequestCategory::ROOM_SERVICE->icon());
        $this->assertEquals('🧹', ServiceRequestCategory::HOUSEKEEPING->icon());
    }
}

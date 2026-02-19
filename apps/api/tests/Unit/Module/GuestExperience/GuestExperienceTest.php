<?php

declare(strict_types=1);

namespace Lodgik\Tests\Unit\Module\GuestExperience;

use Lodgik\Entity\GuestAccessCode;
use Lodgik\Entity\GuestSession;
use Lodgik\Entity\TabletDevice;
use Lodgik\Entity\ServiceRequest;
use Lodgik\Entity\ChatMessage;
use Lodgik\Enum\ServiceRequestStatus;
use Lodgik\Enum\ServiceRequestCategory;
use PHPUnit\Framework\TestCase;

final class GuestExperienceTest extends TestCase
{
    // === GuestAccessCode ===

    public function testAccessCodeCreation(): void
    {
        $ac = new GuestAccessCode('b1', 'g1', 'p1', '123456', new \DateTimeImmutable('+1 day'), 't1');
        $this->assertEquals('123456', $ac->getCode());
        $this->assertTrue($ac->isActive());
        $this->assertFalse($ac->isExpired());
    }

    public function testAccessCodeExpiry(): void
    {
        $ac = new GuestAccessCode('b1', 'g1', 'p1', '654321', new \DateTimeImmutable('-1 hour'), 't1');
        $this->assertTrue($ac->isExpired());
    }

    public function testAccessCodeDeactivation(): void
    {
        $ac = new GuestAccessCode('b1', 'g1', 'p1', '111222', new \DateTimeImmutable('+1 day'), 't1');
        $ac->deactivate();
        $this->assertTrue($ac->isExpired());
    }

    public function testAccessCodeToArray(): void
    {
        $ac = new GuestAccessCode('b1', 'g1', 'p1', '999888', new \DateTimeImmutable('+1 day'), 't1');
        $ac->onPrePersist();
        $arr = $ac->toArray();
        $this->assertEquals('999888', $arr['code']);
        $this->assertTrue($arr['is_active']);
    }

    // === GuestSession ===

    public function testSessionCreation(): void
    {
        $gs = new GuestSession('g1', 'b1', 'p1', 'tok-abc', 'otp', new \DateTimeImmutable('+24 hours'), 't1');
        $this->assertEquals('tok-abc', $gs->getToken());
        $this->assertEquals('otp', $gs->getAuthMethod());
        $this->assertFalse($gs->isExpired());
    }

    public function testSessionExpiry(): void
    {
        $gs = new GuestSession('g1', 'b1', 'p1', 'tok-old', 'access_code', new \DateTimeImmutable('-1 hour'), 't1');
        $this->assertTrue($gs->isExpired());
    }

    public function testSessionInvalidation(): void
    {
        $gs = new GuestSession('g1', 'b1', 'p1', 'tok-inv', 'tablet', new \DateTimeImmutable('+24 hours'), 't1');
        $gs->invalidate();
        $this->assertFalse($gs->isActive());
    }

    public function testSessionTouch(): void
    {
        $gs = new GuestSession('g1', 'b1', 'p1', 'tok-t', 'otp', new \DateTimeImmutable('+24 hours'), 't1');
        $gs->touch();
        $this->assertNotNull($gs->getLastActivityAt());
    }

    // === TabletDevice ===

    public function testTabletCreation(): void
    {
        $td = new TabletDevice('p1', 'r101', 'Room 101 Tablet', 'dev-token-abc', 't1');
        $this->assertEquals('Room 101 Tablet', $td->getName());
        $this->assertTrue($td->isActive());
        $this->assertNull($td->getCurrentBookingId());
    }

    public function testTabletBinding(): void
    {
        $td = new TabletDevice('p1', 'r101', 'Room 101', 'dev-token', 't1');
        $td->bindToBooking('b1', 'g1');
        $this->assertEquals('b1', $td->getCurrentBookingId());
        $this->assertEquals('g1', $td->getCurrentGuestId());
    }

    public function testTabletUnbind(): void
    {
        $td = new TabletDevice('p1', 'r101', 'Room 101', 'dev-token', 't1');
        $td->bindToBooking('b1', 'g1');
        $td->unbind();
        $this->assertNull($td->getCurrentBookingId());
    }

    public function testTabletPing(): void
    {
        $td = new TabletDevice('p1', 'r101', 'T', 'dev-token', 't1');
        $td->ping();
        $this->assertNotNull($td->getLastPingAt());
    }

    // === ServiceRequest ===

    public function testServiceRequestCreation(): void
    {
        $sr = new ServiceRequest('p1', 'b1', 'g1', ServiceRequestCategory::ROOM_SERVICE, 'Extra towels', 't1');
        $this->assertEquals(ServiceRequestStatus::PENDING, $sr->getStatus());
        $this->assertEquals(ServiceRequestCategory::ROOM_SERVICE, $sr->getCategory());
        $this->assertEquals('Extra towels', $sr->getTitle());
        $this->assertEquals(2, $sr->getPriority());
    }

    public function testServiceRequestWorkflow(): void
    {
        $sr = new ServiceRequest('p1', 'b1', 'g1', ServiceRequestCategory::HOUSEKEEPING, 'Clean room', 't1');
        $sr->acknowledge('staff-1');
        $this->assertEquals(ServiceRequestStatus::ACKNOWLEDGED, $sr->getStatus());
        $this->assertNotNull($sr->getAcknowledgedAt());
        $this->assertEquals('staff-1', $sr->getAssignedTo());

        $sr->startProgress();
        $this->assertEquals(ServiceRequestStatus::IN_PROGRESS, $sr->getStatus());

        $sr->complete('Room cleaned');
        $this->assertEquals(ServiceRequestStatus::COMPLETED, $sr->getStatus());
        $this->assertNotNull($sr->getCompletedAt());
    }

    public function testServiceRequestRating(): void
    {
        $sr = new ServiceRequest('p1', 'b1', 'g1', ServiceRequestCategory::FOOD, 'Dinner', 't1');
        $sr->complete();
        $sr->rate(5, 'Excellent service!');
        $this->assertEquals(5, $sr->getGuestRating());
        $this->assertEquals('Excellent service!', $sr->getGuestFeedback());
    }

    public function testServiceRequestRatingClamp(): void
    {
        $sr = new ServiceRequest('p1', 'b1', 'g1', ServiceRequestCategory::OTHER, 'Test', 't1');
        $sr->rate(10);
        $this->assertEquals(5, $sr->getGuestRating());
        $sr->rate(-1);
        $this->assertEquals(1, $sr->getGuestRating());
    }

    public function testServiceRequestCancel(): void
    {
        $sr = new ServiceRequest('p1', 'b1', 'g1', ServiceRequestCategory::LAUNDRY, 'Laundry', 't1');
        $sr->cancel();
        $this->assertEquals(ServiceRequestStatus::CANCELLED, $sr->getStatus());
    }

    public function testServiceRequestToArray(): void
    {
        $sr = new ServiceRequest('p1', 'b1', 'g1', ServiceRequestCategory::MAINTENANCE, 'Fix AC', 't1');
        $sr->setPriority(3);
        $sr->onPrePersist();
        $arr = $sr->toArray();
        $this->assertEquals('maintenance', $arr['category']);
        $this->assertEquals('Maintenance', $arr['category_label']);
        $this->assertEquals('pending', $arr['status']);
        $this->assertEquals('High', $arr['priority_label']);
    }

    // === ChatMessage ===

    public function testChatMessageCreation(): void
    {
        $msg = new ChatMessage('b1', 'p1', 'guest', 'g1', 'John Doe', 'Hello, need help', 't1');
        $this->assertEquals('guest', $msg->getSenderType());
        $this->assertEquals('Hello, need help', $msg->getMessage());
        $this->assertFalse($msg->isRead());
        $this->assertEquals('text', $msg->getMessageType());
    }

    public function testChatMessageImage(): void
    {
        $msg = new ChatMessage('b1', 'p1', 'guest', 'g1', 'John', 'Photo', 't1');
        $msg->setMessageType('image');
        $msg->setImageUrl('https://cdn.example.com/photo.jpg');
        $this->assertEquals('image', $msg->getMessageType());
        $this->assertNotNull($msg->getImageUrl());
    }

    public function testChatMessageMarkRead(): void
    {
        $msg = new ChatMessage('b1', 'p1', 'staff', 's1', 'Reception', 'Welcome!', 't1');
        $msg->markRead();
        $this->assertTrue($msg->isRead());
        $this->assertNotNull($msg->getReadAt());
    }

    public function testChatMessageToArray(): void
    {
        $msg = new ChatMessage('b1', 'p1', 'guest', 'g1', 'Jane', 'Testing', 't1');
        $msg->onPrePersist();
        $arr = $msg->toArray();
        $this->assertEquals('guest', $arr['sender_type']);
        $this->assertEquals('Jane', $arr['sender_name']);
        $this->assertFalse($arr['is_read']);
    }

    // === Enums ===

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
        $this->assertNotEmpty(ServiceRequestCategory::FOOD->icon());
    }
}

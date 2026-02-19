<?php

declare(strict_types=1);

namespace Lodgik\Tests\Unit\Module\Phase4DE;

use Lodgik\Entity\Notification;
use Lodgik\Entity\DeviceToken;
use Lodgik\Service\FcmService;
use PHPUnit\Framework\TestCase;
use Psr\Log\NullLogger;

/**
 * Phase 4D+4E: Notifications, Device Tokens, FCM, Integration Tests
 */
final class Phase4DETest extends TestCase
{
    // ─── Notification Entity ────────────────────────────────────

    public function testNotificationCreation(): void
    {
        $n = new Notification('prop-1', 'staff', 'user-1', 'service_request', 'New request', 'tenant-1');
        $this->assertNotEmpty($n->getId());
        $this->assertSame('prop-1', $n->getPropertyId());
        $this->assertSame('staff', $n->getRecipientType());
        $this->assertSame('user-1', $n->getRecipientId());
        $this->assertSame('service_request', $n->getChannel());
        $this->assertSame('New request', $n->getTitle());
        $this->assertNull($n->getBody());
        $this->assertNull($n->getData());
        $this->assertFalse($n->isRead());
        $this->assertFalse($n->isPushSent());
    }

    public function testNotificationWithBodyAndData(): void
    {
        $n = new Notification('prop-1', 'guest', 'guest-1', 'chat', 'New message', 'tenant-1');
        $n->setBody('You have a message from reception');
        $n->setData(['booking_id' => 'bk-1', 'type' => 'chat']);

        $this->assertSame('You have a message from reception', $n->getBody());
        $this->assertSame(['booking_id' => 'bk-1', 'type' => 'chat'], $n->getData());
    }

    public function testNotificationMarkRead(): void
    {
        $n = new Notification('prop-1', 'staff', 'user-1', 'service_request', 'Test', 'tenant-1');
        $this->assertFalse($n->isRead());

        $n->markRead();
        $this->assertTrue($n->isRead());
    }

    public function testNotificationPushSent(): void
    {
        $n = new Notification('prop-1', 'staff', 'all', 'chat', 'New chat', 'tenant-1');
        $this->assertFalse($n->isPushSent());

        $n->setPushSent(true);
        $this->assertTrue($n->isPushSent());
    }

    public function testNotificationToArray(): void
    {
        $n = new Notification('prop-1', 'staff', 'user-1', 'service_request', 'Room Service Request', 'tenant-1');
        $n->setBody('Guest needs extra towels');
        $n->setData(['room' => '101']);
        $n->onPrePersist(); // Initialize timestamps

        $arr = $n->toArray();
        $this->assertSame('prop-1', $arr['property_id']);
        $this->assertSame('staff', $arr['recipient_type']);
        $this->assertSame('user-1', $arr['recipient_id']);
        $this->assertSame('service_request', $arr['channel']);
        $this->assertSame('Room Service Request', $arr['title']);
        $this->assertSame('Guest needs extra towels', $arr['body']);
        $this->assertSame(['room' => '101'], $arr['data']);
        $this->assertFalse($arr['is_read']);
        $this->assertNull($arr['read_at']);
        $this->assertFalse($arr['push_sent']);
        $this->assertArrayHasKey('id', $arr);
        $this->assertArrayHasKey('created_at', $arr);
    }

    public function testNotificationChannelTypes(): void
    {
        $channels = ['service_request', 'chat', 'booking', 'payment', 'system'];
        foreach ($channels as $ch) {
            $n = new Notification('p', 'staff', 'u', $ch, "Test {$ch}", 't');
            $this->assertSame($ch, $n->getChannel());
        }
    }

    public function testNotificationRecipientTypes(): void
    {
        $staff = new Notification('p', 'staff', 'staff-1', 'chat', 'Test', 't');
        $this->assertSame('staff', $staff->getRecipientType());

        $guest = new Notification('p', 'guest', 'guest-1', 'chat', 'Test', 't');
        $this->assertSame('guest', $guest->getRecipientType());
    }

    // ─── DeviceToken Entity ─────────────────────────────────────

    public function testDeviceTokenCreation(): void
    {
        $dt = new DeviceToken('staff', 'user-1', 'fcm_abc123', 'android', 'tenant-1');
        $this->assertNotEmpty($dt->getId());
        $this->assertSame('staff', $dt->getOwnerType());
        $this->assertSame('user-1', $dt->getOwnerId());
        $this->assertSame('fcm_abc123', $dt->getToken());
        $this->assertSame('android', $dt->getPlatform());
        $this->assertTrue($dt->isActive());
    }

    public function testDeviceTokenPlatforms(): void
    {
        $platforms = ['android', 'ios', 'web'];
        foreach ($platforms as $p) {
            $dt = new DeviceToken('staff', 'u', 'tok', $p, 't');
            $this->assertSame($p, $dt->getPlatform());
        }
    }

    public function testDeviceTokenGuestOwner(): void
    {
        $dt = new DeviceToken('guest', 'guest-1', 'fcm_guest_tok', 'ios', 'tenant-1');
        $this->assertSame('guest', $dt->getOwnerType());
        $this->assertSame('guest-1', $dt->getOwnerId());
    }

    public function testDeviceTokenDeactivate(): void
    {
        $dt = new DeviceToken('staff', 'user-1', 'fcm_tok', 'android', 'tenant-1');
        $this->assertTrue($dt->isActive());

        $dt->setIsActive(false);
        $this->assertFalse($dt->isActive());
    }

    public function testDeviceTokenMarkUsed(): void
    {
        $dt = new DeviceToken('staff', 'user-1', 'fcm_tok', 'web', 'tenant-1');
        $dt->markUsed();
        // markUsed just updates timestamp, no assertion on timestamp but verify no crash
        $this->assertTrue($dt->isActive());
    }

    public function testDeviceTokenToArray(): void
    {
        $dt = new DeviceToken('staff', 'user-1', 'fcm_secret_token', 'ios', 'tenant-1');
        $dt->onPrePersist(); // Initialize timestamps

        $arr = $dt->toArray();

        $this->assertSame('staff', $arr['owner_type']);
        $this->assertSame('user-1', $arr['owner_id']);
        $this->assertSame('ios', $arr['platform']);
        $this->assertTrue($arr['is_active']);
        $this->assertArrayHasKey('id', $arr);
        // Token should NOT be in toArray for security
        $this->assertArrayNotHasKey('token', $arr);
    }

    // ─── FcmService ─────────────────────────────────────────────

    public function testFcmServiceDisabledByDefault(): void
    {
        $fcm = new FcmService(new NullLogger(), '', '');
        $this->assertFalse($fcm->isEnabled());
    }

    public function testFcmServiceDevModeSend(): void
    {
        $fcm = new FcmService(new NullLogger(), '', '');
        // Should return false (not enabled) but not crash
        $result = $fcm->sendToToken('fake_token', 'Test Title', 'Test Body');
        $this->assertFalse($result);
    }

    public function testFcmServiceSendToMultipleTokensDev(): void
    {
        $fcm = new FcmService(new NullLogger(), '', '');
        $result = $fcm->sendToTokens(['tok1', 'tok2', 'tok3'], 'Title', 'Body', ['key' => 'val']);
        $this->assertSame(0, $result);
    }

    public function testFcmServiceWithInvalidServiceAccount(): void
    {
        $fcm = new FcmService(new NullLogger(), 'my-project', '{"invalid": "json"}');
        // serviceAccount missing private_key/client_email → not enabled
        $this->assertFalse($fcm->isEnabled());
    }

    public function testFcmServiceWithValidStructure(): void
    {
        // Construct a fake service account with proper structure (won't actually authenticate)
        $fakeAccount = json_encode([
            'type' => 'service_account',
            'project_id' => 'test-project',
            'private_key' => "-----BEGIN RSA PRIVATE KEY-----\nMIIBogIBAAJBALRiMLAHudeSA/x3hB2f+2NRkJbFRVwAIgFvNOqGvWMVAFjHi5Dy\nmFBtiAFwHMWWtHlRaLhsP0OpS+U1DhdpzjcCAwEAAQJBAJN5SgIt31D4UDYJ+EDU\nKELVTxAbfRvjHZJB2b3MkuRiyKVCLFKxBc+GixEtaPh/AuU3bJH/QLhCTGJO6jVa\nCkECIQDorNwJ0dIHiJl0D1CgxB7CgXPa3YL/FBs4k/+RXOS8IQIhAMTxhRpMoXvD\nE+vJC9WCz6KgqLdykE2bfjEd7CPgzcj3AiEAyI3tKjzuLRSrZwt+rDPLt3aZ+hE+\ndwm3m6s1PPT5WYECIHsFLzLO/e/hADcH4bh6cTwdfsUH0/J0JSi+FxI17vDDAiEA\nnR/LhJVjns1qN6pCwsn29TQFJ1k0rr/3hZNPvw67rPE=\n-----END RSA PRIVATE KEY-----",
            'client_email' => 'test@test-project.iam.gserviceaccount.com',
        ]);
        $fcm = new FcmService(new NullLogger(), 'test-project', $fakeAccount);
        $this->assertTrue($fcm->isEnabled());
    }

    // ─── Notification Workflow ───────────────────────────────────

    public function testNotificationLifecycle(): void
    {
        // Create
        $n = new Notification('prop-1', 'staff', 'user-1', 'service_request', '🛎️ Room cleaning from John (Room 101)', 'tenant-1');
        $n->setBody('New service request requires attention.');
        $n->setData(['request_id' => 'sr-1', 'category' => 'housekeeping']);
        $this->assertFalse($n->isRead());
        $this->assertFalse($n->isPushSent());

        // Push sent
        $n->setPushSent(true);
        $this->assertTrue($n->isPushSent());
        $this->assertFalse($n->isRead());

        // Read
        $n->markRead();
        $this->assertTrue($n->isRead());
        $this->assertTrue($n->isPushSent());
    }

    public function testMultipleNotificationsForRecipient(): void
    {
        $notifications = [];
        for ($i = 0; $i < 5; $i++) {
            $n = new Notification('prop-1', 'staff', 'user-1', 'service_request', "Request #{$i}", 'tenant-1');
            $notifications[] = $n;
        }

        $this->assertCount(5, $notifications);
        $this->assertSame('Request #0', $notifications[0]->getTitle());
        $this->assertSame('Request #4', $notifications[4]->getTitle());

        // Mark some as read
        $notifications[0]->markRead();
        $notifications[2]->markRead();

        $unread = array_filter($notifications, fn($n) => !$n->isRead());
        $this->assertCount(3, $unread);
    }

    public function testDeviceTokenMultiplePlatforms(): void
    {
        $tokens = [
            new DeviceToken('staff', 'user-1', 'android_tok', 'android', 'tenant-1'),
            new DeviceToken('staff', 'user-1', 'ios_tok', 'ios', 'tenant-1'),
            new DeviceToken('staff', 'user-1', 'web_tok', 'web', 'tenant-1'),
        ];

        $this->assertCount(3, $tokens);
        $this->assertSame('android', $tokens[0]->getPlatform());
        $this->assertSame('ios', $tokens[1]->getPlatform());
        $this->assertSame('web', $tokens[2]->getPlatform());

        // All same owner
        foreach ($tokens as $dt) {
            $this->assertSame('user-1', $dt->getOwnerId());
            $this->assertTrue($dt->isActive());
        }
    }

    public function testNotificationBroadcastRecipient(): void
    {
        // 'all' is used for broadcast to all staff
        $n = new Notification('prop-1', 'staff', 'all', 'service_request', 'Broadcast alert', 'tenant-1');
        $this->assertSame('all', $n->getRecipientId());
    }

    // ─── Integration: Notification Channels ─────────────────────

    public function testServiceRequestNotificationFormat(): void
    {
        $title = "🛎️ Extra towels from Adeola (Room 205)";
        $n = new Notification('prop-1', 'staff', 'all', 'service_request', $title, 'tenant-1');
        $n->setBody("New service request requires attention.");
        $n->onPrePersist();

        $arr = $n->toArray();
        $this->assertStringContainsString('🛎️', $arr['title']);
        $this->assertSame('service_request', $arr['channel']);
    }

    public function testChatNotificationFormat(): void
    {
        $title = "💬 New message from Chidera (Room 103)";
        $n = new Notification('prop-1', 'staff', 'all', 'chat', $title, 'tenant-1');
        $n->onPrePersist();

        $arr = $n->toArray();
        $this->assertStringContainsString('💬', $arr['title']);
        $this->assertSame('chat', $arr['channel']);
    }

    public function testNotificationDataPayload(): void
    {
        $n = new Notification('prop-1', 'guest', 'guest-1', 'booking', 'Checkout Reminder', 'tenant-1');
        $n->setData([
            'booking_id' => 'bk-123',
            'action' => 'checkout_reminder',
            'checkout_time' => '12:00',
        ]);

        $data = $n->getData();
        $this->assertSame('bk-123', $data['booking_id']);
        $this->assertSame('checkout_reminder', $data['action']);
        $this->assertSame('12:00', $data['checkout_time']);
    }
}

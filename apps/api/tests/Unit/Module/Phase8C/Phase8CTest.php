<?php
declare(strict_types=1);
namespace Lodgik\Tests\Unit\Module\Phase8C;
use Lodgik\Entity\{WhatsAppMessage, WhatsAppTemplate};
use Lodgik\Module\WhatsApp\TermiiClient;
use PHPUnit\Framework\TestCase;

final class Phase8CTest extends TestCase
{
    // ─── WhatsAppMessage ──────────────────────────────────────
    public function testMessageCreation(): void
    {
        $m = new WhatsAppMessage('p', 'outbound', '+2348012345678', 'booking_confirmation', 'Hello!', 't');
        $this->assertSame('pending', $m->getStatus());
        $this->assertSame('+2348012345678', $m->getRecipientPhone());
        $this->assertSame('booking_confirmation', $m->getMessageType());
    }

    public function testMessageMarkSent(): void
    {
        $m = new WhatsAppMessage('p', 'outbound', '234801', 'custom', 'Hi', 't');
        $m->markSent('msg-123');
        $this->assertSame('sent', $m->getStatus());
        $this->assertSame('msg-123', $m->getProviderMessageId());
    }

    public function testMessageDeliveryLifecycle(): void
    {
        $m = new WhatsAppMessage('p', 'outbound', '234801', 'check_in_welcome', 'Welcome!', 't');
        $m->markSent('msg-456');
        $this->assertSame('sent', $m->getStatus());
        $m->markDelivered();
        $this->assertSame('delivered', $m->getStatus());
        $m->markRead();
        $this->assertSame('read', $m->getStatus());
    }

    public function testMessageMarkFailed(): void
    {
        $m = new WhatsAppMessage('p', 'outbound', '234801', 'otp', 'OTP', 't');
        $m->markFailed('Invalid phone number');
        $this->assertSame('failed', $m->getStatus());
    }

    public function testMessageToArray(): void
    {
        $m = new WhatsAppMessage('p', 'outbound', '+234801', 'visitor_code', 'Your code is 1234', 't');
        $m->setRecipientName('Ade');
        $m->setBookingId('bk1');
        $m->setGuestId('g1');
        $m->setCost('250');
        $m->onPrePersist();
        $a = $m->toArray();
        $this->assertSame('Ade', $a['recipient_name']);
        $this->assertSame('bk1', $a['booking_id']);
        $this->assertSame('250', $a['cost']);
        $this->assertSame('pending', $a['status']);
    }

    // ─── WhatsAppTemplate ─────────────────────────────────────
    public function testTemplateCreation(): void
    {
        $t = new WhatsAppTemplate('Booking Confirm', 'booking_confirmation', 'Hello {{guest_name}}! Room: {{room_number}}', ['guest_name', 'room_number'], 't');
        $this->assertSame('Booking Confirm', $t->getName());
        $this->assertTrue($t->isActive());
        $this->assertCount(2, $t->getParamNames());
    }

    public function testTemplateRender(): void
    {
        $t = new WhatsAppTemplate('Welcome', 'check_in_welcome', 'Welcome {{guest_name}} to {{hotel_name}}! Room: {{room_number}}', ['guest_name', 'hotel_name', 'room_number'], 't');
        $rendered = $t->render(['guest_name' => 'Sodiq', 'hotel_name' => 'Eko Hotels', 'room_number' => '305']);
        $this->assertSame('Welcome Sodiq to Eko Hotels! Room: 305', $rendered);
    }

    public function testTemplateRenderWithMissingParam(): void
    {
        $t = new WhatsAppTemplate('Test', 'custom', 'Hi {{name}}, code: {{code}}', ['name', 'code'], 't');
        $rendered = $t->render(['name' => 'Guest']);
        $this->assertSame('Hi Guest, code: ', $rendered);
    }

    public function testTemplateDeactivation(): void
    {
        $t = new WhatsAppTemplate('Old', 'custom', 'body', [], 't');
        $t->setIsActive(false);
        $this->assertFalse($t->isActive());
    }

    public function testTemplateUpdate(): void
    {
        $t = new WhatsAppTemplate('V1', 'reminder', 'Old body', ['param1'], 't');
        $t->setName('V2');
        $t->setBody('New body with {{param1}} and {{param2}}');
        $t->setParamNames(['param1', 'param2']);
        $t->setLanguage('fr');
        $a = $t->toArray();
        $this->assertSame('V2', $a['name']);
        $this->assertSame('fr', $a['language']);
        $this->assertCount(2, $a['param_names']);
    }

    // ─── TermiiClient Phone Normalization ─────────────────────
    public function testTermiiClientExists(): void
    {
        $client = new TermiiClient('test_api_key', 'TestSender');
        $this->assertInstanceOf(TermiiClient::class, $client);
    }
}

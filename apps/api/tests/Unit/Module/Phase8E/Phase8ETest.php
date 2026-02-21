<?php
declare(strict_types=1);
namespace Lodgik\Tests\Unit\Module\Phase8E;
use Lodgik\Entity\{OtaChannel, OtaReservation, SpaService as SpaServiceEntity, SpaBooking, PoolAccessLog, IoTDevice, IoTAutomation};
use PHPUnit\Framework\TestCase;

final class Phase8ETest extends TestCase
{
    // OTA
    public function testOtaChannelCreation(): void
    { $c = new OtaChannel('p1', 'booking_com', 'Booking.com', 't'); $this->assertSame('disconnected', $c->getSyncStatus());
      $c->activate(); $this->assertSame('active', $c->getSyncStatus()); }

    public function testOtaChannelLifecycle(): void
    { $c = new OtaChannel('p1', 'expedia', 'Expedia', 't'); $c->activate(); $c->pause(); $this->assertSame('paused', $c->getSyncStatus());
      $c->markSynced(); $c->disconnect(); $this->assertSame('disconnected', $c->getSyncStatus()); }

    public function testOtaReservationCreation(): void
    { $r = new OtaReservation('ch1', 'booking_com', 'BDC-123456', 'John Smith', new \DateTimeImmutable('2026-03-01'), new \DateTimeImmutable('2026-03-05'), '5000000', 't');
      $this->assertSame('pending', $r->getSyncStatus()); $this->assertSame('BDC-123456', $r->getExternalId()); }

    public function testOtaReservationConfirmCancel(): void
    { $r = new OtaReservation('ch1', 'expedia', 'EXP-789', 'Jane Doe', new \DateTimeImmutable('2026-04-01'), new \DateTimeImmutable('2026-04-03'), '3000000', 't');
      $r->confirm(); $this->assertSame('confirmed', $r->getSyncStatus()); $r->setBookingId('bk-local'); $r->setCommission('450000');
      $arr = $r->toArray(); $this->assertSame('bk-local', $arr['booking_id']); $this->assertSame('450000', $arr['commission']); }

    // Spa
    public function testSpaServiceCreation(): void
    { $s = new SpaServiceEntity('p1', 'Deep Tissue Massage', 'massage', 60, '2500000', 't'); $s->setDescription('Full body deep tissue'); $this->assertSame('Deep Tissue Massage', $s->getName()); }

    public function testSpaBookingLifecycle(): void
    { $b = new SpaBooking('p1', 's1', 'Hot Stone', 'g1', 'Guest', new \DateTimeImmutable('2026-03-10'), '14:00', '3000000', 't');
      $b->setTherapistName('Amina'); $this->assertSame('booked', $b->getStatus());
      $b->start(); $this->assertSame('in_progress', $b->getStatus());
      $b->complete(); $this->assertSame('completed', $b->getStatus()); }

    public function testSpaBookingCancel(): void
    { $b = new SpaBooking('p1', 's1', 'Facial', 'g1', 'Guest', new \DateTimeImmutable('2026-03-11'), '10:00', '1500000', 't');
      $b->cancel(); $this->assertSame('cancelled', $b->getStatus()); }

    // Pool
    public function testPoolAccessLog(): void
    { $p = new PoolAccessLog('p1', 'g1', 'Guest', new \DateTimeImmutable('2026-03-10'), '09:00', 't'); $p->setArea('rooftop_pool');
      $arr = $p->toArray(); $this->assertSame('rooftop_pool', $arr['area']); $this->assertSame('09:00', $arr['check_in_time']); $this->assertNull($arr['check_out_time']);
      $p->checkOut('11:30'); $this->assertSame('11:30', $p->toArray()['check_out_time']); }

    // IoT
    public function testIoTDeviceCreation(): void
    { $d = new IoTDevice('p1', 'ac', 'Room 101 AC', 't'); $d->setRoomId('r101'); $d->setRoomNumber('101'); $d->setMqttTopic('hotel/rooms/101/ac');
      $this->assertSame('offline', $d->toArray()['status']); }

    public function testIoTDeviceStateUpdate(): void
    { $d = new IoTDevice('p1', 'light', 'Room 205 Lights', 't');
      $d->updateState(['power' => 'on', 'brightness' => 80]); $arr = $d->toArray();
      $this->assertSame('online', $arr['status']); $this->assertSame(80, $arr['current_state']['brightness']); $this->assertNotNull($arr['last_seen']); }

    public function testIoTDeviceEnergy(): void
    { $d = new IoTDevice('p1', 'ac', 'AC Unit', 't'); $d->addEnergy('2.5'); $d->addEnergy('1.3');
      $this->assertSame('3.8', $d->toArray()['energy_kwh']); }

    public function testIoTAutomationCreation(): void
    { $a = new IoTAutomation('p1', 'Welcome Lights', 'check_in', ['room_scope' => 'assigned'], [['device_type' => 'light', 'action' => 'on'], ['device_type' => 'ac', 'action' => 'set_temp', 'params' => ['temp' => 22]]], 't');
      $this->assertSame('check_in', $a->getTriggerType()); $this->assertCount(2, $a->getActions()); $this->assertTrue($a->isActive()); }

    public function testIoTAutomationToggle(): void
    { $a = new IoTAutomation('p1', 'Checkout Off', 'check_out', [], [['device_type' => 'all', 'action' => 'off']], 't');
      $a->setIsActive(false); $this->assertFalse($a->isActive()); }
}

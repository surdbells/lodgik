<?php
declare(strict_types=1);
namespace Lodgik\Tests\Unit\Module\Phase7;
use Lodgik\Entity\VisitorAccessCode;
use Lodgik\Entity\AmenityVoucher;
use Lodgik\Entity\GatePass;
use Lodgik\Entity\GuestMovement;
use Lodgik\Entity\RoomControlRequest;
use Lodgik\Entity\WaitlistEntry;
use Lodgik\Entity\ChargeTransfer;
use PHPUnit\Framework\TestCase;

final class Phase7Test extends TestCase
{
    public function testVisitorCodeCreation(): void
    {
        $vc = new VisitorAccessCode('bk1', 'p1', 'g1', 'John V', new \DateTimeImmutable('-1 hour'), new \DateTimeImmutable('+4 hours'), 't');
        $this->assertSame('John V', $vc->getVisitorName());
        $this->assertSame(8, strlen($vc->getCode()));
        $this->assertSame('active', $vc->getStatus());
        $this->assertTrue($vc->isValid());
    }
    public function testVisitorCodeRevoke(): void
    {
        $vc = new VisitorAccessCode('bk1', 'p', 'g1', 'J', new \DateTimeImmutable('-1 hour'), new \DateTimeImmutable('+2 hours'), 't');
        $vc->revoke();
        $this->assertFalse($vc->isValid());
    }
    public function testVisitorCodeCheckInOut(): void
    {
        $vc = new VisitorAccessCode('bk1', 'p', 'g1', 'B', new \DateTimeImmutable('-1 hour'), new \DateTimeImmutable('+3 hours'), 't');
        $vc->setVisitorPhone('+234801234'); $vc->setPurpose('Meeting'); $vc->setRoomNumber('305');
        $vc->checkIn();
        $this->assertSame('used', $vc->getStatus());
        $vc->checkOut();
        $this->assertNotNull($vc->getCheckedOutAt());
    }
    public function testVisitorCodeExpired(): void
    {
        $vc = new VisitorAccessCode('bk1', 'p', 'g1', 'X', new \DateTimeImmutable('-4 hours'), new \DateTimeImmutable('-1 hour'), 't');
        $this->assertFalse($vc->isValid());
    }
    public function testVisitorCodeToArray(): void
    {
        $vc = new VisitorAccessCode('bk1', 'p', 'g1', 'T', new \DateTimeImmutable(), new \DateTimeImmutable('+2 hours'), 't');
        $vc->onPrePersist();
        $this->assertSame('active', $vc->toArray()['status']);
    }
    public function testVoucherCreation(): void
    {
        $v = new AmenityVoucher('bk1', 'p', 'g1', 'gym', 'Gym', new \DateTimeImmutable('today'), 't');
        $this->assertStringStartsWith('V', $v->getCode());
        $this->assertSame(10, strlen($v->getCode()));
    }
    public function testVoucherRedeem(): void
    {
        $v = new AmenityVoucher('bk1', 'p', 'g1', 'pool', 'Pool', new \DateTimeImmutable('today'), 't');
        $v->redeem();
        $this->assertSame('used', $v->getStatus());
        $this->assertFalse($v->canRedeem());
    }
    public function testVoucherMultiUse(): void
    {
        $v = new AmenityVoucher('bk1', 'p', 'g1', 'spa', 'Spa', new \DateTimeImmutable('today'), 't');
        $v->setMaxUses(3); $v->setNotes('VIP');
        $v->redeem(); $this->assertTrue($v->canRedeem());
        $v->redeem(); $v->redeem();
        $this->assertSame('used', $v->getStatus());
    }
    public function testVoucherRevoke(): void
    {
        $v = new AmenityVoucher('bk1', 'p', 'g1', 'gym', 'G', new \DateTimeImmutable('today'), 't');
        $v->revoke();
        $this->assertFalse($v->canRedeem());
    }
    public function testGatePassWorkflow(): void
    {
        $gp = new GatePass('p', 'bk1', 'visitor_entry', 'Visitor', 'Guest', 't');
        $gp->setRoomNumber('201'); $gp->setPurpose('Delivery');
        $gp->setPersonPhone('+234'); $gp->setExpectedAt(new \DateTimeImmutable('+1 hour'));
        $this->assertSame('pending', $gp->getStatus());
        $gp->approve('s1');
        $this->assertSame('approved', $gp->getStatus());
        $gp->checkIn();
        $this->assertSame('checked_in', $gp->getStatus());
        $gp->checkOut();
        $this->assertSame('checked_out', $gp->getStatus());
    }
    public function testGatePassDeny(): void
    {
        $gp = new GatePass('p', 'bk1', 'visitor_entry', 'X', 'G', 't');
        $gp->deny('s1', 'No ID');
        $this->assertSame('denied', $gp->getStatus());
    }
    public function testGuestMovement(): void
    {
        $m = new GuestMovement('p', 'bk1', 'g1', 'Name', 'step_out', 't');
        $m->setRoomNumber('305'); $m->setNotes('Market'); $m->setLocation('6.5,3.3');
        $this->assertSame('step_out', $m->getDirection());
        $m2 = new GuestMovement('p', 'bk1', 'g1', 'Name', 'step_in', 't');
        $m2->setRecordedBy('security_post'); $m2->setRecordedById('guard-1');
        $this->assertSame('security_post', $m2->getRecordedBy());
    }
    public function testRoomControlDnd(): void
    {
        $r = new RoomControlRequest('p', 'bk1', 'g1', 'rm1', '301', 'dnd', 't');
        $this->assertSame('acknowledged', $r->getStatus());
        $this->assertTrue($r->isActive());
        $r->cancel();
        $this->assertFalse($r->isActive());
    }
    public function testRoomControlMakeUp(): void
    {
        $r = new RoomControlRequest('p', 'bk1', 'g1', 'rm1', '301', 'make_up_room', 't');
        $this->assertSame('acknowledged', $r->getStatus());
        $r->resolve();
        $this->assertSame('resolved', $r->getStatus());
    }
    public function testRoomControlMaintenance(): void
    {
        $r = new RoomControlRequest('p', 'bk1', 'g1', 'rm1', '301', 'maintenance', 't');
        $r->setDescription('Leaking faucet'); $r->setPhotoUrl('photo.jpg');
        $this->assertSame('pending', $r->getStatus());
        $r->acknowledge();
        $r->assign('m1', 'Emeka');
        $this->assertSame('in_progress', $r->getStatus());
        $r->resolve('Fixed washer');
        $this->assertSame('resolved', $r->getStatus());
    }
    public function testWaitlistWorkflow(): void
    {
        $w = new WaitlistEntry('p', 'bk1', 'g1', 'Guest', 'room_upgrade', 'Suite', 't');
        $w->setPosition(3); $w->setTargetId('rt-suite');
        $w->setPreferredDate(new \DateTimeImmutable('today'));
        $w->setNotes('Honeymoon');
        $this->assertSame('waiting', $w->getStatus());
        $w->notify();
        $this->assertSame('notified', $w->getStatus());
        $w->fulfill();
        $this->assertSame('fulfilled', $w->getStatus());
    }
    public function testWaitlistCancel(): void
    {
        $w = new WaitlistEntry('p', 'bk1', 'g1', 'G', 'amenity', 'Spa', 't');
        $w->cancel();
        $this->assertSame('cancelled', $w->getStatus());
    }
    public function testWaitlistExpire(): void
    {
        $w = new WaitlistEntry('p', 'bk1', 'g1', 'G', 'restaurant', 'Window', 't');
        $w->expire();
        $this->assertSame('expired', $w->getStatus());
    }
    public function testChargeTransferApprove(): void
    {
        $ct = new ChargeTransfer('p', 'bk1', '301', 'bk2', '302', 'g1', 'Mr. O', 'Dinner', '350000', 't');
        $ct->setReason('Group booking');
        $this->assertSame('pending', $ct->getStatus());
        $ct->approve('s1', 'Manager');
        $this->assertSame('approved', $ct->getStatus());
        $ct->complete();
        $this->assertSame('completed', $ct->getStatus());
    }
    public function testChargeTransferReject(): void
    {
        $ct = new ChargeTransfer('p', 'bk1', '301', 'bk2', '302', 'g1', 'G', 'Minibar', '25000', 't');
        $ct->reject('s1', 'Mgr', 'Not authorized');
        $this->assertSame('rejected', $ct->getStatus());
    }
    public function testChargeTransferToArray(): void
    {
        $ct = new ChargeTransfer('p', 'bk1', '301', 'bk2', '302', 'g1', 'N', 'D', '100000', 't');
        $ct->onPrePersist();
        $a = $ct->toArray();
        $this->assertSame('301', $a['from_room_number']);
        $this->assertSame('pending', $a['status']);
    }
}

<?php

declare(strict_types=1);

namespace Lodgik\Tests\Unit\Module\Phase5;

use Lodgik\Entity\GymMembershipPlan;
use Lodgik\Entity\GymMember;
use Lodgik\Entity\GymMembership;
use Lodgik\Entity\GymMembershipPayment;
use Lodgik\Entity\GymVisitLog;
use Lodgik\Entity\GymClass;
use Lodgik\Entity\GymClassBooking;
use Lodgik\Enum\GymMembershipStatus;
use Lodgik\Enum\PaymentMethod;
use Lodgik\Enum\PaymentStatus;
use PHPUnit\Framework\TestCase;

final class Phase5Test extends TestCase
{
    // ─── GymMembershipPlan ──────────────────────────────────────

    public function testPlanCreation(): void
    {
        $p = new GymMembershipPlan('prop-1', 'Monthly Basic', 30, '1500000', 'tenant-1');
        $this->assertNotEmpty($p->getId());
        $this->assertSame('Monthly Basic', $p->getName());
        $this->assertSame(30, $p->getDurationDays());
        $this->assertSame('1500000', $p->getPrice());
        $this->assertTrue($p->isActive());
        $this->assertTrue($p->getIncludesClasses());
        $this->assertFalse($p->getIncludesPool());
    }

    public function testPlanUpdate(): void
    {
        $p = new GymMembershipPlan('prop-1', 'Basic', 30, '1000000', 't');
        $p->setName('Premium');
        $p->setDurationDays(90);
        $p->setPrice('3500000');
        $p->setIncludesPool(true);
        $p->setMaxClasses(12);
        $p->setDescription('Full access with pool');
        $p->setSortOrder(2);
        $this->assertSame('Premium', $p->getName());
        $this->assertSame(90, $p->getDurationDays());
        $this->assertTrue($p->getIncludesPool());
        $this->assertSame(12, $p->getMaxClasses());
        $this->assertSame('Full access with pool', $p->getDescription());
    }

    public function testPlanToArray(): void
    {
        $p = new GymMembershipPlan('prop-1', 'Annual', 365, '12000000', 't');
        $p->onPrePersist();
        $arr = $p->toArray();
        $this->assertSame('Annual', $arr['name']);
        $this->assertSame(365, $arr['duration_days']);
        $this->assertSame('12000000', $arr['price']);
        $this->assertTrue($arr['is_active']);
    }

    // ─── GymMember ──────────────────────────────────────────────

    public function testMemberCreation(): void
    {
        $m = new GymMember('prop-1', 'Adebayo', 'Olumide', '08012345678', 'tenant-1');
        $this->assertSame('Adebayo', $m->getFirstName());
        $this->assertSame('Olumide', $m->getLastName());
        $this->assertSame('Adebayo Olumide', $m->getFullName());
        $this->assertSame('08012345678', $m->getPhone());
        $this->assertSame('external', $m->getMemberType());
        $this->assertFalse($m->isGuest());
        $this->assertTrue($m->isActive());
        $this->assertNotNull($m->getQrCode());
        $this->assertStringStartsWith('GYM-', $m->getQrCode());
    }

    public function testMemberGuestType(): void
    {
        $m = new GymMember('prop-1', 'Jane', 'Doe', '0901234', 't');
        $m->setMemberType('guest');
        $m->setGuestId('guest-123');
        $m->setBookingId('bk-456');
        $this->assertTrue($m->isGuest());
        $this->assertSame('guest-123', $m->getGuestId());
        $this->assertSame('bk-456', $m->getBookingId());
    }

    public function testMemberProfile(): void
    {
        $m = new GymMember('prop-1', 'Chidi', 'Eze', '080', 't');
        $m->setEmail('chidi@example.com');
        $m->setGender('M');
        $m->setDateOfBirth(new \DateTimeImmutable('1990-05-15'));
        $m->setEmergencyContact('Spouse: 08099887766');
        $m->setPhotoUrl('https://example.com/photo.jpg');
        $m->setNotes('Has knee condition');
        $this->assertSame('chidi@example.com', $m->getEmail());
        $this->assertSame('M', $m->getGender());
        $this->assertSame('1990-05-15', $m->getDateOfBirth()->format('Y-m-d'));
    }

    public function testMemberToArray(): void
    {
        $m = new GymMember('prop-1', 'Test', 'User', '080', 't');
        $m->onPrePersist();
        $arr = $m->toArray();
        $this->assertSame('Test User', $arr['full_name']);
        $this->assertSame('external', $arr['member_type']);
        $this->assertStringStartsWith('GYM-', $arr['qr_code']);
    }

    // ─── GymMembershipStatus Enum ───────────────────────────────

    public function testMembershipStatusValues(): void
    {
        $vals = GymMembershipStatus::values();
        $this->assertContains('active', $vals);
        $this->assertContains('expired', $vals);
        $this->assertContains('suspended', $vals);
        $this->assertContains('cancelled', $vals);
        $this->assertCount(4, $vals);
    }

    public function testMembershipStatusLabels(): void
    {
        $this->assertSame('Active', GymMembershipStatus::ACTIVE->label());
        $this->assertSame('Expired', GymMembershipStatus::EXPIRED->label());
        $this->assertSame('#22c55e', GymMembershipStatus::ACTIVE->color());
        $this->assertSame('#ef4444', GymMembershipStatus::EXPIRED->color());
    }

    // ─── GymMembership ──────────────────────────────────────────

    public function testMembershipCreation(): void
    {
        $now = new \DateTimeImmutable();
        $expires = $now->modify('+30 days');
        $ms = new GymMembership('prop-1', 'mem-1', 'plan-1', 'Monthly', '1500000', $now, $expires, 't');
        $this->assertSame('mem-1', $ms->getMemberId());
        $this->assertSame('plan-1', $ms->getPlanId());
        $this->assertSame('Monthly', $ms->getPlanName());
        $this->assertSame('1500000', $ms->getPricePaid());
        $this->assertSame(GymMembershipStatus::ACTIVE, $ms->getStatus());
        $this->assertTrue($ms->isActive());
        $this->assertFalse($ms->isExpired());
        $this->assertGreaterThan(0, $ms->daysRemaining());
    }

    public function testMembershipLifecycleSuspend(): void
    {
        $ms = new GymMembership('p', 'm', 'pl', 'Test', '100', new \DateTimeImmutable(), new \DateTimeImmutable('+30 days'), 't');
        $this->assertSame(GymMembershipStatus::ACTIVE, $ms->getStatus());
        $ms->suspend();
        $this->assertSame(GymMembershipStatus::SUSPENDED, $ms->getStatus());
    }

    public function testMembershipLifecycleCancel(): void
    {
        $ms = new GymMembership('p', 'm', 'pl', 'Test', '100', new \DateTimeImmutable(), new \DateTimeImmutable('+30 days'), 't');
        $ms->cancel();
        $this->assertSame(GymMembershipStatus::CANCELLED, $ms->getStatus());
        $this->assertFalse($ms->isActive());
    }

    public function testMembershipLifecycleExpire(): void
    {
        $ms = new GymMembership('p', 'm', 'pl', 'Test', '100', new \DateTimeImmutable(), new \DateTimeImmutable('+30 days'), 't');
        $ms->expire();
        $this->assertSame(GymMembershipStatus::EXPIRED, $ms->getStatus());
    }

    public function testMembershipReactivate(): void
    {
        $ms = new GymMembership('p', 'm', 'pl', 'Test', '100', new \DateTimeImmutable(), new \DateTimeImmutable('+30 days'), 't');
        $ms->suspend();
        $ms->reactivate();
        $this->assertSame(GymMembershipStatus::ACTIVE, $ms->getStatus());
        $this->assertTrue($ms->isActive());
    }

    public function testMembershipRenew(): void
    {
        $ms = new GymMembership('p', 'm', 'pl', 'Test', '100', new \DateTimeImmutable(), new \DateTimeImmutable('+5 days'), 't');
        $newExpiry = new \DateTimeImmutable('+35 days');
        $ms->renew($newExpiry);
        $this->assertSame(GymMembershipStatus::ACTIVE, $ms->getStatus());
        $this->assertSame($newExpiry->format('Y-m-d'), $ms->getExpiresAt()->format('Y-m-d'));
        $this->assertFalse($ms->isExpiryAlertSent());
    }

    public function testMembershipExpiryAlert(): void
    {
        $ms = new GymMembership('p', 'm', 'pl', 'Test', '100', new \DateTimeImmutable(), new \DateTimeImmutable('+30 days'), 't');
        $this->assertFalse($ms->isExpiryAlertSent());
        $ms->setExpiryAlertSent(true);
        $this->assertTrue($ms->isExpiryAlertSent());
    }

    public function testMembershipToArray(): void
    {
        $ms = new GymMembership('p', 'm', 'pl', 'Premium', '3500000', new \DateTimeImmutable(), new \DateTimeImmutable('+90 days'), 't');
        $ms->onPrePersist();
        $arr = $ms->toArray();
        $this->assertSame('Premium', $arr['plan_name']);
        $this->assertSame('active', $arr['status']);
        $this->assertSame('Active', $arr['status_label']);
        $this->assertSame('#22c55e', $arr['status_color']);
        $this->assertTrue($arr['is_active']);
        $this->assertGreaterThan(0, $arr['days_remaining']);
    }

    // ─── GymMembershipPayment ───────────────────────────────────

    public function testPaymentCreation(): void
    {
        $pay = new GymMembershipPayment('prop-1', 'ms-1', 'mem-1', '1500000', PaymentMethod::CASH, 't');
        $this->assertSame('1500000', $pay->getAmount());
        $this->assertSame(PaymentMethod::CASH, $pay->getPaymentMethod());
        $this->assertSame(PaymentStatus::CONFIRMED, $pay->getStatus());
        $this->assertSame('new', $pay->getPaymentType());
    }

    public function testPaymentMethods(): void
    {
        foreach ([PaymentMethod::CASH, PaymentMethod::BANK_TRANSFER, PaymentMethod::POS_CARD] as $m) {
            $pay = new GymMembershipPayment('p', 'ms', 'mem', '100', $m, 't');
            $this->assertSame($m, $pay->getPaymentMethod());
        }
    }

    public function testPaymentBankTransfer(): void
    {
        $pay = new GymMembershipPayment('p', 'ms', 'mem', '1500000', PaymentMethod::BANK_TRANSFER, 't');
        $pay->setTransferReference('TRF-20260220-001');
        $pay->setRecordedBy('staff-1');
        $pay->setNotes('Paid via GTBank');
        $this->assertSame('TRF-20260220-001', $pay->getTransferReference());
        $this->assertSame('staff-1', $pay->getRecordedBy());
    }

    public function testPaymentRenewalType(): void
    {
        $pay = new GymMembershipPayment('p', 'ms', 'mem', '1500000', PaymentMethod::POS_CARD, 't');
        $pay->setPaymentType('renewal');
        $this->assertSame('renewal', $pay->getPaymentType());
    }

    public function testPaymentToArray(): void
    {
        $pay = new GymMembershipPayment('p', 'ms', 'mem', '2000000', PaymentMethod::CASH, 't');
        $pay->onPrePersist();
        $arr = $pay->toArray();
        $this->assertSame('2000000', $arr['amount']);
        $this->assertSame('cash', $arr['payment_method']);
        $this->assertSame('Cash', $arr['payment_method_label']);
        $this->assertSame('confirmed', $arr['status']);
    }

    // ─── GymVisitLog ────────────────────────────────────────────

    public function testVisitCreation(): void
    {
        $v = new GymVisitLog('prop-1', 'mem-1', 'qr_scan', 't');
        $this->assertSame('mem-1', $v->getMemberId());
        $this->assertSame('qr_scan', $v->getCheckInMethod());
        $this->assertNotNull($v->getCheckedInAt());
        $this->assertNull($v->getCheckedOutAt());
        $this->assertNull($v->getDurationMinutes());
    }

    public function testVisitCheckInMethods(): void
    {
        foreach (['qr_scan', 'name_search', 'guest_access'] as $method) {
            $v = new GymVisitLog('p', 'mem', $method, 't');
            $this->assertSame($method, $v->getCheckInMethod());
        }
    }

    public function testVisitCheckOut(): void
    {
        $v = new GymVisitLog('p', 'mem', 'qr_scan', 't');
        $v->setCheckedInBy('staff-1');
        $v->setMembershipId('ms-1');
        $v->checkOut();
        $this->assertNotNull($v->getCheckedOutAt());
        $this->assertSame('staff-1', $v->getCheckedInBy());
        $this->assertSame('ms-1', $v->getMembershipId());
    }

    public function testVisitToArray(): void
    {
        $v = new GymVisitLog('p', 'mem-1', 'name_search', 't');
        $arr = $v->toArray();
        $this->assertSame('mem-1', $arr['member_id']);
        $this->assertSame('name_search', $arr['check_in_method']);
        $this->assertNull($arr['checked_out_at']);
        $this->assertNull($arr['duration_minutes']);
    }

    // ─── GymClass ───────────────────────────────────────────────

    public function testClassCreation(): void
    {
        $c = new GymClass('prop-1', 'Morning Yoga', new \DateTimeImmutable('2026-02-21 08:00:00'), 't');
        $this->assertSame('Morning Yoga', $c->getName());
        $this->assertSame(60, $c->getDurationMinutes());
        $this->assertSame(20, $c->getMaxCapacity());
        $this->assertSame(0, $c->getCurrentBookings());
        $this->assertSame('other', $c->getCategory());
        $this->assertFalse($c->isCancelled());
        $this->assertFalse($c->isFull());
        $this->assertSame(20, $c->getSpotsLeft());
    }

    public function testClassConfiguration(): void
    {
        $c = new GymClass('p', 'HIIT Blast', new \DateTimeImmutable('2026-03-01 17:00'), 't');
        $c->setCategory('hiit');
        $c->setDurationMinutes(45);
        $c->setMaxCapacity(15);
        $c->setInstructorName('Coach Amaka');
        $c->setLocation('Studio B');
        $c->setRecurrence('weekly');
        $c->setDescription('High intensity interval training');
        $this->assertSame('hiit', $c->getCategory());
        $this->assertSame(45, $c->getDurationMinutes());
        $this->assertSame('Coach Amaka', $c->getInstructorName());
        $this->assertSame('Studio B', $c->getLocation());
        $this->assertSame('weekly', $c->getRecurrence());
    }

    public function testClassCapacity(): void
    {
        $c = new GymClass('p', 'Spin', new \DateTimeImmutable(), 't');
        $c->setMaxCapacity(3);
        $this->assertSame(3, $c->getSpotsLeft());
        $c->incrementBookings();
        $c->incrementBookings();
        $this->assertSame(1, $c->getSpotsLeft());
        $this->assertFalse($c->isFull());
        $c->incrementBookings();
        $this->assertTrue($c->isFull());
        $this->assertSame(0, $c->getSpotsLeft());
        $c->decrementBookings();
        $this->assertFalse($c->isFull());
    }

    public function testClassCancel(): void
    {
        $c = new GymClass('p', 'Test', new \DateTimeImmutable(), 't');
        $this->assertFalse($c->isCancelled());
        $c->cancel();
        $this->assertTrue($c->isCancelled());
    }

    public function testClassEndTime(): void
    {
        $c = new GymClass('p', 'Yoga', new \DateTimeImmutable('2026-02-21 08:00:00'), 't');
        $c->setDurationMinutes(90);
        $this->assertSame('2026-02-21 09:30:00', $c->getEndTime()->format('Y-m-d H:i:s'));
    }

    public function testClassToArray(): void
    {
        $c = new GymClass('p', 'Boxing', new \DateTimeImmutable('2026-02-21 10:00:00'), 't');
        $c->setCategory('boxing');
        $c->onPrePersist();
        $arr = $c->toArray();
        $this->assertSame('Boxing', $arr['name']);
        $this->assertSame('boxing', $arr['category']);
        $this->assertSame(20, $arr['spots_left']);
        $this->assertFalse($arr['is_full']);
    }

    // ─── GymClassBooking ────────────────────────────────────────

    public function testClassBookingCreation(): void
    {
        $b = new GymClassBooking('prop-1', 'cls-1', 'mem-1', 't');
        $this->assertSame('cls-1', $b->getClassId());
        $this->assertSame('mem-1', $b->getMemberId());
        $this->assertSame('booked', $b->getStatus());
    }

    public function testClassBookingAttend(): void
    {
        $b = new GymClassBooking('p', 'cls', 'mem', 't');
        $b->markAttended();
        $this->assertSame('attended', $b->getStatus());
    }

    public function testClassBookingCancel(): void
    {
        $b = new GymClassBooking('p', 'cls', 'mem', 't');
        $b->cancel();
        $this->assertSame('cancelled', $b->getStatus());
    }

    public function testClassBookingNoShow(): void
    {
        $b = new GymClassBooking('p', 'cls', 'mem', 't');
        $b->markNoShow();
        $this->assertSame('no_show', $b->getStatus());
    }

    public function testClassBookingToArray(): void
    {
        $b = new GymClassBooking('p', 'cls-1', 'mem-1', 't');
        $b->onPrePersist();
        $arr = $b->toArray();
        $this->assertSame('cls-1', $arr['class_id']);
        $this->assertSame('booked', $arr['status']);
    }

    // ─── Integrated Workflows ───────────────────────────────────

    public function testFullMembershipWorkflow(): void
    {
        // 1. Create member
        $m = new GymMember('p', 'Tunde', 'Bakare', '080', 't');
        $this->assertNotNull($m->getQrCode());

        // 2. Create plan
        $plan = new GymMembershipPlan('p', 'Monthly', 30, '1500000', 't');

        // 3. Active membership
        $ms = new GymMembership('p', $m->getId(), $plan->getId(), 'Monthly', '1500000', new \DateTimeImmutable(), new \DateTimeImmutable('+30 days'), 't');
        $this->assertTrue($ms->isActive());

        // 4. Payment recorded
        $pay = new GymMembershipPayment('p', $ms->getId(), $m->getId(), '1500000', PaymentMethod::CASH, 't');
        $this->assertSame(PaymentStatus::CONFIRMED, $pay->getStatus());

        // 5. Check-in
        $visit = new GymVisitLog('p', $m->getId(), 'qr_scan', 't');
        $visit->setMembershipId($ms->getId());

        // 6. Suspend
        $ms->suspend();
        $this->assertSame(GymMembershipStatus::SUSPENDED, $ms->getStatus());

        // 7. Reactivate
        $ms->reactivate();
        $this->assertTrue($ms->isActive());

        // 8. Renew
        $ms->renew(new \DateTimeImmutable('+60 days'));
        $this->assertGreaterThan(50, $ms->daysRemaining());
    }

    public function testGuestGymAccess(): void
    {
        // Guest member — no paid membership needed
        $m = new GymMember('p', 'Hotel', 'Guest', '080', 't');
        $m->setMemberType('guest');
        $m->setGuestId('guest-abc');
        $m->setBookingId('bk-xyz');

        // Check-in via guest_access method
        $visit = new GymVisitLog('p', $m->getId(), 'guest_access', 't');
        $this->assertSame('guest_access', $visit->getCheckInMethod());
        $this->assertTrue($m->isGuest());
    }

    public function testClassScheduleAndBooking(): void
    {
        $c = new GymClass('p', 'Pilates', new \DateTimeImmutable('2026-02-22 09:00'), 't');
        $c->setMaxCapacity(10);
        $c->setInstructorName('Sarah');
        $c->setCategory('pilates');

        // Book
        $b1 = new GymClassBooking('p', $c->getId(), 'mem-1', 't');
        $c->incrementBookings();
        $this->assertSame(9, $c->getSpotsLeft());

        // Cancel
        $b1->cancel();
        $c->decrementBookings();
        $this->assertSame(10, $c->getSpotsLeft());
    }
}

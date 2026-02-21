<?php
declare(strict_types=1);
namespace Lodgik\Tests\Unit\Module\Phase8A;

use Lodgik\Entity\Expense;
use Lodgik\Entity\ExpenseCategory;
use Lodgik\Entity\NightAudit;
use Lodgik\Entity\PoliceReport;
use Lodgik\Entity\PerformanceReview;
use Lodgik\Entity\PricingRule;
use Lodgik\Entity\GroupBooking;
use PHPUnit\Framework\TestCase;

final class Phase8ATest extends TestCase
{
    public function testExpenseCategoryCreation(): void
    {
        $c = new ExpenseCategory('Utilities', 't1');
        $this->assertSame('Utilities', $c->getName());
        $this->assertTrue($c->isActive());
        $c->setParentId('p1'); $c->setDescription('Electric, water, gas');
        $this->assertSame('p1', $c->getParentId());
    }

    public function testExpenseWorkflow(): void
    {
        $e = new Expense('p1', 'c1', 'Utilities', 'Electric bill Jan', '350000', new \DateTimeImmutable('2026-01-15'), 'u1', 'John', 't1');
        $this->assertSame('draft', $e->getStatus());
        $e->submit();
        $this->assertSame('submitted', $e->getStatus());
        $e->setVendor('EKEDC'); $e->setReceiptUrl('receipt.pdf'); $e->setNotes('Monthly');
        $e->approve('u2', 'Manager');
        $this->assertSame('approved', $e->getStatus());
        $e->markPaid('transfer', 'TRF-001');
        $this->assertSame('paid', $e->getStatus());
    }

    public function testExpenseReject(): void
    {
        $e = new Expense('p1', 'c1', 'Food', 'Lunch', '25000', new \DateTimeImmutable(), 'u1', 'Staff', 't1');
        $e->reject('u2', 'Mgr', 'No receipt');
        $this->assertSame('rejected', $e->getStatus());
    }

    public function testNightAuditCreation(): void
    {
        $na = new NightAudit('p1', new \DateTimeImmutable('2026-02-20'), 't1');
        $na->setRoomsOccupied(45); $na->setTotalRooms(60); $na->setRoomsAvailable(15);
        $na->setCheckIns(12); $na->setCheckOuts(8); $na->setNoShows(2);
        $na->setRoomRevenue('15000000'); $na->setFnbRevenue('2500000');
        $na->setCashCollected('5000000'); $na->setCardCollected('10000000');
        $na->setOccupancyRate('75.00'); $na->setAdr('333333.33'); $na->setRevpar('250000.00');
        $this->assertSame('open', $na->getStatus());
        $na->close('u1', 'Night Manager');
        $this->assertSame('closed', $na->getStatus());
        $a = $na->toArray();
        $this->assertSame(45, $a['rooms_occupied']);
        $this->assertSame('closed', $a['status']);
    }

    public function testPoliceReport(): void
    {
        $pr = new PoliceReport('p1', 'b1', 'g1', 'Adeola Okafor', new \DateTimeImmutable('2026-02-20'), 't1');
        $pr->setNationality('Nigerian'); $pr->setIdType('passport'); $pr->setIdNumber('A12345678');
        $pr->setAddress('12 Victoria Island, Lagos'); $pr->setPhone('+2348012345678');
        $pr->setPurposeOfVisit('Business'); $pr->setRoomNumber('501');
        $pr->setAccompanyingPersons(1); $pr->setVehiclePlate('LAG-234-XY');
        $a = $pr->toArray();
        $this->assertSame('Adeola Okafor', $a['guest_name']);
        $this->assertSame('passport', $a['id_type']);
        $this->assertSame('501', $a['room_number']);
    }

    public function testPerformanceReview(): void
    {
        $r = new PerformanceReview('p1', 'emp1', 'Chidi Nwosu', 'mgr1', 'Manager', 'Q4', 2025, 4, 't1');
        $this->assertSame('draft', $r->getStatus());
        $r->setRatings(['punctuality' => 5, 'teamwork' => 4, 'initiative' => 3]);
        $r->setStrengths('Reliable, good with guests');
        $r->setImprovements('Communication with kitchen');
        $r->setGoals(['Complete supervisor training', 'Improve upselling']);
        $r->submit();
        $this->assertSame('submitted', $r->getStatus());
        $r->acknowledge();
        $this->assertSame('acknowledged', $r->getStatus());
    }

    public function testPricingRuleSeasonalSurcharge(): void
    {
        $r = new PricingRule('p1', 'Christmas Peak', 'seasonal', 'percentage', '25.00', 't1');
        $r->setStartDate(new \DateTimeImmutable('2026-12-20'));
        $r->setEndDate(new \DateTimeImmutable('2027-01-05'));
        $r->setPriority(10);
        $this->assertTrue($r->appliesOnDate(new \DateTimeImmutable('2026-12-25')));
        $this->assertFalse($r->appliesOnDate(new \DateTimeImmutable('2026-11-01')));
        // Base rate 50000 kobo + 25% = 62500
        $adjusted = $r->applyTo('50000');
        $this->assertSame('62500', $adjusted);
    }

    public function testPricingRuleWeekendDiscount(): void
    {
        $r = new PricingRule('p1', 'Weekend Discount', 'day_of_week', 'percentage', '-10.00', 't1');
        $r->setDaysOfWeek([0, 6]); // Sun, Sat
        $this->assertTrue($r->appliesOnDate(new \DateTimeImmutable('2026-02-22'))); // Sunday
        $this->assertFalse($r->appliesOnDate(new \DateTimeImmutable('2026-02-23'))); // Monday
        $adjusted = $r->applyTo('100000');
        $this->assertSame('90000', $adjusted); // -10%
    }

    public function testPricingRuleFixedSurcharge(): void
    {
        $r = new PricingRule('p1', 'Event Fee', 'event', 'fixed', '5000', 't1');
        $adjusted = $r->applyTo('80000');
        $this->assertSame('85000', $adjusted);
    }

    public function testPricingRuleInactive(): void
    {
        $r = new PricingRule('p1', 'Disabled', 'seasonal', 'percentage', '50.00', 't1');
        $r->setIsActive(false);
        $this->assertFalse($r->appliesOnDate(new \DateTimeImmutable()));
    }

    public function testGroupBookingWorkflow(): void
    {
        $gb = new GroupBooking('p1', 'Shell Corp Annual Meeting', 'corporate', 'Amina Ibrahim',
            new \DateTimeImmutable('2026-03-15'), new \DateTimeImmutable('2026-03-18'), 't1');
        $gb->setContactEmail('amina@shell.ng'); $gb->setContactPhone('+2349012345678');
        $gb->setCompanyName('Shell Nigeria'); $gb->setDiscountPercentage('15.00');
        $gb->setTotalRooms(25); $gb->setSpecialRequirements('Conference room for 100 pax, AV equipment');
        $this->assertSame('tentative', $gb->getStatus());
        $gb->confirm();
        $this->assertSame('confirmed', $gb->getStatus());
        $gb->onPrePersist();
        $a = $gb->toArray();
        $this->assertSame('Shell Nigeria', $a['company_name']);
        $this->assertSame(25, $a['total_rooms']);
    }

    public function testGroupBookingCancel(): void
    {
        $gb = new GroupBooking('p1', 'Wedding', 'event', 'Bola', new \DateTimeImmutable(), new \DateTimeImmutable('+3 days'), 't1');
        $gb->cancel();
        $this->assertSame('cancelled', $gb->getStatus());
    }

    public function testExpenseToArray(): void
    {
        $e = new Expense('p1', 'c1', 'Transport', 'Fuel', '15000', new \DateTimeImmutable('2026-02-20'), 'u1', 'Driver', 't1');
        $e->onPrePersist();
        $a = $e->toArray();
        $this->assertSame('Transport', $a['category_name']);
        $this->assertSame('draft', $a['status']);
        $this->assertSame('2026-02-20', $a['expense_date']);
    }

    public function testPricingRuleToArray(): void
    {
        $r = new PricingRule('p1', 'Test', 'seasonal', 'percentage', '10.00', 't1');
        $r->setRoomTypeId('rt1'); $r->setDescription('Test rule');
        $a = $r->toArray();
        $this->assertSame('rt1', $a['room_type_id']);
        $this->assertSame('seasonal', $a['rule_type']);
    }
}

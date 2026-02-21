<?php
declare(strict_types=1);
namespace Lodgik\Tests\Unit\Module\Phase8A;
use Lodgik\Entity\{Expense, ExpenseCategory, NightAudit, PoliceReport, PerformanceReview, PricingRule, GroupBooking};
use PHPUnit\Framework\TestCase;

final class Phase8ATest extends TestCase
{
    public function testExpenseCategoryCreation(): void
    { $c = new ExpenseCategory('Utilities', 't'); $this->assertSame('Utilities', $c->getName()); $c->setDescription('Power, water'); $this->assertTrue($c->isActive()); }

    public function testExpenseWorkflow(): void
    { $e = new Expense('p', 'cat1', 'Utilities', 'Generator diesel', '500000', new \DateTimeImmutable('2026-01-15'), 'u1', 'John', 't');
      $this->assertSame('draft', $e->getStatus()); $e->submit(); $this->assertSame('submitted', $e->getStatus());
      $e->approve('m1', 'Manager'); $this->assertSame('approved', $e->getStatus());
      $e->markPaid('bank_transfer', 'TRF-001'); $this->assertSame('paid', $e->getStatus()); }

    public function testExpenseReject(): void
    { $e = new Expense('p', 'c1', 'Cat', 'Bad expense', '100', new \DateTimeImmutable(), 'u1', 'Staff', 't');
      $e->submit(); $e->reject('m1', 'Mgr', 'No receipt'); $this->assertSame('rejected', $e->getStatus()); }

    public function testExpenseToArray(): void
    { $e = new Expense('p', 'c1', 'Food', 'Lunch supplies', '75000', new \DateTimeImmutable('2026-02-01'), 'u1', 'Chef', 't');
      $e->setVendor('Market Vendor'); $e->setNotes('Weekly purchase'); $e->onPrePersist();
      $a = $e->toArray(); $this->assertSame('Food', $a['category_name']); $this->assertSame('draft', $a['status']); }

    public function testNightAuditWorkflow(): void
    { $a = new NightAudit('p', new \DateTimeImmutable('2026-02-20'), 't');
      $a->setRoomsOccupied(45); $a->setTotalRooms(80); $a->setTotalRevenue('5000000');
      $this->assertSame('open', $a->getStatus()); $a->close('m1', 'Night Manager');
      $this->assertSame('closed', $a->getStatus()); $arr = $a->toArray(); $this->assertSame(45, $arr['rooms_occupied']); }

    public function testPoliceReportCreation(): void
    { $r = new PoliceReport('p', 'bk1', 'g1', 'Mr. Okafor', new \DateTimeImmutable('2026-02-21'), 't');
      $r->setNationality('Nigerian'); $r->setIdType('passport'); $r->setIdNumber('A12345');
      $r->setRoomNumber('305'); $r->setPurposeOfVisit('Business');
      $a = $r->toArray(); $this->assertSame('Nigerian', $a['nationality']); $this->assertSame('305', $a['room_number']); }

    public function testPerformanceReviewWorkflow(): void
    { $r = new PerformanceReview('p', 'emp1', 'Ada', 'mgr1', 'Manager', 'Q1', 2026, 4, 't');
      $this->assertSame('draft', $r->getStatus()); $r->setStrengths('Excellent customer service');
      $r->submit(); $this->assertSame('submitted', $r->getStatus());
      $r->acknowledge(); $this->assertSame('acknowledged', $r->getStatus()); }

    public function testPricingRuleSeasonalApplies(): void
    { $r = new PricingRule('p', 'Xmas Surcharge', 'seasonal', 'percentage', '25.00', 't');
      $r->setStartDate(new \DateTimeImmutable('2026-12-20')); $r->setEndDate(new \DateTimeImmutable('2026-12-31'));
      $this->assertTrue($r->appliesOnDate(new \DateTimeImmutable('2026-12-25')));
      $this->assertFalse($r->appliesOnDate(new \DateTimeImmutable('2026-11-15'))); }

    public function testPricingRuleDayOfWeek(): void
    { $r = new PricingRule('p', 'Weekend Premium', 'day_of_week', 'percentage', '15.00', 't');
      $r->setDaysOfWeek([5, 6]); // Fri, Sat
      $fri = new \DateTimeImmutable('2026-02-27'); // Friday
      $mon = new \DateTimeImmutable('2026-02-23'); // Monday
      $this->assertTrue($r->appliesOnDate($fri)); $this->assertFalse($r->appliesOnDate($mon)); }

    public function testPricingRuleApplyPercentage(): void
    { $r = new PricingRule('p', 'Surcharge', 'seasonal', 'percentage', '20.00', 't');
      $r->setStartDate(new \DateTimeImmutable('2020-01-01')); $r->setEndDate(new \DateTimeImmutable('2030-12-31'));
      $result = $r->applyTo('100000'); // 100k kobo
      $this->assertSame('120000', $result); }

    public function testPricingRuleApplyFixed(): void
    { $r = new PricingRule('p', 'Flat fee', 'event', 'fixed', '5000', 't');
      $result = $r->applyTo('100000');
      $this->assertSame('105000', $result); }

    public function testPricingRuleInactive(): void
    { $r = new PricingRule('p', 'Off', 'seasonal', 'percentage', '10', 't');
      $r->setIsActive(false); $this->assertFalse($r->appliesOnDate(new \DateTimeImmutable())); }

    public function testGroupBookingWorkflow(): void
    { $g = new GroupBooking('p', 'Acme Corp Retreat', 'corporate', 'John Smith', new \DateTimeImmutable('2026-03-01'), new \DateTimeImmutable('2026-03-05'), 't');
      $g->setCompanyName('Acme Corp'); $g->setTotalRooms(10); $g->setDiscountPercentage('15.00');
      $this->assertSame('tentative', $g->getStatus()); $g->confirm(); $this->assertSame('confirmed', $g->getStatus()); }

    public function testGroupBookingCancel(): void
    { $g = new GroupBooking('p', 'Wedding', 'event', 'Mrs. Ade', new \DateTimeImmutable('2026-06-01'), new \DateTimeImmutable('2026-06-03'), 't');
      $g->cancel(); $this->assertSame('cancelled', $g->getStatus()); }

    public function testGroupBookingToArray(): void
    { $g = new GroupBooking('p', 'Tour Group', 'group', 'Travel Agent', new \DateTimeImmutable('2026-04-01'), new \DateTimeImmutable('2026-04-07'), 't');
      $g->setContactEmail('agent@travel.com'); $g->setContactPhone('+234801234'); $g->onPrePersist();
      $a = $g->toArray(); $this->assertSame('group', $a['booking_type']); $this->assertSame('tentative', $a['status']); }
}

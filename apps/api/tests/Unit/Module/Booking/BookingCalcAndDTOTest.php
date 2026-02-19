<?php

declare(strict_types=1);

namespace Lodgik\Tests\Unit\Module\Booking;

use Lodgik\Entity\RoomType;
use Lodgik\Enum\BookingType;
use Lodgik\Module\Booking\RateCalculator;
use Lodgik\Module\Booking\DTO\CreateBookingRequest;
use PHPUnit\Framework\TestCase;

final class BookingCalcAndDTOTest extends TestCase
{
    // ─── RateCalculator ────────────────────────────────────

    public function testNightlyCalculation(): void
    {
        $calc = new RateCalculator();
        $rt = $this->makeRoomType('25000.00', '5000.00');
        $ci = new \DateTimeImmutable('2026-03-01');
        $co = new \DateTimeImmutable('2026-03-04');

        $result = $calc->calculate($rt, BookingType::OVERNIGHT, $ci, $co);

        $this->assertEquals('25000.00', $result['rate']);
        $this->assertEquals(3, $result['nights']);
        $this->assertNull($result['hours']);
        $this->assertEquals('75000.00', $result['subtotal']);
        $this->assertEquals('75000.00', $result['total']);
    }

    public function testNightlyWithDiscount(): void
    {
        $calc = new RateCalculator();
        $rt = $this->makeRoomType('25000.00');
        $ci = new \DateTimeImmutable('2026-03-01');
        $co = new \DateTimeImmutable('2026-03-03');

        $result = $calc->calculate($rt, BookingType::OVERNIGHT, $ci, $co, '10000.00');

        $this->assertEquals('50000.00', $result['subtotal']);
        $this->assertEquals('10000.00', $result['discount']);
        $this->assertEquals('40000.00', $result['total']);
    }

    public function testHourlyCalculation3Hr(): void
    {
        $calc = new RateCalculator();
        $rt = $this->makeRoomType('25000.00', '5000.00');
        $ci = new \DateTimeImmutable('2026-03-01 10:00');
        $co = new \DateTimeImmutable('2026-03-01 13:00');

        $result = $calc->calculate($rt, BookingType::SHORT_REST_3HR, $ci, $co);

        $this->assertEquals('5000.00', $result['rate']);
        $this->assertEquals(3, $result['hours']);
        $this->assertEquals(0, $result['nights']);
        $this->assertEquals('15000.00', $result['total']);
    }

    public function testHourlyFallbackFromNightlyRate(): void
    {
        $calc = new RateCalculator();
        $rt = $this->makeRoomType('24000.00', null); // no hourly rate
        $ci = new \DateTimeImmutable('2026-03-01 10:00');
        $co = new \DateTimeImmutable('2026-03-01 16:00');

        $result = $calc->calculate($rt, BookingType::SHORT_REST_6HR, $ci, $co);

        $this->assertEquals('1000.00', $result['rate']); // 24000/24
        $this->assertEquals(6, $result['hours']);
        $this->assertEquals('6000.00', $result['total']);
    }

    public function testDiscountCannotGoNegative(): void
    {
        $calc = new RateCalculator();
        $rt = $this->makeRoomType('10000.00');
        $ci = new \DateTimeImmutable('2026-03-01');
        $co = new \DateTimeImmutable('2026-03-02');

        $result = $calc->calculate($rt, BookingType::OVERNIGHT, $ci, $co, '999999.00');
        $this->assertEquals('0.00', $result['total']);
    }

    // ─── CreateBookingRequest ──────────────────────────────

    public function testCreateBookingValidData(): void
    {
        $dto = CreateBookingRequest::fromArray([
            'property_id' => 'abc',
            'guest_id' => 'def',
            'booking_type' => 'overnight',
            'check_in' => '2026-03-01',
            'check_out' => '2026-03-03',
            'room_id' => 'ghi',
        ]);
        $this->assertEmpty($dto->validate());
    }

    public function testCreateBookingRequiresFields(): void
    {
        $dto = CreateBookingRequest::fromArray([]);
        $errors = $dto->validate();
        $this->assertArrayHasKey('property_id', $errors);
        $this->assertArrayHasKey('guest_id', $errors);
        $this->assertArrayHasKey('booking_type', $errors);
        $this->assertArrayHasKey('check_in', $errors);
        $this->assertArrayHasKey('check_out', $errors);
    }

    public function testCreateBookingRejectsInvalidType(): void
    {
        $dto = CreateBookingRequest::fromArray([
            'property_id' => 'a', 'guest_id' => 'b',
            'booking_type' => 'invalid',
            'check_in' => '2026-03-01', 'check_out' => '2026-03-03',
        ]);
        $this->assertArrayHasKey('booking_type', $dto->validate());
    }

    public function testCreateBookingRejectsCheckOutBeforeCheckIn(): void
    {
        $dto = CreateBookingRequest::fromArray([
            'property_id' => 'a', 'guest_id' => 'b',
            'booking_type' => 'overnight',
            'check_in' => '2026-03-05', 'check_out' => '2026-03-01',
        ]);
        $this->assertArrayHasKey('check_out', $dto->validate());
    }

    public function testCreateBookingRejectsInvalidAddon(): void
    {
        $dto = CreateBookingRequest::fromArray([
            'property_id' => 'a', 'guest_id' => 'b',
            'booking_type' => 'overnight',
            'check_in' => '2026-03-01', 'check_out' => '2026-03-03',
            'addons' => [['name' => '', 'amount' => '-5']],
        ]);
        $errors = $dto->validate();
        $this->assertArrayHasKey('addons.0.name', $errors);
        $this->assertArrayHasKey('addons.0.amount', $errors);
    }

    public function testBookingTypeEnum(): void
    {
        $this->assertCount(7, BookingType::values());
        $this->assertTrue(BookingType::SHORT_REST_3HR->isHourly());
        $this->assertFalse(BookingType::OVERNIGHT->isHourly());
        $this->assertEquals(3, BookingType::SHORT_REST_3HR->durationHours());
        $this->assertNull(BookingType::OVERNIGHT->durationHours());
    }

    public function testBookingStatusEnum(): void
    {
        $this->assertCount(6, \Lodgik\Enum\BookingStatus::values());
        $this->assertEquals('Checked In', \Lodgik\Enum\BookingStatus::CHECKED_IN->label());
    }

    // ─── Helper ────────────────────────────────────────────

    private function makeRoomType(string $baseRate, ?string $hourlyRate = null): RoomType
    {
        $rt = new RoomType('Test', 'prop-1', 'tenant-1', $baseRate);
        if ($hourlyRate !== null) {
            $rt->setHourlyRate($hourlyRate);
        }
        return $rt;
    }
}

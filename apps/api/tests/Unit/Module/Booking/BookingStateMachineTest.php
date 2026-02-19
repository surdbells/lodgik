<?php

declare(strict_types=1);

namespace Lodgik\Tests\Unit\Module\Booking;

use Lodgik\Enum\BookingStatus;
use Lodgik\Module\Booking\BookingStateMachine;
use PHPUnit\Framework\TestCase;

final class BookingStateMachineTest extends TestCase
{
    private BookingStateMachine $machine;

    protected function setUp(): void
    {
        $this->machine = new BookingStateMachine();
    }

    public function testPendingCanConfirm(): void
    {
        $this->assertTrue($this->machine->canTransition(BookingStatus::PENDING, BookingStatus::CONFIRMED));
    }

    public function testPendingCanCancel(): void
    {
        $this->assertTrue($this->machine->canTransition(BookingStatus::PENDING, BookingStatus::CANCELLED));
    }

    public function testPendingCannotCheckIn(): void
    {
        $this->assertFalse($this->machine->canTransition(BookingStatus::PENDING, BookingStatus::CHECKED_IN));
    }

    public function testConfirmedCanCheckIn(): void
    {
        $this->assertTrue($this->machine->canTransition(BookingStatus::CONFIRMED, BookingStatus::CHECKED_IN));
    }

    public function testConfirmedCanCancel(): void
    {
        $this->assertTrue($this->machine->canTransition(BookingStatus::CONFIRMED, BookingStatus::CANCELLED));
    }

    public function testConfirmedCanNoShow(): void
    {
        $this->assertTrue($this->machine->canTransition(BookingStatus::CONFIRMED, BookingStatus::NO_SHOW));
    }

    public function testCheckedInCanCheckOut(): void
    {
        $this->assertTrue($this->machine->canTransition(BookingStatus::CHECKED_IN, BookingStatus::CHECKED_OUT));
    }

    public function testCheckedInCannotCancel(): void
    {
        $this->assertFalse($this->machine->canTransition(BookingStatus::CHECKED_IN, BookingStatus::CANCELLED));
    }

    public function testCheckedOutIsTerminal(): void
    {
        $allowed = $this->machine->getAllowedTransitions(BookingStatus::CHECKED_OUT);
        $this->assertEmpty($allowed);
    }

    public function testCancelledIsTerminal(): void
    {
        $allowed = $this->machine->getAllowedTransitions(BookingStatus::CANCELLED);
        $this->assertEmpty($allowed);
    }

    public function testAssertThrowsOnInvalid(): void
    {
        $this->expectException(\InvalidArgumentException::class);
        $this->machine->assertTransition(BookingStatus::CHECKED_OUT, BookingStatus::PENDING);
    }
}

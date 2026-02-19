<?php

declare(strict_types=1);

namespace Lodgik\Tests\Unit\Module\Room;

use Lodgik\Enum\RoomStatus;
use Lodgik\Module\Room\RoomStatusMachine;
use PHPUnit\Framework\TestCase;

final class RoomStatusMachineTest extends TestCase
{
    private RoomStatusMachine $machine;

    protected function setUp(): void
    {
        $this->machine = new RoomStatusMachine();
    }

    public function testVacantCleanCanTransitionToOccupied(): void
    {
        $this->assertTrue($this->machine->canTransition(RoomStatus::VACANT_CLEAN, RoomStatus::OCCUPIED));
    }

    public function testVacantCleanCanTransitionToReserved(): void
    {
        $this->assertTrue($this->machine->canTransition(RoomStatus::VACANT_CLEAN, RoomStatus::RESERVED));
    }

    public function testVacantCleanCannotTransitionToVacantDirty(): void
    {
        $this->assertFalse($this->machine->canTransition(RoomStatus::VACANT_CLEAN, RoomStatus::VACANT_DIRTY));
    }

    public function testOccupiedCanTransitionToVacantDirty(): void
    {
        $this->assertTrue($this->machine->canTransition(RoomStatus::OCCUPIED, RoomStatus::VACANT_DIRTY));
    }

    public function testOccupiedCannotTransitionToVacantClean(): void
    {
        $this->assertFalse($this->machine->canTransition(RoomStatus::OCCUPIED, RoomStatus::VACANT_CLEAN));
    }

    public function testVacantDirtyCanTransitionToVacantClean(): void
    {
        $this->assertTrue($this->machine->canTransition(RoomStatus::VACANT_DIRTY, RoomStatus::VACANT_CLEAN));
    }

    public function testReservedCanTransitionToOccupied(): void
    {
        $this->assertTrue($this->machine->canTransition(RoomStatus::RESERVED, RoomStatus::OCCUPIED));
    }

    public function testMaintenanceCanTransitionToVacantDirty(): void
    {
        $this->assertTrue($this->machine->canTransition(RoomStatus::MAINTENANCE, RoomStatus::VACANT_DIRTY));
    }

    public function testAssertTransitionThrowsOnInvalid(): void
    {
        $this->expectException(\InvalidArgumentException::class);
        $this->machine->assertTransition(RoomStatus::OCCUPIED, RoomStatus::RESERVED);
    }

    public function testGetAllowedTransitions(): void
    {
        $allowed = $this->machine->getAllowedTransitions(RoomStatus::VACANT_CLEAN);
        $values = array_map(fn(RoomStatus $s) => $s->value, $allowed);
        $this->assertContains('reserved', $values);
        $this->assertContains('occupied', $values);
        $this->assertNotContains('vacant_dirty', $values);
    }

    public function testRoomStatusValues(): void
    {
        $this->assertCount(6, RoomStatus::values());
        $this->assertContains('vacant_clean', RoomStatus::values());
    }

    public function testRoomStatusLabels(): void
    {
        $this->assertEquals('Vacant Clean', RoomStatus::VACANT_CLEAN->label());
        $this->assertEquals('Occupied', RoomStatus::OCCUPIED->label());
    }
}

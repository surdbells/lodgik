<?php

declare(strict_types=1);

namespace Lodgik\Tests\Unit\Module\Room;

use Lodgik\Module\Room\DTO\CreateRoomTypeRequest;
use Lodgik\Module\Room\DTO\UpdateRoomTypeRequest;
use Lodgik\Module\Room\DTO\CreateRoomRequest;
use Lodgik\Module\Room\DTO\UpdateRoomRequest;
use Lodgik\Module\Room\DTO\BulkCreateRoomsRequest;
use PHPUnit\Framework\TestCase;

final class RoomDTOTest extends TestCase
{
    public function testCreateRoomTypeRequiresName(): void
    {
        $dto = CreateRoomTypeRequest::fromArray(['property_id' => 'abc', 'base_rate' => '15000']);
        $this->assertArrayHasKey('name', $dto->validate());
    }

    public function testCreateRoomTypeRequiresValidRate(): void
    {
        $dto = CreateRoomTypeRequest::fromArray(['property_id' => 'abc', 'name' => 'Test', 'base_rate' => '-100']);
        $this->assertArrayHasKey('base_rate', $dto->validate());
    }

    public function testCreateRoomTypeValid(): void
    {
        $dto = CreateRoomTypeRequest::fromArray([
            'property_id' => 'abc', 'name' => 'Standard', 'base_rate' => '15000', 'max_occupancy' => 2,
        ]);
        $this->assertEmpty($dto->validate());
    }

    public function testCreateRoomTypeRejectsHighOccupancy(): void
    {
        $dto = CreateRoomTypeRequest::fromArray([
            'property_id' => 'abc', 'name' => 'Standard', 'base_rate' => '15000', 'max_occupancy' => 25,
        ]);
        $this->assertArrayHasKey('max_occupancy', $dto->validate());
    }

    public function testCreateRoomRequiresFields(): void
    {
        $dto = CreateRoomRequest::fromArray([]);
        $errors = $dto->validate();
        $this->assertArrayHasKey('property_id', $errors);
        $this->assertArrayHasKey('room_type_id', $errors);
        $this->assertArrayHasKey('room_number', $errors);
    }

    public function testCreateRoomValid(): void
    {
        $dto = CreateRoomRequest::fromArray([
            'property_id' => 'abc', 'room_type_id' => 'def', 'room_number' => '101', 'floor' => 1,
        ]);
        $this->assertEmpty($dto->validate());
    }

    public function testBulkCreateValid(): void
    {
        $dto = BulkCreateRoomsRequest::fromArray([
            'property_id' => 'abc', 'room_type_id' => 'def', 'floor' => 1,
            'prefix' => '', 'from' => 101, 'to' => 120,
        ]);
        $this->assertEmpty($dto->validate());
    }

    public function testBulkCreateRejectsInvertedRange(): void
    {
        $dto = BulkCreateRoomsRequest::fromArray([
            'property_id' => 'abc', 'room_type_id' => 'def', 'floor' => 1,
            'prefix' => '', 'from' => 120, 'to' => 101,
        ]);
        $this->assertArrayHasKey('range', $dto->validate());
    }

    public function testBulkCreateRejectsOver100(): void
    {
        $dto = BulkCreateRoomsRequest::fromArray([
            'property_id' => 'abc', 'room_type_id' => 'def', 'floor' => 1,
            'prefix' => '', 'from' => 1, 'to' => 200,
        ]);
        $this->assertArrayHasKey('range', $dto->validate());
    }

    public function testUpdateRoomTypePartial(): void
    {
        $dto = UpdateRoomTypeRequest::fromArray(['name' => 'Deluxe']);
        $this->assertEmpty($dto->validate());
        $this->assertEquals('Deluxe', $dto->name);
        $this->assertNull($dto->baseRate);
    }

    public function testUpdateRoomTypeRejectsEmptyName(): void
    {
        $dto = UpdateRoomTypeRequest::fromArray(['name' => '']);
        $this->assertArrayHasKey('name', $dto->validate());
    }

    public function testUpdateRoomPartial(): void
    {
        $dto = UpdateRoomRequest::fromArray(['floor' => 3]);
        $this->assertEmpty($dto->validate());
        $this->assertEquals(3, $dto->floor);
    }
}

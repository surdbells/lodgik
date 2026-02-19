<?php

declare(strict_types=1);

namespace Lodgik\Module\Room;

use Doctrine\ORM\EntityManagerInterface;
use Lodgik\Entity\Amenity;
use Lodgik\Entity\Property;
use Lodgik\Entity\Room;
use Lodgik\Entity\RoomStatusLog;
use Lodgik\Entity\RoomType;
use Lodgik\Enum\RoomStatus;
use Lodgik\Module\Room\DTO\BulkCreateRoomsRequest;
use Lodgik\Module\Room\DTO\CreateRoomRequest;
use Lodgik\Module\Room\DTO\CreateRoomTypeRequest;
use Lodgik\Module\Room\DTO\UpdateRoomRequest;
use Lodgik\Module\Room\DTO\UpdateRoomTypeRequest;
use Lodgik\Repository\AmenityRepository;
use Lodgik\Repository\RoomRepository;
use Lodgik\Repository\RoomStatusLogRepository;
use Lodgik\Repository\RoomTypeRepository;
use Psr\Log\LoggerInterface;

final class RoomService
{
    public function __construct(
        private readonly EntityManagerInterface $em,
        private readonly RoomRepository $roomRepo,
        private readonly RoomTypeRepository $roomTypeRepo,
        private readonly RoomStatusLogRepository $statusLogRepo,
        private readonly AmenityRepository $amenityRepo,
        private readonly RoomStatusMachine $statusMachine,
        private readonly LoggerInterface $logger,
    ) {}

    // ═══ Room Types ════════════════════════════════════════════

    /** @return array{items: RoomType[], total: int} */
    public function listRoomTypes(string $propertyId, ?bool $activeOnly = null, int $page = 1, int $limit = 50): array
    {
        return $this->roomTypeRepo->listByProperty($propertyId, $activeOnly, $page, $limit);
    }

    public function getRoomType(string $id): ?RoomType
    {
        return $this->roomTypeRepo->find($id);
    }

    public function createRoomType(CreateRoomTypeRequest $dto, string $tenantId, ?string $userId = null): RoomType
    {
        $property = $this->em->find(Property::class, $dto->propertyId);
        if ($property === null) {
            throw new \InvalidArgumentException('Property not found');
        }

        $existing = $this->roomTypeRepo->findByNameAndProperty($dto->name, $dto->propertyId);
        if ($existing !== null) {
            throw new \InvalidArgumentException("Room type '{$dto->name}' already exists for this property");
        }

        $roomType = new RoomType($dto->name, $dto->propertyId, $tenantId, $dto->baseRate);
        $roomType->setDescription($dto->description);
        $roomType->setHourlyRate($dto->hourlyRate);
        $roomType->setMaxOccupancy($dto->maxOccupancy);
        $roomType->setAmenities($dto->amenities);
        $roomType->setSortOrder($dto->sortOrder);

        $this->roomTypeRepo->save($roomType);
        $this->logger->info("Room type created: {$roomType->getName()}");
        return $roomType;
    }

    public function updateRoomType(string $id, UpdateRoomTypeRequest $dto, ?string $userId = null): RoomType
    {
        $roomType = $this->roomTypeRepo->findOrFail($id);

        if ($dto->name !== null) $roomType->setName($dto->name);
        if ($dto->baseRate !== null) $roomType->setBaseRate($dto->baseRate);
        if ($dto->hourlyRate !== null) $roomType->setHourlyRate($dto->hourlyRate === '' ? null : $dto->hourlyRate);
        if ($dto->description !== null) $roomType->setDescription($dto->description);
        if ($dto->maxOccupancy !== null) $roomType->setMaxOccupancy($dto->maxOccupancy);
        if ($dto->amenities !== null) $roomType->setAmenities($dto->amenities);
        if ($dto->sortOrder !== null) $roomType->setSortOrder($dto->sortOrder);
        if ($dto->isActive !== null) $roomType->setIsActive($dto->isActive);

        $this->roomTypeRepo->flush();
        return $roomType;
    }

    public function deleteRoomType(string $id, ?string $userId = null): void
    {
        $roomType = $this->roomTypeRepo->findOrFail($id);

        $result = $this->roomRepo->listRooms(
            propertyId: $roomType->getPropertyId(),
            roomTypeId: $id,
            activeOnly: true,
            page: 1,
            limit: 1
        );

        if ($result['total'] > 0) {
            throw new \InvalidArgumentException('Cannot delete room type with active rooms. Deactivate or reassign rooms first.');
        }

        $roomType->softDelete();
        $this->roomTypeRepo->flush();
    }

    // ═══ Rooms ═════════════════════════════════════════════════

    /** @return array{items: Room[], total: int} */
    public function listRooms(
        ?string $propertyId = null,
        ?string $roomTypeId = null,
        ?string $status = null,
        ?int $floor = null,
        ?string $search = null,
        ?bool $activeOnly = null,
        int $page = 1,
        int $limit = 50,
    ): array {
        return $this->roomRepo->listRooms($propertyId, $roomTypeId, $status, $floor, $search, $activeOnly, $page, $limit);
    }

    public function getRoom(string $id): ?Room
    {
        return $this->roomRepo->find($id);
    }

    public function createRoom(CreateRoomRequest $dto, string $tenantId, ?string $userId = null): Room
    {
        $property = $this->em->find(Property::class, $dto->propertyId);
        if ($property === null) {
            throw new \InvalidArgumentException('Property not found');
        }

        $roomType = $this->roomTypeRepo->find($dto->roomTypeId);
        if ($roomType === null) {
            throw new \InvalidArgumentException('Room type not found');
        }

        $existing = $this->roomRepo->findByNumber($dto->propertyId, $dto->roomNumber);
        if ($existing !== null) {
            throw new \InvalidArgumentException("Room number '{$dto->roomNumber}' already exists in this property");
        }

        $room = new Room($dto->roomNumber, $dto->roomTypeId, $dto->propertyId, $tenantId);
        $room->setFloor($dto->floor);
        $room->setNotes($dto->notes);
        $room->setAmenities($dto->amenities);

        $this->roomRepo->save($room);
        return $room;
    }

    /** @return Room[] */
    public function bulkCreateRooms(BulkCreateRoomsRequest $dto, string $tenantId, ?string $userId = null): array
    {
        $property = $this->em->find(Property::class, $dto->propertyId);
        if ($property === null) {
            throw new \InvalidArgumentException('Property not found');
        }

        $roomType = $this->roomTypeRepo->find($dto->roomTypeId);
        if ($roomType === null) {
            throw new \InvalidArgumentException('Room type not found');
        }

        $rooms = [];
        for ($i = $dto->from; $i <= $dto->to; $i++) {
            $roomNumber = $dto->prefix . str_pad((string) $i, 2, '0', STR_PAD_LEFT);

            $existing = $this->roomRepo->findByNumber($dto->propertyId, $roomNumber);
            if ($existing !== null) {
                continue;
            }

            $room = new Room($roomNumber, $dto->roomTypeId, $dto->propertyId, $tenantId);
            $room->setFloor($dto->floor);
            $this->em->persist($room);
            $rooms[] = $room;
        }

        if (!empty($rooms)) {
            $this->em->flush();
            $this->logger->info("Bulk created " . count($rooms) . " rooms");
        }

        return $rooms;
    }

    public function updateRoom(string $id, UpdateRoomRequest $dto, ?string $userId = null): Room
    {
        $room = $this->roomRepo->findOrFail($id);

        if ($dto->roomTypeId !== null) {
            $roomType = $this->roomTypeRepo->find($dto->roomTypeId);
            if ($roomType === null) {
                throw new \InvalidArgumentException('Room type not found');
            }
            $room->setRoomTypeId($dto->roomTypeId);
        }

        if ($dto->roomNumber !== null) {
            $existing = $this->roomRepo->findByNumber($room->getPropertyId(), $dto->roomNumber);
            if ($existing !== null && $existing->getId() !== $id) {
                throw new \InvalidArgumentException("Room number '{$dto->roomNumber}' already exists in this property");
            }
            $room->setRoomNumber($dto->roomNumber);
        }

        if ($dto->floor !== null) $room->setFloor($dto->floor);
        if ($dto->notes !== null) $room->setNotes($dto->notes);
        if ($dto->amenities !== null) $room->setAmenities($dto->amenities);
        if ($dto->isActive !== null) $room->setIsActive($dto->isActive);

        $this->roomRepo->flush();
        return $room;
    }

    public function deleteRoom(string $id, ?string $userId = null): void
    {
        $room = $this->roomRepo->findOrFail($id);

        if ($room->getStatus() === RoomStatus::OCCUPIED) {
            throw new \InvalidArgumentException('Cannot delete an occupied room');
        }

        $room->softDelete();
        $room->setIsActive(false);
        $this->roomRepo->flush();
    }

    // ═══ Room Status ═══════════════════════════════════════════

    public function changeStatus(string $roomId, RoomStatus $newStatus, ?string $userId = null, ?string $notes = null): Room
    {
        $room = $this->roomRepo->findOrFail($roomId);
        $oldStatus = $room->getStatus();

        $this->statusMachine->assertTransition($oldStatus, $newStatus);

        $room->setStatus($newStatus);

        $log = new RoomStatusLog($roomId, $oldStatus, $newStatus, $room->getTenantId());
        $log->setChangedBy($userId);
        $log->setNotes($notes);

        $this->em->persist($log);
        $this->em->flush();

        $this->logger->info("Room {$room->getRoomNumber()}: {$oldStatus->value} -> {$newStatus->value}");
        return $room;
    }

    /** @return RoomStatusLog[] */
    public function getStatusHistory(string $roomId, int $limit = 20): array
    {
        return $this->statusLogRepo->getHistory($roomId, $limit);
    }

    /** @return array<string, int> */
    public function getStatusCounts(string $propertyId): array
    {
        return $this->roomRepo->countByStatus($propertyId);
    }

    /** @return Room[] */
    public function getAvailableRooms(string $propertyId, ?string $roomTypeId = null): array
    {
        $result = $this->roomRepo->listRooms(
            propertyId: $propertyId,
            roomTypeId: $roomTypeId,
            status: RoomStatus::VACANT_CLEAN->value,
            activeOnly: true,
            page: 1,
            limit: 500,
        );
        return $result['items'];
    }

    /** @return int[] */
    public function getFloors(string $propertyId): array
    {
        return $this->roomRepo->getFloors($propertyId);
    }

    // ═══ Amenities ═════════════════════════════════════════════

    /** @return Amenity[] */
    public function listAmenities(?string $category = null): array
    {
        return $this->amenityRepo->listAll($category);
    }

    public function createAmenity(string $name, string $tenantId, ?string $category = null, ?string $icon = null): Amenity
    {
        $amenity = new Amenity($name, $tenantId);
        $amenity->setCategory($category);
        $amenity->setIcon($icon);
        $this->amenityRepo->save($amenity);
        return $amenity;
    }
}

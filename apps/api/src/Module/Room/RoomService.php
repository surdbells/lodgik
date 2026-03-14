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

    public function updateAmenity(string $id, array $data): ?\Lodgik\Entity\Amenity
    {
        $amenity = $this->em->find(\Lodgik\Entity\Amenity::class, $id);
        if (!$amenity) return null;
        if (isset($data['name'])) $amenity->setName($data['name']);
        if (isset($data['category'])) $amenity->setCategory($data['category']);
        if (isset($data['icon'])) $amenity->setIcon($data['icon']);
        if (isset($data['is_active'])) $amenity->setIsActive((bool)$data['is_active']);
        $this->em->flush();
        return $amenity;
    }

    public function deleteAmenity(string $id): void
    {
        $amenity = $this->em->find(\Lodgik\Entity\Amenity::class, $id);
        if ($amenity) { $this->em->remove($amenity); $this->em->flush(); }
    }

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
    /**
     * Get rooms available for a room change on a given booking.
     * Returns only rooms of the same type or higher (by sort_order),
     * that are not currently assigned to any overlapping booking,
     * and are in VACANT_CLEAN status.
     * Enriches each room with room_type_name and base_rate.
     */
    public function getRoomsForChange(string $bookingId, string $propertyId): array
    {
        // Load the booking to know its dates and current room
        $booking = $this->em->find(\Lodgik\Entity\Booking::class, $bookingId);
        if (!$booking) {
            return [];
        }

        $currentRoomId   = $booking->getRoomId();
        $currentSortOrder = 0;

        if ($currentRoomId) {
            $currentRoom = $this->roomRepo->find($currentRoomId);
            if ($currentRoom) {
                $currentType = $this->em->find(\Lodgik\Entity\RoomType::class, $currentRoom->getRoomTypeId());
                if ($currentType) {
                    $currentSortOrder = $currentType->getSortOrder();
                }
            }
        }

        // Get all available (VACANT_CLEAN) rooms for this property
        $result = $this->roomRepo->listRooms(
            propertyId: $propertyId,
            status: \Lodgik\Enum\RoomStatus::VACANT_CLEAN->value,
            activeOnly: true,
            page: 1,
            limit: 500,
        );

        $rooms = [];
        foreach ($result['items'] as $room) {
            // Exclude current room
            if ($room->getId() === $currentRoomId) {
                continue;
            }

            // Load room type
            $roomType = $this->em->find(\Lodgik\Entity\RoomType::class, $room->getRoomTypeId());
            if (!$roomType) {
                continue;
            }

            // Only same or higher type
            if ($roomType->getSortOrder() < $currentSortOrder) {
                continue;
            }

            // Check no booking overlap for this room during the booking's dates
            $bookingRepo = $this->em->getRepository(\Lodgik\Entity\Booking::class);
            // Use a raw DQL overlap check
            $overlap = $this->em->createQuery(
                "SELECT COUNT(b.id) FROM Lodgik\Entity\Booking b
                 WHERE b.roomId = :roomId
                   AND b.id != :bookingId
                   AND b.status NOT IN ('cancelled','no_show','checked_out')
                   AND b.checkIn < :checkOut
                   AND b.checkOut > :checkIn"
            )
            ->setParameter('roomId',    $room->getId())
            ->setParameter('bookingId', $bookingId)
            ->setParameter('checkOut',  $booking->getCheckOut())
            ->setParameter('checkIn',   $booking->getCheckIn())
            ->getSingleScalarResult();

            if ($overlap > 0) {
                continue;
            }

            $currentTypeRate = $currentRoomId
                ? ((float) ($this->em->find(\Lodgik\Entity\RoomType::class, $room->getRoomTypeId())?->getBaseRate() ?? 0))
                : 0.0;

            $isUpgrade   = $roomType->getSortOrder() > $currentSortOrder;
            $rateDiff    = (float) $roomType->getBaseRate() - (float) ($currentType?->getBaseRate() ?? 0);

            // Remaining nights for pro-rata preview
            $now            = new \DateTimeImmutable('today');
            $checkOut       = $booking->getCheckOut();
            $from           = max($now, $booking->getCheckIn()->modify('midnight'));
            $remainingNights = max(1, (int) $from->diff($checkOut)->days);

            $rooms[] = [
                'id'              => $room->getId(),
                'room_number'     => $room->getRoomNumber(),
                'floor'           => $room->getFloor(),
                'status'          => $room->getStatus()->value,
                'status_label'    => $room->getStatus()->label(),
                'room_type_id'    => $roomType->getId(),
                'room_type_name'  => $roomType->getName(),
                'base_rate'       => $roomType->getBaseRate(),
                'max_occupancy'   => $roomType->getMaxOccupancy(),
                'is_upgrade'      => $isUpgrade,
                'rate_difference' => max(0, $rateDiff),
                'upgrade_total'   => max(0.0, $rateDiff * $remainingNights),
                'remaining_nights'=> $remainingNights,
                'amenities'       => $room->getAmenities(),
            ];
        }

        // Sort: same type first, then upgrades by sort_order, then by room number
        usort($rooms, fn($a, $b) =>
            [$a['is_upgrade'] ? 1 : 0, $a['base_rate'], $a['room_number']]
            <=>
            [$b['is_upgrade'] ? 1 : 0, $b['base_rate'], $b['room_number']]
        );

        return $rooms;
    }

}

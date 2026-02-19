<?php

declare(strict_types=1);

namespace Lodgik\Repository;

use Lodgik\Entity\Room;
use Lodgik\Enum\RoomStatus;

/**
 * @extends BaseRepository<Room>
 */
final class RoomRepository extends BaseRepository
{
    protected function getEntityClass(): string
    {
        return Room::class;
    }

    /**
     * List rooms with filters + pagination.
     *
     * @return array{items: Room[], total: int}
     */
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
        $qb = $this->createQueryBuilder('r')
            ->orderBy('r.floor', 'ASC')
            ->addOrderBy('r.roomNumber', 'ASC');

        if ($propertyId !== null) {
            $qb->andWhere('r.propertyId = :propertyId')
                ->setParameter('propertyId', $propertyId);
        }

        if ($roomTypeId !== null) {
            $qb->andWhere('r.roomTypeId = :roomTypeId')
                ->setParameter('roomTypeId', $roomTypeId);
        }

        if ($status !== null) {
            $qb->andWhere('r.status = :status')
                ->setParameter('status', $status);
        }

        if ($floor !== null) {
            $qb->andWhere('r.floor = :floor')
                ->setParameter('floor', $floor);
        }

        if ($search !== null && trim($search) !== '') {
            $qb->andWhere('LOWER(r.roomNumber) LIKE :search')
                ->setParameter('search', '%' . strtolower(trim($search)) . '%');
        }

        if ($activeOnly !== null) {
            $qb->andWhere('r.isActive = :active')
                ->setParameter('active', $activeOnly);
        }

        $qb->andWhere('r.deletedAt IS NULL');

        return $this->paginate($qb, $page, $limit, 'r');
    }

    /**
     * Find room by number within a property.
     */
    public function findByNumber(string $propertyId, string $roomNumber): ?Room
    {
        return $this->findOneBy([
            'propertyId' => $propertyId,
            'roomNumber' => $roomNumber,
        ]);
    }

    /**
     * Get rooms by status for a property.
     *
     * @return Room[]
     */
    public function findByStatus(string $propertyId, RoomStatus $status): array
    {
        return $this->findBy([
            'propertyId' => $propertyId,
            'status' => $status,
            'isActive' => true,
        ]);
    }

    /**
     * Count rooms grouped by status for a property.
     *
     * @return array<string, int>
     */
    public function countByStatus(string $propertyId): array
    {
        $results = $this->createQueryBuilder('r')
            ->select('r.status, COUNT(r.id) as cnt')
            ->where('r.propertyId = :propertyId')
            ->andWhere('r.isActive = true')
            ->andWhere('r.deletedAt IS NULL')
            ->setParameter('propertyId', $propertyId)
            ->groupBy('r.status')
            ->getQuery()
            ->getArrayResult();

        $counts = [];
        foreach (RoomStatus::values() as $s) {
            $counts[$s] = 0;
        }
        foreach ($results as $row) {
            $status = $row['status'] instanceof RoomStatus ? $row['status']->value : $row['status'];
            $counts[$status] = (int) $row['cnt'];
        }

        return $counts;
    }

    /**
     * Get distinct floors for a property.
     *
     * @return int[]
     */
    public function getFloors(string $propertyId): array
    {
        $results = $this->createQueryBuilder('r')
            ->select('DISTINCT r.floor')
            ->where('r.propertyId = :propertyId')
            ->andWhere('r.floor IS NOT NULL')
            ->andWhere('r.deletedAt IS NULL')
            ->setParameter('propertyId', $propertyId)
            ->orderBy('r.floor', 'ASC')
            ->getQuery()
            ->getSingleColumnResult();

        return array_map('intval', $results);
    }
}

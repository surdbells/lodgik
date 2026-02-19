<?php

declare(strict_types=1);

namespace Lodgik\Repository;

use Lodgik\Entity\RoomType;

/**
 * @extends BaseRepository<RoomType>
 */
final class RoomTypeRepository extends BaseRepository
{
    protected function getEntityClass(): string
    {
        return RoomType::class;
    }

    /**
     * @return array{items: RoomType[], total: int}
     */
    public function listByProperty(
        string $propertyId,
        ?bool $activeOnly = null,
        int $page = 1,
        int $limit = 50,
    ): array {
        $qb = $this->createQueryBuilder('rt')
            ->where('rt.propertyId = :propertyId')
            ->setParameter('propertyId', $propertyId)
            ->orderBy('rt.sortOrder', 'ASC')
            ->addOrderBy('rt.name', 'ASC');

        if ($activeOnly !== null) {
            $qb->andWhere('rt.isActive = :active')
                ->setParameter('active', $activeOnly);
        }

        $qb->andWhere('rt.deletedAt IS NULL');

        return $this->paginate($qb, $page, $limit, 'rt');
    }

    public function findByNameAndProperty(string $name, string $propertyId): ?RoomType
    {
        return $this->findOneBy([
            'name' => $name,
            'propertyId' => $propertyId,
        ]);
    }
}

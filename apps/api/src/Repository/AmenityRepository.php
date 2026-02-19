<?php

declare(strict_types=1);

namespace Lodgik\Repository;

use Lodgik\Entity\Amenity;

/**
 * @extends BaseRepository<Amenity>
 */
final class AmenityRepository extends BaseRepository
{
    protected function getEntityClass(): string
    {
        return Amenity::class;
    }

    /**
     * @return Amenity[]
     */
    public function listAll(?string $category = null): array
    {
        $qb = $this->createQueryBuilder('a')
            ->where('a.isActive = true')
            ->orderBy('a.category', 'ASC')
            ->addOrderBy('a.name', 'ASC');

        if ($category !== null) {
            $qb->andWhere('a.category = :cat')
                ->setParameter('cat', $category);
        }

        return $qb->getQuery()->getResult();
    }
}

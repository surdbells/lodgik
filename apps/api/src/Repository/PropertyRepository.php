<?php

declare(strict_types=1);

namespace Lodgik\Repository;

use Lodgik\Entity\Property;

/**
 * @extends BaseRepository<Property>
 */
final class PropertyRepository extends BaseRepository
{
    protected function getEntityClass(): string
    {
        return Property::class;
    }

    /**
     * @return Property[]
     */
    public function findActive(): array
    {
        return $this->findBy(['isActive' => true], ['name' => 'ASC']);
    }

    public function countActive(): int
    {
        return $this->count(['isActive' => true]);
    }
}

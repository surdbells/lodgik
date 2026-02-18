<?php

declare(strict_types=1);

namespace Lodgik\Repository;

use Lodgik\Entity\Tenant;

/**
 * @extends BaseRepository<Tenant>
 */
final class TenantRepository extends BaseRepository
{
    protected function getEntityClass(): string
    {
        return Tenant::class;
    }

    public function findBySlug(string $slug): ?Tenant
    {
        return $this->findOneBy(['slug' => $slug]);
    }

    public function slugExists(string $slug): bool
    {
        return $this->findBySlug($slug) !== null;
    }
}

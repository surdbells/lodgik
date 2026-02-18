<?php

declare(strict_types=1);

namespace Lodgik\Entity\Contract;

/**
 * Marker interface for entities that are tenant-scoped.
 * Any entity implementing this will have `WHERE tenant_id = ?` auto-applied.
 */
interface TenantAware
{
    public function getTenantId(): string;

    public function setTenantId(string $tenantId): void;
}

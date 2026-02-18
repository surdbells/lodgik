<?php

declare(strict_types=1);

namespace Lodgik\Doctrine\Listener;

use Doctrine\ORM\Event\PrePersistEventArgs;
use Lodgik\Entity\Contract\TenantAware;

/**
 * Automatically sets tenant_id on new TenantAware entities
 * using the current request's tenant context.
 */
final class TenantListener
{
    private ?string $currentTenantId = null;

    /**
     * Set the current tenant ID for this request.
     * Called by TenantMiddleware after JWT verification.
     */
    public function setCurrentTenantId(string $tenantId): void
    {
        $this->currentTenantId = $tenantId;
    }

    public function getCurrentTenantId(): ?string
    {
        return $this->currentTenantId;
    }

    /**
     * Auto-set tenant_id on new entities that implement TenantAware.
     */
    public function prePersist(PrePersistEventArgs $args): void
    {
        $entity = $args->getObject();

        if (!$entity instanceof TenantAware) {
            return;
        }

        // Only auto-set if not already set (allows manual override for seeding/admin)
        if ($entity->getTenantId() === '' || $entity->getTenantId() === null) {
            if ($this->currentTenantId === null) {
                throw new \RuntimeException(
                    'Cannot persist TenantAware entity without a tenant context. '
                    . 'Ensure TenantMiddleware has run or set tenant_id manually.'
                );
            }

            $entity->setTenantId($this->currentTenantId);
        }
    }
}

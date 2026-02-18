<?php

declare(strict_types=1);

namespace Lodgik\Entity\Traits;

use Doctrine\ORM\Mapping as ORM;

trait HasTenant
{
    #[ORM\Column(name: 'tenant_id', type: 'string', length: 36)]
    private string $tenantId;

    public function getTenantId(): string
    {
        return $this->tenantId;
    }

    public function setTenantId(string $tenantId): void
    {
        $this->tenantId = $tenantId;
    }
}

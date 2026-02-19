<?php

declare(strict_types=1);

namespace Lodgik\Entity;

use Doctrine\DBAL\Types\Types;
use Doctrine\ORM\Mapping as ORM;
use Lodgik\Entity\Traits\HasUuid;
use Lodgik\Entity\Traits\HasTenant;
use Lodgik\Entity\Traits\HasTimestamps;

#[ORM\Entity]
#[ORM\Table(name: 'tax_configurations')]
#[ORM\UniqueConstraint(name: 'uq_tax_tenant_key', columns: ['tenant_id', 'tax_key'])]
#[ORM\HasLifecycleCallbacks]
class TaxConfiguration
{
    use HasUuid;
    use HasTenant;
    use HasTimestamps;

    #[ORM\Column(name: 'tax_key', type: 'string', length: 30)]
    private string $taxKey; // 'vat', 'tourism_levy', etc.

    #[ORM\Column(name: 'name', type: 'string', length: 100)]
    private string $name;

    #[ORM\Column(name: 'rate', type: Types::DECIMAL, precision: 5, scale: 2)]
    private string $rate; // e.g. 7.50 for 7.5%

    #[ORM\Column(name: 'is_inclusive', type: 'boolean', options: ['default' => false])]
    private bool $isInclusive = false;

    #[ORM\Column(name: 'is_active', type: 'boolean', options: ['default' => true])]
    private bool $isActive = true;

    #[ORM\Column(name: 'applies_to', type: 'string', length: 50, options: ['default' => 'all'])]
    private string $appliesTo = 'all'; // 'all', 'room', 'service'

    public function __construct(string $taxKey, string $name, string $rate, string $tenantId)
    {
        $this->generateId();
        $this->taxKey = $taxKey;
        $this->name = $name;
        $this->rate = $rate;
        $this->tenantId = $tenantId;
    }

    public function getTaxKey(): string { return $this->taxKey; }
    public function getName(): string { return $this->name; }
    public function getRate(): string { return $this->rate; }
    public function isInclusive(): bool { return $this->isInclusive; }
    public function setIsInclusive(bool $v): void { $this->isInclusive = $v; }
    public function isActive(): bool { return $this->isActive; }
    public function setIsActive(bool $v): void { $this->isActive = $v; }
    public function getAppliesTo(): string { return $this->appliesTo; }
    public function setAppliesTo(string $v): void { $this->appliesTo = $v; }

    public function toArray(): array
    {
        return [
            'id' => $this->id,
            'tax_key' => $this->taxKey,
            'name' => $this->name,
            'rate' => $this->rate,
            'is_inclusive' => $this->isInclusive,
            'is_active' => $this->isActive,
            'applies_to' => $this->appliesTo,
        ];
    }
}

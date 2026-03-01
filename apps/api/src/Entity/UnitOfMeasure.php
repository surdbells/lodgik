<?php

declare(strict_types=1);

namespace Lodgik\Entity;

use Doctrine\DBAL\Types\Types;
use Doctrine\ORM\Mapping as ORM;
use Lodgik\Entity\Contract\TenantAware;
use Lodgik\Entity\Traits\HasUuid;
use Lodgik\Entity\Traits\HasTenant;
use Lodgik\Entity\Traits\HasTimestamps;

#[ORM\Entity]
#[ORM\Table(name: 'units_of_measure')]
#[ORM\UniqueConstraint(name: 'uq_uom_name', columns: ['tenant_id', 'name'])]
#[ORM\HasLifecycleCallbacks]
class UnitOfMeasure implements TenantAware
{
    use HasUuid, HasTenant, HasTimestamps;

    /** e.g. "Kilogram", "Litre", "Piece", "Case (24)" */
    #[ORM\Column(type: Types::STRING, length: 80)]
    private string $name;

    /** Short code used on labels: kg, L, pcs, cs24 */
    #[ORM\Column(type: Types::STRING, length: 20)]
    private string $symbol;

    /**
     * The base unit this unit converts to. NULL means this IS a base unit.
     * e.g. "Kilogram" has base_unit_id = NULL
     *      "Gram" has base_unit_id = kg_uuid, conversion_factor = 0.001
     *      "Case (24)" has base_unit_id = pcs_uuid, conversion_factor = 24
     */
    #[ORM\Column(name: 'base_unit_id', type: Types::STRING, length: 36, nullable: true)]
    private ?string $baseUnitId = null;

    /**
     * How many base units equal one of THIS unit.
     * e.g. 1 Case = 24 pieces → conversion_factor = 24
     *      1 Gram = 0.001 kg  → conversion_factor = 0.001
     */
    #[ORM\Column(name: 'conversion_factor', type: Types::DECIMAL, precision: 15, scale: 6, options: ['default' => '1.000000'])]
    private string $conversionFactor = '1.000000';

    /** weight | volume | count | length | area */
    #[ORM\Column(type: Types::STRING, length: 20, options: ['default' => 'count'])]
    private string $type = 'count';

    #[ORM\Column(name: 'is_active', type: Types::BOOLEAN, options: ['default' => true])]
    private bool $isActive = true;

    public function __construct(string $name, string $symbol, string $tenantId, string $type = 'count')
    {
        $this->generateId();
        $this->name   = $name;
        $this->symbol = $symbol;
        $this->type   = $type;
        $this->setTenantId($tenantId);
    }

    public function getName(): string { return $this->name; }
    public function setName(string $v): void { $this->name = $v; }

    public function getSymbol(): string { return $this->symbol; }
    public function setSymbol(string $v): void { $this->symbol = $v; }

    public function getBaseUnitId(): ?string { return $this->baseUnitId; }
    public function setBaseUnitId(?string $v): void { $this->baseUnitId = $v; }

    public function getConversionFactor(): string { return $this->conversionFactor; }
    public function setConversionFactor(string $v): void { $this->conversionFactor = $v; }

    public function getType(): string { return $this->type; }
    public function setType(string $v): void { $this->type = $v; }

    public function isActive(): bool { return $this->isActive; }
    public function setIsActive(bool $v): void { $this->isActive = $v; }

    public function toArray(): array
    {
        return [
            'id'                => $this->getId(),
            'tenant_id'         => $this->getTenantId(),
            'name'              => $this->name,
            'symbol'            => $this->symbol,
            'type'              => $this->type,
            'base_unit_id'      => $this->baseUnitId,
            'conversion_factor' => $this->conversionFactor,
            'is_active'         => $this->isActive,
            'created_at'        => $this->createdAt->format('Y-m-d H:i:s'),
            'updated_at'        => $this->updatedAt->format('Y-m-d H:i:s'),
        ];
    }
}

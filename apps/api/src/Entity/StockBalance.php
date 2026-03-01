<?php

declare(strict_types=1);

namespace Lodgik\Entity;

use Doctrine\DBAL\Types\Types;
use Doctrine\ORM\Mapping as ORM;
use Lodgik\Entity\Contract\TenantAware;
use Lodgik\Entity\Traits\HasUuid;
use Lodgik\Entity\Traits\HasTenant;
use Lodgik\Entity\Traits\HasTimestamps;

/**
 * Tracks the current on-hand quantity of a stock item at a specific location.
 * One row per (tenant, item, location) triplet.
 *
 * Quantities are in ISSUE units (the smallest unit of measure).
 * All movements (GRN, Issue, Adjustment) adjust quantity_on_hand here.
 */
#[ORM\Entity]
#[ORM\Table(name: 'stock_balances')]
#[ORM\UniqueConstraint(name: 'uq_sb_item_location', columns: ['tenant_id', 'item_id', 'location_id'])]
#[ORM\Index(columns: ['tenant_id', 'location_id'], name: 'stk_bal_location')]
#[ORM\Index(columns: ['tenant_id', 'item_id'], name: 'stk_bal_item')]
#[ORM\HasLifecycleCallbacks]
class StockBalance implements TenantAware
{
    use HasUuid, HasTenant, HasTimestamps;

    #[ORM\Column(name: 'item_id', type: Types::STRING, length: 36)]
    private string $itemId;

    #[ORM\Column(name: 'location_id', type: Types::STRING, length: 36)]
    private string $locationId;

    /** property_id denormalised from the location for fast property-level queries */
    #[ORM\Column(name: 'property_id', type: Types::STRING, length: 36, nullable: true)]
    private ?string $propertyId = null;

    /**
     * Current on-hand quantity in ISSUE units.
     * Stored as DECIMAL to support fractional quantities (e.g. 0.5 kg).
     */
    #[ORM\Column(name: 'quantity_on_hand', type: Types::DECIMAL, precision: 15, scale: 4, options: ['default' => '0.0000'])]
    private string $quantityOnHand = '0.0000';

    /**
     * Quantity reserved for open orders (not yet issued).
     * quantity_available = quantity_on_hand - quantity_reserved
     */
    #[ORM\Column(name: 'quantity_reserved', type: Types::DECIMAL, precision: 15, scale: 4, options: ['default' => '0.0000'])]
    private string $quantityReserved = '0.0000';

    /** Total value of on-hand stock in kobo (quantity_on_hand × average_cost at time of last movement) */
    #[ORM\Column(name: 'value_on_hand', type: Types::BIGINT, options: ['default' => 0])]
    private string $valueOnHand = '0';

    /** Timestamp of the last movement that touched this balance */
    #[ORM\Column(name: 'last_movement_at', type: Types::DATETIME_IMMUTABLE, nullable: true)]
    private ?\DateTimeImmutable $lastMovementAt = null;

    public function __construct(string $itemId, string $locationId, string $tenantId, ?string $propertyId = null)
    {
        $this->generateId();
        $this->itemId     = $itemId;
        $this->locationId = $locationId;
        $this->propertyId = $propertyId;
        $this->setTenantId($tenantId);
    }

    public function getItemId(): string { return $this->itemId; }
    public function getLocationId(): string { return $this->locationId; }
    public function getPropertyId(): ?string { return $this->propertyId; }
    public function setPropertyId(?string $v): void { $this->propertyId = $v; }

    public function getQuantityOnHand(): string { return $this->quantityOnHand; }
    public function setQuantityOnHand(string $v): void { $this->quantityOnHand = $v; }

    public function getQuantityReserved(): string { return $this->quantityReserved; }
    public function setQuantityReserved(string $v): void { $this->quantityReserved = $v; }

    public function getValueOnHand(): string { return $this->valueOnHand; }
    public function setValueOnHand(string $v): void { $this->valueOnHand = $v; }

    public function getLastMovementAt(): ?\DateTimeImmutable { return $this->lastMovementAt; }
    public function setLastMovementAt(?\DateTimeImmutable $v): void { $this->lastMovementAt = $v; }

    /** Derived: quantity available to issue right now */
    public function getQuantityAvailable(): string
    {
        return number_format(
            (float)$this->quantityOnHand - (float)$this->quantityReserved,
            4, '.', ''
        );
    }

    public function toArray(): array
    {
        return [
            'id'                 => $this->getId(),
            'tenant_id'          => $this->getTenantId(),
            'item_id'            => $this->itemId,
            'location_id'        => $this->locationId,
            'property_id'        => $this->propertyId,
            'quantity_on_hand'   => $this->quantityOnHand,
            'quantity_reserved'  => $this->quantityReserved,
            'quantity_available' => $this->getQuantityAvailable(),
            'value_on_hand'      => $this->valueOnHand,
            'last_movement_at'   => $this->lastMovementAt?->format('Y-m-d H:i:s'),
            'created_at'         => $this->createdAt->format('Y-m-d H:i:s'),
            'updated_at'         => $this->updatedAt->format('Y-m-d H:i:s'),
        ];
    }
}

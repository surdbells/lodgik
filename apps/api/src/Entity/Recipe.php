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
 * Recipe — links a POS product to its constituent stock ingredients.
 *
 * A product may have exactly one active recipe at a time.
 * yield_quantity / yield_uom define how much the recipe produces
 * (e.g. "1 serving" or "1 cocktail") — used to scale food cost calculations.
 */
#[ORM\Entity]
#[ORM\Table(name: 'recipes')]
#[ORM\UniqueConstraint(name: 'uq_recipe_product', columns: ['tenant_id', 'product_id'])]
#[ORM\Index(columns: ['tenant_id', 'property_id'], name: 'rec_property')]
#[ORM\Index(columns: ['tenant_id', 'is_active'], name: 'rec_active')]
#[ORM\HasLifecycleCallbacks]
class Recipe implements TenantAware
{
    use HasUuid, HasTenant, HasTimestamps;

    /** POS Product UUID this recipe belongs to */
    #[ORM\Column(name: 'product_id', type: Types::STRING, length: 36)]
    private string $productId;

    /** Denormalised — product name for quick display */
    #[ORM\Column(name: 'product_name', type: Types::STRING, length: 150)]
    private string $productName;

    #[ORM\Column(name: 'property_id', type: Types::STRING, length: 36, nullable: true)]
    private ?string $propertyId = null;

    /**
     * How many "portions" does this recipe yield?
     * Usually 1.0 — used when a single recipe makes multiple servings.
     */
    #[ORM\Column(name: 'yield_quantity', type: Types::DECIMAL, precision: 10, scale: 4, options: ['default' => '1.0000'])]
    private string $yieldQuantity = '1.0000';

    /** Unit label for the yield, e.g. "serving", "cocktail", "batch" */
    #[ORM\Column(name: 'yield_uom', type: Types::STRING, length: 50, options: ['default' => 'serving'])]
    private string $yieldUom = 'serving';

    #[ORM\Column(name: 'notes', type: Types::TEXT, nullable: true)]
    private ?string $notes = null;

    #[ORM\Column(name: 'is_active', type: Types::BOOLEAN, options: ['default' => true])]
    private bool $isActive = true;

    public function __construct(string $productId, string $productName, string $tenantId)
    {
        $this->generateId();
        $this->productId   = $productId;
        $this->productName = $productName;
        $this->setTenantId($tenantId);
    }

    public function getProductId(): string    { return $this->productId; }
    public function getProductName(): string  { return $this->productName; }
    public function setProductName(string $v): void { $this->productName = $v; }

    public function getPropertyId(): ?string  { return $this->propertyId; }
    public function setPropertyId(?string $v): void { $this->propertyId = $v; }

    public function getYieldQuantity(): string { return $this->yieldQuantity; }
    public function setYieldQuantity(string $v): void { $this->yieldQuantity = $v; }

    public function getYieldUom(): string { return $this->yieldUom; }
    public function setYieldUom(string $v): void { $this->yieldUom = $v; }

    public function getNotes(): ?string { return $this->notes; }
    public function setNotes(?string $v): void { $this->notes = $v; }

    public function isActive(): bool { return $this->isActive; }
    public function setIsActive(bool $v): void { $this->isActive = $v; }

    public function toArray(): array
    {
        return [
            'id'             => $this->getId(),
            'product_id'     => $this->productId,
            'product_name'   => $this->productName,
            'property_id'    => $this->propertyId,
            'yield_quantity' => $this->yieldQuantity,
            'yield_uom'      => $this->yieldUom,
            'notes'          => $this->notes,
            'is_active'      => $this->isActive,
            'created_at'     => $this->createdAt->format('Y-m-d H:i:s'),
            'updated_at'     => $this->updatedAt->format('Y-m-d H:i:s'),
        ];
    }
}

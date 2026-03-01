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
#[ORM\Table(name: 'pos_products')]
#[ORM\Index(columns: ['tenant_id', 'property_id', 'category_id'], name: 'idx_pp_category')]
#[ORM\HasLifecycleCallbacks]
class PosProduct implements TenantAware
{
    use HasUuid; use HasTenant; use HasTimestamps;

    #[ORM\Column(name: 'property_id', type: Types::STRING, length: 36)]
    private string $propertyId;
    #[ORM\Column(name: 'category_id', type: Types::STRING, length: 36)]
    private string $categoryId;
    #[ORM\Column(type: Types::STRING, length: 150)]
    private string $name;
    #[ORM\Column(type: Types::TEXT, nullable: true)]
    private ?string $description = null;
    /** Price in kobo */
    #[ORM\Column(type: Types::BIGINT)]
    private string $price;
    #[ORM\Column(name: 'is_available', type: Types::BOOLEAN, options: ['default' => true])]
    private bool $isAvailable = true;
    #[ORM\Column(name: 'prep_time_minutes', type: Types::INTEGER, options: ['default' => 15])]
    private int $prepTimeMinutes = 15;
    #[ORM\Column(name: 'sort_order', type: Types::INTEGER, options: ['default' => 0])]
    private int $sortOrder = 0;
    /** Goes to kitchen display if true */
    #[ORM\Column(name: 'requires_kitchen', type: Types::BOOLEAN, options: ['default' => true])]
    private bool $requiresKitchen = true;

    /**
     * Optional link to a StockItem for automatic deduction on POS order close.
     * NULL = no inventory deduction (e.g. service items, or not yet mapped).
     */
    #[ORM\Column(name: 'stock_item_id', type: Types::STRING, length: 36, nullable: true)]
    private ?string $stockItemId = null;

    public function __construct(string $propertyId, string $categoryId, string $name, string $price, string $tenantId)
    {
        $this->generateId(); $this->propertyId = $propertyId; $this->categoryId = $categoryId;
        $this->name = $name; $this->price = $price; $this->setTenantId($tenantId);
    }

    public function getPropertyId(): string { return $this->propertyId; }
    public function getCategoryId(): string { return $this->categoryId; }
    public function getName(): string { return $this->name; }
    public function setName(string $v): void { $this->name = $v; }
    public function getDescription(): ?string { return $this->description; }
    public function setDescription(?string $v): void { $this->description = $v; }
    public function getPrice(): string { return $this->price; }
    public function setPrice(string $v): void { $this->price = $v; }
    public function isAvailable(): bool { return $this->isAvailable; }
    public function setIsAvailable(bool $v): void { $this->isAvailable = $v; }
    public function getPrepTimeMinutes(): int { return $this->prepTimeMinutes; }
    public function setPrepTimeMinutes(int $v): void { $this->prepTimeMinutes = $v; }
    public function getRequiresKitchen(): bool { return $this->requiresKitchen; }
    public function setRequiresKitchen(bool $v): void { $this->requiresKitchen = $v; }
    public function getSortOrder(): int { return $this->sortOrder; }
    public function setSortOrder(int $v): void { $this->sortOrder = $v; }
    public function getStockItemId(): ?string { return $this->stockItemId; }
    public function setStockItemId(?string $v): void { $this->stockItemId = $v; }

    public function toArray(): array
    {
        return ['id' => $this->getId(), 'property_id' => $this->propertyId, 'category_id' => $this->categoryId, 'name' => $this->name, 'description' => $this->description, 'price' => $this->price, 'is_available' => $this->isAvailable, 'prep_time_minutes' => $this->prepTimeMinutes, 'requires_kitchen' => $this->requiresKitchen, 'sort_order' => $this->sortOrder, 'stock_item_id' => $this->stockItemId, 'created_at' => $this->getCreatedAt()?->format('Y-m-d H:i:s')];
    }
}

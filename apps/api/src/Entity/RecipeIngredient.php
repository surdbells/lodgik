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
 * RecipeIngredient — one stock item line in a recipe.
 *
 * quantity_per_yield is expressed in ISSUE units of the stock item
 * (the same unit used in StockBalance / deduction movements).
 */
#[ORM\Entity]
#[ORM\Table(name: 'recipe_ingredients')]
#[ORM\Index(columns: ['tenant_id', 'recipe_id'], name: 'ri_recipe')]
#[ORM\Index(columns: ['tenant_id', 'stock_item_id'], name: 'ri_item')]
#[ORM\HasLifecycleCallbacks]
class RecipeIngredient implements TenantAware
{
    use HasUuid, HasTenant, HasTimestamps;

    #[ORM\Column(name: 'recipe_id', type: Types::STRING, length: 36)]
    private string $recipeId;

    #[ORM\Column(name: 'stock_item_id', type: Types::STRING, length: 36)]
    private string $stockItemId;

    /** Denormalised for quick display without join */
    #[ORM\Column(name: 'item_sku', type: Types::STRING, length: 50)]
    private string $itemSku;

    #[ORM\Column(name: 'item_name', type: Types::STRING, length: 150)]
    private string $itemName;

    /** Units consumed per ONE yield of the recipe (in issue units) */
    #[ORM\Column(name: 'quantity_per_yield', type: Types::DECIMAL, precision: 15, scale: 6)]
    private string $quantityPerYield;

    /** Issue UOM symbol (e.g. "ml", "g", "pcs") — denormalised */
    #[ORM\Column(name: 'uom_symbol', type: Types::STRING, length: 20, options: ['default' => 'unit'])]
    private string $uomSymbol = 'unit';

    #[ORM\Column(type: Types::STRING, length: 200, nullable: true)]
    private ?string $notes = null;

    #[ORM\Column(name: 'sort_order', type: Types::INTEGER, options: ['default' => 0])]
    private int $sortOrder = 0;

    public function __construct(
        string $recipeId,
        string $stockItemId,
        string $itemSku,
        string $itemName,
        string $quantityPerYield,
        string $tenantId
    ) {
        $this->generateId();
        $this->recipeId         = $recipeId;
        $this->stockItemId      = $stockItemId;
        $this->itemSku          = $itemSku;
        $this->itemName         = $itemName;
        $this->quantityPerYield = $quantityPerYield;
        $this->setTenantId($tenantId);
    }

    public function getRecipeId(): string         { return $this->recipeId; }
    public function getStockItemId(): string      { return $this->stockItemId; }
    public function getItemSku(): string          { return $this->itemSku; }
    public function getItemName(): string         { return $this->itemName; }
    public function setItemName(string $v): void  { $this->itemName = $v; }

    public function getQuantityPerYield(): string { return $this->quantityPerYield; }
    public function setQuantityPerYield(string $v): void { $this->quantityPerYield = $v; }

    public function getUomSymbol(): string        { return $this->uomSymbol; }
    public function setUomSymbol(string $v): void { $this->uomSymbol = $v; }

    public function getNotes(): ?string  { return $this->notes; }
    public function setNotes(?string $v): void { $this->notes = $v; }

    public function getSortOrder(): int  { return $this->sortOrder; }
    public function setSortOrder(int $v): void { $this->sortOrder = $v; }

    public function toArray(): array
    {
        return [
            'id'                 => $this->getId(),
            'recipe_id'          => $this->recipeId,
            'stock_item_id'      => $this->stockItemId,
            'item_sku'           => $this->itemSku,
            'item_name'          => $this->itemName,
            'quantity_per_yield' => $this->quantityPerYield,
            'uom_symbol'         => $this->uomSymbol,
            'notes'              => $this->notes,
            'sort_order'         => $this->sortOrder,
        ];
    }
}

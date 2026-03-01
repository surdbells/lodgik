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
#[ORM\Table(name: 'stock_items')]
#[ORM\UniqueConstraint(name: 'uq_si_sku', columns: ['tenant_id', 'sku'])]
#[ORM\Index(columns: ['tenant_id', 'category_id'], name: 'stk_itm_category')]
#[ORM\Index(columns: ['tenant_id', 'is_active'], name: 'stk_itm_active')]
#[ORM\HasLifecycleCallbacks]
class StockItem implements TenantAware
{
    use HasUuid, HasTenant, HasTimestamps;

    /** Stock Keeping Unit — unique per tenant */
    #[ORM\Column(type: Types::STRING, length: 50)]
    private string $sku;

    #[ORM\Column(type: Types::STRING, length: 150)]
    private string $name;

    #[ORM\Column(type: Types::TEXT, nullable: true)]
    private ?string $description = null;

    #[ORM\Column(name: 'category_id', type: Types::STRING, length: 36)]
    private string $categoryId;

    /** UUID of the purchase unit (e.g. "Case") */
    #[ORM\Column(name: 'purchase_uom_id', type: Types::STRING, length: 36)]
    private string $purchaseUomId;

    /** UUID of the issue/consumption unit (e.g. "Bottle") */
    #[ORM\Column(name: 'issue_uom_id', type: Types::STRING, length: 36)]
    private string $issueUomId;

    /**
     * How many issue units per one purchase unit.
     * e.g. 1 Case of Heineken = 24 Bottles → purchase_to_issue_factor = 24
     */
    #[ORM\Column(name: 'purchase_to_issue_factor', type: Types::DECIMAL, precision: 15, scale: 6, options: ['default' => '1.000000'])]
    private string $purchaseToIssueFactor = '1.000000';

    /** Latest purchase cost per PURCHASE unit, in kobo */
    #[ORM\Column(name: 'last_purchase_cost', type: Types::BIGINT, options: ['default' => 0])]
    private string $lastPurchaseCost = '0';

    /** Weighted average cost per ISSUE unit, in kobo — recalculated on each GRN */
    #[ORM\Column(name: 'average_cost', type: Types::BIGINT, options: ['default' => 0])]
    private string $averageCost = '0';

    /** Minimum quantity (issue units) before reorder alert fires */
    #[ORM\Column(name: 'reorder_point', type: Types::DECIMAL, precision: 15, scale: 4, options: ['default' => '0.0000'])]
    private string $reorderPoint = '0.0000';

    /** Target quantity to have on hand (issue units) */
    #[ORM\Column(name: 'par_level', type: Types::DECIMAL, precision: 15, scale: 4, options: ['default' => '0.0000'])]
    private string $parLevel = '0.0000';

    /** Maximum storage quantity (issue units) — 0 = no maximum */
    #[ORM\Column(name: 'max_level', type: Types::DECIMAL, precision: 15, scale: 4, options: ['default' => '0.0000'])]
    private string $maxLevel = '0.0000';

    /** Perishable items require batch/expiry tracking */
    #[ORM\Column(name: 'is_perishable', type: Types::BOOLEAN, options: ['default' => false])]
    private bool $isPerishable = false;

    /** Alert N days before expiry (0 = no alert) */
    #[ORM\Column(name: 'expiry_alert_days', type: Types::INTEGER, options: ['default' => 0])]
    private int $expiryAlertDays = 0;

    /** barcode for scanning (optional) */
    #[ORM\Column(type: Types::STRING, length: 100, nullable: true)]
    private ?string $barcode = null;

    /** Optional image URL */
    #[ORM\Column(name: 'image_url', type: Types::STRING, length: 500, nullable: true)]
    private ?string $imageUrl = null;

    /** Preferred vendor name (denormalised for quick display) */
    #[ORM\Column(name: 'preferred_vendor', type: Types::STRING, length: 150, nullable: true)]
    private ?string $preferredVendor = null;

    #[ORM\Column(name: 'is_active', type: Types::BOOLEAN, options: ['default' => true])]
    private bool $isActive = true;

    public function __construct(
        string $sku,
        string $name,
        string $categoryId,
        string $purchaseUomId,
        string $issueUomId,
        string $tenantId
    ) {
        $this->generateId();
        $this->sku           = $sku;
        $this->name          = $name;
        $this->categoryId    = $categoryId;
        $this->purchaseUomId = $purchaseUomId;
        $this->issueUomId    = $issueUomId;
        $this->setTenantId($tenantId);
    }

    public function getSku(): string { return $this->sku; }
    public function setSku(string $v): void { $this->sku = $v; }

    public function getName(): string { return $this->name; }
    public function setName(string $v): void { $this->name = $v; }

    public function getDescription(): ?string { return $this->description; }
    public function setDescription(?string $v): void { $this->description = $v; }

    public function getCategoryId(): string { return $this->categoryId; }
    public function setCategoryId(string $v): void { $this->categoryId = $v; }

    public function getPurchaseUomId(): string { return $this->purchaseUomId; }
    public function setPurchaseUomId(string $v): void { $this->purchaseUomId = $v; }

    public function getIssueUomId(): string { return $this->issueUomId; }
    public function setIssueUomId(string $v): void { $this->issueUomId = $v; }

    public function getPurchaseToIssueFactor(): string { return $this->purchaseToIssueFactor; }
    public function setPurchaseToIssueFactor(string $v): void { $this->purchaseToIssueFactor = $v; }

    public function getLastPurchaseCost(): string { return $this->lastPurchaseCost; }
    public function setLastPurchaseCost(string $v): void { $this->lastPurchaseCost = $v; }

    public function getAverageCost(): string { return $this->averageCost; }
    public function setAverageCost(string $v): void { $this->averageCost = $v; }

    public function getReorderPoint(): string { return $this->reorderPoint; }
    public function setReorderPoint(string $v): void { $this->reorderPoint = $v; }

    public function getParLevel(): string { return $this->parLevel; }
    public function setParLevel(string $v): void { $this->parLevel = $v; }

    public function getMaxLevel(): string { return $this->maxLevel; }
    public function setMaxLevel(string $v): void { $this->maxLevel = $v; }

    public function isPerishable(): bool { return $this->isPerishable; }
    public function setIsPerishable(bool $v): void { $this->isPerishable = $v; }

    public function getExpiryAlertDays(): int { return $this->expiryAlertDays; }
    public function setExpiryAlertDays(int $v): void { $this->expiryAlertDays = $v; }

    public function getBarcode(): ?string { return $this->barcode; }
    public function setBarcode(?string $v): void { $this->barcode = $v; }

    public function getImageUrl(): ?string { return $this->imageUrl; }
    public function setImageUrl(?string $v): void { $this->imageUrl = $v; }

    public function getPreferredVendor(): ?string { return $this->preferredVendor; }
    public function setPreferredVendor(?string $v): void { $this->preferredVendor = $v; }

    public function isActive(): bool { return $this->isActive; }
    public function setIsActive(bool $v): void { $this->isActive = $v; }

    public function toArray(): array
    {
        return [
            'id'                      => $this->getId(),
            'tenant_id'               => $this->getTenantId(),
            'sku'                     => $this->sku,
            'name'                    => $this->name,
            'description'             => $this->description,
            'category_id'             => $this->categoryId,
            'purchase_uom_id'         => $this->purchaseUomId,
            'issue_uom_id'            => $this->issueUomId,
            'purchase_to_issue_factor'=> $this->purchaseToIssueFactor,
            'last_purchase_cost'      => $this->lastPurchaseCost,
            'average_cost'            => $this->averageCost,
            'reorder_point'           => $this->reorderPoint,
            'par_level'               => $this->parLevel,
            'max_level'               => $this->maxLevel,
            'is_perishable'           => $this->isPerishable,
            'expiry_alert_days'       => $this->expiryAlertDays,
            'barcode'                 => $this->barcode,
            'image_url'               => $this->imageUrl,
            'preferred_vendor'        => $this->preferredVendor,
            'is_active'               => $this->isActive,
            'created_at'              => $this->createdAt->format('Y-m-d H:i:s'),
            'updated_at'              => $this->updatedAt->format('Y-m-d H:i:s'),
        ];
    }
}

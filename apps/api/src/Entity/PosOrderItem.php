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
#[ORM\Table(name: 'pos_order_items')]
#[ORM\Index(columns: ['tenant_id', 'order_id'], name: 'idx_poi_order')]
#[ORM\HasLifecycleCallbacks]
class PosOrderItem implements TenantAware
{
    use HasUuid; use HasTenant; use HasTimestamps;

    #[ORM\Column(name: 'order_id', type: Types::STRING, length: 36)]
    private string $orderId;
    #[ORM\Column(name: 'product_id', type: Types::STRING, length: 36)]
    private string $productId;
    #[ORM\Column(name: 'product_name', type: Types::STRING, length: 150)]
    private string $productName;
    #[ORM\Column(type: Types::INTEGER)]
    private int $quantity;
    /** Unit price in kobo */
    #[ORM\Column(name: 'unit_price', type: Types::BIGINT)]
    private string $unitPrice;
    /** Line total in kobo */
    #[ORM\Column(name: 'line_total', type: Types::BIGINT)]
    private string $lineTotal;
    /** 'pending', 'preparing', 'ready', 'served', 'cancelled' */
    #[ORM\Column(type: Types::STRING, length: 20, options: ['default' => 'pending'])]
    private string $status = 'pending';
    #[ORM\Column(type: Types::TEXT, nullable: true)]
    private ?string $notes = null;
    #[ORM\Column(name: 'requires_kitchen', type: Types::BOOLEAN, options: ['default' => true])]
    private bool $requiresKitchen = true;
    #[ORM\Column(name: 'prep_started_at', type: Types::DATETIME_IMMUTABLE, nullable: true)]
    private ?\DateTimeImmutable $prepStartedAt = null;
    #[ORM\Column(name: 'ready_at', type: Types::DATETIME_IMMUTABLE, nullable: true)]
    private ?\DateTimeImmutable $readyAt = null;
    /** For bill splitting */
    #[ORM\Column(name: 'split_group', type: Types::INTEGER, options: ['default' => 1])]
    private int $splitGroup = 1;

    public function __construct(string $orderId, string $productId, string $productName, int $quantity, string $unitPrice, string $tenantId)
    {
        $this->generateId(); $this->orderId = $orderId; $this->productId = $productId;
        $this->productName = $productName; $this->quantity = $quantity;
        $this->unitPrice = $unitPrice;
        $this->lineTotal = (string)(intval($unitPrice) * $quantity);
        $this->setTenantId($tenantId);
    }

    public function getOrderId(): string { return $this->orderId; }
    public function getProductId(): string { return $this->productId; }
    public function getProductName(): string { return $this->productName; }
    public function getQuantity(): int { return $this->quantity; }
    public function setQuantity(int $v): void { $this->quantity = $v; $this->lineTotal = (string)(intval($this->unitPrice) * $v); }
    public function getUnitPrice(): string { return $this->unitPrice; }
    public function getLineTotal(): string { return $this->lineTotal; }
    public function getStatus(): string { return $this->status; }
    public function getNotes(): ?string { return $this->notes; }
    public function setNotes(?string $v): void { $this->notes = $v; }
    public function getRequiresKitchen(): bool { return $this->requiresKitchen; }
    public function setRequiresKitchen(bool $v): void { $this->requiresKitchen = $v; }
    public function getSplitGroup(): int { return $this->splitGroup; }
    public function setSplitGroup(int $v): void { $this->splitGroup = $v; }

    public function startPrep(): void { $this->status = 'preparing'; $this->prepStartedAt = new \DateTimeImmutable(); }
    public function markReady(): void { $this->status = 'ready'; $this->readyAt = new \DateTimeImmutable(); }
    public function markServed(): void { $this->status = 'served'; }
    public function cancel(): void { $this->status = 'cancelled'; }

    public function getPrepTimeMinutes(): ?int
    {
        if (!$this->prepStartedAt || !$this->readyAt) return null;
        return (int)round(($this->readyAt->getTimestamp() - $this->prepStartedAt->getTimestamp()) / 60);
    }

    public function toArray(): array
    {
        return [
            'id' => $this->getId(), 'order_id' => $this->orderId,
            'product_id' => $this->productId, 'product_name' => $this->productName,
            'quantity' => $this->quantity, 'unit_price' => $this->unitPrice,
            'line_total' => $this->lineTotal, 'status' => $this->status,
            'notes' => $this->notes, 'requires_kitchen' => $this->requiresKitchen,
            'split_group' => $this->splitGroup,
            'prep_started_at' => $this->prepStartedAt?->format('Y-m-d H:i:s'),
            'ready_at' => $this->readyAt?->format('Y-m-d H:i:s'),
            'prep_time_minutes' => $this->getPrepTimeMinutes(),
            'created_at' => $this->getCreatedAt()?->format('Y-m-d H:i:s'),
        ];
    }
}

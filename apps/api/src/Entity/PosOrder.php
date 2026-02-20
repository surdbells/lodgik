<?php

declare(strict_types=1);

namespace Lodgik\Entity;

use Doctrine\DBAL\Types\Types;
use Doctrine\ORM\Mapping as ORM;
use Lodgik\Entity\Contract\TenantAware;
use Lodgik\Entity\Traits\HasUuid;
use Lodgik\Entity\Traits\HasTenant;
use Lodgik\Entity\Traits\HasTimestamps;
use Lodgik\Enum\PosOrderStatus;

#[ORM\Entity]
#[ORM\Table(name: 'pos_orders')]
#[ORM\Index(columns: ['tenant_id', 'property_id', 'status'], name: 'idx_po_status')]
#[ORM\Index(columns: ['tenant_id', 'table_id'], name: 'idx_po_table')]
#[ORM\HasLifecycleCallbacks]
class PosOrder implements TenantAware
{
    use HasUuid; use HasTenant; use HasTimestamps;

    #[ORM\Column(name: 'property_id', type: Types::STRING, length: 36)]
    private string $propertyId;

    #[ORM\Column(name: 'order_number', type: Types::STRING, length: 20)]
    private string $orderNumber;

    #[ORM\Column(name: 'table_id', type: Types::STRING, length: 36, nullable: true)]
    private ?string $tableId = null;

    #[ORM\Column(name: 'table_number', type: Types::STRING, length: 20, nullable: true)]
    private ?string $tableNumber = null;

    #[ORM\Column(type: Types::STRING, length: 20, enumType: PosOrderStatus::class)]
    private PosOrderStatus $status;

    /** 'dine_in', 'takeaway', 'room_service' */
    #[ORM\Column(name: 'order_type', type: Types::STRING, length: 20, options: ['default' => 'dine_in'])]
    private string $orderType = 'dine_in';

    /** Total in kobo */
    #[ORM\Column(name: 'subtotal', type: Types::BIGINT, options: ['default' => '0'])]
    private string $subtotal = '0';

    #[ORM\Column(name: 'total_amount', type: Types::BIGINT, options: ['default' => '0'])]
    private string $totalAmount = '0';

    /** 'direct', 'room_charge' */
    #[ORM\Column(name: 'payment_type', type: Types::STRING, length: 20, nullable: true)]
    private ?string $paymentType = null;

    #[ORM\Column(name: 'payment_method', type: Types::STRING, length: 20, nullable: true)]
    private ?string $paymentMethod = null;

    /** For room charge: link to booking folio */
    #[ORM\Column(name: 'folio_id', type: Types::STRING, length: 36, nullable: true)]
    private ?string $folioId = null;

    #[ORM\Column(name: 'booking_id', type: Types::STRING, length: 36, nullable: true)]
    private ?string $bookingId = null;

    #[ORM\Column(name: 'guest_name', type: Types::STRING, length: 100, nullable: true)]
    private ?string $guestName = null;

    #[ORM\Column(name: 'room_number', type: Types::STRING, length: 20, nullable: true)]
    private ?string $roomNumber = null;

    #[ORM\Column(name: 'served_by', type: Types::STRING, length: 36, nullable: true)]
    private ?string $servedBy = null;

    #[ORM\Column(name: 'served_by_name', type: Types::STRING, length: 100, nullable: true)]
    private ?string $servedByName = null;

    #[ORM\Column(type: Types::TEXT, nullable: true)]
    private ?string $notes = null;

    /** For bill splitting: split group ID */
    #[ORM\Column(name: 'split_from', type: Types::STRING, length: 36, nullable: true)]
    private ?string $splitFrom = null;

    #[ORM\Column(name: 'paid_at', type: Types::DATETIME_IMMUTABLE, nullable: true)]
    private ?\DateTimeImmutable $paidAt = null;

    /** Item count for kitchen display */
    #[ORM\Column(name: 'item_count', type: Types::INTEGER, options: ['default' => 0])]
    private int $itemCount = 0;

    public function __construct(string $propertyId, string $orderNumber, string $tenantId)
    {
        $this->generateId(); $this->propertyId = $propertyId;
        $this->orderNumber = $orderNumber; $this->status = PosOrderStatus::OPEN;
        $this->setTenantId($tenantId);
    }

    public function getPropertyId(): string { return $this->propertyId; }
    public function getOrderNumber(): string { return $this->orderNumber; }
    public function getTableId(): ?string { return $this->tableId; }
    public function setTableId(?string $v): void { $this->tableId = $v; }
    public function getTableNumber(): ?string { return $this->tableNumber; }
    public function setTableNumber(?string $v): void { $this->tableNumber = $v; }
    public function getStatus(): PosOrderStatus { return $this->status; }
    public function getOrderType(): string { return $this->orderType; }
    public function setOrderType(string $v): void { $this->orderType = $v; }
    public function getSubtotal(): string { return $this->subtotal; }
    public function setSubtotal(string $v): void { $this->subtotal = $v; }
    public function getTotalAmount(): string { return $this->totalAmount; }
    public function setTotalAmount(string $v): void { $this->totalAmount = $v; }
    public function getPaymentType(): ?string { return $this->paymentType; }
    public function setPaymentType(?string $v): void { $this->paymentType = $v; }
    public function getPaymentMethod(): ?string { return $this->paymentMethod; }
    public function setPaymentMethod(?string $v): void { $this->paymentMethod = $v; }
    public function getFolioId(): ?string { return $this->folioId; }
    public function setFolioId(?string $v): void { $this->folioId = $v; }
    public function getBookingId(): ?string { return $this->bookingId; }
    public function setBookingId(?string $v): void { $this->bookingId = $v; }
    public function getGuestName(): ?string { return $this->guestName; }
    public function setGuestName(?string $v): void { $this->guestName = $v; }
    public function getRoomNumber(): ?string { return $this->roomNumber; }
    public function setRoomNumber(?string $v): void { $this->roomNumber = $v; }
    public function getServedBy(): ?string { return $this->servedBy; }
    public function setServedBy(?string $v): void { $this->servedBy = $v; }
    public function getServedByName(): ?string { return $this->servedByName; }
    public function setServedByName(?string $v): void { $this->servedByName = $v; }
    public function getNotes(): ?string { return $this->notes; }
    public function setNotes(?string $v): void { $this->notes = $v; }
    public function getSplitFrom(): ?string { return $this->splitFrom; }
    public function setSplitFrom(?string $v): void { $this->splitFrom = $v; }
    public function getItemCount(): int { return $this->itemCount; }
    public function setItemCount(int $v): void { $this->itemCount = $v; }

    // State transitions
    public function send(): void { $this->status = PosOrderStatus::SENT; }
    public function preparing(): void { $this->status = PosOrderStatus::PREPARING; }
    public function ready(): void { $this->status = PosOrderStatus::READY; }
    public function serve(): void { $this->status = PosOrderStatus::SERVED; }
    public function pay(string $paymentType, ?string $method = null): void
    {
        $this->status = PosOrderStatus::PAID;
        $this->paymentType = $paymentType;
        $this->paymentMethod = $method;
        $this->paidAt = new \DateTimeImmutable();
    }
    public function cancel(): void { $this->status = PosOrderStatus::CANCELLED; }

    public function toArray(): array
    {
        return [
            'id' => $this->getId(), 'property_id' => $this->propertyId,
            'order_number' => $this->orderNumber, 'table_id' => $this->tableId,
            'table_number' => $this->tableNumber, 'status' => $this->status->value,
            'status_label' => $this->status->label(), 'status_color' => $this->status->color(),
            'order_type' => $this->orderType, 'subtotal' => $this->subtotal,
            'total_amount' => $this->totalAmount, 'payment_type' => $this->paymentType,
            'payment_method' => $this->paymentMethod, 'folio_id' => $this->folioId,
            'booking_id' => $this->bookingId, 'guest_name' => $this->guestName,
            'room_number' => $this->roomNumber, 'served_by' => $this->servedBy,
            'served_by_name' => $this->servedByName, 'notes' => $this->notes,
            'split_from' => $this->splitFrom, 'item_count' => $this->itemCount,
            'paid_at' => $this->paidAt?->format('Y-m-d H:i:s'),
            'created_at' => $this->getCreatedAt()?->format('Y-m-d H:i:s'),
        ];
    }
}

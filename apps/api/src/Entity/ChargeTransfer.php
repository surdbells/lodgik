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
 * Guest request to transfer charges from one room/folio to another.
 * Requires staff approval. Common in group bookings.
 */
#[ORM\Entity]
#[ORM\Table(name: 'charge_transfers')]
#[ORM\Index(columns: ['tenant_id', 'property_id', 'status'], name: 'idx_ct_status')]
#[ORM\HasLifecycleCallbacks]
class ChargeTransfer implements TenantAware
{
    use HasUuid;
    use HasTenant;
    use HasTimestamps;

    #[ORM\Column(name: 'property_id', type: Types::STRING, length: 36)]
    private string $propertyId;

    /** Source: where the charge currently is */
    #[ORM\Column(name: 'from_booking_id', type: Types::STRING, length: 36)]
    private string $fromBookingId;

    #[ORM\Column(name: 'from_room_number', type: Types::STRING, length: 10)]
    private string $fromRoomNumber;

    #[ORM\Column(name: 'from_folio_id', type: Types::STRING, length: 36, nullable: true)]
    private ?string $fromFolioId = null;

    /** Target: where to move the charge */
    #[ORM\Column(name: 'to_booking_id', type: Types::STRING, length: 36)]
    private string $toBookingId;

    #[ORM\Column(name: 'to_room_number', type: Types::STRING, length: 10)]
    private string $toRoomNumber;

    #[ORM\Column(name: 'to_folio_id', type: Types::STRING, length: 36, nullable: true)]
    private ?string $toFolioId = null;

    /** Guest who requested */
    #[ORM\Column(name: 'requested_by', type: Types::STRING, length: 36)]
    private string $requestedBy;

    #[ORM\Column(name: 'requested_by_name', type: Types::STRING, length: 150)]
    private string $requestedByName;

    /** Charge details */
    #[ORM\Column(type: Types::STRING, length: 200)]
    private string $description;

    /** Amount in kobo */
    #[ORM\Column(type: Types::DECIMAL, precision: 12, scale: 0)]
    private string $amount;

    #[ORM\Column(name: 'charge_id', type: Types::STRING, length: 36, nullable: true)]
    private ?string $chargeId = null;

    /** 'pending' | 'approved' | 'rejected' | 'completed' */
    #[ORM\Column(type: Types::STRING, length: 15, options: ['default' => 'pending'])]
    private string $status = 'pending';

    #[ORM\Column(name: 'approved_by', type: Types::STRING, length: 36, nullable: true)]
    private ?string $approvedBy = null;

    #[ORM\Column(name: 'approved_by_name', type: Types::STRING, length: 100, nullable: true)]
    private ?string $approvedByName = null;

    #[ORM\Column(type: Types::TEXT, nullable: true)]
    private ?string $reason = null;

    #[ORM\Column(name: 'rejection_reason', type: Types::TEXT, nullable: true)]
    private ?string $rejectionReason = null;

    public function __construct(string $propertyId, string $fromBookingId, string $fromRoomNumber, string $toBookingId, string $toRoomNumber, string $requestedBy, string $requestedByName, string $description, string $amount, string $tenantId)
    {
        $this->generateId();
        $this->propertyId = $propertyId;
        $this->fromBookingId = $fromBookingId;
        $this->fromRoomNumber = $fromRoomNumber;
        $this->toBookingId = $toBookingId;
        $this->toRoomNumber = $toRoomNumber;
        $this->requestedBy = $requestedBy;
        $this->requestedByName = $requestedByName;
        $this->description = $description;
        $this->amount = $amount;
        $this->setTenantId($tenantId);
    }

    public function getPropertyId(): string { return $this->propertyId; }
    public function getFromBookingId(): string { return $this->fromBookingId; }
    public function getFromRoomNumber(): string { return $this->fromRoomNumber; }
    public function getToBookingId(): string { return $this->toBookingId; }
    public function getToRoomNumber(): string { return $this->toRoomNumber; }
    public function getRequestedBy(): string { return $this->requestedBy; }
    public function getRequestedByName(): string { return $this->requestedByName; }
    public function getDescription(): string { return $this->description; }
    public function getAmount(): string { return $this->amount; }
    public function getStatus(): string { return $this->status; }
    public function getReason(): ?string { return $this->reason; }
    public function setReason(?string $v): void { $this->reason = $v; }
    public function setChargeId(?string $v): void { $this->chargeId = $v; }
    public function setFromFolioId(?string $v): void { $this->fromFolioId = $v; }
    public function setToFolioId(?string $v): void { $this->toFolioId = $v; }

    public function approve(string $userId, string $name): void { $this->status = 'approved'; $this->approvedBy = $userId; $this->approvedByName = $name; }
    public function reject(string $userId, string $name, ?string $reason = null): void { $this->status = 'rejected'; $this->approvedBy = $userId; $this->approvedByName = $name; $this->rejectionReason = $reason; }
    public function complete(): void { $this->status = 'completed'; }

    public function toArray(): array
    {
        return [
            'id' => $this->getId(), 'property_id' => $this->propertyId,
            'from_booking_id' => $this->fromBookingId, 'from_room_number' => $this->fromRoomNumber,
            'to_booking_id' => $this->toBookingId, 'to_room_number' => $this->toRoomNumber,
            'requested_by_name' => $this->requestedByName, 'description' => $this->description,
            'amount' => $this->amount, 'status' => $this->status, 'reason' => $this->reason,
            'approved_by_name' => $this->approvedByName, 'rejection_reason' => $this->rejectionReason,
            'created_at' => $this->getCreatedAt()?->format('Y-m-d H:i:s'),
        ];
    }
}

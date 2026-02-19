<?php

declare(strict_types=1);

namespace Lodgik\Entity;

use Doctrine\DBAL\Types\Types;
use Doctrine\ORM\Mapping as ORM;
use Lodgik\Entity\Traits\HasUuid;
use Lodgik\Entity\Traits\HasTenant;
use Lodgik\Entity\Traits\HasTimestamps;
use Lodgik\Enum\FolioStatus;

#[ORM\Entity]
#[ORM\Table(name: 'folios')]
#[ORM\Index(name: 'idx_folio_tenant', columns: ['tenant_id'])]
#[ORM\Index(name: 'idx_folio_booking', columns: ['tenant_id', 'booking_id'])]
#[ORM\Index(name: 'idx_folio_property', columns: ['tenant_id', 'property_id'])]
#[ORM\UniqueConstraint(name: 'uq_folio_ref', columns: ['tenant_id', 'folio_number'])]
#[ORM\HasLifecycleCallbacks]
class Folio
{
    use HasUuid;
    use HasTenant;
    use HasTimestamps;

    #[ORM\Column(name: 'property_id', type: 'string', length: 36)]
    private string $propertyId;

    #[ORM\Column(name: 'booking_id', type: 'string', length: 36)]
    private string $bookingId;

    #[ORM\Column(name: 'guest_id', type: 'string', length: 36)]
    private string $guestId;

    #[ORM\Column(name: 'folio_number', type: 'string', length: 30)]
    private string $folioNumber;

    #[ORM\Column(name: 'status', type: 'string', length: 20, enumType: FolioStatus::class)]
    private FolioStatus $status;

    #[ORM\Column(name: 'total_charges', type: Types::DECIMAL, precision: 12, scale: 2, options: ['default' => '0.00'])]
    private string $totalCharges = '0.00';

    #[ORM\Column(name: 'total_payments', type: Types::DECIMAL, precision: 12, scale: 2, options: ['default' => '0.00'])]
    private string $totalPayments = '0.00';

    #[ORM\Column(name: 'total_adjustments', type: Types::DECIMAL, precision: 12, scale: 2, options: ['default' => '0.00'])]
    private string $totalAdjustments = '0.00';

    #[ORM\Column(name: 'balance', type: Types::DECIMAL, precision: 12, scale: 2, options: ['default' => '0.00'])]
    private string $balance = '0.00';

    #[ORM\Column(name: 'closed_at', type: Types::DATETIME_IMMUTABLE, nullable: true)]
    private ?\DateTimeImmutable $closedAt = null;

    #[ORM\Column(name: 'closed_by', type: 'string', length: 36, nullable: true)]
    private ?string $closedBy = null;

    #[ORM\Column(name: 'notes', type: Types::TEXT, nullable: true)]
    private ?string $notes = null;

    public function __construct(string $propertyId, string $bookingId, string $guestId, string $folioNumber, string $tenantId)
    {
        $this->generateId();
        $this->propertyId = $propertyId;
        $this->bookingId = $bookingId;
        $this->guestId = $guestId;
        $this->folioNumber = $folioNumber;
        $this->tenantId = $tenantId;
        $this->status = FolioStatus::OPEN;
    }

    public function getPropertyId(): string { return $this->propertyId; }
    public function getBookingId(): string { return $this->bookingId; }
    public function getGuestId(): string { return $this->guestId; }
    public function getFolioNumber(): string { return $this->folioNumber; }
    public function getStatus(): FolioStatus { return $this->status; }
    public function setStatus(FolioStatus $status): void { $this->status = $status; }
    public function getTotalCharges(): string { return $this->totalCharges; }
    public function getTotalPayments(): string { return $this->totalPayments; }
    public function getTotalAdjustments(): string { return $this->totalAdjustments; }
    public function getBalance(): string { return $this->balance; }
    public function getClosedAt(): ?\DateTimeImmutable { return $this->closedAt; }
    public function setClosedAt(?\DateTimeImmutable $closedAt): void { $this->closedAt = $closedAt; }
    public function getClosedBy(): ?string { return $this->closedBy; }
    public function setClosedBy(?string $closedBy): void { $this->closedBy = $closedBy; }
    public function getNotes(): ?string { return $this->notes; }
    public function setNotes(?string $notes): void { $this->notes = $notes; }

    public function recalculate(string $charges, string $payments, string $adjustments): void
    {
        $this->totalCharges = $charges;
        $this->totalPayments = $payments;
        $this->totalAdjustments = $adjustments;
        // balance = charges - payments - adjustments
        $this->balance = number_format((float)$charges - (float)$payments - (float)$adjustments, 2, '.', '');
    }

    public function toArray(): array
    {
        return [
            'id' => $this->id,
            'property_id' => $this->propertyId,
            'booking_id' => $this->bookingId,
            'guest_id' => $this->guestId,
            'folio_number' => $this->folioNumber,
            'status' => $this->status->value,
            'status_label' => $this->status->label(),
            'status_color' => $this->status->color(),
            'total_charges' => $this->totalCharges,
            'total_payments' => $this->totalPayments,
            'total_adjustments' => $this->totalAdjustments,
            'balance' => $this->balance,
            'closed_at' => $this->closedAt?->format('c'),
            'closed_by' => $this->closedBy,
            'notes' => $this->notes,
            'created_at' => $this->createdAt->format('c'),
            'updated_at' => $this->updatedAt->format('c'),
        ];
    }
}

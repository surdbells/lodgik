<?php

declare(strict_types=1);

namespace Lodgik\Entity;

use Doctrine\DBAL\Types\Types;
use Doctrine\ORM\Mapping as ORM;
use Lodgik\Entity\Traits\HasUuid;
use Lodgik\Entity\Traits\HasTenant;
use Lodgik\Entity\Traits\HasTimestamps;
use Lodgik\Enum\PaymentMethod;
use Lodgik\Enum\PaymentStatus;

#[ORM\Entity]
#[ORM\Table(name: 'folio_payments')]
#[ORM\Index(name: 'idx_payment_folio', columns: ['tenant_id', 'folio_id'])]
#[ORM\Index(name: 'idx_payment_status', columns: ['tenant_id', 'status'])]
#[ORM\HasLifecycleCallbacks]
class FolioPayment
{
    use HasUuid;
    use HasTenant;
    use HasTimestamps;

    #[ORM\Column(name: 'folio_id', type: 'string', length: 36)]
    private string $folioId;

    #[ORM\Column(name: 'payment_method', type: 'string', length: 20, enumType: PaymentMethod::class)]
    private PaymentMethod $paymentMethod;

    #[ORM\Column(name: 'amount', type: Types::DECIMAL, precision: 12, scale: 2)]
    private string $amount;

    #[ORM\Column(name: 'status', type: 'string', length: 20, enumType: PaymentStatus::class)]
    private PaymentStatus $status;

    #[ORM\Column(name: 'payment_date', type: Types::DATE_IMMUTABLE)]
    private \DateTimeImmutable $paymentDate;

    // Bank transfer specific fields
    #[ORM\Column(name: 'sender_name', type: 'string', length: 255, nullable: true)]
    private ?string $senderName = null;

    #[ORM\Column(name: 'transfer_reference', type: 'string', length: 100, nullable: true)]
    private ?string $transferReference = null;

    #[ORM\Column(name: 'proof_image_url', type: 'string', length: 500, nullable: true)]
    private ?string $proofImageUrl = null;

    // Confirmation
    #[ORM\Column(name: 'recorded_by', type: 'string', length: 36, nullable: true)]
    private ?string $recordedBy = null;

    #[ORM\Column(name: 'confirmed_by', type: 'string', length: 36, nullable: true)]
    private ?string $confirmedBy = null;

    #[ORM\Column(name: 'confirmed_at', type: Types::DATETIME_IMMUTABLE, nullable: true)]
    private ?\DateTimeImmutable $confirmedAt = null;

    #[ORM\Column(name: 'rejection_reason', type: Types::TEXT, nullable: true)]
    private ?string $rejectionReason = null;

    #[ORM\Column(name: 'notes', type: Types::TEXT, nullable: true)]
    private ?string $notes = null;

    public function __construct(string $folioId, PaymentMethod $method, string $amount, string $tenantId)
    {
        $this->generateId();
        $this->folioId = $folioId;
        $this->paymentMethod = $method;
        $this->amount = $amount;
        $this->tenantId = $tenantId;
        $this->status = PaymentStatus::PENDING;
        $this->paymentDate = new \DateTimeImmutable();
    }

    public function getFolioId(): string { return $this->folioId; }
    public function getPaymentMethod(): PaymentMethod { return $this->paymentMethod; }
    public function getAmount(): string { return $this->amount; }
    public function getStatus(): PaymentStatus { return $this->status; }
    public function setStatus(PaymentStatus $status): void { $this->status = $status; }
    public function getPaymentDate(): \DateTimeImmutable { return $this->paymentDate; }
    public function getSenderName(): ?string { return $this->senderName; }
    public function setSenderName(?string $v): void { $this->senderName = $v; }
    public function getTransferReference(): ?string { return $this->transferReference; }
    public function setTransferReference(?string $v): void { $this->transferReference = $v; }
    public function getProofImageUrl(): ?string { return $this->proofImageUrl; }
    public function setProofImageUrl(?string $v): void { $this->proofImageUrl = $v; }
    public function getRecordedBy(): ?string { return $this->recordedBy; }
    public function setRecordedBy(?string $v): void { $this->recordedBy = $v; }
    public function getConfirmedBy(): ?string { return $this->confirmedBy; }
    public function setConfirmedBy(?string $v): void { $this->confirmedBy = $v; }
    public function getConfirmedAt(): ?\DateTimeImmutable { return $this->confirmedAt; }
    public function setConfirmedAt(?\DateTimeImmutable $v): void { $this->confirmedAt = $v; }
    public function getRejectionReason(): ?string { return $this->rejectionReason; }
    public function setRejectionReason(?string $v): void { $this->rejectionReason = $v; }
    public function getNotes(): ?string { return $this->notes; }
    public function setNotes(?string $v): void { $this->notes = $v; }

    public function toArray(): array
    {
        return [
            'id' => $this->id,
            'folio_id' => $this->folioId,
            'payment_method' => $this->paymentMethod->value,
            'payment_method_label' => $this->paymentMethod->label(),
            'amount' => $this->amount,
            'status' => $this->status->value,
            'status_label' => $this->status->label(),
            'status_color' => $this->status->color(),
            'payment_date' => $this->paymentDate->format('Y-m-d'),
            'sender_name' => $this->senderName,
            'transfer_reference' => $this->transferReference,
            'proof_image_url' => $this->proofImageUrl,
            'recorded_by' => $this->recordedBy,
            'confirmed_by' => $this->confirmedBy,
            'confirmed_at' => $this->confirmedAt?->format('c'),
            'rejection_reason' => $this->rejectionReason,
            'notes' => $this->notes,
            'created_at' => $this->createdAt->format('c'),
        ];
    }
}

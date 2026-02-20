<?php

declare(strict_types=1);

namespace Lodgik\Entity;

use Doctrine\DBAL\Types\Types;
use Doctrine\ORM\Mapping as ORM;
use Lodgik\Entity\Contract\TenantAware;
use Lodgik\Entity\Traits\HasUuid;
use Lodgik\Entity\Traits\HasTenant;
use Lodgik\Entity\Traits\HasTimestamps;
use Lodgik\Enum\PaymentMethod;
use Lodgik\Enum\PaymentStatus;

#[ORM\Entity]
#[ORM\Table(name: 'gym_membership_payments')]
#[ORM\Index(columns: ['tenant_id', 'membership_id'], name: 'idx_gmpay_membership')]
#[ORM\Index(columns: ['tenant_id', 'property_id'], name: 'idx_gmpay_property')]
#[ORM\HasLifecycleCallbacks]
class GymMembershipPayment implements TenantAware
{
    use HasUuid;
    use HasTenant;
    use HasTimestamps;

    #[ORM\Column(name: 'property_id', type: Types::STRING, length: 36)]
    private string $propertyId;

    #[ORM\Column(name: 'membership_id', type: Types::STRING, length: 36)]
    private string $membershipId;

    #[ORM\Column(name: 'member_id', type: Types::STRING, length: 36)]
    private string $memberId;

    /** Amount in kobo */
    #[ORM\Column(type: Types::BIGINT)]
    private string $amount;

    #[ORM\Column(name: 'payment_method', type: Types::STRING, length: 20, enumType: PaymentMethod::class)]
    private PaymentMethod $paymentMethod;

    #[ORM\Column(type: Types::STRING, length: 20, enumType: PaymentStatus::class)]
    private PaymentStatus $status;

    #[ORM\Column(name: 'payment_date', type: Types::DATETIME_IMMUTABLE)]
    private \DateTimeImmutable $paymentDate;

    #[ORM\Column(name: 'transfer_reference', type: Types::STRING, length: 100, nullable: true)]
    private ?string $transferReference = null;

    #[ORM\Column(name: 'recorded_by', type: Types::STRING, length: 36, nullable: true)]
    private ?string $recordedBy = null;

    #[ORM\Column(name: 'confirmed_by', type: Types::STRING, length: 36, nullable: true)]
    private ?string $confirmedBy = null;

    #[ORM\Column(name: 'confirmed_at', type: Types::DATETIME_IMMUTABLE, nullable: true)]
    private ?\DateTimeImmutable $confirmedAt = null;

    #[ORM\Column(type: Types::TEXT, nullable: true)]
    private ?string $notes = null;

    /** 'new' = new membership, 'renewal' = renewal payment */
    #[ORM\Column(name: 'payment_type', type: Types::STRING, length: 20, options: ['default' => 'new'])]
    private string $paymentType = 'new';

    public function __construct(string $propertyId, string $membershipId, string $memberId, string $amount, PaymentMethod $method, string $tenantId)
    {
        $this->generateId();
        $this->propertyId = $propertyId;
        $this->membershipId = $membershipId;
        $this->memberId = $memberId;
        $this->amount = $amount;
        $this->paymentMethod = $method;
        $this->status = PaymentStatus::CONFIRMED;
        $this->paymentDate = new \DateTimeImmutable();
        $this->setTenantId($tenantId);
    }

    public function getPropertyId(): string { return $this->propertyId; }
    public function getMembershipId(): string { return $this->membershipId; }
    public function getMemberId(): string { return $this->memberId; }
    public function getAmount(): string { return $this->amount; }
    public function getPaymentMethod(): PaymentMethod { return $this->paymentMethod; }
    public function getStatus(): PaymentStatus { return $this->status; }
    public function setStatus(PaymentStatus $v): void { $this->status = $v; }
    public function getPaymentDate(): \DateTimeImmutable { return $this->paymentDate; }
    public function getTransferReference(): ?string { return $this->transferReference; }
    public function setTransferReference(?string $v): void { $this->transferReference = $v; }
    public function getRecordedBy(): ?string { return $this->recordedBy; }
    public function setRecordedBy(?string $v): void { $this->recordedBy = $v; }
    public function getConfirmedBy(): ?string { return $this->confirmedBy; }
    public function confirm(string $userId): void { $this->confirmedBy = $userId; $this->confirmedAt = new \DateTimeImmutable(); $this->status = PaymentStatus::CONFIRMED; }
    public function getNotes(): ?string { return $this->notes; }
    public function setNotes(?string $v): void { $this->notes = $v; }
    public function getPaymentType(): string { return $this->paymentType; }
    public function setPaymentType(string $v): void { $this->paymentType = $v; }

    public function toArray(): array
    {
        return [
            'id' => $this->getId(), 'property_id' => $this->propertyId,
            'membership_id' => $this->membershipId, 'member_id' => $this->memberId,
            'amount' => $this->amount, 'payment_method' => $this->paymentMethod->value,
            'payment_method_label' => $this->paymentMethod->label(),
            'status' => $this->status->value, 'status_label' => $this->status->label(),
            'payment_date' => $this->paymentDate->format('Y-m-d H:i:s'),
            'transfer_reference' => $this->transferReference,
            'recorded_by' => $this->recordedBy, 'confirmed_by' => $this->confirmedBy,
            'confirmed_at' => $this->confirmedAt?->format('Y-m-d H:i:s'),
            'payment_type' => $this->paymentType, 'notes' => $this->notes,
            'created_at' => $this->getCreatedAt()?->format('Y-m-d H:i:s'),
        ];
    }
}

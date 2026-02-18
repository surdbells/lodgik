<?php

declare(strict_types=1);

namespace Lodgik\Entity;

use Doctrine\DBAL\Types\Types;
use Doctrine\ORM\Mapping as ORM;
use Lodgik\Entity\Traits\HasUuid;
use Lodgik\Entity\Traits\HasTimestamps;

/**
 * Invoice/payment record for a subscription charge.
 */
#[ORM\Entity]
#[ORM\Table(name: 'subscription_invoices')]
#[ORM\Index(columns: ['tenant_id'], name: 'idx_si_tenant')]
#[ORM\Index(columns: ['subscription_id'], name: 'idx_si_subscription')]
#[ORM\Index(columns: ['status'], name: 'idx_si_status')]
#[ORM\HasLifecycleCallbacks]
class SubscriptionInvoice
{
    use HasUuid;
    use HasTimestamps;

    #[ORM\Column(name: 'tenant_id', type: Types::STRING, length: 36)]
    private string $tenantId;

    #[ORM\Column(name: 'subscription_id', type: Types::STRING, length: 36)]
    private string $subscriptionId;

    #[ORM\Column(name: 'plan_id', type: Types::STRING, length: 36)]
    private string $planId;

    #[ORM\Column(name: 'invoice_number', type: Types::STRING, length: 50)]
    private string $invoiceNumber;

    #[ORM\Column(type: Types::BIGINT)]
    private int $amount;

    #[ORM\Column(type: Types::STRING, length: 3, options: ['default' => 'NGN'])]
    private string $currency = 'NGN';

    /** paid | failed | pending | refunded */
    #[ORM\Column(type: Types::STRING, length: 20, options: ['default' => 'pending'])]
    private string $status = 'pending';

    #[ORM\Column(name: 'billing_cycle', type: Types::STRING, length: 10)]
    private string $billingCycle;

    #[ORM\Column(name: 'period_start', type: Types::DATETIME_IMMUTABLE)]
    private \DateTimeImmutable $periodStart;

    #[ORM\Column(name: 'period_end', type: Types::DATETIME_IMMUTABLE)]
    private \DateTimeImmutable $periodEnd;

    #[ORM\Column(name: 'paid_at', type: Types::DATETIME_IMMUTABLE, nullable: true)]
    private ?\DateTimeImmutable $paidAt = null;

    // ─── Paystack ──────────────────────────────────────────────

    #[ORM\Column(name: 'paystack_reference', type: Types::STRING, length: 100, nullable: true)]
    private ?string $paystackReference = null;

    #[ORM\Column(name: 'paystack_transaction_id', type: Types::STRING, length: 50, nullable: true)]
    private ?string $paystackTransactionId = null;

    #[ORM\Column(name: 'paystack_channel', type: Types::STRING, length: 30, nullable: true)]
    private ?string $paystackChannel = null;

    /** Full Paystack response stored as JSON. */
    #[ORM\Column(name: 'payment_data', type: Types::JSON, nullable: true)]
    private ?array $paymentData = null;

    public function __construct(
        string $tenantId,
        string $subscriptionId,
        string $planId,
        string $invoiceNumber,
        int $amount,
        string $billingCycle,
        \DateTimeImmutable $periodStart,
        \DateTimeImmutable $periodEnd,
    ) {
        $this->generateId();
        $this->tenantId = $tenantId;
        $this->subscriptionId = $subscriptionId;
        $this->planId = $planId;
        $this->invoiceNumber = $invoiceNumber;
        $this->amount = $amount;
        $this->billingCycle = $billingCycle;
        $this->periodStart = $periodStart;
        $this->periodEnd = $periodEnd;
    }

    public function getTenantId(): string { return $this->tenantId; }
    public function getSubscriptionId(): string { return $this->subscriptionId; }
    public function getPlanId(): string { return $this->planId; }
    public function getInvoiceNumber(): string { return $this->invoiceNumber; }
    public function getAmount(): int { return $this->amount; }
    public function getCurrency(): string { return $this->currency; }
    public function getStatus(): string { return $this->status; }
    public function setStatus(string $s): void { $this->status = $s; }
    public function getBillingCycle(): string { return $this->billingCycle; }
    public function getPeriodStart(): \DateTimeImmutable { return $this->periodStart; }
    public function getPeriodEnd(): \DateTimeImmutable { return $this->periodEnd; }
    public function getPaidAt(): ?\DateTimeImmutable { return $this->paidAt; }
    public function setPaidAt(?\DateTimeImmutable $d): void { $this->paidAt = $d; }
    public function getPaystackReference(): ?string { return $this->paystackReference; }
    public function setPaystackReference(?string $r): void { $this->paystackReference = $r; }
    public function getPaystackTransactionId(): ?string { return $this->paystackTransactionId; }
    public function setPaystackTransactionId(?string $id): void { $this->paystackTransactionId = $id; }
    public function getPaystackChannel(): ?string { return $this->paystackChannel; }
    public function setPaystackChannel(?string $c): void { $this->paystackChannel = $c; }
    public function getPaymentData(): ?array { return $this->paymentData; }
    public function setPaymentData(?array $d): void { $this->paymentData = $d; }

    public function markPaid(string $reference, ?string $transactionId = null, ?string $channel = null): void
    {
        $this->status = 'paid';
        $this->paidAt = new \DateTimeImmutable();
        $this->paystackReference = $reference;
        $this->paystackTransactionId = $transactionId;
        $this->paystackChannel = $channel;
    }
}

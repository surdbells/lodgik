<?php

declare(strict_types=1);

namespace Lodgik\Entity;

use Doctrine\DBAL\Types\Types;
use Doctrine\ORM\Mapping as ORM;
use Lodgik\Entity\Traits\HasUuid;
use Lodgik\Entity\Traits\HasTenant;
use Lodgik\Entity\Traits\HasTimestamps;
use Lodgik\Enum\ChargeCategory;

#[ORM\Entity]
#[ORM\Table(name: 'folio_charges')]
#[ORM\Index(name: 'idx_charge_folio', columns: ['tenant_id', 'folio_id'])]
#[ORM\HasLifecycleCallbacks]
class FolioCharge
{
    use HasUuid;
    use HasTenant;
    use HasTimestamps;

    #[ORM\Column(name: 'folio_id', type: 'string', length: 36)]
    private string $folioId;

    #[ORM\Column(name: 'category', type: 'string', length: 20, enumType: ChargeCategory::class)]
    private ChargeCategory $category;

    #[ORM\Column(name: 'description', type: 'string', length: 255)]
    private string $description;

    #[ORM\Column(name: 'amount', type: Types::DECIMAL, precision: 12, scale: 2)]
    private string $amount;

    #[ORM\Column(name: 'quantity', type: 'integer', options: ['default' => 1])]
    private int $quantity = 1;

    #[ORM\Column(name: 'line_total', type: Types::DECIMAL, precision: 12, scale: 2)]
    private string $lineTotal;

    #[ORM\Column(name: 'charge_date', type: Types::DATE_IMMUTABLE)]
    private \DateTimeImmutable $chargeDate;

    #[ORM\Column(name: 'posted_by', type: 'string', length: 36, nullable: true)]
    private ?string $postedBy = null;

    #[ORM\Column(name: 'is_voided', type: 'boolean', options: ['default' => false])]
    private bool $isVoided = false;

    #[ORM\Column(name: 'notes', type: Types::TEXT, nullable: true)]
    private ?string $notes = null;

    public function __construct(string $folioId, ChargeCategory $category, string $description, string $amount, int $quantity, string $tenantId)
    {
        $this->generateId();
        $this->folioId = $folioId;
        $this->category = $category;
        $this->description = $description;
        $this->amount = $amount;
        $this->quantity = $quantity;
        $this->lineTotal = number_format((float)$amount * $quantity, 2, '.', '');
        $this->chargeDate = new \DateTimeImmutable();
        $this->tenantId = $tenantId;
    }

    public function getFolioId(): string { return $this->folioId; }
    public function getCategory(): ChargeCategory { return $this->category; }
    public function getDescription(): string { return $this->description; }
    public function getAmount(): string { return $this->amount; }
    public function getQuantity(): int { return $this->quantity; }
    public function getLineTotal(): string { return $this->lineTotal; }
    public function getChargeDate(): \DateTimeImmutable { return $this->chargeDate; }
    public function getPostedBy(): ?string { return $this->postedBy; }
    public function setPostedBy(?string $postedBy): void { $this->postedBy = $postedBy; }
    public function isVoided(): bool { return $this->isVoided; }
    public function setIsVoided(bool $v): void { $this->isVoided = $v; }
    public function getNotes(): ?string { return $this->notes; }
    public function setNotes(?string $notes): void { $this->notes = $notes; }

    public function toArray(): array
    {
        return [
            'id' => $this->id,
            'folio_id' => $this->folioId,
            'category' => $this->category->value,
            'category_label' => $this->category->label(),
            'description' => $this->description,
            'amount' => $this->amount,
            'quantity' => $this->quantity,
            'line_total' => $this->lineTotal,
            'charge_date' => $this->chargeDate->format('Y-m-d'),
            'posted_by' => $this->postedBy,
            'is_voided' => $this->isVoided,
            'notes' => $this->notes,
            'created_at' => $this->createdAt->format('c'),
        ];
    }
}

<?php

declare(strict_types=1);

namespace Lodgik\Entity;

use Doctrine\DBAL\Types\Types;
use Doctrine\ORM\Mapping as ORM;
use Lodgik\Entity\Traits\HasUuid;
use Lodgik\Entity\Traits\HasTenant;
use Lodgik\Entity\Traits\HasTimestamps;

#[ORM\Entity]
#[ORM\Table(name: 'folio_adjustments')]
#[ORM\Index(name: 'idx_adjustment_folio', columns: ['tenant_id', 'folio_id'])]
#[ORM\HasLifecycleCallbacks]
class FolioAdjustment
{
    use HasUuid;
    use HasTenant;
    use HasTimestamps;

    #[ORM\Column(name: 'folio_id', type: 'string', length: 36)]
    private string $folioId;

    #[ORM\Column(name: 'type', type: 'string', length: 20)]
    private string $type; // 'discount', 'refund', 'correction', 'comp'

    #[ORM\Column(name: 'description', type: 'string', length: 255)]
    private string $description;

    #[ORM\Column(name: 'amount', type: Types::DECIMAL, precision: 12, scale: 2)]
    private string $amount;

    #[ORM\Column(name: 'adjusted_by', type: 'string', length: 36, nullable: true)]
    private ?string $adjustedBy = null;

    #[ORM\Column(name: 'reason', type: Types::TEXT, nullable: true)]
    private ?string $reason = null;

    public function __construct(string $folioId, string $type, string $description, string $amount, string $tenantId)
    {
        $this->generateId();
        $this->folioId = $folioId;
        $this->type = $type;
        $this->description = $description;
        $this->amount = $amount;
        $this->tenantId = $tenantId;
    }

    public function getFolioId(): string { return $this->folioId; }
    public function getType(): string { return $this->type; }
    public function getDescription(): string { return $this->description; }
    public function getAmount(): string { return $this->amount; }
    public function getAdjustedBy(): ?string { return $this->adjustedBy; }
    public function setAdjustedBy(?string $v): void { $this->adjustedBy = $v; }
    public function getReason(): ?string { return $this->reason; }
    public function setReason(?string $v): void { $this->reason = $v; }

    public function toArray(): array
    {
        return [
            'id' => $this->id,
            'folio_id' => $this->folioId,
            'type' => $this->type,
            'description' => $this->description,
            'amount' => $this->amount,
            'adjusted_by' => $this->adjustedBy,
            'reason' => $this->reason,
            'created_at' => $this->createdAt->format('c'),
        ];
    }
}

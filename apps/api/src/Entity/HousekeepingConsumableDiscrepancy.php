<?php
declare(strict_types=1);

namespace Lodgik\Entity;

use Doctrine\DBAL\Types\Types;
use Doctrine\ORM\Mapping as ORM;
use Lodgik\Entity\Traits\HasUuid;
use Lodgik\Entity\Traits\HasTenant;

#[ORM\Entity]
#[ORM\Table(name: 'housekeeping_consumable_discrepancies')]
#[ORM\Index(columns: ['tenant_id', 'property_id', 'flagged'], name: 'idx_hk_disc_prop')]
class HousekeepingConsumableDiscrepancy
{
    use HasUuid, HasTenant;

    #[ORM\Column(name: 'property_id', type: Types::STRING, length: 36)]
    private string $propertyId;

    #[ORM\Column(name: 'consumable_id', type: Types::STRING, length: 36)]
    private string $consumableId;

    #[ORM\Column(name: 'consumable_name', type: Types::STRING, length: 150)]
    private string $consumableName;

    #[ORM\Column(name: 'period_start', type: Types::DATE_IMMUTABLE)]
    private \DateTimeImmutable $periodStart;

    #[ORM\Column(name: 'period_end', type: Types::DATE_IMMUTABLE)]
    private \DateTimeImmutable $periodEnd;

    #[ORM\Column(name: 'rooms_serviced', type: Types::INTEGER, options: ['default' => 0])]
    private int $roomsServiced = 0;

    #[ORM\Column(name: 'expected_usage', type: Types::DECIMAL, precision: 10, scale: 2)]
    private string $expectedUsage;

    #[ORM\Column(name: 'actual_usage', type: Types::DECIMAL, precision: 10, scale: 2)]
    private string $actualUsage;

    #[ORM\Column(type: Types::DECIMAL, precision: 10, scale: 2)]
    private string $variance;

    #[ORM\Column(name: 'variance_pct', type: Types::DECIMAL, precision: 6, scale: 2)]
    private string $variancePct;

    #[ORM\Column(type: Types::BOOLEAN, options: ['default' => true])]
    private bool $flagged = true;

    #[ORM\Column(type: Types::BOOLEAN, options: ['default' => false])]
    private bool $resolved = false;

    #[ORM\Column(name: 'resolved_by', type: Types::STRING, length: 36, nullable: true)]
    private ?string $resolvedBy = null;

    #[ORM\Column(name: 'resolved_at', type: Types::DATETIME_IMMUTABLE, nullable: true)]
    private ?\DateTimeImmutable $resolvedAt = null;

    #[ORM\Column(type: Types::TEXT, nullable: true)]
    private ?string $notes = null;

    #[ORM\Column(name: 'created_at', type: Types::DATETIME_IMMUTABLE)]
    private \DateTimeImmutable $createdAt;

    public function __construct(
        string $propertyId, string $consumableId, string $consumableName,
        \DateTimeImmutable $periodStart, \DateTimeImmutable $periodEnd,
        int $roomsServiced, string $expectedUsage, string $actualUsage, string $tenantId
    ) {
        $this->generateId();
        $this->propertyId     = $propertyId;
        $this->consumableId   = $consumableId;
        $this->consumableName = $consumableName;
        $this->periodStart    = $periodStart;
        $this->periodEnd      = $periodEnd;
        $this->roomsServiced  = $roomsServiced;
        $this->expectedUsage  = $expectedUsage;
        $this->actualUsage    = $actualUsage;
        $this->setTenantId($tenantId);
        $this->createdAt = new \DateTimeImmutable();

        $exp = (float) $expectedUsage;
        $act = (float) $actualUsage;
        $this->variance    = number_format($act - $exp, 2, '.', '');
        $this->variancePct = $exp > 0
            ? number_format((($act - $exp) / $exp) * 100, 2, '.', '')
            : '0.00';
    }

    public function resolve(string $userId, ?string $notes = null): void
    {
        $this->resolved   = true;
        $this->flagged    = false;
        $this->resolvedBy = $userId;
        $this->resolvedAt = new \DateTimeImmutable();
        if ($notes) $this->notes = $notes;
    }

    public function toArray(): array
    {
        return [
            'id'              => $this->id,
            'property_id'     => $this->propertyId,
            'consumable_id'   => $this->consumableId,
            'consumable_name' => $this->consumableName,
            'period_start'    => $this->periodStart->format('Y-m-d'),
            'period_end'      => $this->periodEnd->format('Y-m-d'),
            'rooms_serviced'  => $this->roomsServiced,
            'expected_usage'  => $this->expectedUsage,
            'actual_usage'    => $this->actualUsage,
            'variance'        => $this->variance,
            'variance_pct'    => $this->variancePct,
            'flagged'         => $this->flagged,
            'resolved'        => $this->resolved,
            'resolved_by'     => $this->resolvedBy,
            'resolved_at'     => $this->resolvedAt?->format('c'),
            'notes'           => $this->notes,
            'created_at'      => $this->createdAt->format('c'),
        ];
    }
}

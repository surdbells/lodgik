<?php
declare(strict_types=1);

namespace Lodgik\Entity;

use Doctrine\DBAL\Types\Types;
use Doctrine\ORM\Mapping as ORM;
use Lodgik\Entity\Traits\HasUuid;
use Lodgik\Entity\Traits\HasTenant;
use Lodgik\Entity\Traits\HasTimestamps;

#[ORM\Entity]
#[ORM\Table(name: 'housekeeping_consumables')]
#[ORM\Index(columns: ['tenant_id', 'property_id'], name: 'idx_hk_consumables_prop')]
#[ORM\HasLifecycleCallbacks]
class HousekeepingConsumable
{
    use HasUuid, HasTenant, HasTimestamps;

    #[ORM\Column(name: 'property_id', type: Types::STRING, length: 36)]
    private string $propertyId;

    #[ORM\Column(type: Types::STRING, length: 150)]
    private string $name;

    /** unit of measure: piece, litre, kg, roll, pack, etc. */
    #[ORM\Column(type: Types::STRING, length: 30, options: ['default' => 'piece'])]
    private string $unit = 'piece';

    /** expected units consumed per room serviced */
    #[ORM\Column(name: 'expected_per_room', type: Types::DECIMAL, precision: 8, scale: 2, options: ['default' => '1.00'])]
    private string $expectedPerRoom = '1.00';

    /** stock level that triggers a low-stock alert */
    #[ORM\Column(name: 'reorder_threshold', type: Types::DECIMAL, precision: 8, scale: 2, options: ['default' => '10.00'])]
    private string $reorderThreshold = '10.00';

    #[ORM\Column(type: Types::TEXT, nullable: true)]
    private ?string $notes = null;

    #[ORM\Column(name: 'is_active', type: Types::BOOLEAN, options: ['default' => true])]
    private bool $isActive = true;

    public function __construct(string $propertyId, string $name, string $unit, string $tenantId)
    {
        $this->generateId();
        $this->propertyId = $propertyId;
        $this->name       = $name;
        $this->unit       = $unit;
        $this->setTenantId($tenantId);
    }

    public function getPropertyId(): string { return $this->propertyId; }
    public function getName(): string { return $this->name; }
    public function setName(string $v): void { $this->name = $v; }
    public function getUnit(): string { return $this->unit; }
    public function setUnit(string $v): void { $this->unit = $v; }
    public function getExpectedPerRoom(): string { return $this->expectedPerRoom; }
    public function setExpectedPerRoom(string $v): void { $this->expectedPerRoom = $v; }
    public function getReorderThreshold(): string { return $this->reorderThreshold; }
    public function setReorderThreshold(string $v): void { $this->reorderThreshold = $v; }
    public function getNotes(): ?string { return $this->notes; }
    public function setNotes(?string $v): void { $this->notes = $v; }
    public function isActive(): bool { return $this->isActive; }
    public function setIsActive(bool $v): void { $this->isActive = $v; }

    public function toArray(): array
    {
        return [
            'id'                => $this->id,
            'property_id'       => $this->propertyId,
            'name'              => $this->name,
            'unit'              => $this->unit,
            'expected_per_room' => $this->expectedPerRoom,
            'reorder_threshold' => $this->reorderThreshold,
            'notes'             => $this->notes,
            'is_active'         => $this->isActive,
            'created_at'        => $this->createdAt->format('c'),
            'updated_at'        => $this->updatedAt->format('c'),
        ];
    }
}

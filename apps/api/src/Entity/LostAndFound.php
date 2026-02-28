<?php

declare(strict_types=1);

namespace Lodgik\Entity;

use Doctrine\DBAL\Types\Types;
use Doctrine\ORM\Mapping as ORM;
use Lodgik\Entity\Contract\TenantAware;
use Lodgik\Entity\Traits\HasUuid;
use Lodgik\Entity\Traits\HasTenant;
use Lodgik\Entity\Traits\HasTimestamps;

#[ORM\Entity]
#[ORM\Table(name: 'lost_and_found')]
#[ORM\Index(columns: ['tenant_id', 'property_id', 'status'], name: 'idx_laf_status')]
#[ORM\HasLifecycleCallbacks]
class LostAndFound implements TenantAware
{
    use HasUuid;
    use HasTenant;
    use HasTimestamps;

    #[ORM\Column(name: 'property_id', type: Types::STRING, length: 36)]
    private string $propertyId;

    #[ORM\Column(type: Types::STRING, length: 200)]
    private string $description;

    #[ORM\Column(name: 'found_location', type: Types::STRING, length: 100)]
    private string $foundLocation;

    #[ORM\Column(name: 'room_id', type: Types::STRING, length: 36, nullable: true)]
    private ?string $roomId = null;

    #[ORM\Column(name: 'found_by', type: Types::STRING, length: 150)]
    private string $foundBy;

    #[ORM\Column(name: 'found_at', type: Types::DATETIME_IMMUTABLE)]
    private \DateTimeImmutable $foundAt;

    #[ORM\Column(name: 'photo_url', type: Types::TEXT, nullable: true)]
    private ?string $photoUrl = null;

    /** 'stored', 'claimed', 'disposed', 'donated' */
    #[ORM\Column(type: Types::STRING, length: 20, options: ['default' => 'stored'])]
    private string $status = 'stored';

    #[ORM\Column(name: 'claimed_by', type: Types::STRING, length: 200, nullable: true)]
    private ?string $claimedBy = null;

    #[ORM\Column(name: 'claimed_at', type: Types::DATETIME_IMMUTABLE, nullable: true)]
    private ?\DateTimeImmutable $claimedAt = null;

    #[ORM\Column(type: Types::TEXT, nullable: true)]
    private ?string $notes = null;

    public function __construct(string $propertyId, string $description, string $foundLocation, string $foundBy, string $tenantId)
    {
        $this->generateId();
        $this->propertyId = $propertyId;
        $this->description = $description;
        $this->foundLocation = $foundLocation;
        $this->foundBy = $foundBy;
        $this->foundAt = new \DateTimeImmutable();
        $this->setTenantId($tenantId);
    }

    public function getPropertyId(): string { return $this->propertyId; }
    public function getDescription(): string { return $this->description; }
    public function setDescription(string $v): void { $this->description = $v; }
    public function getFoundLocation(): string { return $this->foundLocation; }
    public function getRoomId(): ?string { return $this->roomId; }
    public function setRoomId(?string $v): void { $this->roomId = $v; }
    public function getPhotoUrl(): ?string { return $this->photoUrl; }
    public function setPhotoUrl(?string $v): void { $this->photoUrl = $v; }
    public function getStatus(): string { return $this->status; }
    public function getNotes(): ?string { return $this->notes; }
    public function setNotes(?string $v): void { $this->notes = $v; }

    public function claim(string $claimedBy): void
    {
        $this->status = 'claimed';
        $this->claimedBy = $claimedBy;
        $this->claimedAt = new \DateTimeImmutable();
    }

    public function dispose(): void { $this->status = 'disposed'; }
    public function donate(): void { $this->status = 'donated'; }

    public function toArray(): array
    {
        return [
            'id' => $this->getId(), 'property_id' => $this->propertyId,
            'description' => $this->description, 'found_location' => $this->foundLocation,
            'room_id' => $this->roomId, 'found_by' => $this->foundBy,
            'found_at' => $this->foundAt->format('Y-m-d H:i:s'),
            'photo_url' => $this->photoUrl, 'status' => $this->status,
            'claimed_by' => $this->claimedBy,
            'claimed_at' => $this->claimedAt?->format('Y-m-d H:i:s'),
            'notes' => $this->notes,
            'created_at' => $this->getCreatedAt()?->format('Y-m-d H:i:s'),
        ];
    }
}

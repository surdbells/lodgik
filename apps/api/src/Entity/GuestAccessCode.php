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
 * 6-digit access code generated at check-in for guest self-service login.
 * One active code per booking. Expires at checkout.
 */
#[ORM\Entity]
#[ORM\Table(name: 'guest_access_codes')]
#[ORM\UniqueConstraint(name: 'uq_access_code_tenant', columns: ['tenant_id', 'code'])]
#[ORM\Index(columns: ['tenant_id', 'booking_id'], name: 'idx_gac_booking')]
#[ORM\HasLifecycleCallbacks]
class GuestAccessCode implements TenantAware
{
    use HasUuid;
    use HasTenant;
    use HasTimestamps;

    #[ORM\Column(name: 'booking_id', type: Types::STRING, length: 36)]
    private string $bookingId;

    #[ORM\Column(name: 'guest_id', type: Types::STRING, length: 36)]
    private string $guestId;

    #[ORM\Column(name: 'property_id', type: Types::STRING, length: 36)]
    private string $propertyId;

    #[ORM\Column(name: 'room_id', type: Types::STRING, length: 36, nullable: true)]
    private ?string $roomId = null;

    /** 6-digit numeric code */
    #[ORM\Column(type: Types::STRING, length: 6)]
    private string $code;

    #[ORM\Column(name: 'is_active', type: Types::BOOLEAN, options: ['default' => true])]
    private bool $isActive = true;

    #[ORM\Column(name: 'expires_at', type: Types::DATETIME_IMMUTABLE)]
    private \DateTimeImmutable $expiresAt;

    #[ORM\Column(name: 'last_used_at', type: Types::DATETIME_IMMUTABLE, nullable: true)]
    private ?\DateTimeImmutable $lastUsedAt = null;

    public function __construct(string $bookingId, string $guestId, string $propertyId, string $code, \DateTimeImmutable $expiresAt, string $tenantId)
    {
        $this->generateId();
        $this->bookingId = $bookingId;
        $this->guestId = $guestId;
        $this->propertyId = $propertyId;
        $this->code = $code;
        $this->expiresAt = $expiresAt;
        $this->setTenantId($tenantId);
    }

    public function getBookingId(): string { return $this->bookingId; }
    public function getGuestId(): string { return $this->guestId; }
    public function getPropertyId(): string { return $this->propertyId; }
    public function getRoomId(): ?string { return $this->roomId; }
    public function setRoomId(?string $v): void { $this->roomId = $v; }
    public function getCode(): string { return $this->code; }
    public function isActive(): bool { return $this->isActive; }
    public function setIsActive(bool $v): void { $this->isActive = $v; }
    public function getExpiresAt(): \DateTimeImmutable { return $this->expiresAt; }
    public function setExpiresAt(\DateTimeImmutable $v): void { $this->expiresAt = $v; }
    public function getLastUsedAt(): ?\DateTimeImmutable { return $this->lastUsedAt; }
    public function setLastUsedAt(?\DateTimeImmutable $v): void { $this->lastUsedAt = $v; }

    public function isExpired(): bool
    {
        return !$this->isActive || $this->expiresAt < new \DateTimeImmutable();
    }

    public function deactivate(): void { $this->isActive = false; }

    public function toArray(): array
    {
        return [
            'id' => $this->getId(),
            'booking_id' => $this->bookingId,
            'guest_id' => $this->guestId,
            'property_id' => $this->propertyId,
            'room_id' => $this->roomId,
            'code' => $this->code,
            'is_active' => $this->isActive,
            'expires_at' => $this->expiresAt->format('Y-m-d H:i:s'),
            'last_used_at' => $this->lastUsedAt?->format('Y-m-d H:i:s'),
            'created_at' => $this->getCreatedAt()?->format('Y-m-d H:i:s'),
        ];
    }
}

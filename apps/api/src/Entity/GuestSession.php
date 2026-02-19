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
 * Guest session token — issued on OTP or access code login.
 * Short-lived (24h), tied to booking + guest + property.
 */
#[ORM\Entity]
#[ORM\Table(name: 'guest_sessions')]
#[ORM\Index(columns: ['token'], name: 'idx_gs_token')]
#[ORM\Index(columns: ['tenant_id', 'guest_id'], name: 'idx_gs_guest')]
#[ORM\HasLifecycleCallbacks]
class GuestSession implements TenantAware
{
    use HasUuid;
    use HasTenant;
    use HasTimestamps;

    #[ORM\Column(name: 'guest_id', type: Types::STRING, length: 36)]
    private string $guestId;

    #[ORM\Column(name: 'booking_id', type: Types::STRING, length: 36)]
    private string $bookingId;

    #[ORM\Column(name: 'property_id', type: Types::STRING, length: 36)]
    private string $propertyId;

    #[ORM\Column(name: 'room_id', type: Types::STRING, length: 36, nullable: true)]
    private ?string $roomId = null;

    /** Opaque session token (UUID) */
    #[ORM\Column(type: Types::STRING, length: 64)]
    private string $token;

    /** Auth method: 'otp' | 'access_code' | 'tablet' */
    #[ORM\Column(name: 'auth_method', type: Types::STRING, length: 20)]
    private string $authMethod;

    #[ORM\Column(name: 'device_type', type: Types::STRING, length: 20, nullable: true)]
    private ?string $deviceType = null;

    #[ORM\Column(name: 'is_active', type: Types::BOOLEAN, options: ['default' => true])]
    private bool $isActive = true;

    #[ORM\Column(name: 'expires_at', type: Types::DATETIME_IMMUTABLE)]
    private \DateTimeImmutable $expiresAt;

    #[ORM\Column(name: 'last_activity_at', type: Types::DATETIME_IMMUTABLE, nullable: true)]
    private ?\DateTimeImmutable $lastActivityAt = null;

    public function __construct(string $guestId, string $bookingId, string $propertyId, string $token, string $authMethod, \DateTimeImmutable $expiresAt, string $tenantId)
    {
        $this->generateId();
        $this->guestId = $guestId;
        $this->bookingId = $bookingId;
        $this->propertyId = $propertyId;
        $this->token = $token;
        $this->authMethod = $authMethod;
        $this->expiresAt = $expiresAt;
        $this->setTenantId($tenantId);
    }

    public function getGuestId(): string { return $this->guestId; }
    public function getBookingId(): string { return $this->bookingId; }
    public function getPropertyId(): string { return $this->propertyId; }
    public function getRoomId(): ?string { return $this->roomId; }
    public function setRoomId(?string $v): void { $this->roomId = $v; }
    public function getToken(): string { return $this->token; }
    public function getAuthMethod(): string { return $this->authMethod; }
    public function getDeviceType(): ?string { return $this->deviceType; }
    public function setDeviceType(?string $v): void { $this->deviceType = $v; }
    public function isActive(): bool { return $this->isActive; }
    public function setIsActive(bool $v): void { $this->isActive = $v; }
    public function getExpiresAt(): \DateTimeImmutable { return $this->expiresAt; }
    public function getLastActivityAt(): ?\DateTimeImmutable { return $this->lastActivityAt; }
    public function setLastActivityAt(?\DateTimeImmutable $v): void { $this->lastActivityAt = $v; }

    public function isExpired(): bool
    {
        return !$this->isActive || $this->expiresAt < new \DateTimeImmutable();
    }

    public function invalidate(): void { $this->isActive = false; }

    public function touch(): void { $this->lastActivityAt = new \DateTimeImmutable(); }

    public function toArray(): array
    {
        return [
            'id' => $this->getId(),
            'guest_id' => $this->guestId,
            'booking_id' => $this->bookingId,
            'property_id' => $this->propertyId,
            'room_id' => $this->roomId,
            'auth_method' => $this->authMethod,
            'device_type' => $this->deviceType,
            'is_active' => $this->isActive,
            'expires_at' => $this->expiresAt->format('Y-m-d H:i:s'),
            'last_activity_at' => $this->lastActivityAt?->format('Y-m-d H:i:s'),
            'created_at' => $this->getCreatedAt()?->format('Y-m-d H:i:s'),
        ];
    }
}

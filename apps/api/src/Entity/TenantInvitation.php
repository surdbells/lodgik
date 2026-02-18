<?php

declare(strict_types=1);

namespace Lodgik\Entity;

use Doctrine\DBAL\Types\Types;
use Doctrine\ORM\Mapping as ORM;
use Lodgik\Entity\Traits\HasUuid;
use Lodgik\Entity\Traits\HasTimestamps;

/**
 * Invitation for a new hotel to join the platform.
 * Used for partner referrals, sales outreach, and self-service onboarding links.
 */
#[ORM\Entity]
#[ORM\Table(name: 'tenant_invitations')]
#[ORM\Index(columns: ['email'], name: 'idx_ti_email')]
#[ORM\Index(columns: ['token'], name: 'idx_ti_token')]
#[ORM\Index(columns: ['status'], name: 'idx_ti_status')]
#[ORM\HasLifecycleCallbacks]
class TenantInvitation
{
    use HasUuid;
    use HasTimestamps;

    #[ORM\Column(type: Types::STRING, length: 320)]
    private string $email;

    #[ORM\Column(name: 'hotel_name', type: Types::STRING, length: 255)]
    private string $hotelName;

    #[ORM\Column(name: 'contact_name', type: Types::STRING, length: 200, nullable: true)]
    private ?string $contactName = null;

    #[ORM\Column(type: Types::STRING, length: 30, nullable: true)]
    private ?string $phone = null;

    #[ORM\Column(type: Types::STRING, length: 100, unique: true)]
    private string $token;

    /** pending, accepted, expired, revoked */
    #[ORM\Column(type: Types::STRING, length: 20, options: ['default' => 'pending'])]
    private string $status = 'pending';

    #[ORM\Column(name: 'expires_at', type: Types::DATETIME_IMMUTABLE)]
    private \DateTimeImmutable $expiresAt;

    /** The tenant created when invitation is accepted. */
    #[ORM\Column(name: 'tenant_id', type: Types::STRING, length: 36, nullable: true)]
    private ?string $tenantId = null;

    /** Which plan was suggested in the invitation. */
    #[ORM\Column(name: 'suggested_plan_id', type: Types::STRING, length: 36, nullable: true)]
    private ?string $suggestedPlanId = null;

    /** Who sent this invitation (super admin user ID, or null for self-service). */
    #[ORM\Column(name: 'invited_by', type: Types::STRING, length: 36, nullable: true)]
    private ?string $invitedBy = null;

    #[ORM\Column(name: 'accepted_at', type: Types::DATETIME_IMMUTABLE, nullable: true)]
    private ?\DateTimeImmutable $acceptedAt = null;

    #[ORM\Column(type: Types::JSON, nullable: true)]
    private ?array $metadata = null;

    public function __construct(string $email, string $hotelName, int $expiryDays = 30)
    {
        $this->generateId();
        $this->email = strtolower(trim($email));
        $this->hotelName = $hotelName;
        $this->token = bin2hex(random_bytes(32));
        $this->expiresAt = new \DateTimeImmutable("+{$expiryDays} days");
    }

    public function getEmail(): string { return $this->email; }
    public function getHotelName(): string { return $this->hotelName; }
    public function getContactName(): ?string { return $this->contactName; }
    public function setContactName(?string $n): void { $this->contactName = $n; }
    public function getPhone(): ?string { return $this->phone; }
    public function setPhone(?string $p): void { $this->phone = $p; }
    public function getToken(): string { return $this->token; }
    public function getStatus(): string { return $this->status; }
    public function setStatus(string $s): void { $this->status = $s; }
    public function getExpiresAt(): \DateTimeImmutable { return $this->expiresAt; }
    public function getTenantId(): ?string { return $this->tenantId; }
    public function setTenantId(?string $id): void { $this->tenantId = $id; }
    public function getSuggestedPlanId(): ?string { return $this->suggestedPlanId; }
    public function setSuggestedPlanId(?string $id): void { $this->suggestedPlanId = $id; }
    public function getInvitedBy(): ?string { return $this->invitedBy; }
    public function setInvitedBy(?string $id): void { $this->invitedBy = $id; }
    public function getAcceptedAt(): ?\DateTimeImmutable { return $this->acceptedAt; }
    public function getMetadata(): ?array { return $this->metadata; }
    public function setMetadata(?array $m): void { $this->metadata = $m; }

    public function isExpired(): bool
    {
        return $this->expiresAt < new \DateTimeImmutable();
    }

    public function isPending(): bool
    {
        return $this->status === 'pending' && !$this->isExpired();
    }

    public function accept(string $tenantId): void
    {
        $this->status = 'accepted';
        $this->tenantId = $tenantId;
        $this->acceptedAt = new \DateTimeImmutable();
    }

    public function revoke(): void
    {
        $this->status = 'revoked';
    }
}

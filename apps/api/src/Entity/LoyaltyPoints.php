<?php
declare(strict_types=1);
namespace Lodgik\Entity;
use Doctrine\DBAL\Types\Types; use Doctrine\ORM\Mapping as ORM;
use Lodgik\Entity\Contract\TenantAware; use Lodgik\Entity\Traits\{HasUuid, HasTenant, HasTimestamps};

#[ORM\Entity] #[ORM\Table(name: 'loyalty_points')]
#[ORM\Index(columns: ['tenant_id', 'guest_id'], name: 'idx_lp_guest')] #[ORM\HasLifecycleCallbacks]
class LoyaltyPoints implements TenantAware
{
    use HasUuid, HasTenant, HasTimestamps;
    #[ORM\Column(name: 'guest_id', type: Types::STRING, length: 36)] private string $guestId;
    #[ORM\Column(name: 'property_id', type: Types::STRING, length: 36)] private string $propertyId;
    #[ORM\Column(type: Types::INTEGER)] private int $points;
    /** booking|dining|spa|referral|manual|redemption */
    #[ORM\Column(type: Types::STRING, length: 15)] private string $source;
    /** earn|redeem|expire|adjust */
    #[ORM\Column(name: 'transaction_type', type: Types::STRING, length: 10)] private string $transactionType;
    #[ORM\Column(name: 'reference_id', type: Types::STRING, length: 36, nullable: true)] private ?string $referenceId = null;
    #[ORM\Column(type: Types::TEXT, nullable: true)] private ?string $notes = null;

    public function __construct(string $guestId, string $propertyId, int $points, string $source, string $transactionType, string $tenantId)
    { $this->generateId(); $this->guestId = $guestId; $this->propertyId = $propertyId; $this->points = $points; $this->source = $source; $this->transactionType = $transactionType; $this->setTenantId($tenantId); }

    public function getPoints(): int { return $this->points; }
    public function getGuestId(): string { return $this->guestId; }
    public function getTransactionType(): string { return $this->transactionType; }
    public function setReferenceId(?string $v): void { $this->referenceId = $v; }
    public function setNotes(?string $v): void { $this->notes = $v; }

    public function toArray(): array { return ['id' => $this->getId(), 'guest_id' => $this->guestId, 'points' => $this->points, 'source' => $this->source, 'transaction_type' => $this->transactionType, 'reference_id' => $this->referenceId, 'notes' => $this->notes, 'created_at' => $this->getCreatedAt()?->format('Y-m-d H:i:s')]; }
}

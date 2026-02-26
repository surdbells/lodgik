<?php
declare(strict_types=1);
namespace Lodgik\Entity;
use Doctrine\DBAL\Types\Types; use Doctrine\ORM\Mapping as ORM;
use Lodgik\Entity\Contract\TenantAware; use Lodgik\Entity\Traits\{HasUuid, HasTenant, HasTimestamps};

#[ORM\Entity] #[ORM\Table(name: 'guest_preferences')]
#[ORM\Index(columns: ['tenant_id', 'guest_id'], name: 'idx_gp_guest')] #[ORM\HasLifecycleCallbacks]
class GuestPreference implements TenantAware
{
    use HasUuid, HasTenant, HasTimestamps;
    #[ORM\Column(name: 'guest_id', type: Types::STRING, length: 36)] private string $guestId;
    #[ORM\Column(name: 'room_preferences', type: Types::JSON, nullable: true)] private ?array $roomPreferences = null;
    #[ORM\Column(name: 'dietary_restrictions', type: Types::JSON, nullable: true)] private ?array $dietaryRestrictions = null;
    #[ORM\Column(name: 'special_occasions', type: Types::JSON, nullable: true)] private ?array $specialOccasions = null;
    /** email|sms|whatsapp|phone */
    #[ORM\Column(name: 'communication_preference', type: Types::STRING, length: 15, options: ['default' => 'whatsapp'])] private string $communicationPreference = 'whatsapp';
    #[ORM\Column(name: 'notes', type: Types::TEXT, nullable: true)] private ?string $notes = null;
    #[ORM\Column(name: 'vip_status', type: Types::BOOLEAN, options: ['default' => false])] private bool $vipStatus = false;
    #[ORM\Column(name: 'preferred_language', type: Types::STRING, length: 5, options: ['default' => 'en'])] private string $preferredLanguage = 'en';

    public function __construct(string $guestId, string $tenantId) { $this->generateId(); $this->guestId = $guestId; $this->setTenantId($tenantId); }

    public function getGuestId(): string { return $this->guestId; }
    public function setRoomPreferences(?array $v): void { $this->roomPreferences = $v; }
    public function setDietaryRestrictions(?array $v): void { $this->dietaryRestrictions = $v; }
    public function setSpecialOccasions(?array $v): void { $this->specialOccasions = $v; }
    public function setCommunicationPreference(string $v): void { $this->communicationPreference = $v; }
    public function setNotes(?string $v): void { $this->notes = $v; }
    public function setVipStatus(bool $v): void { $this->vipStatus = $v; }
    public function setPreferredLanguage(string $v): void { $this->preferredLanguage = $v; }

    public function toArray(): array { return ['id' => $this->getId(), 'guest_id' => $this->guestId, 'room_preferences' => $this->roomPreferences, 'dietary_restrictions' => $this->dietaryRestrictions, 'special_occasions' => $this->specialOccasions, 'communication_preference' => $this->communicationPreference, 'notes' => $this->notes, 'vip_status' => $this->vipStatus, 'preferred_language' => $this->preferredLanguage]; }
}

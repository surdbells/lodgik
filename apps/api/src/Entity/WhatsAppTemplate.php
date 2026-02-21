<?php
declare(strict_types=1);
namespace Lodgik\Entity;
use Doctrine\DBAL\Types\Types;
use Doctrine\ORM\Mapping as ORM;
use Lodgik\Entity\Contract\TenantAware;
use Lodgik\Entity\Traits\{HasUuid, HasTenant, HasTimestamps};

#[ORM\Entity]
#[ORM\Table(name: 'whatsapp_templates')]
#[ORM\Index(columns: ['tenant_id', 'message_type'], name: 'idx_wat_type')]
#[ORM\HasLifecycleCallbacks]
class WhatsAppTemplate implements TenantAware
{
    use HasUuid, HasTenant, HasTimestamps;

    #[ORM\Column(type: Types::STRING, length: 50)]
    private string $name;

    /** booking_confirmation|check_in_welcome|check_out_thanks|payment_receipt|visitor_code|custom|otp|reminder */
    #[ORM\Column(name: 'message_type', type: Types::STRING, length: 30)]
    private string $messageType;

    /** Template body with {{placeholder}} syntax */
    #[ORM\Column(type: Types::TEXT)]
    private string $body;

    /** Param names in order: ["guest_name", "hotel_name", "room_number"] */
    #[ORM\Column(name: 'param_names', type: Types::JSON)]
    private array $paramNames = [];

    #[ORM\Column(name: 'is_active', type: Types::BOOLEAN, options: ['default' => true])]
    private bool $isActive = true;

    /** Language code e.g. en, fr */
    #[ORM\Column(type: Types::STRING, length: 5, options: ['default' => 'en'])]
    private string $language = 'en';

    public function __construct(string $name, string $messageType, string $body, array $paramNames, string $tenantId)
    {
        $this->generateId();
        $this->name = $name;
        $this->messageType = $messageType;
        $this->body = $body;
        $this->paramNames = $paramNames;
        $this->setTenantId($tenantId);
    }

    public function getName(): string { return $this->name; }
    public function getMessageType(): string { return $this->messageType; }
    public function getBody(): string { return $this->body; }
    public function getParamNames(): array { return $this->paramNames; }
    public function isActive(): bool { return $this->isActive; }

    public function setName(string $v): void { $this->name = $v; }
    public function setBody(string $v): void { $this->body = $v; }
    public function setParamNames(array $v): void { $this->paramNames = $v; }
    public function setIsActive(bool $v): void { $this->isActive = $v; }
    public function setLanguage(string $v): void { $this->language = $v; }

    /** Render template by replacing {{param}} with values */
    public function render(array $params): string
    {
        $rendered = $this->body;
        foreach ($this->paramNames as $i => $name) {
            $value = $params[$name] ?? $params[$i] ?? '';
            $rendered = str_replace('{{' . $name . '}}', $value, $rendered);
        }
        return $rendered;
    }

    public function toArray(): array
    {
        return [
            'id' => $this->getId(),
            'name' => $this->name,
            'message_type' => $this->messageType,
            'body' => $this->body,
            'param_names' => $this->paramNames,
            'is_active' => $this->isActive,
            'language' => $this->language,
        ];
    }
}

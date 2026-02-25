<?php

declare(strict_types=1);

namespace Lodgik\Entity;

use Doctrine\DBAL\Types\Types;
use Doctrine\ORM\Mapping as ORM;

#[ORM\Entity]
#[ORM\Table(name: 'platform_settings')]
class PlatformSetting
{
    #[ORM\Id]
    #[ORM\Column(name: 'setting_key', type: Types::STRING, length: 100)]
    private string $key;

    #[ORM\Column(name: 'setting_value', type: Types::TEXT, nullable: true)]
    private ?string $value = null;

    #[ORM\Column(name: 'is_secret', type: Types::BOOLEAN, options: ['default' => false])]
    private bool $isSecret = false;

    #[ORM\Column(name: 'updated_at', type: Types::DATETIME_IMMUTABLE)]
    private \DateTimeImmutable $updatedAt;

    public function __construct(string $key, ?string $value = null, bool $isSecret = false)
    {
        $this->key = $key;
        $this->value = $value;
        $this->isSecret = $isSecret;
        $this->updatedAt = new \DateTimeImmutable();
    }

    public function getKey(): string { return $this->key; }
    public function getValue(): ?string { return $this->value; }
    public function setValue(?string $value): void { $this->value = $value; $this->updatedAt = new \DateTimeImmutable(); }
    public function isSecret(): bool { return $this->isSecret; }
    public function setIsSecret(bool $s): void { $this->isSecret = $s; }
    public function getUpdatedAt(): \DateTimeImmutable { return $this->updatedAt; }
}

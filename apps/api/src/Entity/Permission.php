<?php
declare(strict_types=1);
namespace Lodgik\Entity;

use Doctrine\ORM\Mapping as ORM;

#[ORM\Entity]
#[ORM\Table(name: 'permissions')]
#[ORM\UniqueConstraint(name: 'uq_permission_module_action', columns: ['module_key', 'action'])]
#[ORM\Index(columns: ['module_key'], name: 'idx_permissions_module')]
class Permission
{
    #[ORM\Id]
    #[ORM\Column(type: 'guid')]
    #[ORM\GeneratedValue(strategy: 'CUSTOM')]
    #[ORM\CustomIdGenerator(class: \Lodgik\Helper\UuidGenerator::class)]
    private string $id;

    #[ORM\Column(name: 'module_key', type: 'string', length: 60)]
    private string $moduleKey;

    #[ORM\Column(type: 'string', length: 60)]
    private string $action;

    #[ORM\Column(type: 'string', length: 150)]
    private string $label;

    #[ORM\Column(type: 'text', nullable: true)]
    private ?string $description;

    #[ORM\Column(name: 'sort_order', type: 'integer')]
    private int $sortOrder;

    public function getId(): string { return $this->id; }
    public function getModuleKey(): string { return $this->moduleKey; }
    public function getAction(): string { return $this->action; }
    public function getLabel(): string { return $this->label; }
    public function getDescription(): ?string { return $this->description; }
    public function getSortOrder(): int { return $this->sortOrder; }

    public function getKey(): string { return $this->moduleKey . '.' . $this->action; }
}

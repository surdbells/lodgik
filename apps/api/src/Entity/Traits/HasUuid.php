<?php

declare(strict_types=1);

namespace Lodgik\Entity\Traits;

use Doctrine\ORM\Mapping as ORM;
use Lodgik\Helper\UuidHelper;

trait HasUuid
{
    #[ORM\Id]
    #[ORM\Column(type: 'string', length: 36)]
    private string $id;

    public function getId(): string
    {
        return $this->id;
    }

    /**
     * Call in constructor of each entity: $this->generateId();
     */
    protected function generateId(): void
    {
        $this->id = UuidHelper::generate();
    }
}

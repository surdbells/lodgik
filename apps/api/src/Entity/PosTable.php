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
#[ORM\Table(name: 'pos_tables')]
#[ORM\Index(columns: ['tenant_id', 'property_id'], name: 'idx_pt_property')]
#[ORM\HasLifecycleCallbacks]
class PosTable implements TenantAware
{
    use HasUuid; use HasTenant; use HasTimestamps;

    #[ORM\Column(name: 'property_id', type: Types::STRING, length: 36)]
    private string $propertyId;

    #[ORM\Column(type: Types::STRING, length: 20)]
    private string $number;

    #[ORM\Column(type: Types::INTEGER, options: ['default' => 4])]
    private int $seats = 4;

    /** 'bar', 'restaurant', 'poolside', 'terrace' */
    #[ORM\Column(type: Types::STRING, length: 30, options: ['default' => 'restaurant'])]
    private string $section = 'restaurant';

    #[ORM\Column(name: 'qr_code', type: Types::STRING, length: 50, nullable: true)]
    private ?string $qrCode = null;

    /** 'available', 'occupied', 'reserved', 'inactive' */
    #[ORM\Column(type: Types::STRING, length: 20, options: ['default' => 'available'])]
    private string $status = 'available';

    #[ORM\Column(name: 'current_order_id', type: Types::STRING, length: 36, nullable: true)]
    private ?string $currentOrderId = null;

    public function __construct(string $propertyId, string $number, string $tenantId)
    {
        $this->generateId();
        $this->propertyId = $propertyId;
        $this->number = $number;
        $this->setTenantId($tenantId);
        $this->qrCode = 'TBL-' . strtoupper(substr(md5($this->getId()), 0, 8));
    }

    public function getPropertyId(): string { return $this->propertyId; }
    public function getNumber(): string { return $this->number; }
    public function setNumber(string $v): void { $this->number = $v; }
    public function getSeats(): int { return $this->seats; }
    public function setSeats(int $v): void { $this->seats = $v; }
    public function getSection(): string { return $this->section; }
    public function setSection(string $v): void { $this->section = $v; }
    public function getQrCode(): ?string { return $this->qrCode; }
    public function getStatus(): string { return $this->status; }
    public function setStatus(string $v): void { $this->status = $v; }
    public function getCurrentOrderId(): ?string { return $this->currentOrderId; }
    public function setCurrentOrderId(?string $v): void { $this->currentOrderId = $v; }
    public function occupy(string $orderId): void { $this->status = 'occupied'; $this->currentOrderId = $orderId; }
    public function release(): void { $this->status = 'available'; $this->currentOrderId = null; }

    public function toArray(): array
    {
        return [
            'id' => $this->getId(), 'property_id' => $this->propertyId,
            'number' => $this->number, 'seats' => $this->seats,
            'section' => $this->section, 'qr_code' => $this->qrCode,
            'status' => $this->status, 'current_order_id' => $this->currentOrderId,
            'created_at' => $this->getCreatedAt()?->format('Y-m-d H:i:s'),
        ];
    }
}

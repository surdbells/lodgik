<?php

declare(strict_types=1);

namespace Lodgik\Entity;

use Doctrine\DBAL\Types\Types;
use Doctrine\ORM\Mapping as ORM;
use Lodgik\Entity\Contract\TenantAware;
use Lodgik\Entity\Traits\HasUuid;
use Lodgik\Entity\Traits\HasTenant;

#[ORM\Entity]
#[ORM\Table(name: 'booking_addons')]
#[ORM\Index(columns: ['tenant_id', 'booking_id'], name: 'idx_booking_addons_booking')]
class BookingAddon implements TenantAware
{
    use HasUuid;
    use HasTenant;

    #[ORM\Column(name: 'booking_id', type: Types::STRING, length: 36)]
    private string $bookingId;

    #[ORM\Column(type: Types::STRING, length: 150)]
    private string $name;

    #[ORM\Column(type: Types::DECIMAL, precision: 12, scale: 2)]
    private string $amount;

    #[ORM\Column(type: Types::SMALLINT, options: ['default' => 1])]
    private int $quantity = 1;

    public function __construct(string $bookingId, string $name, string $amount, string $tenantId, int $quantity = 1)
    {
        $this->generateId();
        $this->bookingId = $bookingId;
        $this->name = $name;
        $this->amount = $amount;
        $this->quantity = $quantity;
        $this->setTenantId($tenantId);
    }

    public function getBookingId(): string { return $this->bookingId; }
    public function getName(): string { return $this->name; }
    public function setName(string $v): void { $this->name = $v; }
    public function getAmount(): string { return $this->amount; }
    public function setAmount(string $v): void { $this->amount = $v; }
    public function getQuantity(): int { return $this->quantity; }
    public function setQuantity(int $v): void { $this->quantity = $v; }
    public function getLineTotal(): string { return number_format((float) $this->amount * $this->quantity, 2, '.', ''); }
}

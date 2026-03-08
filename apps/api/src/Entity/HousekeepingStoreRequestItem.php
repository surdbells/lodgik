<?php
declare(strict_types=1);

namespace Lodgik\Entity;

use Doctrine\DBAL\Types\Types;
use Doctrine\ORM\Mapping as ORM;
use Lodgik\Entity\Traits\HasUuid;

#[ORM\Entity]
#[ORM\Table(name: 'housekeeping_store_request_items')]
#[ORM\Index(columns: ['request_id'], name: 'idx_hk_req_items_req')]
class HousekeepingStoreRequestItem
{
    use HasUuid;

    #[ORM\Column(name: 'request_id', type: Types::STRING, length: 36)]
    private string $requestId;

    #[ORM\Column(name: 'consumable_id', type: Types::STRING, length: 36)]
    private string $consumableId;

    #[ORM\Column(name: 'consumable_name', type: Types::STRING, length: 150)]
    private string $consumableName;

    #[ORM\Column(name: 'quantity_req', type: Types::DECIMAL, precision: 10, scale: 2)]
    private string $quantityReq;

    #[ORM\Column(name: 'quantity_issued', type: Types::DECIMAL, precision: 10, scale: 2, nullable: true)]
    private ?string $quantityIssued = null;

    #[ORM\Column(type: Types::STRING, length: 30, options: ['default' => 'piece'])]
    private string $unit = 'piece';

    public function __construct(string $requestId, string $consumableId, string $consumableName, string $quantityReq, string $unit)
    {
        $this->generateId();
        $this->requestId      = $requestId;
        $this->consumableId   = $consumableId;
        $this->consumableName = $consumableName;
        $this->quantityReq    = $quantityReq;
        $this->unit           = $unit;
    }

    public function getRequestId(): string { return $this->requestId; }
    public function getConsumableId(): string { return $this->consumableId; }
    public function getQuantityReq(): string { return $this->quantityReq; }
    public function getQuantityIssued(): ?string { return $this->quantityIssued; }
    public function setQuantityIssued(?string $v): void { $this->quantityIssued = $v; }

    public function toArray(): array
    {
        return [
            'id'              => $this->id,
            'request_id'      => $this->requestId,
            'consumable_id'   => $this->consumableId,
            'consumable_name' => $this->consumableName,
            'quantity_req'    => $this->quantityReq,
            'quantity_issued' => $this->quantityIssued,
            'unit'            => $this->unit,
        ];
    }
}

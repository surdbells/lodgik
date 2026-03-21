<?php
declare(strict_types=1);
namespace Lodgik\Entity;

use Doctrine\ORM\Mapping as ORM;
use Doctrine\DBAL\Types\Types;
use Lodgik\Entity\Traits\HasUuid;
use Lodgik\Entity\Traits\HasTimestamps;

/**
 * Section-specific price override for a POS product.
 * When an order is placed at a table belonging to a section,
 * this override price replaces the product's default price.
 */
#[ORM\Entity]
#[ORM\Table(name: 'pos_section_prices')]
#[ORM\Index(columns: ['property_id', 'product_id'], name: 'idx_psp_product')]
#[ORM\Index(columns: ['property_id', 'section'], name: 'idx_psp_section')]
#[ORM\UniqueConstraint(name: 'uq_psp_product_section', columns: ['product_id', 'section', 'property_id'])]
#[ORM\HasLifecycleCallbacks]
class PosSectionPrice
{
    use HasUuid, HasTimestamps;

    #[ORM\Column(name: 'property_id', type: Types::STRING, length: 36)]
    private string $propertyId;

    #[ORM\Column(name: 'tenant_id', type: Types::STRING, length: 36)]
    private string $tenantId;

    #[ORM\Column(name: 'product_id', type: Types::STRING, length: 36)]
    private string $productId;

    #[ORM\Column(name: 'product_name', type: Types::STRING, length: 200)]
    private string $productName;

    /** e.g. 'restaurant', 'private_lounge', 'executive_lounge', 'bar', 'pool' */
    #[ORM\Column(name: 'section', type: Types::STRING, length: 100)]
    private string $section;

    #[ORM\Column(name: 'price', type: Types::DECIMAL, precision: 12, scale: 2)]
    private string $price;

    #[ORM\Column(name: 'note', type: Types::STRING, length: 255, nullable: true)]
    private ?string $note = null;

    public function __construct(
        string $propertyId,
        string $tenantId,
        string $productId,
        string $productName,
        string $section,
        string $price
    ) {
        $this->generateId();
        $this->propertyId  = $propertyId;
        $this->tenantId    = $tenantId;
        $this->productId   = $productId;
        $this->productName = $productName;
        $this->section     = $section;
        $this->price       = $price;
    }

    public function getId(): string        { return $this->id; }
    public function getPropertyId(): string { return $this->propertyId; }
    public function getTenantId(): string   { return $this->tenantId; }
    public function getProductId(): string  { return $this->productId; }
    public function getProductName(): string { return $this->productName; }
    public function getSection(): string    { return $this->section; }
    public function getPrice(): string      { return $this->price; }
    public function getNote(): ?string      { return $this->note; }
    public function setPrice(string $v): void { $this->price = $v; }
    public function setNote(?string $v): void { $this->note = $v; }
    public function setProductName(string $v): void { $this->productName = $v; }

    public function toArray(): array
    {
        return [
            'id'           => $this->getId(),
            'property_id'  => $this->propertyId,
            'product_id'   => $this->productId,
            'product_name' => $this->productName,
            'section'      => $this->section,
            'price'        => $this->price,
            'note'         => $this->note,
            'created_at'   => $this->getCreatedAt()?->format('Y-m-d H:i:s'),
        ];
    }
}

<?php
declare(strict_types=1);
namespace Lodgik\Entity;
use Doctrine\DBAL\Types\Types; use Doctrine\ORM\Mapping as ORM;
use Lodgik\Entity\Contract\TenantAware; use Lodgik\Entity\Traits\{HasUuid, HasTenant, HasTimestamps};

#[ORM\Entity] #[ORM\Table(name: 'assets')]
#[ORM\Index(columns: ['tenant_id', 'property_id', 'status'], name: 'idx_asset_status')]
#[ORM\Index(columns: ['tenant_id', 'qr_code'], name: 'idx_asset_qr')] #[ORM\HasLifecycleCallbacks]
class Asset implements TenantAware
{
    use HasUuid, HasTenant, HasTimestamps;
    #[ORM\Column(name: 'property_id', type: Types::STRING, length: 36)] private string $propertyId;
    #[ORM\Column(name: 'category_id', type: Types::STRING, length: 36)] private string $categoryId;
    #[ORM\Column(name: 'category_name', type: Types::STRING, length: 100)] private string $categoryName;
    #[ORM\Column(type: Types::STRING, length: 200)] private string $name;
    #[ORM\Column(type: Types::STRING, length: 100, nullable: true)] private ?string $brand = null;
    #[ORM\Column(name: 'model', type: Types::STRING, length: 100, nullable: true)] private ?string $model = null;
    #[ORM\Column(name: 'serial_number', type: Types::STRING, length: 100, nullable: true)] private ?string $serialNumber = null;
    #[ORM\Column(name: 'purchase_date', type: Types::DATE_IMMUTABLE, nullable: true)] private ?\DateTimeImmutable $purchaseDate = null;
    #[ORM\Column(name: 'warranty_expiry', type: Types::DATE_IMMUTABLE, nullable: true)] private ?\DateTimeImmutable $warrantyExpiry = null;
    #[ORM\Column(name: 'purchase_cost', type: Types::BIGINT, nullable: true)] private ?string $purchaseCost = null;
    #[ORM\Column(name: 'qr_code', type: Types::STRING, length: 50, nullable: true)] private ?string $qrCode = null;
    /** active|under_repair|retired|disposed */
    #[ORM\Column(type: Types::STRING, length: 15, options: ['default' => 'active'])] private string $status = 'active';
    /** low|medium|high|critical */
    #[ORM\Column(name: 'criticality', type: Types::STRING, length: 10, options: ['default' => 'medium'])] private string $criticality = 'medium';
    #[ORM\Column(name: 'location_block', type: Types::STRING, length: 50, nullable: true)] private ?string $locationBlock = null;
    #[ORM\Column(name: 'location_floor', type: Types::STRING, length: 20, nullable: true)] private ?string $locationFloor = null;
    #[ORM\Column(name: 'location_room', type: Types::STRING, length: 50, nullable: true)] private ?string $locationRoom = null;
    #[ORM\Column(name: 'custodian_dept', type: Types::STRING, length: 50, nullable: true)] private ?string $custodianDept = null;
    #[ORM\Column(name: 'custodian_staff_id', type: Types::STRING, length: 36, nullable: true)] private ?string $custodianStaffId = null;
    #[ORM\Column(name: 'custodian_staff_name', type: Types::STRING, length: 100, nullable: true)] private ?string $custodianStaffName = null;
    #[ORM\Column(name: 'primary_engineer_id', type: Types::STRING, length: 36, nullable: true)] private ?string $primaryEngineerId = null;
    #[ORM\Column(name: 'backup_engineer_id', type: Types::STRING, length: 36, nullable: true)] private ?string $backupEngineerId = null;
    #[ORM\Column(name: 'notes', type: Types::TEXT, nullable: true)] private ?string $notes = null;
    #[ORM\Column(name: 'photo_url', type: Types::STRING, length: 500, nullable: true)] private ?string $photoUrl = null;

    public function __construct(string $propertyId, string $categoryId, string $categoryName, string $name, string $tenantId)
    { $this->generateId(); $this->propertyId = $propertyId; $this->categoryId = $categoryId; $this->categoryName = $categoryName; $this->name = $name; $this->setTenantId($tenantId);
      $this->qrCode = 'AST-' . strtoupper(substr(md5(random_bytes(8)), 0, 8)); }

    public function getPropertyId(): string { return $this->propertyId; }
    public function getName(): string { return $this->name; } public function setName(string $v): void { $this->name = $v; }
    public function getStatus(): string { return $this->status; } public function setStatus(string $v): void { $this->status = $v; }
    public function getCriticality(): string { return $this->criticality; } public function setCriticality(string $v): void { $this->criticality = $v; }
    public function getQrCode(): ?string { return $this->qrCode; }
    public function getPrimaryEngineerId(): ?string { return $this->primaryEngineerId; }
    public function getBackupEngineerId(): ?string { return $this->backupEngineerId; }
    public function setBrand(?string $v): void { $this->brand = $v; } public function setModel(?string $v): void { $this->model = $v; }
    public function setSerialNumber(?string $v): void { $this->serialNumber = $v; }
    public function setPurchaseDate(?\DateTimeImmutable $v): void { $this->purchaseDate = $v; }
    public function setWarrantyExpiry(?\DateTimeImmutable $v): void { $this->warrantyExpiry = $v; }
    public function setPurchaseCost(?string $v): void { $this->purchaseCost = $v; }
    public function setLocationBlock(?string $v): void { $this->locationBlock = $v; }
    public function setLocationFloor(?string $v): void { $this->locationFloor = $v; }
    public function setLocationRoom(?string $v): void { $this->locationRoom = $v; }
    public function setCustodianDept(?string $v): void { $this->custodianDept = $v; }
    public function setCustodianStaffId(?string $v): void { $this->custodianStaffId = $v; }
    public function setCustodianStaffName(?string $v): void { $this->custodianStaffName = $v; }
    public function setPrimaryEngineerId(?string $v): void { $this->primaryEngineerId = $v; }
    public function setBackupEngineerId(?string $v): void { $this->backupEngineerId = $v; }
    public function setNotes(?string $v): void { $this->notes = $v; } public function setPhotoUrl(?string $v): void { $this->photoUrl = $v; }

    public function toArray(): array
    { return ['id' => $this->getId(), 'property_id' => $this->propertyId, 'category_id' => $this->categoryId, 'category_name' => $this->categoryName,
        'name' => $this->name, 'brand' => $this->brand, 'model' => $this->model, 'serial_number' => $this->serialNumber,
        'purchase_date' => $this->purchaseDate?->format('Y-m-d'), 'warranty_expiry' => $this->warrantyExpiry?->format('Y-m-d'),
        'purchase_cost' => $this->purchaseCost, 'qr_code' => $this->qrCode, 'status' => $this->status, 'criticality' => $this->criticality,
        'location_block' => $this->locationBlock, 'location_floor' => $this->locationFloor, 'location_room' => $this->locationRoom,
        'custodian_dept' => $this->custodianDept, 'custodian_staff_name' => $this->custodianStaffName,
        'primary_engineer_id' => $this->primaryEngineerId, 'backup_engineer_id' => $this->backupEngineerId,
        'notes' => $this->notes, 'photo_url' => $this->photoUrl, 'created_at' => $this->getCreatedAt()?->format('Y-m-d H:i:s')]; }
}

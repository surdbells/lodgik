<?php
declare(strict_types=1);
namespace Lodgik\Entity;

use Doctrine\DBAL\Types\Types;
use Doctrine\ORM\Mapping as ORM;
use Lodgik\Entity\Traits\HasUuid;
use Lodgik\Entity\Traits\HasTimestamps;

#[ORM\Entity]
#[ORM\Table(name: 'merchant_support_tickets')]
#[ORM\Index(columns: ['merchant_id'], name: 'idx_mst_merch')]
#[ORM\Index(columns: ['status'], name: 'idx_mst_status')]
#[ORM\HasLifecycleCallbacks]
class MerchantSupportTicket
{
    use HasUuid; use HasTimestamps;

    #[ORM\Column(type: Types::STRING, length: 36)]
    private string $merchantId;
    #[ORM\Column(type: Types::STRING, length: 36, nullable: true)]
    private ?string $hotelId = null;
    #[ORM\Column(type: Types::STRING, length: 255)]
    private string $subject;
    #[ORM\Column(type: Types::TEXT)]
    private string $description;
    #[ORM\Column(type: Types::STRING, length: 20)]
    private string $priorityTag = 'sales';
    #[ORM\Column(type: Types::STRING, length: 20)]
    private string $status = 'open';
    #[ORM\Column(type: Types::STRING, length: 36, nullable: true)]
    private ?string $assignedTo = null;
    #[ORM\Column(type: Types::DATETIME_IMMUTABLE, nullable: true)]
    private ?\DateTimeImmutable $slaDueAt = null;
    #[ORM\Column(type: Types::DATETIME_IMMUTABLE, nullable: true)]
    private ?\DateTimeImmutable $resolvedAt = null;
    #[ORM\Column(type: Types::TEXT, nullable: true)]
    private ?string $resolutionNotes = null;

    public function __construct() { $this->generateId(); }

    public function getMerchantId(): string { return $this->merchantId; }
    public function setMerchantId(string $v): self { $this->merchantId = $v; return $this; }
    public function getHotelId(): ?string { return $this->hotelId; }
    public function setHotelId(?string $v): self { $this->hotelId = $v; return $this; }
    public function getSubject(): string { return $this->subject; }
    public function setSubject(string $v): self { $this->subject = $v; return $this; }
    public function getDescription(): string { return $this->description; }
    public function setDescription(string $v): self { $this->description = $v; return $this; }
    public function getPriorityTag(): string { return $this->priorityTag; }
    public function setPriorityTag(string $v): self { $this->priorityTag = $v; return $this; }
    public function getStatus(): string { return $this->status; }
    public function setStatus(string $v): self { $this->status = $v; return $this; }
    public function getAssignedTo(): ?string { return $this->assignedTo; }
    public function setAssignedTo(?string $v): self { $this->assignedTo = $v; return $this; }
    public function getSlaDueAt(): ?\DateTimeImmutable { return $this->slaDueAt; }
    public function setSlaDueAt(?\DateTimeImmutable $v): self { $this->slaDueAt = $v; return $this; }
    public function getResolvedAt(): ?\DateTimeImmutable { return $this->resolvedAt; }
    public function setResolvedAt(?\DateTimeImmutable $v): self { $this->resolvedAt = $v; return $this; }
    public function getResolutionNotes(): ?string { return $this->resolutionNotes; }
    public function setResolutionNotes(?string $v): self { $this->resolutionNotes = $v; return $this; }

    public function toArray(): array
    {
        return [
            'id' => $this->getId(), 'merchant_id' => $this->merchantId, 'hotel_id' => $this->hotelId,
            'subject' => $this->subject, 'description' => $this->description, 'priority_tag' => $this->priorityTag,
            'status' => $this->status, 'assigned_to' => $this->assignedTo,
            'sla_due_at' => $this->slaDueAt?->format(\DateTimeInterface::ATOM),
            'resolved_at' => $this->resolvedAt?->format(\DateTimeInterface::ATOM),
            'resolution_notes' => $this->resolutionNotes, 'created_at' => $this->getCreatedAt()->format(\DateTimeInterface::ATOM),
        ];
    }
}

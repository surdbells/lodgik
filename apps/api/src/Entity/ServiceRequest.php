<?php

declare(strict_types=1);

namespace Lodgik\Entity;

use Doctrine\DBAL\Types\Types;
use Doctrine\ORM\Mapping as ORM;
use Lodgik\Entity\Contract\TenantAware;
use Lodgik\Entity\Traits\HasUuid;
use Lodgik\Entity\Traits\HasTenant;
use Lodgik\Entity\Traits\HasTimestamps;
use Lodgik\Enum\ServiceRequestStatus;
use Lodgik\Enum\ServiceRequestCategory;

#[ORM\Entity]
#[ORM\Table(name: 'service_requests')]
#[ORM\Index(columns: ['tenant_id', 'property_id', 'status'], name: 'idx_sr_property_status')]
#[ORM\Index(columns: ['tenant_id', 'booking_id'], name: 'idx_sr_booking')]
#[ORM\HasLifecycleCallbacks]
class ServiceRequest implements TenantAware
{
    use HasUuid;
    use HasTenant;
    use HasTimestamps;

    #[ORM\Column(name: 'property_id', type: Types::STRING, length: 36)]
    private string $propertyId;

    #[ORM\Column(name: 'booking_id', type: Types::STRING, length: 36)]
    private string $bookingId;

    #[ORM\Column(name: 'guest_id', type: Types::STRING, length: 36)]
    private string $guestId;

    #[ORM\Column(name: 'room_id', type: Types::STRING, length: 36, nullable: true)]
    private ?string $roomId = null;

    #[ORM\Column(type: Types::STRING, length: 20, enumType: ServiceRequestCategory::class)]
    private ServiceRequestCategory $category;

    #[ORM\Column(type: Types::STRING, length: 20, enumType: ServiceRequestStatus::class)]
    private ServiceRequestStatus $status = ServiceRequestStatus::PENDING;

    #[ORM\Column(type: Types::STRING, length: 200)]
    private string $title;

    #[ORM\Column(type: Types::TEXT, nullable: true)]
    private ?string $description = null;

    /** Priority: 1=low, 2=normal, 3=high, 4=urgent */
    #[ORM\Column(type: Types::INTEGER, options: ['default' => 2])]
    private int $priority = 2;

    #[ORM\Column(name: 'assigned_to', type: Types::STRING, length: 36, nullable: true)]
    private ?string $assignedTo = null;

    #[ORM\Column(name: 'acknowledged_at', type: Types::DATETIME_IMMUTABLE, nullable: true)]
    private ?\DateTimeImmutable $acknowledgedAt = null;

    #[ORM\Column(name: 'completed_at', type: Types::DATETIME_IMMUTABLE, nullable: true)]
    private ?\DateTimeImmutable $completedAt = null;

    #[ORM\Column(name: 'guest_rating', type: Types::INTEGER, nullable: true)]
    private ?int $guestRating = null;

    #[ORM\Column(name: 'guest_feedback', type: Types::TEXT, nullable: true)]
    private ?string $guestFeedback = null;

    #[ORM\Column(name: 'staff_notes', type: Types::TEXT, nullable: true)]
    private ?string $staffNotes = null;

    /** Optional photo URL (guest can attach an image) */
    #[ORM\Column(name: 'photo_url', type: Types::STRING, length: 500, nullable: true)]
    private ?string $photoUrl = null;

    public function __construct(string $propertyId, string $bookingId, string $guestId, ServiceRequestCategory $category, string $title, string $tenantId)
    {
        $this->generateId();
        $this->propertyId = $propertyId;
        $this->bookingId = $bookingId;
        $this->guestId = $guestId;
        $this->category = $category;
        $this->title = $title;
        $this->setTenantId($tenantId);
    }

    public function getPropertyId(): string { return $this->propertyId; }
    public function getBookingId(): string { return $this->bookingId; }
    public function getGuestId(): string { return $this->guestId; }
    public function getRoomId(): ?string { return $this->roomId; }
    public function setRoomId(?string $v): void { $this->roomId = $v; }
    public function getCategory(): ServiceRequestCategory { return $this->category; }
    public function getStatus(): ServiceRequestStatus { return $this->status; }
    public function setStatus(ServiceRequestStatus $v): void { $this->status = $v; }
    public function getTitle(): string { return $this->title; }
    public function getDescription(): ?string { return $this->description; }
    public function setDescription(?string $v): void { $this->description = $v; }
    public function getPriority(): int { return $this->priority; }
    public function setPriority(int $v): void { $this->priority = $v; }
    public function getAssignedTo(): ?string { return $this->assignedTo; }
    public function setAssignedTo(?string $v): void { $this->assignedTo = $v; }
    public function getAcknowledgedAt(): ?\DateTimeImmutable { return $this->acknowledgedAt; }
    public function setAcknowledgedAt(?\DateTimeImmutable $v): void { $this->acknowledgedAt = $v; }
    public function getCompletedAt(): ?\DateTimeImmutable { return $this->completedAt; }
    public function setCompletedAt(?\DateTimeImmutable $v): void { $this->completedAt = $v; }
    public function getGuestRating(): ?int { return $this->guestRating; }
    public function setGuestRating(?int $v): void { $this->guestRating = $v; }
    public function getGuestFeedback(): ?string { return $this->guestFeedback; }
    public function setGuestFeedback(?string $v): void { $this->guestFeedback = $v; }
    public function getStaffNotes(): ?string { return $this->staffNotes; }
    public function setStaffNotes(?string $v): void { $this->staffNotes = $v; }
    public function getPhotoUrl(): ?string { return $this->photoUrl; }
    public function setPhotoUrl(?string $v): void { $this->photoUrl = $v; }

    public function acknowledge(?string $staffId = null): void
    {
        $this->status = ServiceRequestStatus::ACKNOWLEDGED;
        $this->acknowledgedAt = new \DateTimeImmutable();
        if ($staffId) $this->assignedTo = $staffId;
    }

    public function startProgress(?string $staffId = null): void
    {
        $this->status = ServiceRequestStatus::IN_PROGRESS;
        if ($staffId) $this->assignedTo = $staffId;
    }

    public function complete(?string $notes = null): void
    {
        $this->status = ServiceRequestStatus::COMPLETED;
        $this->completedAt = new \DateTimeImmutable();
        if ($notes) $this->staffNotes = $notes;
    }

    public function cancel(): void
    {
        $this->status = ServiceRequestStatus::CANCELLED;
    }

    public function rate(int $rating, ?string $feedback = null): void
    {
        $this->guestRating = max(1, min(5, $rating));
        $this->guestFeedback = $feedback;
    }

    public function getPriorityLabel(): string
    {
        return match ($this->priority) { 1 => 'Low', 2 => 'Normal', 3 => 'High', 4 => 'Urgent', default => 'Normal' };
    }

    public function toArray(): array
    {
        return [
            'id' => $this->getId(),
            'property_id' => $this->propertyId,
            'booking_id' => $this->bookingId,
            'guest_id' => $this->guestId,
            'room_id' => $this->roomId,
            'category' => $this->category->value,
            'category_label' => $this->category->label(),
            'category_icon' => $this->category->icon(),
            'status' => $this->status->value,
            'status_label' => $this->status->label(),
            'status_color' => $this->status->color(),
            'title' => $this->title,
            'description' => $this->description,
            'priority' => $this->priority,
            'priority_label' => $this->getPriorityLabel(),
            'assigned_to' => $this->assignedTo,
            'acknowledged_at' => $this->acknowledgedAt?->format('Y-m-d H:i:s'),
            'completed_at' => $this->completedAt?->format('Y-m-d H:i:s'),
            'guest_rating' => $this->guestRating,
            'guest_feedback' => $this->guestFeedback,
            'staff_notes' => $this->staffNotes,
            'photo_url' => $this->photoUrl,
            'created_at' => $this->getCreatedAt()?->format('Y-m-d H:i:s'),
        ];
    }
}

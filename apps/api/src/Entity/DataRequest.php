<?php

declare(strict_types=1);

namespace Lodgik\Entity;

use Doctrine\DBAL\Types\Types;
use Doctrine\ORM\Mapping as ORM;
use Lodgik\Entity\Traits\HasUuid;
use Lodgik\Entity\Traits\HasTenant;
use Lodgik\Entity\Traits\HasTimestamps;

#[ORM\Entity]
#[ORM\Table(name: 'data_requests')]
#[ORM\Index(columns: ['tenant_id', 'status'], name: 'idx_dr_tenant')]
#[ORM\Index(columns: ['subject_type', 'subject_id'], name: 'idx_dr_subject')]
#[ORM\HasLifecycleCallbacks]
class DataRequest
{
    use HasUuid, HasTenant, HasTimestamps;

    /** export | erasure */
    #[ORM\Column(type: Types::STRING, length: 20)]
    private string $type;

    /** guest | employee */
    #[ORM\Column(name: 'subject_type', type: Types::STRING, length: 20)]
    private string $subjectType;

    #[ORM\Column(name: 'subject_id', type: Types::STRING, length: 36)]
    private string $subjectId;

    #[ORM\Column(name: 'subject_name', type: Types::STRING, length: 200)]
    private string $subjectName;

    /** pending | processing | complete | rejected */
    #[ORM\Column(type: Types::STRING, length: 20, options: ['default' => 'pending'])]
    private string $status = 'pending';

    #[ORM\Column(name: 'rejection_reason', type: Types::TEXT, nullable: true)]
    private ?string $rejectionReason = null;

    /** Signed URL to the exported JSON file */
    #[ORM\Column(name: 'download_url', type: Types::TEXT, nullable: true)]
    private ?string $downloadUrl = null;

    #[ORM\Column(name: 'requested_by_id', type: Types::STRING, length: 36)]
    private string $requestedById;

    #[ORM\Column(name: 'requested_by_name', type: Types::STRING, length: 200)]
    private string $requestedByName;

    #[ORM\Column(name: 'property_id', type: Types::STRING, length: 36, nullable: true)]
    private ?string $propertyId = null;

    #[ORM\Column(name: 'completed_at', type: Types::DATETIME_IMMUTABLE, nullable: true)]
    private ?\DateTimeImmutable $completedAt = null;

    public function __construct(
        string $type,
        string $subjectType,
        string $subjectId,
        string $subjectName,
        string $requestedById,
        string $requestedByName,
        string $tenantId,
        ?string $propertyId = null,
    ) {
        $this->generateId();
        $this->type             = $type;
        $this->subjectType      = $subjectType;
        $this->subjectId        = $subjectId;
        $this->subjectName      = $subjectName;
        $this->requestedById    = $requestedById;
        $this->requestedByName  = $requestedByName;
        $this->propertyId       = $propertyId;
        $this->setTenantId($tenantId);
    }

    // ── State machine ──────────────────────────────────────────

    public function markProcessing(): void { $this->status = 'processing'; }

    public function markComplete(?string $downloadUrl = null): void
    {
        $this->status      = 'complete';
        $this->completedAt = new \DateTimeImmutable();
        if ($downloadUrl !== null) $this->downloadUrl = $downloadUrl;
    }

    public function reject(string $reason): void
    {
        $this->status          = 'rejected';
        $this->rejectionReason = $reason;
        $this->completedAt     = new \DateTimeImmutable();
    }

    // ── Getters ────────────────────────────────────────────────

    public function getType(): string { return $this->type; }
    public function getSubjectType(): string { return $this->subjectType; }
    public function getSubjectId(): string { return $this->subjectId; }
    public function getSubjectName(): string { return $this->subjectName; }
    public function getStatus(): string { return $this->status; }
    public function getRejectionReason(): ?string { return $this->rejectionReason; }
    public function getDownloadUrl(): ?string { return $this->downloadUrl; }
    public function setDownloadUrl(?string $v): void { $this->downloadUrl = $v; }
    public function getRequestedById(): string { return $this->requestedById; }
    public function getRequestedByName(): string { return $this->requestedByName; }
    public function getPropertyId(): ?string { return $this->propertyId; }
    public function getCompletedAt(): ?\DateTimeImmutable { return $this->completedAt; }

    public function toArray(): array
    {
        return [
            'id'                  => $this->getId(),
            'type'                => $this->type,
            'type_label'          => $this->type === 'export' ? 'Data Export' : 'Right to Erasure',
            'subject_type'        => $this->subjectType,
            'subject_id'          => $this->subjectId,
            'subject_name'        => $this->subjectName,
            'status'              => $this->status,
            'status_color'        => $this->statusColor(),
            'rejection_reason'    => $this->rejectionReason,
            'download_url'        => $this->downloadUrl,
            'requested_by_name'   => $this->requestedByName,
            'property_id'         => $this->propertyId,
            'completed_at'        => $this->completedAt?->format('Y-m-d H:i:s'),
            'created_at'          => $this->getCreatedAt()->format('Y-m-d H:i:s'),
            'updated_at'          => $this->getUpdatedAt()->format('Y-m-d H:i:s'),
        ];
    }

    private function statusColor(): string
    {
        return match ($this->status) {
            'pending'    => 'amber',
            'processing' => 'blue',
            'complete'   => 'green',
            'rejected'   => 'red',
            default      => 'gray',
        };
    }
}

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
#[ORM\Table(name: 'performance_reviews')]
#[ORM\Index(columns: ['tenant_id', 'employee_id'], name: 'idx_perf_emp')]
#[ORM\HasLifecycleCallbacks]
class PerformanceReview implements TenantAware
{
    use HasUuid, HasTenant, HasTimestamps;

    #[ORM\Column(name: 'property_id', type: Types::STRING, length: 36)]
    private string $propertyId;
    #[ORM\Column(name: 'employee_id', type: Types::STRING, length: 36)]
    private string $employeeId;
    #[ORM\Column(name: 'employee_name', type: Types::STRING, length: 150)]
    private string $employeeName;
    #[ORM\Column(name: 'reviewer_id', type: Types::STRING, length: 36)]
    private string $reviewerId;
    #[ORM\Column(name: 'reviewer_name', type: Types::STRING, length: 150)]
    private string $reviewerName;
    /** Q1|Q2|Q3|Q4|H1|H2|Annual */
    #[ORM\Column(type: Types::STRING, length: 10)]
    private string $period;
    #[ORM\Column(type: Types::INTEGER)]
    private int $year;
    /** 1-5 scale */
    #[ORM\Column(name: 'overall_rating', type: Types::INTEGER)]
    private int $overallRating;
    #[ORM\Column(type: Types::JSON, nullable: true)]
    private ?array $ratings = null;
    #[ORM\Column(type: Types::TEXT, nullable: true)]
    private ?string $strengths = null;
    #[ORM\Column(type: Types::TEXT, nullable: true)]
    private ?string $improvements = null;
    #[ORM\Column(name: 'action_items', type: Types::TEXT, nullable: true)]
    private ?string $actionItems = null;
    #[ORM\Column(type: Types::JSON, nullable: true)]
    private ?array $goals = null;
    /** draft|submitted|acknowledged */
    #[ORM\Column(type: Types::STRING, length: 15, options: ['default' => 'draft'])]
    private string $status = 'draft';
    #[ORM\Column(name: 'submitted_at', type: Types::DATETIME_IMMUTABLE, nullable: true)]
    private ?\DateTimeImmutable $submittedAt = null;
    #[ORM\Column(name: 'acknowledged_at', type: Types::DATETIME_IMMUTABLE, nullable: true)]
    private ?\DateTimeImmutable $acknowledgedAt = null;

    public function __construct(string $propertyId, string $employeeId, string $employeeName, string $reviewerId, string $reviewerName, string $period, int $year, int $overallRating, string $tenantId)
    {
        $this->generateId(); $this->propertyId = $propertyId; $this->employeeId = $employeeId; $this->employeeName = $employeeName;
        $this->reviewerId = $reviewerId; $this->reviewerName = $reviewerName; $this->period = $period; $this->year = $year;
        $this->overallRating = $overallRating; $this->setTenantId($tenantId);
    }

    public function getEmployeeId(): string { return $this->employeeId; }
    public function getOverallRating(): int { return $this->overallRating; }
    public function setOverallRating(int $v): void { $this->overallRating = $v; }
    public function setRatings(?array $v): void { $this->ratings = $v; }
    public function setStrengths(?string $v): void { $this->strengths = $v; }
    public function setImprovements(?string $v): void { $this->improvements = $v; }
    public function setActionItems(?string $v): void { $this->actionItems = $v; }
    public function setGoals(?array $v): void { $this->goals = $v; }
    public function getStatus(): string { return $this->status; }
    public function submit(): void { $this->status = 'submitted'; $this->submittedAt = new \DateTimeImmutable(); }
    public function acknowledge(): void { $this->status = 'acknowledged'; $this->acknowledgedAt = new \DateTimeImmutable(); }

    public function toArray(): array
    {
        return [
            'id' => $this->getId(), 'employee_id' => $this->employeeId, 'employee_name' => $this->employeeName,
            'reviewer_name' => $this->reviewerName, 'period' => $this->period, 'year' => $this->year,
            'overall_rating' => $this->overallRating, 'ratings' => $this->ratings,
            'strengths' => $this->strengths, 'improvements' => $this->improvements,
            'action_items' => $this->actionItems, 'goals' => $this->goals,
            'status' => $this->status, 'submitted_at' => $this->submittedAt?->format('Y-m-d H:i:s'),
            'acknowledged_at' => $this->acknowledgedAt?->format('Y-m-d H:i:s'),
            'created_at' => $this->getCreatedAt()?->format('Y-m-d H:i:s'),
        ];
    }
}

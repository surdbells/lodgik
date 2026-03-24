<?php declare(strict_types=1);
namespace Lodgik\Entity;
use Doctrine\DBAL\Types\Types;
use Doctrine\ORM\Mapping as ORM;
use Lodgik\Entity\Traits\HasUuid;
#[ORM\Entity]
#[ORM\Table(name: 'training_enrollments')]
#[ORM\UniqueConstraint(name: 'uq_training_enrollment', columns: ['program_id', 'employee_id'])]
class TrainingEnrollment
{
    use HasUuid;
    #[ORM\Column(name: 'program_id', type: Types::STRING, length: 36)]
    private string $programId;
    #[ORM\Column(name: 'employee_id', type: Types::STRING, length: 36)]
    private string $employeeId;
    #[ORM\Column(name: 'employee_name', type: Types::STRING, length: 150)]
    private string $employeeName;
    #[ORM\Column(name: 'enrolled_at', type: Types::DATETIME_IMMUTABLE)]
    private \DateTimeImmutable $enrolledAt;
    #[ORM\Column(name: 'completed_at', type: Types::DATETIME_IMMUTABLE, nullable: true)]
    private ?\DateTimeImmutable $completedAt = null;
    #[ORM\Column(name: 'completion_pct', type: Types::SMALLINT)]
    private int $completionPct = 0;
    #[ORM\Column(type: Types::DECIMAL, precision: 5, scale: 2, nullable: true)]
    private ?string $score = null;
    #[ORM\Column(name: 'certificate_url', type: Types::STRING, length: 500, nullable: true)]
    private ?string $certificateUrl = null;
    #[ORM\Column(type: Types::STRING, length: 20)]
    private string $status = 'enrolled';
    #[ORM\Column(type: Types::TEXT, nullable: true)]
    private ?string $notes = null;

    public function __construct(string $programId, string $empId, string $empName) {
        $this->generateId();
        $this->programId   = $programId;
        $this->employeeId  = $empId;
        $this->employeeName = $empName;
        $this->enrolledAt  = new \DateTimeImmutable();
    }
    public function getProgramId(): string { return $this->programId; }
    public function getEmployeeId(): string { return $this->employeeId; }
    public function setCompletionPct(int $v): void { $this->completionPct = $v; }
    public function setScore(?string $v): void { $this->score = $v; }
    public function setCertificateUrl(?string $v): void { $this->certificateUrl = $v; }
    public function setStatus(string $v): void { $this->status = $v; }
    public function setNotes(?string $v): void { $this->notes = $v; }
    public function complete(): void { $this->completedAt = new \DateTimeImmutable(); $this->status = 'completed'; $this->completionPct = 100; }
    public function toArray(): array {
        return [
            'id' => $this->getId(), 'program_id' => $this->programId,
            'employee_id' => $this->employeeId, 'employee_name' => $this->employeeName,
            'enrolled_at' => $this->enrolledAt->format('Y-m-d'),
            'completed_at' => $this->completedAt?->format('Y-m-d'),
            'completion_pct' => $this->completionPct, 'score' => $this->score,
            'certificate_url' => $this->certificateUrl, 'status' => $this->status, 'notes' => $this->notes,
        ];
    }
}

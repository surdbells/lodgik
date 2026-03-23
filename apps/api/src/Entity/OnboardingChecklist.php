<?php declare(strict_types=1);
namespace Lodgik\Entity;
use Doctrine\DBAL\Types\Types; use Doctrine\ORM\Mapping as ORM;
use Lodgik\Entity\Traits\{HasUuid,HasTenant};
#[ORM\Entity] #[ORM\Table(name:'onboarding_checklists')]
class OnboardingChecklist { use HasUuid,HasTenant;
    #[ORM\Column(name:'employee_id',type:Types::STRING,length:36)] private string $employeeId;
    #[ORM\Column(type:Types::STRING,length:150)] private string $title;
    #[ORM\Column(type:Types::TEXT,nullable:true)] private ?string $description=null;
    #[ORM\Column(type:Types::STRING,length:50)] private string $category='general';
    #[ORM\Column(name:'due_date',type:Types::DATE_IMMUTABLE,nullable:true)] private ?\DateTimeImmutable $dueDate=null;
    #[ORM\Column(name:'completed_at',type:Types::DATETIME_IMMUTABLE,nullable:true)] private ?\DateTimeImmutable $completedAt=null;
    #[ORM\Column(name:'completed_by',type:Types::STRING,length:36,nullable:true)] private ?string $completedBy=null;
    #[ORM\Column(name:'assigned_to',type:Types::STRING,length:36,nullable:true)] private ?string $assignedTo=null;
    #[ORM\Column(name:'is_mandatory',type:Types::BOOLEAN)] private bool $isMandatory=true;
    #[ORM\Column(name:'sort_order',type:Types::SMALLINT)] private int $sortOrder=0;
    #[ORM\Column(name:'created_at',type:Types::DATETIME_IMMUTABLE)] private \DateTimeImmutable $createdAt;
    public function __construct(string $empId,string $title,string $tenantId){$this->generateId();$this->employeeId=$empId;$this->title=$title;$this->setTenantId($tenantId);$this->createdAt=new \DateTimeImmutable();}
    public function getEmployeeId():string{return $this->employeeId;}
    public function isCompleted():bool{return $this->completedAt!==null;}
    public function complete(string $userId):void{$this->completedAt=new \DateTimeImmutable();$this->completedBy=$userId;}
    public function setCategory(string $v):void{$this->category=$v;}
    public function setDescription(?string $v):void{$this->description=$v;}
    public function setDueDate(?\DateTimeImmutable $v):void{$this->dueDate=$v;}
    public function setAssignedTo(?string $v):void{$this->assignedTo=$v;}
    public function setIsMandatory(bool $v):void{$this->isMandatory=$v;}
    public function setSortOrder(int $v):void{$this->sortOrder=$v;}
    public function toArray():array{return['id'=>$this->getId(),'employee_id'=>$this->employeeId,'title'=>$this->title,'description'=>$this->description,'category'=>$this->category,'due_date'=>$this->dueDate?->format('Y-m-d'),'completed_at'=>$this->completedAt?->format('Y-m-d H:i:s'),'completed_by'=>$this->completedBy,'assigned_to'=>$this->assignedTo,'is_mandatory'=>$this->isMandatory,'sort_order'=>$this->sortOrder,'is_completed'=>$this->isCompleted()];}
}

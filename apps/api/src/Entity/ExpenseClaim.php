<?php declare(strict_types=1);
namespace Lodgik\Entity;
use Doctrine\DBAL\Types\Types; use Doctrine\ORM\Mapping as ORM;
use Lodgik\Entity\Traits\{HasUuid,HasTenant,HasTimestamps};
#[ORM\Entity] #[ORM\Table(name:'expense_claims')] #[ORM\HasLifecycleCallbacks]
class ExpenseClaim { use HasUuid,HasTenant,HasTimestamps;
    #[ORM\Column(name:'property_id',type:Types::STRING,length:36)] private string $propertyId;
    #[ORM\Column(name:'employee_id',type:Types::STRING,length:36)] private string $employeeId;
    #[ORM\Column(name:'employee_name',type:Types::STRING,length:150)] private string $employeeName;
    #[ORM\Column(name:'claim_number',type:Types::STRING,length:30)] private string $claimNumber;
    #[ORM\Column(type:Types::STRING,length:200)] private string $title;
    #[ORM\Column(name:'total_amount',type:Types::BIGINT)] private string $totalAmount='0';
    #[ORM\Column(type:Types::STRING,length:20)] private string $status='draft';
    #[ORM\Column(name:'submitted_at',type:Types::DATETIME_IMMUTABLE,nullable:true)] private ?\DateTimeImmutable $submittedAt=null;
    #[ORM\Column(name:'approved_at',type:Types::DATETIME_IMMUTABLE,nullable:true)] private ?\DateTimeImmutable $approvedAt=null;
    #[ORM\Column(name:'approved_by',type:Types::STRING,length:36,nullable:true)] private ?string $approvedBy=null;
    #[ORM\Column(name:'rejection_reason',type:Types::TEXT,nullable:true)] private ?string $rejectionReason=null;
    #[ORM\Column(name:'paid_at',type:Types::DATETIME_IMMUTABLE,nullable:true)] private ?\DateTimeImmutable $paidAt=null;
    #[ORM\Column(type:Types::TEXT,nullable:true)] private ?string $notes=null;
    public function __construct(string $pid,string $empId,string $empName,string $title,string $tenantId){
        $this->generateId();$this->propertyId=$pid;$this->employeeId=$empId;$this->employeeName=$empName;$this->title=$title;$this->setTenantId($tenantId);
        $this->claimNumber='EXP-'.strtoupper(substr(uniqid(),0,8));}
    public function getPropertyId():string{return $this->propertyId;}
    public function getEmployeeId():string{return $this->employeeId;}
    public function getClaimNumber():string{return $this->claimNumber;}
    public function getTitle():string{return $this->title;}
    public function getTotalAmount():string{return $this->totalAmount;}
    public function setTotalAmount(string $v):void{$this->totalAmount=$v;}
    public function getStatus():string{return $this->status;}
    public function setStatus(string $v):void{$this->status=$v;}
    public function submit():void{$this->status='submitted';$this->submittedAt=new \DateTimeImmutable();}
    public function approve(string $by):void{$this->status='approved';$this->approvedAt=new \DateTimeImmutable();$this->approvedBy=$by;}
    public function reject(string $reason):void{$this->status='rejected';$this->rejectionReason=$reason;}
    public function markPaid():void{$this->status='paid';$this->paidAt=new \DateTimeImmutable();}
    public function setNotes(?string $v):void{$this->notes=$v;}
    public function toArray():array{return['id'=>$this->getId(),'property_id'=>$this->propertyId,'employee_id'=>$this->employeeId,'employee_name'=>$this->employeeName,'claim_number'=>$this->claimNumber,'title'=>$this->title,'total_amount'=>$this->totalAmount,'status'=>$this->status,'submitted_at'=>$this->submittedAt?->format('Y-m-d H:i:s'),'approved_at'=>$this->approvedAt?->format('Y-m-d H:i:s'),'approved_by'=>$this->approvedBy,'rejection_reason'=>$this->rejectionReason,'paid_at'=>$this->paidAt?->format('Y-m-d H:i:s'),'notes'=>$this->notes,'created_at'=>$this->getCreatedAt()?->format('Y-m-d H:i:s')];}
}

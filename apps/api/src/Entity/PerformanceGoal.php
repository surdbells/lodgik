<?php declare(strict_types=1);
namespace Lodgik\Entity;
use Doctrine\DBAL\Types\Types; use Doctrine\ORM\Mapping as ORM;
use Lodgik\Entity\Traits\{HasUuid,HasTenant,HasTimestamps};
#[ORM\Entity] #[ORM\Table(name:'performance_goals')] #[ORM\HasLifecycleCallbacks]
class PerformanceGoal { use HasUuid,HasTenant,HasTimestamps;
    #[ORM\Column(name:'employee_id',type:Types::STRING,length:36)] private string $employeeId;
    #[ORM\Column(name:'review_id',type:Types::STRING,length:36,nullable:true)] private ?string $reviewId=null;
    #[ORM\Column(type:Types::STRING,length:200)] private string $title;
    #[ORM\Column(type:Types::TEXT,nullable:true)] private ?string $description=null;
    #[ORM\Column(type:Types::STRING,length:50)] private string $category='kra';
    #[ORM\Column(type:Types::SMALLINT)] private int $weight=10;
    #[ORM\Column(name:'target_value',type:Types::DECIMAL,precision:12,scale:2,nullable:true)] private ?string $targetValue=null;
    #[ORM\Column(name:'actual_value',type:Types::DECIMAL,precision:12,scale:2,nullable:true)] private ?string $actualValue=null;
    #[ORM\Column(type:Types::STRING,length:30,nullable:true)] private ?string $unit=null;
    #[ORM\Column(name:'due_date',type:Types::DATE_IMMUTABLE,nullable:true)] private ?\DateTimeImmutable $dueDate=null;
    #[ORM\Column(type:Types::STRING,length:20)] private string $status='active';
    public function __construct(string $empId,string $title,string $tenantId){$this->generateId();$this->employeeId=$empId;$this->title=$title;$this->setTenantId($tenantId);}
    public function getEmployeeId():string{return $this->employeeId;}
    public function setReviewId(?string $v):void{$this->reviewId=$v;}
    public function setTitle(string $v):void{$this->title=$v;}
    public function setDescription(?string $v):void{$this->description=$v;}
    public function setCategory(string $v):void{$this->category=$v;}
    public function setWeight(int $v):void{$this->weight=$v;}
    public function setTargetValue(?string $v):void{$this->targetValue=$v;}
    public function setActualValue(?string $v):void{$this->actualValue=$v;}
    public function setUnit(?string $v):void{$this->unit=$v;}
    public function setDueDate(?\DateTimeImmutable $v):void{$this->dueDate=$v;}
    public function setStatus(string $v):void{$this->status=$v;}
    public function getProgressPct():?float{if(!$this->targetValue||!$this->actualValue)return null;return min(100,round((float)$this->actualValue/(float)$this->targetValue*100,1));}
    public function toArray():array{return['id'=>$this->getId(),'employee_id'=>$this->employeeId,'review_id'=>$this->reviewId,'title'=>$this->title,'description'=>$this->description,'category'=>$this->category,'weight'=>$this->weight,'target_value'=>$this->targetValue,'actual_value'=>$this->actualValue,'unit'=>$this->unit,'due_date'=>$this->dueDate?->format('Y-m-d'),'status'=>$this->status,'progress_pct'=>$this->getProgressPct(),'created_at'=>$this->getCreatedAt()?->format('Y-m-d')];}
}

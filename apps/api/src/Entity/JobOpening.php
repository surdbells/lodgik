<?php declare(strict_types=1);
namespace Lodgik\Entity;
use Doctrine\DBAL\Types\Types; use Doctrine\ORM\Mapping as ORM;
use Lodgik\Entity\Traits\{HasUuid,HasTenant,HasTimestamps};
#[ORM\Entity] #[ORM\Table(name:'job_openings')] #[ORM\HasLifecycleCallbacks]
class JobOpening { use HasUuid,HasTenant,HasTimestamps;
    #[ORM\Column(name:'property_id',type:Types::STRING,length:36)] private string $propertyId;
    #[ORM\Column(type:Types::STRING,length:150)] private string $title;
    #[ORM\Column(name:'department_id',type:Types::STRING,length:36,nullable:true)] private ?string $departmentId=null;
    #[ORM\Column(name:'employment_type',type:Types::STRING,length:20)] private string $employmentType='permanent';
    #[ORM\Column(type:Types::TEXT,nullable:true)] private ?string $description=null;
    #[ORM\Column(type:Types::TEXT,nullable:true)] private ?string $requirements=null;
    #[ORM\Column(type:Types::SMALLINT)] private int $vacancies=1;
    #[ORM\Column(name:'salary_min',type:Types::BIGINT,nullable:true)] private ?string $salaryMin=null;
    #[ORM\Column(name:'salary_max',type:Types::BIGINT,nullable:true)] private ?string $salaryMax=null;
    #[ORM\Column(type:Types::DATE_IMMUTABLE,nullable:true)] private ?\DateTimeImmutable $deadline=null;
    #[ORM\Column(type:Types::STRING,length:20)] private string $status='open';
    #[ORM\Column(name:'posted_by',type:Types::STRING,length:36,nullable:true)] private ?string $postedBy=null;
    public function __construct(string $pid,string $title,string $tenantId){$this->generateId();$this->propertyId=$pid;$this->title=$title;$this->setTenantId($tenantId);}
    public function getPropertyId():string{return $this->propertyId;}
    public function getTitle():string{return $this->title;}
    public function setTitle(string $v):void{$this->title=$v;}
    public function getDepartmentId():?string{return $this->departmentId;}
    public function setDepartmentId(?string $v):void{$this->departmentId=$v;}
    public function getEmploymentType():string{return $this->employmentType;}
    public function setEmploymentType(string $v):void{$this->employmentType=$v;}
    public function getDescription():?string{return $this->description;}
    public function setDescription(?string $v):void{$this->description=$v;}
    public function getRequirements():?string{return $this->requirements;}
    public function setRequirements(?string $v):void{$this->requirements=$v;}
    public function getVacancies():int{return $this->vacancies;}
    public function setVacancies(int $v):void{$this->vacancies=$v;}
    public function getSalaryMin():?string{return $this->salaryMin;}
    public function setSalaryMin(?string $v):void{$this->salaryMin=$v;}
    public function getSalaryMax():?string{return $this->salaryMax;}
    public function setSalaryMax(?string $v):void{$this->salaryMax=$v;}
    public function getDeadline():?\DateTimeImmutable{return $this->deadline;}
    public function setDeadline(?\DateTimeImmutable $v):void{$this->deadline=$v;}
    public function getStatus():string{return $this->status;}
    public function setStatus(string $v):void{$this->status=$v;}
    public function setPostedBy(?string $v):void{$this->postedBy=$v;}
    public function toArray():array{return['id'=>$this->getId(),'property_id'=>$this->propertyId,'title'=>$this->title,'department_id'=>$this->departmentId,'employment_type'=>$this->employmentType,'description'=>$this->description,'requirements'=>$this->requirements,'vacancies'=>$this->vacancies,'salary_min'=>$this->salaryMin,'salary_max'=>$this->salaryMax,'deadline'=>$this->deadline?->format('Y-m-d'),'status'=>$this->status,'posted_by'=>$this->postedBy,'created_at'=>$this->getCreatedAt()?->format('Y-m-d H:i:s')];}
}

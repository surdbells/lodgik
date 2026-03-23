<?php declare(strict_types=1);
namespace Lodgik\Entity;
use Doctrine\DBAL\Types\Types;
use Doctrine\ORM\Mapping as ORM;
use Lodgik\Entity\Traits\{HasUuid,HasTenant};
#[ORM\Entity] #[ORM\Table(name:'employee_job_history')]
class EmployeeJobHistory { use HasUuid,HasTenant;
    #[ORM\Column(name:'employee_id',type:Types::STRING,length:36)] private string $employeeId;
    #[ORM\Column(name:'job_title',type:Types::STRING,length:100)] private string $jobTitle;
    #[ORM\Column(name:'department_id',type:Types::STRING,length:36,nullable:true)] private ?string $departmentId=null;
    #[ORM\Column(name:'department_name',type:Types::STRING,length:100,nullable:true)] private ?string $departmentName=null;
    #[ORM\Column(name:'start_date',type:Types::DATE_IMMUTABLE)] private \DateTimeImmutable $startDate;
    #[ORM\Column(name:'end_date',type:Types::DATE_IMMUTABLE,nullable:true)] private ?\DateTimeImmutable $endDate=null;
    #[ORM\Column(name:'change_type',type:Types::STRING,length:30)] private string $changeType='hire';
    #[ORM\Column(name:'change_reason',type:Types::TEXT,nullable:true)] private ?string $changeReason=null;
    #[ORM\Column(name:'gross_salary',type:Types::BIGINT)] private string $grossSalary='0';
    #[ORM\Column(name:'created_by',type:Types::STRING,length:36,nullable:true)] private ?string $createdBy=null;
    #[ORM\Column(name:'created_at',type:Types::DATETIME_IMMUTABLE)] private \DateTimeImmutable $createdAt;
    public function __construct(string $empId,string $jobTitle,\DateTimeImmutable $startDate,string $tenantId,string $changeType='hire'){
        $this->generateId();$this->employeeId=$empId;$this->jobTitle=$jobTitle;$this->startDate=$startDate;$this->setTenantId($tenantId);$this->changeType=$changeType;$this->createdAt=new \DateTimeImmutable();}
    public function getEmployeeId():string{return $this->employeeId;}
    public function setJobTitle(string $v):void{$this->jobTitle=$v;}
    public function setDepartmentId(?string $v):void{$this->departmentId=$v;}
    public function setDepartmentName(?string $v):void{$this->departmentName=$v;}
    public function setEndDate(?\DateTimeImmutable $v):void{$this->endDate=$v;}
    public function setChangeReason(?string $v):void{$this->changeReason=$v;}
    public function setGrossSalary(string $v):void{$this->grossSalary=$v;}
    public function setCreatedBy(?string $v):void{$this->createdBy=$v;}
    public function toArray():array{return['id'=>$this->getId(),'employee_id'=>$this->employeeId,'job_title'=>$this->jobTitle,'department_name'=>$this->departmentName,'start_date'=>$this->startDate->format('Y-m-d'),'end_date'=>$this->endDate?->format('Y-m-d'),'change_type'=>$this->changeType,'change_reason'=>$this->changeReason,'gross_salary'=>$this->grossSalary,'created_at'=>$this->createdAt->format('Y-m-d H:i:s')];}
}

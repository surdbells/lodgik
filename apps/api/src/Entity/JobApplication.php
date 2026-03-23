<?php declare(strict_types=1);
namespace Lodgik\Entity;
use Doctrine\DBAL\Types\Types; use Doctrine\ORM\Mapping as ORM;
use Lodgik\Entity\Traits\{HasUuid,HasTenant,HasTimestamps};
#[ORM\Entity] #[ORM\Table(name:'job_applications')] #[ORM\HasLifecycleCallbacks]
class JobApplication { use HasUuid,HasTenant,HasTimestamps;
    #[ORM\Column(name:'job_opening_id',type:Types::STRING,length:36)] private string $jobOpeningId;
    #[ORM\Column(name:'applicant_name',type:Types::STRING,length:150)] private string $applicantName;
    #[ORM\Column(name:'applicant_email',type:Types::STRING,length:320,nullable:true)] private ?string $applicantEmail=null;
    #[ORM\Column(name:'applicant_phone',type:Types::STRING,length:30,nullable:true)] private ?string $applicantPhone=null;
    #[ORM\Column(name:'cv_url',type:Types::STRING,length:500,nullable:true)] private ?string $cvUrl=null;
    #[ORM\Column(name:'cover_note',type:Types::TEXT,nullable:true)] private ?string $coverNote=null;
    #[ORM\Column(type:Types::STRING,length:30)] private string $status='applied';
    #[ORM\Column(name:'interview_date',type:Types::DATETIME_IMMUTABLE,nullable:true)] private ?\DateTimeImmutable $interviewDate=null;
    #[ORM\Column(name:'offer_date',type:Types::DATE_IMMUTABLE,nullable:true)] private ?\DateTimeImmutable $offerDate=null;
    #[ORM\Column(name:'offer_salary',type:Types::BIGINT,nullable:true)] private ?string $offerSalary=null;
    #[ORM\Column(name:'rejection_reason',type:Types::TEXT,nullable:true)] private ?string $rejectionReason=null;
    #[ORM\Column(type:Types::TEXT,nullable:true)] private ?string $notes=null;
    #[ORM\Column(name:'reviewed_by',type:Types::STRING,length:36,nullable:true)] private ?string $reviewedBy=null;
    public function __construct(string $jobOpeningId,string $name,string $tenantId){$this->generateId();$this->jobOpeningId=$jobOpeningId;$this->applicantName=$name;$this->setTenantId($tenantId);}
    public function getJobOpeningId():string{return $this->jobOpeningId;}
    public function getStatus():string{return $this->status;}
    public function setStatus(string $v):void{$this->status=$v;}
    public function setApplicantEmail(?string $v):void{$this->applicantEmail=$v;}
    public function setApplicantPhone(?string $v):void{$this->applicantPhone=$v;}
    public function setCvUrl(?string $v):void{$this->cvUrl=$v;}
    public function setCoverNote(?string $v):void{$this->coverNote=$v;}
    public function setInterviewDate(?\DateTimeImmutable $v):void{$this->interviewDate=$v;}
    public function setOfferDate(?\DateTimeImmutable $v):void{$this->offerDate=$v;}
    public function setOfferSalary(?string $v):void{$this->offerSalary=$v;}
    public function setRejectionReason(?string $v):void{$this->rejectionReason=$v;}
    public function setNotes(?string $v):void{$this->notes=$v;}
    public function setReviewedBy(?string $v):void{$this->reviewedBy=$v;}
    public function toArray():array{return['id'=>$this->getId(),'job_opening_id'=>$this->jobOpeningId,'applicant_name'=>$this->applicantName,'applicant_email'=>$this->applicantEmail,'applicant_phone'=>$this->applicantPhone,'cv_url'=>$this->cvUrl,'cover_note'=>$this->coverNote,'status'=>$this->status,'interview_date'=>$this->interviewDate?->format('Y-m-d H:i'),'offer_date'=>$this->offerDate?->format('Y-m-d'),'offer_salary'=>$this->offerSalary,'rejection_reason'=>$this->rejectionReason,'notes'=>$this->notes,'reviewed_by'=>$this->reviewedBy,'created_at'=>$this->getCreatedAt()?->format('Y-m-d H:i:s')];}
}

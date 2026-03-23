<?php declare(strict_types=1);
namespace Lodgik\Entity;
use Doctrine\DBAL\Types\Types;
use Doctrine\ORM\Mapping as ORM;
use Lodgik\Entity\Traits\{HasUuid,HasTenant,HasTimestamps};
#[ORM\Entity] #[ORM\Table(name:'employee_documents')] #[ORM\HasLifecycleCallbacks]
class EmployeeDocument { use HasUuid,HasTenant,HasTimestamps;
    #[ORM\Column(name:'employee_id',type:Types::STRING,length:36)] private string $employeeId;
    #[ORM\Column(name:'document_type',type:Types::STRING,length:30)] private string $documentType='other';
    #[ORM\Column(type:Types::STRING,length:200)] private string $title;
    #[ORM\Column(name:'file_url',type:Types::STRING,length:500,nullable:true)] private ?string $fileUrl=null;
    #[ORM\Column(name:'file_name',type:Types::STRING,length:200,nullable:true)] private ?string $fileName=null;
    #[ORM\Column(name:'expiry_date',type:Types::DATE_IMMUTABLE,nullable:true)] private ?\DateTimeImmutable $expiryDate=null;
    #[ORM\Column(type:Types::TEXT,nullable:true)] private ?string $notes=null;
    #[ORM\Column(name:'uploaded_by',type:Types::STRING,length:36,nullable:true)] private ?string $uploadedBy=null;
    public function __construct(string $employeeId,string $title,string $type,string $tenantId){
        $this->generateId();$this->employeeId=$employeeId;$this->title=$title;$this->documentType=$type;$this->setTenantId($tenantId);}
    public function getEmployeeId():string{return $this->employeeId;}
    public function getDocumentType():string{return $this->documentType;}
    public function setDocumentType(string $v):void{$this->documentType=$v;}
    public function getTitle():string{return $this->title;}
    public function setTitle(string $v):void{$this->title=$v;}
    public function getFileUrl():?string{return $this->fileUrl;}
    public function setFileUrl(?string $v):void{$this->fileUrl=$v;}
    public function getFileName():?string{return $this->fileName;}
    public function setFileName(?string $v):void{$this->fileName=$v;}
    public function getExpiryDate():?\DateTimeImmutable{return $this->expiryDate;}
    public function setExpiryDate(?\DateTimeImmutable $v):void{$this->expiryDate=$v;}
    public function getNotes():?string{return $this->notes;}
    public function setNotes(?string $v):void{$this->notes=$v;}
    public function getUploadedBy():?string{return $this->uploadedBy;}
    public function setUploadedBy(?string $v):void{$this->uploadedBy=$v;}
    public function isExpiringSoon(int $days=30):bool{
        if(!$this->expiryDate)return false;
        return $this->expiryDate<=(new \DateTimeImmutable())->modify("+{$days} days")&&$this->expiryDate>=(new \DateTimeImmutable());}
    public function toArray():array{return['id'=>$this->getId(),'employee_id'=>$this->employeeId,'document_type'=>$this->documentType,'title'=>$this->title,'file_url'=>$this->fileUrl,'file_name'=>$this->fileName,'expiry_date'=>$this->expiryDate?->format('Y-m-d'),'notes'=>$this->notes,'uploaded_by'=>$this->uploadedBy,'expiring_soon'=>$this->isExpiringSoon(),'created_at'=>$this->getCreatedAt()?->format('Y-m-d H:i:s')];}
}

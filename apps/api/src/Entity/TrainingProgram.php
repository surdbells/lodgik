<?php declare(strict_types=1);
namespace Lodgik\Entity;
use Doctrine\DBAL\Types\Types; use Doctrine\ORM\Mapping as ORM;
use Lodgik\Entity\Traits\{HasUuid,HasTenant};
#[ORM\Entity] #[ORM\Table(name:'training_programs')]
class TrainingProgram { use HasUuid,HasTenant;
    #[ORM\Column(name:'property_id',type:Types::STRING,length:36)] private string $propertyId;
    #[ORM\Column(type:Types::STRING,length:200)] private string $title;
    #[ORM\Column(type:Types::STRING,length:50)] private string $category='skills';
    #[ORM\Column(type:Types::STRING,length:20)] private string $mode='in_house';
    #[ORM\Column(type:Types::STRING,length:150,nullable:true)] private ?string $provider=null;
    #[ORM\Column(type:Types::TEXT,nullable:true)] private ?string $description=null;
    #[ORM\Column(name:'duration_hours',type:Types::DECIMAL,precision:6,scale:2,nullable:true)] private ?string $durationHours=null;
    #[ORM\Column(name:'cost_per_head',type:Types::BIGINT)] private string $costPerHead='0';
    #[ORM\Column(name:'start_date',type:Types::DATE_IMMUTABLE,nullable:true)] private ?\DateTimeImmutable $startDate=null;
    #[ORM\Column(name:'end_date',type:Types::DATE_IMMUTABLE,nullable:true)] private ?\DateTimeImmutable $endDate=null;
    #[ORM\Column(name:'max_participants',type:Types::SMALLINT,nullable:true)] private ?int $maxParticipants=null;
    #[ORM\Column(type:Types::STRING,length:20)] private string $status='planned';
    #[ORM\Column(name:'created_at',type:Types::DATETIME_IMMUTABLE)] private \DateTimeImmutable $createdAt;
    public function __construct(string $pid,string $title,string $tenantId){$this->generateId();$this->propertyId=$pid;$this->title=$title;$this->setTenantId($tenantId);$this->createdAt=new \DateTimeImmutable();}
    public function getPropertyId():string{return $this->propertyId;}
    public function getTitle():string{return $this->title;}
    public function setTitle(string $v):void{$this->title=$v;}
    public function setCategory(string $v):void{$this->category=$v;}
    public function setMode(string $v):void{$this->mode=$v;}
    public function setProvider(?string $v):void{$this->provider=$v;}
    public function setDescription(?string $v):void{$this->description=$v;}
    public function setDurationHours(?string $v):void{$this->durationHours=$v;}
    public function setCostPerHead(string $v):void{$this->costPerHead=$v;}
    public function setStartDate(?\DateTimeImmutable $v):void{$this->startDate=$v;}
    public function setEndDate(?\DateTimeImmutable $v):void{$this->endDate=$v;}
    public function setMaxParticipants(?int $v):void{$this->maxParticipants=$v;}
    public function setStatus(string $v):void{$this->status=$v;}
    public function toArray():array{return['id'=>$this->getId(),'property_id'=>$this->propertyId,'title'=>$this->title,'category'=>$this->category,'mode'=>$this->mode,'provider'=>$this->provider,'description'=>$this->description,'duration_hours'=>$this->durationHours,'cost_per_head'=>$this->costPerHead,'start_date'=>$this->startDate?->format('Y-m-d'),'end_date'=>$this->endDate?->format('Y-m-d'),'max_participants'=>$this->maxParticipants,'status'=>$this->status,'created_at'=>$this->createdAt->format('Y-m-d')];}
}

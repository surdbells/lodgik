<?php declare(strict_types=1);
namespace Lodgik\Entity;
use Doctrine\DBAL\Types\Types; use Doctrine\ORM\Mapping as ORM;
use Lodgik\Entity\Traits\HasUuid;
#[ORM\Entity] #[ORM\Table(name:'expense_claim_items')]
class ExpenseClaimItem { use HasUuid;
    #[ORM\Column(name:'claim_id',type:Types::STRING,length:36)] private string $claimId;
    #[ORM\Column(type:Types::STRING,length:50)] private string $category='other';
    #[ORM\Column(type:Types::STRING,length:300)] private string $description;
    #[ORM\Column(type:Types::BIGINT)] private string $amount;
    #[ORM\Column(name:'expense_date',type:Types::DATE_IMMUTABLE)] private \DateTimeImmutable $expenseDate;
    #[ORM\Column(name:'receipt_url',type:Types::STRING,length:500,nullable:true)] private ?string $receiptUrl=null;
    #[ORM\Column(name:'created_at',type:Types::DATETIME_IMMUTABLE)] private \DateTimeImmutable $createdAt;
    public function __construct(string $claimId,string $desc,string $amount,\DateTimeImmutable $date){$this->generateId();$this->claimId=$claimId;$this->description=$desc;$this->amount=$amount;$this->expenseDate=$date;$this->createdAt=new \DateTimeImmutable();}
    public function getClaimId():string{return $this->claimId;}
    public function getAmount():string{return $this->amount;}
    public function setCategory(string $v):void{$this->category=$v;}
    public function setReceiptUrl(?string $v):void{$this->receiptUrl=$v;}
    public function toArray():array{return['id'=>$this->getId(),'claim_id'=>$this->claimId,'category'=>$this->category,'description'=>$this->description,'amount'=>$this->amount,'expense_date'=>$this->expenseDate->format('Y-m-d'),'receipt_url'=>$this->receiptUrl];}
}

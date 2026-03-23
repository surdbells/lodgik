<?php declare(strict_types=1);
namespace Lodgik\Entity;
use Doctrine\DBAL\Types\Types; use Doctrine\ORM\Mapping as ORM;
use Lodgik\Entity\Traits\{HasUuid,HasTenant};
#[ORM\Entity] #[ORM\Table(name:'payroll_components')]
class PayrollComponent { use HasUuid,HasTenant;
    #[ORM\Column(type:Types::STRING,length:100)] private string $name;
    #[ORM\Column(type:Types::STRING,length:20)] private string $code;
    #[ORM\Column(name:'component_type',type:Types::STRING,length:20)] private string $componentType='earning';
    #[ORM\Column(type:Types::STRING,length:20)] private string $calculation='fixed';
    #[ORM\Column(type:Types::BIGINT)] private string $value='0';
    #[ORM\Column(name:'is_taxable',type:Types::BOOLEAN)] private bool $isTaxable=true;
    #[ORM\Column(name:'is_active',type:Types::BOOLEAN)] private bool $isActive=true;
    #[ORM\Column(name:'sort_order',type:Types::SMALLINT)] private int $sortOrder=0;
    #[ORM\Column(name:'created_at',type:Types::DATETIME_IMMUTABLE)] private \DateTimeImmutable $createdAt;
    public function __construct(string $name,string $code,string $type,string $tenantId){$this->generateId();$this->name=$name;$this->code=$code;$this->componentType=$type;$this->setTenantId($tenantId);$this->createdAt=new \DateTimeImmutable();}
    public function getName():string{return $this->name;}
    public function setName(string $v):void{$this->name=$v;}
    public function getCode():string{return $this->code;}
    public function getComponentType():string{return $this->componentType;}
    public function getCalculation():string{return $this->calculation;}
    public function setCalculation(string $v):void{$this->calculation=$v;}
    public function getValue():string{return $this->value;}
    public function setValue(string $v):void{$this->value=$v;}
    public function isActive():bool{return $this->isActive;}
    public function setIsActive(bool $v):void{$this->isActive=$v;}
    public function setSortOrder(int $v):void{$this->sortOrder=$v;}
    public function setIsTaxable(bool $v):void{$this->isTaxable=$v;}
    public function toArray():array{return['id'=>$this->getId(),'name'=>$this->name,'code'=>$this->code,'component_type'=>$this->componentType,'calculation'=>$this->calculation,'value'=>$this->value,'is_taxable'=>$this->isTaxable,'is_active'=>$this->isActive,'sort_order'=>$this->sortOrder];}
}

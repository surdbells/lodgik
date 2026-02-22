<?php
declare(strict_types=1);
namespace Lodgik\Entity;

use Doctrine\DBAL\Types\Types;
use Doctrine\ORM\Mapping as ORM;
use Lodgik\Entity\Traits\HasUuid;

#[ORM\Entity]
#[ORM\Table(name: 'merchant_statements')]
#[ORM\Index(columns: ['merchant_id'], name: 'idx_ms_merch')]
class MerchantStatement
{
    use HasUuid;

    #[ORM\Column(type: Types::STRING, length: 36)]
    private string $merchantId;
    #[ORM\Column(type: Types::DATE_IMMUTABLE)]
    private \DateTimeImmutable $periodStart;
    #[ORM\Column(type: Types::DATE_IMMUTABLE)]
    private \DateTimeImmutable $periodEnd;
    #[ORM\Column(type: Types::DECIMAL, precision: 12, scale: 2)]
    private string $openingBalance = '0.00';
    #[ORM\Column(type: Types::DECIMAL, precision: 12, scale: 2)]
    private string $totalEarned = '0.00';
    #[ORM\Column(type: Types::DECIMAL, precision: 12, scale: 2)]
    private string $totalPaid = '0.00';
    #[ORM\Column(type: Types::DECIMAL, precision: 12, scale: 2)]
    private string $closingBalance = '0.00';
    #[ORM\Column(type: Types::DATETIME_IMMUTABLE)]
    private \DateTimeImmutable $generatedAt;
    #[ORM\Column(type: Types::STRING, length: 500, nullable: true)]
    private ?string $fileUrl = null;

    public function __construct() { $this->generateId(); $this->generatedAt = new \DateTimeImmutable(); }

    public function getMerchantId(): string { return $this->merchantId; }
    public function setMerchantId(string $v): self { $this->merchantId = $v; return $this; }
    public function getPeriodStart(): \DateTimeImmutable { return $this->periodStart; }
    public function setPeriodStart(\DateTimeImmutable $v): self { $this->periodStart = $v; return $this; }
    public function getPeriodEnd(): \DateTimeImmutable { return $this->periodEnd; }
    public function setPeriodEnd(\DateTimeImmutable $v): self { $this->periodEnd = $v; return $this; }
    public function getOpeningBalance(): string { return $this->openingBalance; }
    public function setOpeningBalance(string $v): self { $this->openingBalance = $v; return $this; }
    public function getTotalEarned(): string { return $this->totalEarned; }
    public function setTotalEarned(string $v): self { $this->totalEarned = $v; return $this; }
    public function getTotalPaid(): string { return $this->totalPaid; }
    public function setTotalPaid(string $v): self { $this->totalPaid = $v; return $this; }
    public function getClosingBalance(): string { return $this->closingBalance; }
    public function setClosingBalance(string $v): self { $this->closingBalance = $v; return $this; }
    public function getFileUrl(): ?string { return $this->fileUrl; }
    public function setFileUrl(?string $v): self { $this->fileUrl = $v; return $this; }

    public function toArray(): array
    {
        return [
            'id' => $this->getId(), 'merchant_id' => $this->merchantId,
            'period_start' => $this->periodStart->format('Y-m-d'), 'period_end' => $this->periodEnd->format('Y-m-d'),
            'opening_balance' => $this->openingBalance, 'total_earned' => $this->totalEarned,
            'total_paid' => $this->totalPaid, 'closing_balance' => $this->closingBalance,
            'file_url' => $this->fileUrl, 'generated_at' => $this->generatedAt->format(\DateTimeInterface::ATOM),
        ];
    }
}

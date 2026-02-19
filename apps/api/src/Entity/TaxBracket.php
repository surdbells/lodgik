<?php

declare(strict_types=1);

namespace Lodgik\Entity;

use Doctrine\DBAL\Types\Types;
use Doctrine\ORM\Mapping as ORM;
use Lodgik\Entity\Contract\TenantAware;
use Lodgik\Entity\Traits\HasUuid;
use Lodgik\Entity\Traits\HasTenant;
use Lodgik\Entity\Traits\HasTimestamps;

/**
 * Nigeria PAYE tax brackets (seeded per-tenant).
 * Standard Nigeria rates:
 *   First ₦300,000  → 7%
 *   Next  ₦300,000  → 11%
 *   Next  ₦500,000  → 15%
 *   Next  ₦500,000  → 19%
 *   Next  ₦1,600,000 → 21%
 *   Over  ₦3,200,000 → 24%
 */
#[ORM\Entity]
#[ORM\Table(name: 'tax_brackets')]
#[ORM\Index(columns: ['tenant_id'], name: 'idx_tb_tenant')]
#[ORM\HasLifecycleCallbacks]
class TaxBracket implements TenantAware
{
    use HasUuid;
    use HasTenant;
    use HasTimestamps;

    /** Lower bound (annual, in naira, inclusive) */
    #[ORM\Column(name: 'lower_bound', type: Types::BIGINT)]
    private string $lowerBound;

    /** Upper bound (annual, in naira, 0 = unlimited) */
    #[ORM\Column(name: 'upper_bound', type: Types::BIGINT, options: ['default' => 0])]
    private string $upperBound = '0';

    /** Tax rate as percentage (e.g., 7.00 for 7%) */
    #[ORM\Column(type: Types::DECIMAL, precision: 5, scale: 2)]
    private string $rate;

    #[ORM\Column(name: 'sort_order', type: Types::INTEGER, options: ['default' => 0])]
    private int $sortOrder = 0;

    public function __construct(string $lowerBound, string $upperBound, string $rate, int $sortOrder, string $tenantId)
    {
        $this->generateId();
        $this->lowerBound = $lowerBound;
        $this->upperBound = $upperBound;
        $this->rate = $rate;
        $this->sortOrder = $sortOrder;
        $this->setTenantId($tenantId);
    }

    public function getLowerBound(): string { return $this->lowerBound; }
    public function getUpperBound(): string { return $this->upperBound; }
    public function getRate(): string { return $this->rate; }
    public function getSortOrder(): int { return $this->sortOrder; }

    public function toArray(): array
    {
        return [
            'id' => $this->getId(),
            'lower_bound' => $this->lowerBound,
            'upper_bound' => $this->upperBound,
            'rate' => $this->rate,
            'sort_order' => $this->sortOrder,
        ];
    }
}

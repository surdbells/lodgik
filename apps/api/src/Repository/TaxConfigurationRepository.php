<?php

declare(strict_types=1);

namespace Lodgik\Repository;

use Lodgik\Entity\TaxConfiguration;

/** @extends BaseRepository<TaxConfiguration> */
final class TaxConfigurationRepository extends BaseRepository
{
    protected function getEntityClass(): string { return TaxConfiguration::class; }

    /** @return TaxConfiguration[] */
    public function findActiveTaxes(string $tenantId): array
    {
        return $this->createQueryBuilder('t')
            ->where('t.tenantId = :tid')->setParameter('tid', $tenantId)
            ->andWhere('t.isActive = true')
            ->getQuery()->getResult();
    }

    public function findByKey(string $tenantId, string $taxKey): ?TaxConfiguration
    {
        return $this->createQueryBuilder('t')
            ->where('t.tenantId = :tid')->setParameter('tid', $tenantId)
            ->andWhere('t.taxKey = :k')->setParameter('k', $taxKey)
            ->setMaxResults(1)->getQuery()->getOneOrNullResult();
    }
}

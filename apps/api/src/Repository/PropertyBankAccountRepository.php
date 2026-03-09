<?php
declare(strict_types=1);

namespace Lodgik\Repository;

use Lodgik\Entity\PropertyBankAccount;

final class PropertyBankAccountRepository extends BaseRepository
{
    protected function getEntityClass(): string
    {
        return PropertyBankAccount::class;
    }

    /** @return PropertyBankAccount[] */
    public function findByProperty(string $propertyId): array
    {
        return $this->createQueryBuilder('b')
            ->where('b.propertyId = :pid')
            ->setParameter('pid', $propertyId)
            ->orderBy('b.isPrimary', 'DESC')
            ->getQuery()->getResult();
    }

    /** @return PropertyBankAccount[] */
    public function findActiveByProperty(string $propertyId): array
    {
        return $this->createQueryBuilder('b')
            ->where('b.propertyId = :pid')
            ->andWhere('b.isActive = true')
            ->setParameter('pid', $propertyId)
            ->orderBy('b.isPrimary', 'DESC')
            ->getQuery()->getResult();
    }

    public function findPrimary(string $propertyId): ?PropertyBankAccount
    {
        return $this->createQueryBuilder('b')
            ->where('b.propertyId = :pid')
            ->andWhere('b.isPrimary = true')
            ->andWhere('b.isActive = true')
            ->setParameter('pid', $propertyId)
            ->setMaxResults(1)
            ->getQuery()->getOneOrNullResult();
    }
}

<?php

declare(strict_types=1);

namespace Lodgik\Repository;

use Lodgik\Entity\DeviceToken;

/** @extends BaseRepository<DeviceToken> */
final class DeviceTokenRepository extends BaseRepository
{
    protected function getEntityClass(): string { return DeviceToken::class; }

    /** @return DeviceToken[] */
    public function findActiveForOwner(string $ownerId): array
    {
        return $this->createQueryBuilder('dt')
            ->where('dt.ownerId = :oid')
            ->andWhere('dt.isActive = true')
            ->setParameter('oid', $ownerId)
            ->getQuery()->getResult();
    }

    public function findByToken(string $token): ?DeviceToken
    {
        return $this->createQueryBuilder('dt')
            ->where('dt.token = :t')
            ->setParameter('t', $token)
            ->setMaxResults(1)
            ->getQuery()->getOneOrNullResult();
    }


    /** @return DeviceToken[] — all active tokens for every user in a tenant (for broadcast) */
    public function findActiveForTenant(string $tenantId): array
    {
        return $this->createQueryBuilder('dt')
            ->where('dt.tenantId = :tid')
            ->andWhere('dt.isActive = TRUE')
            ->setParameter('tid', $tenantId)
            ->getQuery()->getResult();
    }
    public function deactivateForOwner(string $ownerId): void
    {
        $this->createQueryBuilder('dt')
            ->update()
            ->set('dt.isActive', 'false')
            ->where('dt.ownerId = :oid')
            ->setParameter('oid', $ownerId)
            ->getQuery()->execute();
    }
}

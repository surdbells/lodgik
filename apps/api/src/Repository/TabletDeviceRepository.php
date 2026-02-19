<?php

declare(strict_types=1);

namespace Lodgik\Repository;

use Lodgik\Entity\TabletDevice;

/** @extends BaseRepository<TabletDevice> */
final class TabletDeviceRepository extends BaseRepository
{
    protected function getEntityClass(): string { return TabletDevice::class; }

    public function findByDeviceToken(string $token): ?TabletDevice
    {
        return $this->createQueryBuilder('td')
            ->where('td.deviceToken = :token')->andWhere('td.isActive = true')
            ->setParameter('token', $token)
            ->setMaxResults(1)->getQuery()->getOneOrNullResult();
    }

    public function findByRoom(string $roomId): ?TabletDevice
    {
        return $this->createQueryBuilder('td')
            ->where('td.roomId = :rid')->andWhere('td.isActive = true')
            ->setParameter('rid', $roomId)
            ->setMaxResults(1)->getQuery()->getOneOrNullResult();
    }

    /** @return TabletDevice[] */
    public function findByProperty(string $propertyId): array
    {
        return $this->createQueryBuilder('td')
            ->where('td.propertyId = :pid')
            ->setParameter('pid', $propertyId)
            ->orderBy('td.name', 'ASC')
            ->getQuery()->getResult();
    }
}

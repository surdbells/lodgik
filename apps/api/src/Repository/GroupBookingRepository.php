<?php
declare(strict_types=1);

namespace Lodgik\Repository;

use Lodgik\Entity\GroupBooking;

/** @extends BaseRepository<GroupBooking> */
final class GroupBookingRepository extends BaseRepository
{
    protected function getEntityClass(): string { return GroupBooking::class; }

    /** List group bookings for a property, newest first. */
    public function findByProperty(string $propertyId, string $tenantId, int $page = 1, int $limit = 20): array
    {
        $qb = $this->createQueryBuilder('g')
            ->where('g.propertyId = :pid')->setParameter('pid', $propertyId)
            ->andWhere('g.tenantId = :tid')->setParameter('tid', $tenantId);

        $total = (int)(clone $qb)->select('COUNT(g.id)')->getQuery()->getSingleScalarResult();
        $items = $qb->orderBy('g.createdAt', 'DESC')
            ->setFirstResult(($page - 1) * $limit)
            ->setMaxResults($limit)
            ->getQuery()->getResult();

        return ['items' => $items, 'total' => $total, 'page' => $page, 'limit' => $limit];
    }

    /** Find only corporate group bookings for a property. */
    public function findCorporateByProperty(string $propertyId, string $tenantId): array
    {
        return $this->createQueryBuilder('g')
            ->where('g.propertyId = :pid')->setParameter('pid', $propertyId)
            ->andWhere('g.tenantId = :tid')->setParameter('tid', $tenantId)
            ->andWhere('g.folioType = :ft')->setParameter('ft', 'corporate')
            ->orderBy('g.createdAt', 'DESC')
            ->getQuery()->getResult();
    }

    /** Find a group booking by ID, scoped to tenant for security. */
    public function findForTenant(string $id, string $tenantId): ?GroupBooking
    {
        return $this->createQueryBuilder('g')
            ->where('g.id = :id')->setParameter('id', $id)
            ->andWhere('g.tenantId = :tid')->setParameter('tid', $tenantId)
            ->getQuery()->getOneOrNullResult();
    }
}

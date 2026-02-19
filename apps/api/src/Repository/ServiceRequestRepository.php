<?php

declare(strict_types=1);

namespace Lodgik\Repository;

use Lodgik\Entity\ServiceRequest;
use Lodgik\Enum\ServiceRequestStatus;

/** @extends BaseRepository<ServiceRequest> */
final class ServiceRequestRepository extends BaseRepository
{
    protected function getEntityClass(): string { return ServiceRequest::class; }

    /** @return ServiceRequest[] */
    public function findByProperty(string $propertyId, ?string $status = null): array
    {
        $qb = $this->createQueryBuilder('sr')
            ->where('sr.propertyId = :pid')
            ->setParameter('pid', $propertyId)
            ->orderBy('sr.createdAt', 'DESC');
        if ($status) $qb->andWhere('sr.status = :s')->setParameter('s', $status);
        return $qb->getQuery()->getResult();
    }

    /** @return ServiceRequest[] */
    public function findByBooking(string $bookingId): array
    {
        return $this->createQueryBuilder('sr')
            ->where('sr.bookingId = :bid')
            ->setParameter('bid', $bookingId)
            ->orderBy('sr.createdAt', 'DESC')
            ->getQuery()->getResult();
    }

    /** @return ServiceRequest[] Active (non-completed/cancelled) */
    public function findActive(string $propertyId): array
    {
        return $this->createQueryBuilder('sr')
            ->where('sr.propertyId = :pid')
            ->andWhere('sr.status NOT IN (:done)')
            ->setParameter('pid', $propertyId)
            ->setParameter('done', [ServiceRequestStatus::COMPLETED->value, ServiceRequestStatus::CANCELLED->value])
            ->orderBy('sr.priority', 'DESC')
            ->addOrderBy('sr.createdAt', 'ASC')
            ->getQuery()->getResult();
    }

    /** @return array{pending:int, acknowledged:int, in_progress:int, completed:int} */
    public function summarize(string $propertyId): array
    {
        $rows = $this->createQueryBuilder('sr')
            ->select('sr.status, COUNT(sr.id) as cnt')
            ->where('sr.propertyId = :pid')
            ->setParameter('pid', $propertyId)
            ->groupBy('sr.status')
            ->getQuery()->getResult();
        $map = array_fill_keys(ServiceRequestStatus::values(), 0);
        foreach ($rows as $r) $map[$r['status'] instanceof ServiceRequestStatus ? $r['status']->value : $r['status']] = (int)$r['cnt'];
        return $map;
    }
}

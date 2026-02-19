<?php

declare(strict_types=1);

namespace Lodgik\Repository;

use Lodgik\Entity\LeaveRequest;
use Lodgik\Enum\LeaveRequestStatus;

/** @extends BaseRepository<LeaveRequest> */
final class LeaveRequestRepository extends BaseRepository
{
    protected function getEntityClass(): string { return LeaveRequest::class; }

    /** @return LeaveRequest[] */
    public function findByEmployee(string $employeeId, ?int $year = null): array
    {
        $qb = $this->createQueryBuilder('lr')
            ->where('lr.employeeId = :eid')
            ->setParameter('eid', $employeeId)
            ->orderBy('lr.startDate', 'DESC');
        if ($year) {
            $qb->andWhere('lr.startDate >= :from AND lr.startDate <= :to')
               ->setParameter('from', "$year-01-01")
               ->setParameter('to', "$year-12-31");
        }
        return $qb->getQuery()->getResult();
    }

    /** @return LeaveRequest[] */
    public function findPending(?string $propertyId = null): array
    {
        $qb = $this->createQueryBuilder('lr')
            ->where('lr.status = :st')
            ->setParameter('st', LeaveRequestStatus::PENDING->value)
            ->orderBy('lr.createdAt', 'ASC');
        // Note: property filter requires join; handled in service layer
        return $qb->getQuery()->getResult();
    }

    /** Check for overlapping approved/pending leave */
    public function hasOverlap(string $employeeId, string $startDate, string $endDate, ?string $excludeId = null): bool
    {
        $qb = $this->createQueryBuilder('lr')
            ->select('COUNT(lr.id)')
            ->where('lr.employeeId = :eid')
            ->andWhere('lr.status IN (:statuses)')
            ->andWhere('lr.startDate <= :end AND lr.endDate >= :start')
            ->setParameter('eid', $employeeId)
            ->setParameter('statuses', [LeaveRequestStatus::PENDING->value, LeaveRequestStatus::APPROVED->value])
            ->setParameter('start', $startDate)
            ->setParameter('end', $endDate);
        if ($excludeId) $qb->andWhere('lr.id != :xid')->setParameter('xid', $excludeId);
        return (int) $qb->getQuery()->getSingleScalarResult() > 0;
    }
}

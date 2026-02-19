<?php

declare(strict_types=1);

namespace Lodgik\Repository;

use Lodgik\Entity\AttendanceRecord;

/** @extends BaseRepository<AttendanceRecord> */
final class AttendanceRecordRepository extends BaseRepository
{
    protected function getEntityClass(): string { return AttendanceRecord::class; }

    /** @return AttendanceRecord[] */
    public function findByDate(string $date, ?string $propertyId = null): array
    {
        $qb = $this->createQueryBuilder('a')
            ->where('a.attendanceDate = :d')
            ->setParameter('d', $date)
            ->orderBy('a.createdAt', 'DESC');
        if ($propertyId) $qb->andWhere('a.propertyId = :pid')->setParameter('pid', $propertyId);
        return $qb->getQuery()->getResult();
    }

    /** @return AttendanceRecord[] */
    public function findByEmployeeDateRange(string $employeeId, string $from, string $to): array
    {
        return $this->createQueryBuilder('a')
            ->where('a.employeeId = :eid')
            ->andWhere('a.attendanceDate BETWEEN :from AND :to')
            ->setParameter('eid', $employeeId)
            ->setParameter('from', $from)
            ->setParameter('to', $to)
            ->orderBy('a.attendanceDate', 'ASC')
            ->getQuery()->getResult();
    }

    public function findForEmployeeOnDate(string $employeeId, string $date): ?AttendanceRecord
    {
        return $this->createQueryBuilder('a')
            ->where('a.employeeId = :eid')
            ->andWhere('a.attendanceDate = :d')
            ->setParameter('eid', $employeeId)
            ->setParameter('d', $date)
            ->setMaxResults(1)
            ->getQuery()->getOneOrNullResult();
    }

    /** @return array{present: int, absent: int, late: int, on_leave: int} */
    public function summarizeByDate(string $date, ?string $propertyId = null): array
    {
        $qb = $this->createQueryBuilder('a')
            ->select('a.status, COUNT(a.id) as cnt')
            ->where('a.attendanceDate = :d')
            ->setParameter('d', $date)
            ->groupBy('a.status');
        if ($propertyId) $qb->andWhere('a.propertyId = :pid')->setParameter('pid', $propertyId);
        $rows = $qb->getQuery()->getArrayResult();
        $summary = ['present' => 0, 'absent' => 0, 'late' => 0, 'half_day' => 0, 'on_leave' => 0];
        foreach ($rows as $r) $summary[$r['status']->value ?? $r['status']] = (int) $r['cnt'];
        return $summary;
    }
}

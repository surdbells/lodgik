<?php

declare(strict_types=1);

namespace Lodgik\Repository;

use Lodgik\Entity\Booking;
use Lodgik\Enum\BookingStatus;

/**
 * @extends BaseRepository<Booking>
 */
final class BookingRepository extends BaseRepository
{
    protected function getEntityClass(): string
    {
        return Booking::class;
    }

    /** @return array{items: Booking[], total: int} */
    public function listBookings(
        ?string $propertyId = null,
        ?string $status = null,
        ?string $guestId = null,
        ?string $roomId = null,
        ?string $dateFrom = null,
        ?string $dateTo = null,
        ?string $search = null,
        int $page = 1,
        int $limit = 20,
    ): array {
        $qb = $this->createQueryBuilder('b')
            ->where('b.deletedAt IS NULL')
            ->orderBy('b.checkIn', 'DESC');

        if ($propertyId !== null) {
            $qb->andWhere('b.propertyId = :prop')->setParameter('prop', $propertyId);
        }
        if ($status !== null) {
            $qb->andWhere('b.status = :status')->setParameter('status', $status);
        }
        if ($guestId !== null) {
            $qb->andWhere('b.guestId = :guest')->setParameter('guest', $guestId);
        }
        if ($roomId !== null) {
            $qb->andWhere('b.roomId = :room')->setParameter('room', $roomId);
        }
        if ($dateFrom !== null) {
            $qb->andWhere('b.checkIn >= :from')->setParameter('from', $dateFrom);
        }
        if ($dateTo !== null) {
            $qb->andWhere('b.checkIn <= :to')->setParameter('to', $dateTo);
        }
        if ($search !== null && trim($search) !== '') {
            $qb->andWhere('LOWER(b.bookingRef) LIKE :s')->setParameter('s', '%' . strtolower(trim($search)) . '%');
        }

        return $this->paginate($qb, $page, $limit, 'b');
    }

    /** Get bookings for today (check-ins and check-outs). */
    public function getToday(string $propertyId): array
    {
        $today = (new \DateTimeImmutable())->format('Y-m-d');

        return $this->createQueryBuilder('b')
            ->where('b.propertyId = :prop')
            ->andWhere('b.deletedAt IS NULL')
            ->andWhere(
                '((b.checkIn >= :todayStart AND b.checkIn < :todayEnd) OR (b.checkOut >= :todayStart AND b.checkOut < :todayEnd))'
            )
            ->andWhere('b.status NOT IN (:excluded)')
            ->setParameter('prop', $propertyId)
            ->setParameter('todayStart', $today . ' 00:00:00')
            ->setParameter('todayEnd', $today . ' 23:59:59')
            ->setParameter('excluded', [BookingStatus::CANCELLED->value, BookingStatus::NO_SHOW->value])
            ->orderBy('b.checkIn', 'ASC')
            ->getQuery()
            ->getResult();
    }

    /** Get bookings for calendar range. */
    public function getCalendar(string $propertyId, string $from, string $to): array
    {
        return $this->createQueryBuilder('b')
            ->where('b.propertyId = :prop')
            ->andWhere('b.deletedAt IS NULL')
            ->andWhere('b.checkOut >= :from AND b.checkIn <= :to')
            ->andWhere('b.status NOT IN (:excluded)')
            ->setParameter('prop', $propertyId)
            ->setParameter('from', $from)
            ->setParameter('to', $to)
            ->setParameter('excluded', [BookingStatus::CANCELLED->value, BookingStatus::NO_SHOW->value])
            ->orderBy('b.checkIn', 'ASC')
            ->getQuery()
            ->getResult();
    }

    /** Check if room has overlapping bookings in date range. */
    public function hasOverlap(string $roomId, \DateTimeImmutable $checkIn, \DateTimeImmutable $checkOut, ?string $excludeBookingId = null): bool
    {
        $qb = $this->createQueryBuilder('b')
            ->select('COUNT(b.id)')
            ->where('b.roomId = :room')
            ->andWhere('b.deletedAt IS NULL')
            ->andWhere('b.checkOut > :ci AND b.checkIn < :co')
            ->andWhere('b.status NOT IN (:excluded)')
            ->setParameter('room', $roomId)
            ->setParameter('ci', $checkIn->format('Y-m-d H:i:s'))
            ->setParameter('co', $checkOut->format('Y-m-d H:i:s'))
            ->setParameter('excluded', [BookingStatus::CANCELLED->value, BookingStatus::NO_SHOW->value, BookingStatus::CHECKED_OUT->value]);

        if ($excludeBookingId !== null) {
            $qb->andWhere('b.id != :excl')->setParameter('excl', $excludeBookingId);
        }

        return (int) $qb->getQuery()->getSingleScalarResult() > 0;
    }

    /** Generate next booking reference: BK-YYYYMMDD-NNN */
    public function generateRef(string $tenantId): string
    {
        $date = (new \DateTimeImmutable())->format('Ymd');
        $prefix = "BK-{$date}-";

        $count = (int) $this->createQueryBuilder('b')
            ->select('COUNT(b.id)')
            ->where('b.bookingRef LIKE :prefix')
            ->setParameter('prefix', $prefix . '%')
            ->getQuery()
            ->getSingleScalarResult();

        return $prefix . str_pad((string) ($count + 1), 3, '0', STR_PAD_LEFT);
    }

    /** Get bookings by guest for history. */
    public function findByGuest(string $guestId, int $limit = 50): array
    {
        return $this->createQueryBuilder('b')
            ->where('b.guestId = :guest')
            ->andWhere('b.deletedAt IS NULL')
            ->setParameter('guest', $guestId)
            ->orderBy('b.checkIn', 'DESC')
            ->setMaxResults($limit)
            ->getQuery()
            ->getResult();
    }

    /** Find the current checked-in booking for a guest */
    public function findActiveForGuest(string $guestId): ?Booking
    {
        return $this->createQueryBuilder('b')
            ->where('b.guestId = :gid')
            ->andWhere('b.status = :s')
            ->setParameter('gid', $guestId)
            ->setParameter('s', \Lodgik\Enum\BookingStatus::CHECKED_IN)
            ->orderBy('b.checkIn', 'DESC')
            ->setMaxResults(1)
            ->getQuery()
            ->getOneOrNullResult();
    }
}

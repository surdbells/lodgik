<?php

declare(strict_types=1);

namespace Lodgik\Module\Dashboard;

use Doctrine\ORM\EntityManagerInterface;
use Lodgik\Entity\Booking;
use Lodgik\Entity\BookingStatusLog;
use Lodgik\Entity\DailySnapshot;
use Lodgik\Entity\Room;
use Lodgik\Enum\BookingStatus;
use Lodgik\Enum\RoomStatus;
use Lodgik\Repository\BookingRepository;
use Lodgik\Repository\DailySnapshotRepository;
use Lodgik\Repository\RoomRepository;
use Lodgik\Entity\Folio;
use Lodgik\Entity\FolioPayment;
use Lodgik\Entity\HousekeepingTask;
use Lodgik\Entity\ServiceRequest;
use Lodgik\Enum\FolioStatus;
use Lodgik\Enum\HousekeepingTaskStatus;
use Lodgik\Enum\PaymentStatus;
use Lodgik\Enum\ServiceRequestStatus;
use Psr\Log\LoggerInterface;

final class DashboardService
{
    public function __construct(
        private readonly EntityManagerInterface $em,
        private readonly BookingRepository $bookingRepo,
        private readonly RoomRepository $roomRepo,
        private readonly DailySnapshotRepository $snapshotRepo,
        private readonly LoggerInterface $logger,
        private readonly ?\Lodgik\Repository\PropertyRepository $propertyRepo = null,
    ) {}

    /**
     * Real-time dashboard overview for a property.
     */
    public function getOverview(string $propertyId): array
    {
        $today = (new \DateTimeImmutable())->format('Y-m-d');
        $todayStart = $today . ' 00:00:00';
        $todayEnd = $today . ' 23:59:59';

        // Room stats
        $roomCounts = $this->roomRepo->countByStatus($propertyId);
        $totalRooms = array_sum($roomCounts);
        $occupiedRooms = $roomCounts[RoomStatus::OCCUPIED->value] ?? 0;
        $availableRooms = $roomCounts[RoomStatus::VACANT_CLEAN->value] ?? 0;
        $dirtyRooms = $roomCounts[RoomStatus::VACANT_DIRTY->value] ?? 0;
        $occupancyRate = $totalRooms > 0 ? round(($occupiedRooms / $totalRooms) * 100, 1) : 0;

        // Today's check-ins
        $todayCheckIns = (int) $this->em->createQueryBuilder()
            ->select('COUNT(b.id)')
            ->from(Booking::class, 'b')
            ->where('b.propertyId = :prop')
            ->andWhere('b.status = :status')
            ->andWhere('b.checkedInAt >= :start AND b.checkedInAt <= :end')
            ->setParameter('prop', $propertyId)
            ->setParameter('status', BookingStatus::CHECKED_IN->value)
            ->setParameter('start', $todayStart)
            ->setParameter('end', $todayEnd)
            ->getQuery()
            ->getSingleScalarResult();

        // Today's check-outs
        $todayCheckOuts = (int) $this->em->createQueryBuilder()
            ->select('COUNT(b.id)')
            ->from(Booking::class, 'b')
            ->where('b.propertyId = :prop')
            ->andWhere('b.status = :status')
            ->andWhere('b.checkedOutAt >= :start AND b.checkedOutAt <= :end')
            ->setParameter('prop', $propertyId)
            ->setParameter('status', BookingStatus::CHECKED_OUT->value)
            ->setParameter('start', $todayStart)
            ->setParameter('end', $todayEnd)
            ->getQuery()
            ->getSingleScalarResult();

        // Pending check-ins (confirmed bookings with check-in today)
        $pendingCheckIns = (int) $this->em->createQueryBuilder()
            ->select('COUNT(b.id)')
            ->from(Booking::class, 'b')
            ->where('b.propertyId = :prop')
            ->andWhere('b.status = :status')
            ->andWhere('b.checkIn >= :todayStart AND b.checkIn < :todayEnd')
            ->setParameter('prop', $propertyId)
            ->setParameter('status', BookingStatus::CONFIRMED->value)
            ->setParameter('todayStart', $today . ' 00:00:00')
            ->setParameter('todayEnd', $today . ' 23:59:59')
            ->getQuery()
            ->getSingleScalarResult();

        // Pending bookings total
        $pendingBookings = (int) $this->em->createQueryBuilder()
            ->select('COUNT(b.id)')
            ->from(Booking::class, 'b')
            ->where('b.propertyId = :prop')
            ->andWhere('b.status IN (:statuses)')
            ->andWhere('b.deletedAt IS NULL')
            ->setParameter('prop', $propertyId)
            ->setParameter('statuses', [BookingStatus::PENDING->value, BookingStatus::CONFIRMED->value])
            ->getQuery()
            ->getSingleScalarResult();

        // Today's revenue (checked-out today)
        $todayRevenue = $this->em->createQueryBuilder()
            ->select('COALESCE(SUM(b.totalAmount), 0)')
            ->from(Booking::class, 'b')
            ->where('b.propertyId = :prop')
            ->andWhere('b.status = :status')
            ->andWhere('b.checkedOutAt >= :start AND b.checkedOutAt <= :end')
            ->setParameter('prop', $propertyId)
            ->setParameter('status', BookingStatus::CHECKED_OUT->value)
            ->setParameter('start', $todayStart)
            ->setParameter('end', $todayEnd)
            ->getQuery()
            ->getSingleScalarResult();

        // ADR (Average Daily Rate) = total revenue / rooms sold
        $adr = $occupiedRooms > 0 ? round((float) $todayRevenue / $occupiedRooms, 2) : 0;

        // RevPAR = total revenue / total rooms
        $revpar = $totalRooms > 0 ? round((float) $todayRevenue / $totalRooms, 2) : 0;

        return [
            'date' => $today,
            'rooms' => [
                'total' => $totalRooms,
                'occupied' => $occupiedRooms,
                'available' => $availableRooms,
                'dirty' => $dirtyRooms,
                'out_of_order' => $roomCounts[RoomStatus::OUT_OF_ORDER->value] ?? 0,
                'maintenance' => $roomCounts[RoomStatus::MAINTENANCE->value] ?? 0,
                'reserved' => $roomCounts[RoomStatus::RESERVED->value] ?? 0,
            ],
            'occupancy_rate' => $occupancyRate,
            'today_check_ins' => $todayCheckIns,
            'today_check_outs' => $todayCheckOuts,
            'pending_check_ins' => $pendingCheckIns,
            'pending_bookings' => $pendingBookings,
            'today_revenue' => number_format((float) $todayRevenue, 2, '.', ''),
            'adr' => number_format($adr, 2, '.', ''),
            'revpar' => number_format($revpar, 2, '.', ''),
        ];
    }

    /**
     * Occupancy trends over a date range (from snapshots or real-time).
     *
     * @return array<int, array{date: string, occupancy_rate: float, rooms_sold: int, revenue: string}>
     */
    public function getOccupancyTrends(string $propertyId, int $days = 30): array
    {
        $to = new \DateTimeImmutable();
        $from = $to->modify("-{$days} days");

        $snapshots = $this->snapshotRepo->getRange($propertyId, $from->format('Y-m-d'), $to->format('Y-m-d'));

        return array_map(fn(DailySnapshot $s) => [
            'date' => $s->getSnapshotDate()->format('Y-m-d'),
            'occupancy_rate' => (float) $s->getOccupancyRate(),
            'rooms_sold' => $s->getRoomsSold(),
            'revenue' => $s->getTotalRevenue(),
            'check_ins' => $s->getCheckIns(),
            'check_outs' => $s->getCheckOuts(),
            'adr' => $s->getAdr(),
            'revpar' => $s->getRevpar(),
        ], $snapshots);
    }

    /**
     * Revenue breakdown by booking type.
     */
    public function getRevenueBreakdown(string $propertyId, int $days = 30): array
    {
        $from = (new \DateTimeImmutable())->modify("-{$days} days")->format('Y-m-d');

        $results = $this->em->createQueryBuilder()
            ->select('b.bookingType as type, COUNT(b.id) as count, COALESCE(SUM(b.totalAmount), 0) as revenue')
            ->from(Booking::class, 'b')
            ->where('b.propertyId = :prop')
            ->andWhere('b.status = :status')
            ->andWhere('b.checkedOutAt >= :from')
            ->andWhere('b.deletedAt IS NULL')
            ->setParameter('prop', $propertyId)
            ->setParameter('status', BookingStatus::CHECKED_OUT->value)
            ->setParameter('from', $from)
            ->groupBy('b.bookingType')
            ->getQuery()
            ->getArrayResult();

        return array_map(fn(array $r) => [
            'booking_type' => $r['type'] instanceof \Lodgik\Enum\BookingType ? $r['type']->value : $r['type'],
            'count' => (int) $r['count'],
            'revenue' => number_format((float) $r['revenue'], 2, '.', ''),
        ], $results);
    }

    /**
     * Recent activity feed.
     *
     * @return array<int, array{action: string, booking_ref: string, timestamp: string, changed_by: string|null}>
     */
    public function getActivityFeed(string $propertyId, int $limit = 20): array
    {
        $logs = $this->em->createQueryBuilder()
            ->select('l, b.bookingRef, b.guestId')
            ->from(BookingStatusLog::class, 'l')
            ->join(Booking::class, 'b', 'WITH', 'l.bookingId = b.id')
            ->where('b.propertyId = :prop')
            ->setParameter('prop', $propertyId)
            ->orderBy('l.createdAt', 'DESC')
            ->setMaxResults($limit)
            ->getQuery()
            ->getResult();

        $items = [];
        foreach ($logs as $row) {
            if (is_array($row)) {
                $log = $row[0];
                $ref = $row['bookingRef'] ?? '';
            } else {
                $log = $row;
                $ref = '';
            }

            $items[] = [
                'action' => $log->getNewStatus()->value,
                'action_label' => $log->getNewStatus()->label(),
                'booking_ref' => $ref,
                'old_status' => $log->getOldStatus()->value,
                'new_status' => $log->getNewStatus()->value,
                'changed_by' => $log->getChangedBy(),
                'notes' => $log->getNotes(),
                'timestamp' => $log->getCreatedAt()->format('c'),
            ];
        }

        return $items;
    }

    /**
     * Generate daily snapshot for a property (called by cron or manually).
     */
    public function generateSnapshot(string $propertyId, string $tenantId, ?string $date = null): DailySnapshot
    {
        $snapshotDate = $date !== null ? new \DateTimeImmutable($date) : new \DateTimeImmutable('yesterday');
        $dateStr = $snapshotDate->format('Y-m-d');

        // Check if already exists
        $existing = $this->snapshotRepo->findByDate($propertyId, $dateStr);
        if ($existing !== null) {
            return $existing;
        }

        $dayStart = $dateStr . ' 00:00:00';
        $dayEnd = $dateStr . ' 23:59:59';

        // Total active rooms
        $totalRooms = (int) $this->em->createQueryBuilder()
            ->select('COUNT(r.id)')
            ->from(Room::class, 'r')
            ->where('r.propertyId = :prop')
            ->andWhere('r.isActive = true')
            ->andWhere('r.deletedAt IS NULL')
            ->setParameter('prop', $propertyId)
            ->getQuery()
            ->getSingleScalarResult();

        // Rooms sold (checked-in during this day)
        $roomsSold = (int) $this->em->createQueryBuilder()
            ->select('COUNT(DISTINCT b.roomId)')
            ->from(Booking::class, 'b')
            ->where('b.propertyId = :prop')
            ->andWhere('b.checkIn <= :end AND b.checkOut >= :start')
            ->andWhere('b.status IN (:statuses)')
            ->andWhere('b.deletedAt IS NULL')
            ->setParameter('prop', $propertyId)
            ->setParameter('start', $dayStart)
            ->setParameter('end', $dayEnd)
            ->setParameter('statuses', [BookingStatus::CHECKED_IN->value, BookingStatus::CHECKED_OUT->value])
            ->getQuery()
            ->getSingleScalarResult();

        // Revenue
        $revenue = (float) $this->em->createQueryBuilder()
            ->select('COALESCE(SUM(b.totalAmount), 0)')
            ->from(Booking::class, 'b')
            ->where('b.propertyId = :prop')
            ->andWhere('b.checkedOutAt >= :start AND b.checkedOutAt <= :end')
            ->andWhere('b.status = :status')
            ->setParameter('prop', $propertyId)
            ->setParameter('start', $dayStart)
            ->setParameter('end', $dayEnd)
            ->setParameter('status', BookingStatus::CHECKED_OUT->value)
            ->getQuery()
            ->getSingleScalarResult();

        // Check-ins/outs count
        $checkIns = (int) $this->em->createQueryBuilder()
            ->select('COUNT(b.id)')
            ->from(Booking::class, 'b')
            ->where('b.propertyId = :prop')
            ->andWhere('b.checkedInAt >= :start AND b.checkedInAt <= :end')
            ->setParameter('prop', $propertyId)
            ->setParameter('start', $dayStart)
            ->setParameter('end', $dayEnd)
            ->getQuery()
            ->getSingleScalarResult();

        $checkOuts = (int) $this->em->createQueryBuilder()
            ->select('COUNT(b.id)')
            ->from(Booking::class, 'b')
            ->where('b.propertyId = :prop')
            ->andWhere('b.checkedOutAt >= :start AND b.checkedOutAt <= :end')
            ->setParameter('prop', $propertyId)
            ->setParameter('start', $dayStart)
            ->setParameter('end', $dayEnd)
            ->getQuery()
            ->getSingleScalarResult();

        // New bookings created
        $newBookings = (int) $this->em->createQueryBuilder()
            ->select('COUNT(b.id)')
            ->from(Booking::class, 'b')
            ->where('b.propertyId = :prop')
            ->andWhere('b.createdAt >= :start AND b.createdAt <= :end')
            ->andWhere('b.deletedAt IS NULL')
            ->setParameter('prop', $propertyId)
            ->setParameter('start', $dayStart)
            ->setParameter('end', $dayEnd)
            ->getQuery()
            ->getSingleScalarResult();

        // Cancellations
        $cancellations = (int) $this->em->createQueryBuilder()
            ->select('COUNT(l.id)')
            ->from(BookingStatusLog::class, 'l')
            ->join(Booking::class, 'b', 'WITH', 'l.bookingId = b.id')
            ->where('b.propertyId = :prop')
            ->andWhere('l.newStatus = :cancelled')
            ->andWhere('l.createdAt >= :start AND l.createdAt <= :end')
            ->setParameter('prop', $propertyId)
            ->setParameter('cancelled', BookingStatus::CANCELLED->value)
            ->setParameter('start', $dayStart)
            ->setParameter('end', $dayEnd)
            ->getQuery()
            ->getSingleScalarResult();

        $occupancyRate = $totalRooms > 0 ? round(($roomsSold / $totalRooms) * 100, 2) : 0;
        $adr = $roomsSold > 0 ? round($revenue / $roomsSold, 2) : 0;
        $revpar = $totalRooms > 0 ? round($revenue / $totalRooms, 2) : 0;

        $snapshot = new DailySnapshot($propertyId, $tenantId, $snapshotDate);
        $snapshot->setTotalRooms($totalRooms);
        $snapshot->setRoomsSold($roomsSold);
        $snapshot->setOccupancyRate(number_format($occupancyRate, 2, '.', ''));
        $snapshot->setTotalRevenue(number_format($revenue, 2, '.', ''));
        $snapshot->setAdr(number_format($adr, 2, '.', ''));
        $snapshot->setRevpar(number_format($revpar, 2, '.', ''));
        $snapshot->setCheckIns($checkIns);
        $snapshot->setCheckOuts($checkOuts);
        $snapshot->setNewBookings($newBookings);
        $snapshot->setCancellations($cancellations);

        $this->snapshotRepo->save($snapshot);
        $this->logger->info("Snapshot generated for {$propertyId} on {$dateStr}");

        return $snapshot;
    }

    // ═══ Cross-Property Aggregation ═══════════════════════════

    /**
     * Aggregated overview across all tenant properties.
     */
    public function getAggregatedOverview(string $tenantId): array
    {
        $properties = $this->propertyRepo?->findBy(['tenantId' => $tenantId, 'isActive' => true]) ?? [];
        if (empty($properties)) return ['properties' => [], 'totals' => $this->emptyTotals()];

        $propertyData = [];
        $totals = $this->emptyTotals();

        foreach ($properties as $prop) {
            try {
                $overview = $this->getOverview($prop->getId());
                $overview['property_id'] = $prop->getId();
                $overview['property_name'] = $prop->getName();
                $overview['city'] = $prop->getCity();
                $propertyData[] = $overview;

                // Aggregate totals
                $totals['total_rooms'] += $overview['rooms']['total'] ?? 0;
                $totals['occupied_rooms'] += $overview['rooms']['occupied'] ?? 0;
                $totals['available_rooms'] += $overview['rooms']['available'] ?? 0;
                $totals['today_check_ins'] += $overview['today_check_ins'] ?? 0;
                $totals['today_check_outs'] += $overview['today_check_outs'] ?? 0;
                $totals['pending_check_ins'] += $overview['pending_check_ins'] ?? 0;
                $totals['pending_bookings'] += $overview['pending_bookings'] ?? 0;
                $totals['today_revenue'] += (float) ($overview['today_revenue'] ?? 0);
            } catch (\Throwable $e) {
                $this->logger->warning("Failed to get overview for property {$prop->getId()}: {$e->getMessage()}");
            }
        }

        // Compute aggregate rates
        $totals['occupancy_rate'] = $totals['total_rooms'] > 0
            ? round(($totals['occupied_rooms'] / $totals['total_rooms']) * 100, 1) : 0;
        $totals['adr'] = $totals['occupied_rooms'] > 0
            ? round($totals['today_revenue'] / $totals['occupied_rooms'], 2) : 0;
        $totals['revpar'] = $totals['total_rooms'] > 0
            ? round($totals['today_revenue'] / $totals['total_rooms'], 2) : 0;
        $totals['today_revenue'] = number_format($totals['today_revenue'], 2, '.', '');
        $totals['adr'] = number_format($totals['adr'], 2, '.', '');
        $totals['revpar'] = number_format($totals['revpar'], 2, '.', '');
        $totals['property_count'] = count($propertyData);

        return [
            'properties' => $propertyData,
            'totals' => $totals,
        ];
    }

    /**
     * Revenue comparison across properties for a given period.
     */
    public function getPropertyComparison(string $tenantId, int $days = 30): array
    {
        $from = (new \DateTimeImmutable())->modify("-{$days} days")->format('Y-m-d');
        $properties = $this->propertyRepo?->findBy(['tenantId' => $tenantId, 'isActive' => true]) ?? [];

        $comparison = [];
        foreach ($properties as $prop) {
            try {
                $revenue = (float) $this->em->createQueryBuilder()
                    ->select('COALESCE(SUM(b.totalAmount), 0)')
                    ->from(Booking::class, 'b')
                    ->where('b.propertyId = :prop')
                    ->andWhere('b.status = :status')
                    ->andWhere('b.checkedOutAt >= :from')
                    ->andWhere('b.deletedAt IS NULL')
                    ->setParameter('prop', $prop->getId())
                    ->setParameter('status', BookingStatus::CHECKED_OUT->value)
                    ->setParameter('from', $from)
                    ->getQuery()
                    ->getSingleScalarResult();

                $bookingCount = (int) $this->em->createQueryBuilder()
                    ->select('COUNT(b.id)')
                    ->from(Booking::class, 'b')
                    ->where('b.propertyId = :prop')
                    ->andWhere('b.deletedAt IS NULL')
                    ->andWhere('b.createdAt >= :from')
                    ->setParameter('prop', $prop->getId())
                    ->setParameter('from', $from)
                    ->getQuery()
                    ->getSingleScalarResult();

                $roomCounts = $this->roomRepo->countByStatus($prop->getId());
                $totalRooms = array_sum($roomCounts);
                $occupied = $roomCounts[RoomStatus::OCCUPIED->value] ?? 0;

                $comparison[] = [
                    'property_id' => $prop->getId(),
                    'property_name' => $prop->getName(),
                    'city' => $prop->getCity(),
                    'total_rooms' => $totalRooms,
                    'occupied_rooms' => $occupied,
                    'occupancy_rate' => $totalRooms > 0 ? round(($occupied / $totalRooms) * 100, 1) : 0,
                    'revenue' => number_format($revenue, 2, '.', ''),
                    'bookings' => $bookingCount,
                ];
            } catch (\Throwable $e) {
                $this->logger->warning("Comparison failed for {$prop->getId()}: {$e->getMessage()}");
            }
        }

        return $comparison;
    }

    private function emptyTotals(): array
    {
        return [
            'total_rooms' => 0, 'occupied_rooms' => 0, 'available_rooms' => 0,
            'today_check_ins' => 0, 'today_check_outs' => 0,
            'pending_check_ins' => 0, 'pending_bookings' => 0,
            'today_revenue' => 0, 'occupancy_rate' => 0, 'adr' => 0, 'revpar' => 0,
        ];
    }
    // ────────────────────────────────────────────────────────────
    // Dashboard summary sub-endpoints
    // ────────────────────────────────────────────────────────────

    /**
     * GET /api/dashboard/housekeeping-summary
     *
     * Today's housekeeping snapshot:
     *   - dirty/clean room counts (from Room status)
     *   - today's task breakdown (pending, in-progress, completed, needs-rework)
     *   - completion rate %
     *
     * Feature tier: basic_analytics (all plans)
     */
    public function getHousekeepingSummary(string $propertyId): array
    {
        // Room status breakdown
        $roomCounts     = $this->roomRepo->countByStatus($propertyId);
        $dirtyRooms     = ($roomCounts[RoomStatus::VACANT_DIRTY->value]   ?? 0)
                        + ($roomCounts[RoomStatus::MAINTENANCE->value]     ?? 0);
        $cleanRooms     = ($roomCounts[RoomStatus::VACANT_CLEAN->value]   ?? 0);
        $occupiedRooms  = ($roomCounts[RoomStatus::OCCUPIED->value]        ?? 0);
        $outOfOrder     = ($roomCounts[RoomStatus::OUT_OF_ORDER->value]    ?? 0);
        $totalRooms     = array_sum($roomCounts);

        // Today's tasks
        $todayStart = (new \DateTimeImmutable('today'))->format('Y-m-d 00:00:00');
        $todayEnd   = (new \DateTimeImmutable('today'))->format('Y-m-d 23:59:59');

        $rows = $this->em->createQueryBuilder()
            ->select('t.status, COUNT(t.id) as cnt')
            ->from(HousekeepingTask::class, 't')
            ->where('t.propertyId = :pid')
            ->andWhere('t.createdAt BETWEEN :s AND :e')
            ->groupBy('t.status')
            ->setParameter('pid', $propertyId)
            ->setParameter('s', $todayStart)
            ->setParameter('e', $todayEnd)
            ->getQuery()
            ->getArrayResult();

        $taskMap = [];
        $totalTasks = 0;
        foreach ($rows as $row) {
            $statusVal = $row['status'] instanceof HousekeepingTaskStatus
                ? $row['status']->value
                : $row['status'];
            $taskMap[$statusVal] = (int) $row['cnt'];
            $totalTasks += (int) $row['cnt'];
        }

        $completedTasks = ($taskMap[HousekeepingTaskStatus::COMPLETED->value]  ?? 0)
                        + ($taskMap[HousekeepingTaskStatus::INSPECTED->value]   ?? 0);
        $pendingTasks   =  $taskMap[HousekeepingTaskStatus::PENDING->value]    ?? 0;
        $assignedTasks  =  $taskMap[HousekeepingTaskStatus::ASSIGNED->value]   ?? 0;
        $inProgressTasks=  $taskMap[HousekeepingTaskStatus::IN_PROGRESS->value]?? 0;
        $reworkTasks    =  $taskMap[HousekeepingTaskStatus::NEEDS_REWORK->value]?? 0;
        $completionRate = $totalTasks > 0 ? round(($completedTasks / $totalTasks) * 100, 1) : 0;

        return [
            'rooms' => [
                'total'       => $totalRooms,
                'dirty'       => $dirtyRooms,
                'clean'       => $cleanRooms,
                'occupied'    => $occupiedRooms,
                'out_of_order'=> $outOfOrder,
            ],
            'tasks_today' => [
                'total'       => $totalTasks,
                'pending'     => $pendingTasks,
                'assigned'    => $assignedTasks,
                'in_progress' => $inProgressTasks,
                'completed'   => $completedTasks,
                'needs_rework'=> $reworkTasks,
                'completion_rate' => $completionRate,
            ],
        ];
    }

    /**
     * GET /api/dashboard/service-requests-summary
     *
     * Open/active service requests for the property:
     *   - counts by status
     *   - breakdown by category (top 5)
     *   - avg response time today (minutes from created → acknowledged)
     *
     * Feature tier: basic_analytics (all plans)
     */
    public function getServiceRequestsSummary(string $propertyId): array
    {
        // Status counts (all non-cancelled)
        $statusRows = $this->em->createQueryBuilder()
            ->select('sr.status, COUNT(sr.id) as cnt')
            ->from(ServiceRequest::class, 'sr')
            ->where('sr.propertyId = :pid')
            ->andWhere('sr.status != :cancelled')
            ->groupBy('sr.status')
            ->setParameter('pid', $propertyId)
            ->setParameter('cancelled', ServiceRequestStatus::CANCELLED->value)
            ->getQuery()
            ->getArrayResult();

        $statusMap = [];
        $total = 0;
        foreach ($statusRows as $row) {
            $s = $row['status'] instanceof ServiceRequestStatus
                ? $row['status']->value
                : $row['status'];
            $statusMap[$s] = (int) $row['cnt'];
            $total += (int) $row['cnt'];
        }

        // Category breakdown (today's requests)
        $todayStart = (new \DateTimeImmutable('today'))->format('Y-m-d 00:00:00');
        $todayEnd   = (new \DateTimeImmutable('today'))->format('Y-m-d 23:59:59');

        $catRows = $this->em->createQueryBuilder()
            ->select('sr.category, COUNT(sr.id) as cnt')
            ->from(ServiceRequest::class, 'sr')
            ->where('sr.propertyId = :pid')
            ->andWhere('sr.createdAt BETWEEN :s AND :e')
            ->groupBy('sr.category')
            ->orderBy('cnt', 'DESC')
            ->setMaxResults(5)
            ->setParameter('pid', $propertyId)
            ->setParameter('s', $todayStart)
            ->setParameter('e', $todayEnd)
            ->getQuery()
            ->getArrayResult();

        $byCategory = array_map(fn(array $r) => [
            'category' => $r['category'] instanceof \Lodgik\Enum\ServiceRequestCategory
                ? $r['category']->value
                : $r['category'],
            'count' => (int) $r['cnt'],
        ], $catRows);

        $todayTotal = array_sum(array_column($byCategory, 'count'));

        return [
            'total'        => $total,
            'pending'      => $statusMap[ServiceRequestStatus::PENDING->value]      ?? 0,
            'acknowledged' => $statusMap[ServiceRequestStatus::ACKNOWLEDGED->value] ?? 0,
            'in_progress'  => $statusMap[ServiceRequestStatus::IN_PROGRESS->value]  ?? 0,
            'completed'    => $statusMap[ServiceRequestStatus::COMPLETED->value]    ?? 0,
            'today_total'  => $todayTotal,
            'by_category'  => $byCategory,
        ];
    }

    /**
     * GET /api/dashboard/folio-summary
     *
     * Financial snapshot for the property:
     *   - collections today (confirmed payments, payment date = today)
     *   - outstanding balance (sum of open folio balances > 0)
     *   - pending payments (FolioPayments with status = pending)
     *   - open folios count
     *
     * Feature tier: advanced_analytics (business+)
     */
    public function getFolioSummary(string $propertyId): array
    {
        $todayStart = (new \DateTimeImmutable('today'))->format('Y-m-d 00:00:00');
        $todayEnd   = (new \DateTimeImmutable('today'))->format('Y-m-d 23:59:59');

        // Collections today — confirmed payments recorded today
        $collectedToday = (float) $this->em->createQueryBuilder()
            ->select('COALESCE(SUM(fp.amount), 0)')
            ->from(FolioPayment::class, 'fp')
            ->join(Folio::class, 'f', 'WITH', 'fp.folioId = f.id')
            ->where('f.propertyId = :pid')
            ->andWhere('fp.status = :confirmed')
            ->andWhere('fp.paymentDate BETWEEN :s AND :e')
            ->setParameter('pid',       $propertyId)
            ->setParameter('confirmed', PaymentStatus::CONFIRMED->value)
            ->setParameter('s',         $todayStart)
            ->setParameter('e',         $todayEnd)
            ->getQuery()
            ->getSingleScalarResult();

        // Outstanding balance across all open folios with balance > 0
        $outstandingBalance = (float) $this->em->createQueryBuilder()
            ->select('COALESCE(SUM(f.balance), 0)')
            ->from(Folio::class, 'f')
            ->where('f.propertyId = :pid')
            ->andWhere('f.status = :open')
            ->andWhere('f.balance > 0')
            ->setParameter('pid',  $propertyId)
            ->setParameter('open', FolioStatus::OPEN->value)
            ->getQuery()
            ->getSingleScalarResult();

        // Pending payments (awaiting staff confirmation)
        $pendingPayments = (int) $this->em->createQueryBuilder()
            ->select('COUNT(fp.id)')
            ->from(FolioPayment::class, 'fp')
            ->join(Folio::class, 'f', 'WITH', 'fp.folioId = f.id')
            ->where('f.propertyId = :pid')
            ->andWhere('fp.status = :pending')
            ->setParameter('pid',     $propertyId)
            ->setParameter('pending', PaymentStatus::PENDING->value)
            ->getQuery()
            ->getSingleScalarResult();

        // Pending payment value
        $pendingAmount = (float) $this->em->createQueryBuilder()
            ->select('COALESCE(SUM(fp.amount), 0)')
            ->from(FolioPayment::class, 'fp')
            ->join(Folio::class, 'f', 'WITH', 'fp.folioId = f.id')
            ->where('f.propertyId = :pid')
            ->andWhere('fp.status = :pending')
            ->setParameter('pid',     $propertyId)
            ->setParameter('pending', PaymentStatus::PENDING->value)
            ->getQuery()
            ->getSingleScalarResult();

        // Open folio count
        $openFolios = (int) $this->em->createQueryBuilder()
            ->select('COUNT(f.id)')
            ->from(Folio::class, 'f')
            ->where('f.propertyId = :pid')
            ->andWhere('f.status = :open')
            ->setParameter('pid',  $propertyId)
            ->setParameter('open', FolioStatus::OPEN->value)
            ->getQuery()
            ->getSingleScalarResult();

        return [
            'collected_today'     => number_format($collectedToday,     2, '.', ''),
            'outstanding_balance' => number_format($outstandingBalance, 2, '.', ''),
            'pending_payments'    => $pendingPayments,
            'pending_amount'      => number_format($pendingAmount,      2, '.', ''),
            'open_folios'         => $openFolios,
        ];
    }

}
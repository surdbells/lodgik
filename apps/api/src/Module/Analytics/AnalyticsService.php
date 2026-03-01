<?php
declare(strict_types=1);
namespace Lodgik\Module\Analytics;
use Doctrine\ORM\EntityManagerInterface;
use Lodgik\Entity\{Booking, Room, Expense, NightAudit};

final class AnalyticsService
{
    public function __construct(private readonly EntityManagerInterface $em) {}

    /** RevPAR: Revenue per available room = Total Room Revenue / Available Rooms */
    public function getRevparTrend(string $propertyId, string $from, string $to, string $groupBy = 'daily'): array
    { $audits = $this->em->getRepository(NightAudit::class)->findBy(['propertyId' => $propertyId]);
      $result = []; foreach ($audits as $a) { $arr = $a->toArray(); $date = $arr['audit_date'] ?? '';
        if ($date >= $from && $date <= $to) { $key = $groupBy === 'monthly' ? substr($date, 0, 7) : $date;
          if (!isset($result[$key])) $result[$key] = ['date' => $key, 'room_revenue' => 0, 'total_rooms' => 0, 'occupied' => 0, 'revpar' => 0];
          $result[$key]['room_revenue'] += (int)($arr['room_revenue'] ?? 0); $result[$key]['total_rooms'] = max($result[$key]['total_rooms'], (int)($arr['total_rooms'] ?? 1));
          $result[$key]['occupied'] += (int)($arr['rooms_occupied'] ?? 0); } }
      foreach ($result as &$r) { $r['revpar'] = $r['total_rooms'] > 0 ? round($r['room_revenue'] / $r['total_rooms']) : 0; $r['adr'] = $r['occupied'] > 0 ? round($r['room_revenue'] / $r['occupied']) : 0; }
      return array_values($result); }

    /** ADR analysis by day of week */
    public function getAdrByDayOfWeek(string $propertyId, string $from, string $to): array
    { $days = ['Mon' => 0, 'Tue' => 0, 'Wed' => 0, 'Thu' => 0, 'Fri' => 0, 'Sat' => 0, 'Sun' => 0];
      $counts = $days; $audits = $this->em->getRepository(NightAudit::class)->findBy(['propertyId' => $propertyId]);
      foreach ($audits as $a) { $arr = $a->toArray(); $date = $arr['audit_date'] ?? ''; if ($date >= $from && $date <= $to) {
        $dow = (new \DateTimeImmutable($date))->format('D'); $days[$dow] += (float)($arr['adr'] ?? 0); $counts[$dow]++; } }
      $result = []; foreach ($days as $d => $total) { $result[] = ['day' => $d, 'avg_adr' => $counts[$d] > 0 ? round($total / $counts[$d], 2) : 0, 'count' => $counts[$d]]; }
      return $result; }

    /** Occupancy rate trend */
    public function getOccupancyTrend(string $propertyId, string $from, string $to): array
    { $audits = $this->em->getRepository(NightAudit::class)->findBy(['propertyId' => $propertyId]);
      $result = []; foreach ($audits as $a) { $arr = $a->toArray(); $date = $arr['audit_date'] ?? '';
        if ($date >= $from && $date <= $to) { $result[] = ['date' => $date, 'occupancy_rate' => (float)($arr['occupancy_rate'] ?? 0), 'rooms_occupied' => (int)($arr['rooms_occupied'] ?? 0), 'total_rooms' => (int)($arr['total_rooms'] ?? 0)]; } }
      usort($result, fn($a, $b) => strcmp($a['date'], $b['date'])); return $result; }

    /** Revenue breakdown by category */
    public function getRevenueBreakdown(string $propertyId, string $from, string $to): array
    { $audits = $this->em->getRepository(NightAudit::class)->findBy(['propertyId' => $propertyId]);
      $totals = ['room' => 0, 'fnb' => 0, 'other' => 0, 'total' => 0];
      foreach ($audits as $a) { $arr = $a->toArray(); $date = $arr['audit_date'] ?? '';
        if ($date >= $from && $date <= $to) { $totals['room'] += (int)($arr['room_revenue'] ?? 0); $totals['fnb'] += (int)($arr['fnb_revenue'] ?? 0); $totals['other'] += (int)($arr['other_revenue'] ?? 0); $totals['total'] += (int)($arr['total_revenue'] ?? 0); } }
      return $totals; }

    /** Booking source analysis */
    public function getBookingSourceBreakdown(string $propertyId, string $from, string $to): array
    { $qb = $this->em->createQueryBuilder()->select("b.source, COUNT(b.id) as cnt, SUM(b.totalAmount) as revenue")
        ->from(Booking::class, 'b')->where('b.propertyId = :p')->andWhere('b.createdAt >= :f')->andWhere('b.createdAt <= :t')
        ->setParameter('p', $propertyId)->setParameter('f', $from . ' 00:00:00')->setParameter('t', $to . ' 23:59:59')
        ->groupBy('b.source');
      $rows = $qb->getQuery()->getResult();
      $total = array_sum(array_column($rows, 'cnt')) ?: 1;
      return array_map(fn($r) => [
        'source'     => $r['source'] ?? 'direct',
        'bookings'   => (int)$r['cnt'],
        'revenue'    => (int)$r['revenue'],
        'percentage' => round((int)$r['cnt'] / $total * 100, 1),
      ], $rows); }

    /** Top rooms by revenue */
    public function getTopRoomsByRevenue(string $propertyId, string $from, string $to, int $limit = 10): array
    { $qb = $this->em->createQueryBuilder()->select("r.roomNumber as room_number, COUNT(b.id) as bookings, SUM(b.totalAmount) as revenue")
        ->from(Booking::class, 'b')
        ->join(\Lodgik\Entity\Room::class, 'r', 'WITH', 'r.id = b.roomId')
        ->where('b.propertyId = :p')->andWhere('b.createdAt >= :f')->andWhere('b.createdAt <= :t')
        ->andWhere('b.roomId IS NOT NULL')
        ->setParameter('p', $propertyId)->setParameter('f', $from . ' 00:00:00')->setParameter('t', $to . ' 23:59:59')
        ->groupBy('r.roomNumber')->orderBy('revenue', 'DESC')->setMaxResults($limit);
      return array_map(fn($r) => ['room_number' => $r['room_number'], 'bookings' => (int)$r['bookings'], 'revenue' => (int)$r['revenue']], $qb->getQuery()->getResult()); }

    /** Expense vs Revenue (P&L summary) */
    public function getProfitLossSummary(string $propertyId, string $from, string $to): array
    { $revenue = $this->getRevenueBreakdown($propertyId, $from, $to);
      $expenses = (int)($this->em->createQueryBuilder()->select('SUM(e.amount)')->from(Expense::class, 'e')
        ->where('e.propertyId = :p')->andWhere("e.status IN ('approved', 'paid')")->andWhere('e.expenseDate >= :f')->andWhere('e.expenseDate <= :t')
        ->setParameter('p', $propertyId)->setParameter('f', $from)->setParameter('t', $to)->getQuery()->getSingleScalarResult() ?? 0);
      return ['period' => ['from' => $from, 'to' => $to], 'total_revenue' => $revenue['total'], 'total_expenses' => $expenses, 'net_profit' => $revenue['total'] - $expenses, 'revenue_breakdown' => $revenue]; }

    /** Guest demographics (nationality distribution) */
    public function getGuestDemographics(string $propertyId, string $from, string $to): array
    { $qb = $this->em->createQueryBuilder()->select("pr.nationality, COUNT(pr.id) as cnt")
        ->from(\Lodgik\Entity\PoliceReport::class, 'pr')->where('pr.propertyId = :p')->andWhere('pr.arrivalDate >= :f')->andWhere('pr.arrivalDate <= :t')
        ->setParameter('p', $propertyId)->setParameter('f', $from)->setParameter('t', $to)
        ->groupBy('pr.nationality')->orderBy('cnt', 'DESC');
      $rows = $qb->getQuery()->getResult();
      $nationalities = array_map(fn($r) => ['nationality' => $r['nationality'] ?? 'Unknown', 'count' => (int)$r['cnt']], $rows);
      // Age groups not tracked — return empty for now (extend when guest DOB is captured)
      return ['nationalities' => $nationalities, 'age_groups' => []]; }

    /** Monthly summary for dashboard */
    public function getMonthlySummary(string $propertyId, int $monthsBack = 12): array
    { $result = []; $now = new \DateTimeImmutable(); for ($i = $monthsBack - 1; $i >= 0; $i--) {
        $d = $now->modify("-{$i} months"); $from = $d->format('Y-m-01'); $to = $d->format('Y-m-t');
        $rev = $this->getRevenueBreakdown($propertyId, $from, $to);
        $result[] = ['month' => $d->format('Y-m'), 'revenue' => $rev['total'], 'room_revenue' => $rev['room'], 'fnb_revenue' => $rev['fnb']]; }
      return $result; }
}

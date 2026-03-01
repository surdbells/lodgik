<?php
declare(strict_types=1);
namespace Lodgik\Module\Finance;
use Doctrine\ORM\EntityManagerInterface;
use Lodgik\Entity\{Expense, ExpenseCategory, NightAudit, PoliceReport, PerformanceReview, PricingRule, GroupBooking};
use Lodgik\Entity\{Booking, Room, Folio, FolioCharge, FolioPayment};
use Lodgik\Enum\{BookingStatus, ChargeCategory, PaymentMethod, PaymentStatus};

final class FinanceService
{
    public function __construct(private readonly EntityManagerInterface $em) {}

    public function listCategories(string $tenantId): array { return array_map(fn($c) => $c->toArray(), $this->em->getRepository(ExpenseCategory::class)->findBy(['tenantId' => $tenantId], ['name' => 'ASC'])); }
    public function createCategory(string $name, string $tenantId, ?string $parentId = null, ?string $desc = null): ExpenseCategory { $c = new ExpenseCategory($name, $tenantId); if ($parentId) $c->setParentId($parentId); if ($desc) $c->setDescription($desc); $this->em->persist($c); $this->em->flush(); return $c; }

    public function listExpenses(string $propertyId, ?string $status = null, ?string $from = null, ?string $to = null, int $page = 1, int $limit = 20): array
    { $qb = $this->em->createQueryBuilder()->select('e')->from(Expense::class, 'e')->where('e.propertyId = :p')->setParameter('p', $propertyId)->orderBy('e.expenseDate', 'DESC');
      if ($status) $qb->andWhere('e.status = :s')->setParameter('s', $status);
      if ($from) $qb->andWhere('e.expenseDate >= :f')->setParameter('f', $from);
      if ($to) $qb->andWhere('e.expenseDate <= :t')->setParameter('t', $to);
      $qb->setFirstResult(($page-1)*$limit)->setMaxResults($limit);
      return array_map(fn($e) => $e->toArray(), $qb->getQuery()->getResult()); }

    public function createExpense(string $pid, string $catId, string $catName, string $desc, string $amt, string $date, string $by, string $byName, string $tid, array $x = []): Expense
    { $e = new Expense($pid, $catId, $catName, $desc, $amt, new \DateTimeImmutable($date), $by, $byName, $tid);
      if (!empty($x['vendor'])) $e->setVendor($x['vendor']); if (!empty($x['receipt_url'])) $e->setReceiptUrl($x['receipt_url']); if (!empty($x['notes'])) $e->setNotes($x['notes']);
      if ($x['auto_submit'] ?? false) $e->submit(); $this->em->persist($e); $this->em->flush(); return $e; }

    public function submitExpense(string $id): Expense { $e = $this->em->find(Expense::class, $id); $e->submit(); $this->em->flush(); return $e; }
    public function approveExpense(string $id, string $uid, string $name): Expense { $e = $this->em->find(Expense::class, $id); $e->approve($uid, $name); $this->em->flush(); return $e; }
    public function rejectExpense(string $id, string $uid, string $name, ?string $reason = null): Expense { $e = $this->em->find(Expense::class, $id); $e->reject($uid, $name, $reason); $this->em->flush(); return $e; }
    public function markExpensePaid(string $id, string $method, ?string $ref = null): Expense { $e = $this->em->find(Expense::class, $id); $e->markPaid($method, $ref); $this->em->flush(); return $e; }

    public function listNightAudits(string $pid, int $limit = 30): array { return array_map(fn($a) => $a->toArray(), $this->em->getRepository(NightAudit::class)->findBy(['propertyId' => $pid], ['auditDate' => 'DESC'], $limit)); }
    public function generateNightAudit(string $pid, string $date, string $tid): NightAudit
    {
        $auditDate = new \DateTimeImmutable($date);
        $dayStart  = $date . ' 00:00:00';
        $dayEnd    = $date . ' 23:59:59';

        // ── Upsert audit record ───────────────────────────────────────────────
        $a = $this->em->getRepository(NightAudit::class)
            ->findOneBy(['propertyId' => $pid, 'auditDate' => $auditDate]);
        if (!$a) {
            $a = new NightAudit($pid, $auditDate, $tid);
            $this->em->persist($a);
        }

        // ── Rooms ─────────────────────────────────────────────────────────────
        $totalRooms = (int) $this->em->createQueryBuilder()
            ->select('COUNT(r.id)')->from(Room::class, 'r')
            ->where('r.propertyId = :p')->setParameter('p', $pid)
            ->getQuery()->getSingleScalarResult();

        // Check-ins today: bookings whose status changed to checked_in on this date
        $checkIns = (int) $this->em->createQueryBuilder()
            ->select('COUNT(b.id)')->from(Booking::class, 'b')
            ->where('b.propertyId = :p')
            ->andWhere('b.status = :s')
            ->andWhere('b.checkedInAt >= :ds')->andWhere('b.checkedInAt <= :de')
            ->setParameter('p', $pid)->setParameter('s', BookingStatus::CHECKED_IN)
            ->setParameter('ds', $dayStart)->setParameter('de', $dayEnd)
            ->getQuery()->getSingleScalarResult();

        // Check-outs today
        $checkOuts = (int) $this->em->createQueryBuilder()
            ->select('COUNT(b.id)')->from(Booking::class, 'b')
            ->where('b.propertyId = :p')
            ->andWhere('b.status = :s')
            ->andWhere('b.checkedOutAt >= :ds')->andWhere('b.checkedOutAt <= :de')
            ->setParameter('p', $pid)->setParameter('s', BookingStatus::CHECKED_OUT)
            ->setParameter('ds', $dayStart)->setParameter('de', $dayEnd)
            ->getQuery()->getSingleScalarResult();

        // No-shows today (booking date = audit date, status = no_show)
        $noShows = (int) $this->em->createQueryBuilder()
            ->select('COUNT(b.id)')->from(Booking::class, 'b')
            ->where('b.propertyId = :p')
            ->andWhere('b.status = :s')
            ->andWhere('b.checkIn >= :ds')->andWhere('b.checkIn <= :de')
            ->setParameter('p', $pid)->setParameter('s', BookingStatus::NO_SHOW)
            ->setParameter('ds', $dayStart)->setParameter('de', $dayEnd)
            ->getQuery()->getSingleScalarResult();

        // Rooms occupied tonight (checked_in bookings spanning this date)
        $roomsOccupied = (int) $this->em->createQueryBuilder()
            ->select('COUNT(b.id)')->from(Booking::class, 'b')
            ->where('b.propertyId = :p')
            ->andWhere('b.status = :s')
            ->andWhere('b.checkIn <= :d')->andWhere('b.checkOut > :d')
            ->setParameter('p', $pid)->setParameter('s', BookingStatus::CHECKED_IN)
            ->setParameter('d', $date)
            ->getQuery()->getSingleScalarResult();

        $roomsAvailable = max(0, $totalRooms - $roomsOccupied);
        $occupancyRate  = $totalRooms > 0
            ? number_format(($roomsOccupied / $totalRooms) * 100, 2, '.', '')
            : '0.00';

        // ── Revenue from FolioCharges posted today ────────────────────────────
        // Get folio IDs for this property
        $folioIds = $this->em->createQueryBuilder()
            ->select('f.id')->from(Folio::class, 'f')
            ->where('f.propertyId = :p')->setParameter('p', $pid)
            ->getQuery()->getSingleColumnResult();

        $roomRevenue = '0'; $fnbRevenue = '0'; $otherRevenue = '0';
        if (!empty($folioIds)) {
            $fnbCategories = [
                ChargeCategory::RESTAURANT->value,
                ChargeCategory::BAR->value,
                ChargeCategory::MINIBAR->value,
            ];

            // Room revenue
            $roomRevenue = (string)((int) round((float) ($this->em->createQueryBuilder()
                ->select('SUM(c.lineTotal)')->from(FolioCharge::class, 'c')
                ->where('c.folioId IN (:fids)')->andWhere('c.category = :cat')
                ->andWhere('c.createdAt >= :ds')->andWhere('c.createdAt <= :de')
                ->setParameter('fids', $folioIds)
                ->setParameter('cat', ChargeCategory::ROOM->value)
                ->setParameter('ds', $dayStart)->setParameter('de', $dayEnd)
                ->getQuery()->getSingleScalarResult() ?? 0) * 100));

            // F&B revenue (restaurant + bar + minibar)
            $fnbRevenue = (string)((int) round((float) ($this->em->createQueryBuilder()
                ->select('SUM(c.lineTotal)')->from(FolioCharge::class, 'c')
                ->where('c.folioId IN (:fids)')->andWhere('c.category IN (:cats)')
                ->andWhere('c.createdAt >= :ds')->andWhere('c.createdAt <= :de')
                ->setParameter('fids', $folioIds)
                ->setParameter('cats', $fnbCategories)
                ->setParameter('ds', $dayStart)->setParameter('de', $dayEnd)
                ->getQuery()->getSingleScalarResult() ?? 0) * 100));

            // Other revenue (service, laundry, telephone, other)
            $otherRevenue = (string)((int) round((float) ($this->em->createQueryBuilder()
                ->select('SUM(c.lineTotal)')->from(FolioCharge::class, 'c')
                ->where('c.folioId IN (:fids)')
                ->andWhere('c.category NOT IN (:excl)')
                ->andWhere('c.createdAt >= :ds')->andWhere('c.createdAt <= :de')
                ->setParameter('fids', $folioIds)
                ->setParameter('excl', array_merge([ChargeCategory::ROOM->value], $fnbCategories))
                ->setParameter('ds', $dayStart)->setParameter('de', $dayEnd)
                ->getQuery()->getSingleScalarResult() ?? 0) * 100));
        }

        $totalRevenue = (string)((int)$roomRevenue + (int)$fnbRevenue + (int)$otherRevenue);

        // ── Expenses today ────────────────────────────────────────────────────
        $totalExpenses = (string)((int) round((float) ($this->em->createQueryBuilder()
            ->select('SUM(e.amount)')->from(Expense::class, 'e')
            ->where('e.propertyId = :p')
            ->andWhere("e.status IN ('approved','paid')")
            ->andWhere('e.expenseDate >= :ds')->andWhere('e.expenseDate <= :de')
            ->setParameter('p', $pid)
            ->setParameter('ds', $date)->setParameter('de', $date)
            ->getQuery()->getSingleScalarResult() ?? 0) * 100));

        // ── Payments collected today ──────────────────────────────────────────
        $cashCollected = $cardCollected = $transferCollected = '0';
        if (!empty($folioIds)) {
            $pmBase = $this->em->createQueryBuilder()
                ->select('SUM(p.amount)')->from(FolioPayment::class, 'p')
                ->where('p.folioId IN (:fids)')->andWhere('p.status = :ps')
                ->andWhere('p.createdAt >= :ds')->andWhere('p.createdAt <= :de')
                ->setParameter('fids', $folioIds)
                ->setParameter('ps', PaymentStatus::CONFIRMED)
                ->setParameter('ds', $dayStart)->setParameter('de', $dayEnd);

            $getCash = (clone $pmBase)->andWhere('p.paymentMethod = :m')
                ->setParameter('m', PaymentMethod::CASH->value)
                ->getQuery()->getSingleScalarResult() ?? 0;
            $getCard = (clone $pmBase)->andWhere('p.paymentMethod = :m')
                ->setParameter('m', PaymentMethod::POS_CARD->value)
                ->getQuery()->getSingleScalarResult() ?? 0;
            $getTransfer = (clone $pmBase)->andWhere('p.paymentMethod = :m')
                ->setParameter('m', PaymentMethod::BANK_TRANSFER->value)
                ->getQuery()->getSingleScalarResult() ?? 0;

            $cashCollected     = (string)((int) round((float)$getCash * 100));
            $cardCollected     = (string)((int) round((float)$getCard * 100));
            $transferCollected = (string)((int) round((float)$getTransfer * 100));
        }

        // ── ADR and RevPAR ────────────────────────────────────────────────────
        $adr    = $roomsOccupied > 0
            ? number_format((int)$roomRevenue / $roomsOccupied, 2, '.', '')
            : '0.00';
        $revpar = $totalRooms > 0
            ? number_format((int)$roomRevenue / $totalRooms, 2, '.', '')
            : '0.00';

        // ── Discrepancies: bookings with balance > 0 on checkout ─────────────
        $discrepancies = [];
        if (!empty($folioIds)) {
            // Find folios where balance > 0 updated today (potential discrepancies)
            $outstandingFolios = $this->em->createQueryBuilder()
                ->select('f')->from(Folio::class, 'f')
                ->where('f.propertyId = :p')
                ->andWhere('f.balance > 0')
                ->andWhere('f.updatedAt >= :ds')->andWhere('f.updatedAt <= :de')
                ->setParameter('p', $pid)
                ->setParameter('ds', $dayStart)->setParameter('de', $dayEnd)
                ->getQuery()->getResult();
            foreach ($outstandingFolios as $folio) {
                $discrepancies[] = [
                    'folio_id'    => $folio->getId(),
                    'booking_id'  => $folio->getBookingId(),
                    'balance'     => $folio->getBalance(),
                    'description' => 'Outstanding balance at audit time',
                ];
            }
        }

        $outstandingBalance = (string) array_sum(array_column($discrepancies, 'balance'));

        // ── Persist ───────────────────────────────────────────────────────────
        $a->setTotalRooms($totalRooms);
        $a->setRoomsOccupied($roomsOccupied);
        $a->setRoomsAvailable($roomsAvailable);
        $a->setCheckIns($checkIns);
        $a->setCheckOuts($checkOuts);
        $a->setNoShows($noShows);
        $a->setRoomRevenue($roomRevenue);
        $a->setFnbRevenue($fnbRevenue);
        $a->setOtherRevenue($otherRevenue);
        $a->setTotalRevenue($totalRevenue);
        $a->setTotalExpenses($totalExpenses);
        $a->setOutstandingBalance($outstandingBalance);
        $a->setCashCollected($cashCollected);
        $a->setCardCollected($cardCollected);
        $a->setTransferCollected($transferCollected);
        $a->setOccupancyRate($occupancyRate);
        $a->setAdr($adr);
        $a->setRevpar($revpar);
        $a->setDiscrepancies($discrepancies ?: null);

        $this->em->flush();
        return $a;
    }
    public function closeNightAudit(string $id, string $uid, string $name, ?string $notes = null): NightAudit { $a = $this->em->find(NightAudit::class, $id); if ($notes) $a->setNotes($notes); $a->close($uid, $name); $this->em->flush(); return $a; }

    public function listPoliceReports(string $pid, ?string $from = null, ?string $to = null): array
    { $qb = $this->em->createQueryBuilder()->select('p')->from(PoliceReport::class, 'p')->where('p.propertyId = :p')->setParameter('p', $pid)->orderBy('p.arrivalDate', 'DESC');
      if ($from) $qb->andWhere('p.arrivalDate >= :f')->setParameter('f', $from);
      if ($to) $qb->andWhere('p.arrivalDate <= :t')->setParameter('t', $to);
      return array_map(fn($r) => $r->toArray(), $qb->getQuery()->getResult()); }

    public function createPoliceReport(string $pid, string $bid, string $gid, string $gname, string $arr, string $tid, array $x = []): PoliceReport
    { $r = new PoliceReport($pid, $bid, $gid, $gname, new \DateTimeImmutable($arr), $tid);
      foreach (['nationality','id_type','id_number','address','phone','email','purpose_of_visit','room_number','vehicle_plate'] as $f) { if (!empty($x[$f])) { $m = 'set' . str_replace('_', '', ucwords($f, '_')); $r->$m($x[$f]); } }
      if (!empty($x['departure_date'])) $r->setDepartureDate(new \DateTimeImmutable($x['departure_date']));
      if (isset($x['accompanying_persons'])) $r->setAccompanyingPersons((int)$x['accompanying_persons']);
      $this->em->persist($r); $this->em->flush(); return $r; }

    public function submitPoliceReport(string $id): PoliceReport { $r = $this->em->find(PoliceReport::class, $id); $r->markSubmitted(); $this->em->flush(); return $r; }

    public function listReviews(string $pid, ?string $empId = null): array { $c = ['propertyId' => $pid]; if ($empId) $c['employeeId'] = $empId; return array_map(fn($r) => $r->toArray(), $this->em->getRepository(PerformanceReview::class)->findBy($c, ['year' => 'DESC'])); }
    public function createReview(string $pid, string $eid, string $ename, string $rid, string $rname, string $period, int $year, int $rating, string $tid, array $x = []): PerformanceReview
    { $r = new PerformanceReview($pid, $eid, $ename, $rid, $rname, $period, $year, $rating, $tid);
      if (!empty($x['ratings'])) $r->setRatings($x['ratings']); if (!empty($x['strengths'])) $r->setStrengths($x['strengths']);
      if (!empty($x['improvements'])) $r->setImprovements($x['improvements']); if (!empty($x['goals'])) $r->setGoals($x['goals']);
      $this->em->persist($r); $this->em->flush(); return $r; }
    public function submitReview(string $id): PerformanceReview { $r = $this->em->find(PerformanceReview::class, $id); $r->submit(); $this->em->flush(); return $r; }
    public function acknowledgeReview(string $id): PerformanceReview { $r = $this->em->find(PerformanceReview::class, $id); $r->acknowledge(); $this->em->flush(); return $r; }

    public function listPricingRules(string $pid, ?bool $active = null): array { $c = ['propertyId' => $pid]; if ($active !== null) $c['isActive'] = $active; return array_map(fn($r) => $r->toArray(), $this->em->getRepository(PricingRule::class)->findBy($c, ['priority' => 'DESC'])); }
    public function createPricingRule(string $pid, string $name, string $rType, string $aType, string $aVal, string $tid, array $x = []): PricingRule
    { $r = new PricingRule($pid, $name, $rType, $aType, $aVal, $tid);
      if (!empty($x['room_type_id'])) $r->setRoomTypeId($x['room_type_id']);
      if (!empty($x['start_date'])) $r->setStartDate(new \DateTimeImmutable($x['start_date']));
      if (!empty($x['end_date'])) $r->setEndDate(new \DateTimeImmutable($x['end_date']));
      if (isset($x['days_of_week'])) $r->setDaysOfWeek($x['days_of_week']);
      if (isset($x['min_occupancy'])) $r->setMinOccupancy((int)$x['min_occupancy']);
      if (isset($x['min_nights'])) $r->setMinNights((int)$x['min_nights']);
      if (isset($x['priority'])) $r->setPriority((int)$x['priority']);
      $this->em->persist($r); $this->em->flush(); return $r; }
    public function updatePricingRule(string $id, array $d): PricingRule { $r = $this->em->find(PricingRule::class, $id); if (isset($d['name'])) $r->setName($d['name']); if (isset($d['adjustment_value'])) $r->setAdjustmentValue($d['adjustment_value']); if (isset($d['is_active'])) $r->setIsActive((bool)$d['is_active']); if (isset($d['priority'])) $r->setPriority((int)$d['priority']); $this->em->flush(); return $r; }

    public function calculateDynamicRate(string $pid, ?string $rtId, string $baseRate, \DateTimeImmutable $date, ?int $nights = null, ?float $occRate = null): array
    { $rules = $this->em->getRepository(PricingRule::class)->findBy(['propertyId' => $pid, 'isActive' => true], ['priority' => 'DESC']);
      $applied = []; $rate = $baseRate;
      foreach ($rules as $rule) { if ($rtId && $rule->getRoomTypeId() && $rule->getRoomTypeId() !== $rtId) continue; if (!$rule->appliesOnDate($date)) continue;
        if ($rule->getRuleType() === 'occupancy' && $occRate !== null && $rule->getMinOccupancy() !== null && $occRate < $rule->getMinOccupancy()) continue;
        if ($rule->getRuleType() === 'length_of_stay' && $nights !== null && $rule->getMinNights() !== null && $nights < $rule->getMinNights()) continue;
        $rate = $rule->applyTo($rate); $applied[] = ['rule' => $rule->getName(), 'adjustment' => $rule->getAdjustmentValue()]; }
      return ['base_rate' => $baseRate, 'final_rate' => $rate, 'rules_applied' => $applied]; }

    public function listGroupBookings(string $pid, ?string $status = null): array { $c = ['propertyId' => $pid]; if ($status) $c['status'] = $status; return array_map(fn($g) => $g->toArray(), $this->em->getRepository(GroupBooking::class)->findBy($c, ['checkIn' => 'DESC'])); }
    public function createGroupBooking(string $pid, string $name, string $type, string $contact, string $ci, string $co, string $tid, array $x = []): GroupBooking
    { $g = new GroupBooking($pid, $name, $type, $contact, new \DateTimeImmutable($ci), new \DateTimeImmutable($co), $tid);
      if (!empty($x['contact_email'])) $g->setContactEmail($x['contact_email']); if (!empty($x['contact_phone'])) $g->setContactPhone($x['contact_phone']);
      if (!empty($x['company_name'])) $g->setCompanyName($x['company_name']); if (isset($x['discount_percentage'])) $g->setDiscountPercentage($x['discount_percentage']);
      if (isset($x['total_rooms'])) $g->setTotalRooms((int)$x['total_rooms']); if (!empty($x['notes'])) $g->setNotes($x['notes']);
      $this->em->persist($g); $this->em->flush(); return $g; }
    public function confirmGroupBooking(string $id): GroupBooking { $g = $this->em->find(GroupBooking::class, $id); $g->confirm(); $this->em->flush(); return $g; }
    public function cancelGroupBooking(string $id): GroupBooking { $g = $this->em->find(GroupBooking::class, $id); $g->cancel(); $this->em->flush(); return $g; }
}

<?php
declare(strict_types=1);
namespace Lodgik\Module\Finance;
use Doctrine\ORM\EntityManagerInterface;
use Lodgik\Entity\{Expense, ExpenseCategory, NightAudit, PoliceReport, PerformanceReview, PricingRule, GroupBooking};
use Lodgik\Entity\{Booking, Room, Folio, FolioCharge, FolioPayment};
use Lodgik\Enum\{BookingStatus, ChargeCategory, PaymentMethod, PaymentStatus};
use Lodgik\Module\Folio\FolioService;
use Lodgik\Service\ZeptoMailService;
use Psr\Log\LoggerInterface;

final class FinanceService
{
    public function __construct(
        private readonly EntityManagerInterface $em,
        private readonly ?FolioService $folioService = null,
        private readonly ?LoggerInterface $logger = null,
        private readonly ?ZeptoMailService $mailer = null,
    ) {}

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
    {
        $e = new Expense($pid, $catId, $catName, $desc, $amt, new \DateTimeImmutable($date), $by, $byName, $tid);
        if (!empty($x['vendor']))      $e->setVendor($x['vendor']);
        if (!empty($x['receipt_url'])) $e->setReceiptUrl($x['receipt_url']);
        if (!empty($x['notes']))       $e->setNotes($x['notes']);
        if ($x['auto_submit'] ?? false) $e->submit();

        // Phase 5: Market/walk-in purchase fields
        $vendorType = $x['vendor_type'] ?? 'registered';
        $e->setVendorType($vendorType);
        if (!empty($x['market_vendor_name'])) $e->setMarketVendorName($x['market_vendor_name']);
        if (!empty($x['signed_note_url']))    $e->setSignedNoteUrl($x['signed_note_url']);

        if ($vendorType === 'market' || $vendorType === 'petty_cash') {
            $property = $this->em->find(\Lodgik\Entity\Property::class, $pid);
            if ($property !== null) {
                $limitKobo = (int) $property->getSetting('market_purchase_spending_limit_kobo', 0);
                if ($limitKobo > 0 && (int)$amt > $limitKobo) { $e->setSpendingLimitBreach(true); }
                $requireDual = (bool) $property->getSetting('market_purchase_require_dual_approval', false);
                $e->setSecondApprovalRequired($requireDual);
            }
        }

        $this->em->persist($e);
        $this->em->flush();
        return $e;
    }

    public function submitExpense(string $id): Expense { $e = $this->em->find(Expense::class, $id); $e->submit(); $this->em->flush(); return $e; }
    public function approveExpense(string $id, string $uid, string $name): Expense { $e = $this->em->find(Expense::class, $id); $e->approve($uid, $name); $this->em->flush(); return $e; }
    public function rejectExpense(string $id, string $uid, string $name, ?string $reason = null): Expense { $e = $this->em->find(Expense::class, $id); $e->reject($uid, $name, $reason); $this->em->flush(); return $e; }
    public function markExpensePaid(string $id, string $method, ?string $ref = null): Expense { $e = $this->em->find(Expense::class, $id); $e->markPaid($method, $ref); $this->em->flush(); return $e; }

    public function getExpenseById(string $id): ?Expense { return $this->em->find(Expense::class, $id); }

    /** Phase 5: Admin second-approval for market purchases */
    public function secondApproveExpense(string $id, string $uid, string $name): Expense
    {
        $e = $this->em->find(Expense::class, $id);
        if ($e === null) throw new \RuntimeException('Expense not found');
        $e->secondApprove($uid, $name);
        $this->em->flush();
        return $e;
    }

    public function listPendingSecondApproval(string $propertyId): array
    {
        return array_map(fn($e) => $e->toArray(), $this->em->createQueryBuilder()
            ->select('e')->from(Expense::class, 'e')
            ->where('e.propertyId = :pid')->setParameter('pid', $propertyId)
            ->andWhere('e.secondApprovalRequired = true')
            ->andWhere('e.secondApprovedAt IS NULL')
            ->andWhere('e.status = :s')->setParameter('s', 'approved')
            ->orderBy('e.createdAt', 'DESC')
            ->getQuery()->getResult()
        );
    }

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

    public function policeReportExistsForBooking(string $bid): bool
    { return (bool) $this->em->getRepository(PoliceReport::class)->findOneBy(['bookingId' => $bid]); }

    public function createPoliceReport(string $pid, string $bid, string $gid, string $gname, string $arr, string $tid, array $x = []): PoliceReport
    { // Idempotent: skip silently if a report already exists for this booking
      if ($this->policeReportExistsForBooking($bid)) {
          return $this->em->getRepository(PoliceReport::class)->findOneBy(['bookingId' => $bid]);
      }
      $r = new PoliceReport($pid, $bid, $gid, $gname, new \DateTimeImmutable($arr), $tid);
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
      if (isset($x['max_occupancy'])) $r->setMaxOccupancy((int)$x['max_occupancy']);
      if (isset($x['min_nights'])) $r->setMinNights((int)$x['min_nights']);
      if (isset($x['advance_days'])) $r->setAdvanceDays((int)$x['advance_days']);
      if (isset($x['priority'])) $r->setPriority((int)$x['priority']);
      if (isset($x['description'])) $r->setDescription($x['description']);
      if (isset($x['is_active'])) $r->setIsActive((bool)$x['is_active']);
      $this->em->persist($r); $this->em->flush(); return $r; }
    public function updatePricingRule(string $id, array $d): PricingRule {
      $r = $this->em->find(PricingRule::class, $id);
      if (isset($d['name'])) $r->setName($d['name']);
      if (isset($d['adjustment_value'])) $r->setAdjustmentValue($d['adjustment_value']);
      if (isset($d['adjustment_type'])) $r->setAdjustmentType($d['adjustment_type']);
      if (isset($d['rule_type'])) $r->setRuleType($d['rule_type']);
      if (isset($d['is_active'])) $r->setIsActive((bool)$d['is_active']);
      if (isset($d['priority'])) $r->setPriority((int)$d['priority']);
      if (array_key_exists('room_type_id', $d)) $r->setRoomTypeId($d['room_type_id']);
      if (array_key_exists('start_date', $d)) $r->setStartDate($d['start_date'] ? new \DateTimeImmutable($d['start_date']) : null);
      if (array_key_exists('end_date', $d)) $r->setEndDate($d['end_date'] ? new \DateTimeImmutable($d['end_date']) : null);
      if (array_key_exists('days_of_week', $d)) $r->setDaysOfWeek($d['days_of_week']);
      if (array_key_exists('min_occupancy', $d)) $r->setMinOccupancy($d['min_occupancy'] !== null ? (int)$d['min_occupancy'] : null);
      if (array_key_exists('max_occupancy', $d)) $r->setMaxOccupancy($d['max_occupancy'] !== null ? (int)$d['max_occupancy'] : null);
      if (array_key_exists('advance_days', $d)) $r->setAdvanceDays($d['advance_days'] !== null ? (int)$d['advance_days'] : null);
      if (array_key_exists('min_nights', $d)) $r->setMinNights($d['min_nights'] !== null ? (int)$d['min_nights'] : null);
      if (array_key_exists('description', $d)) $r->setDescription($d['description']);
      $this->em->flush(); return $r; }
    public function deletePricingRule(string $id): void { $r = $this->em->find(PricingRule::class, $id); if ($r) { $this->em->remove($r); $this->em->flush(); } }

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

    // ── Phase 3: Corporate Folio ──────────────────────────────────────────

    /**
     * Update corporate settings on a group booking.
     * Called from PATCH /api/finance/group-bookings/{id}/corporate
     */
    public function updateCorporateSettings(
        string $id,
        string $tenantId,
        ?bool   $isCorporate                = null,
        ?string $creditLimitType            = null,
        ?float  $creditLimitNgn             = null,
        ?string $corporateContactEmail      = null,
        ?string $corporateRefNumber         = null,
        ?bool   $allowCheckoutWithoutPayment = null,
    ): GroupBooking {
        $g = $this->em->getRepository(GroupBooking::class)->findOneBy(['id' => $id, 'tenantId' => $tenantId]);
        if ($g === null) {
            throw new \RuntimeException('Group booking not found');
        }

        if ($isCorporate !== null) {
            $g->setCorporate($isCorporate);
        }
        if ($creditLimitType !== null && in_array($creditLimitType, ['fixed', 'unlimited'], true)) {
            $g->setCreditLimitType($creditLimitType);
        }
        if ($creditLimitNgn !== null) {
            $g->setCreditLimitKobo((int) round($creditLimitNgn * 100));
        }
        if ($corporateContactEmail !== null) {
            $g->setCorporateContactEmail($corporateContactEmail ?: null);
        }
        if ($corporateRefNumber !== null) {
            $g->setCorporateRefNumber($corporateRefNumber ?: null);
        }

        // Propagate allow_checkout_without_payment to all linked folios
        if ($allowCheckoutWithoutPayment !== null && $this->folioService !== null) {
            $folios = $this->folioService->getCorporateFolios($id);
            foreach ($folios as $folio) {
                $folio->setAllowCheckoutWithoutPayment($allowCheckoutWithoutPayment);
            }
        }

        $this->em->flush();
        return $g;
    }

    /**
     * Get aggregated folio summary for a corporate group booking.
     */
    public function getCorporateSummary(string $groupBookingId): array
    {
        if ($this->folioService === null) {
            return ['error' => 'FolioService not available'];
        }

        $gb = $this->em->find(GroupBooking::class, $groupBookingId);
        $summary = $this->folioService->getCorporateSummary($groupBookingId);
        $summary['group_booking'] = $gb?->toArray();
        return $summary;
    }

    /**
     * Send consolidated corporate invoice to the billing contact email.
     * Returns a status message string.
     */
    public function sendCorporateInvoice(string $groupBookingId, string $tenantId): string
    {
        $gb = $this->em->getRepository(GroupBooking::class)
            ->findOneBy(['id' => $groupBookingId, 'tenantId' => $tenantId]);

        if ($gb === null) {
            throw new \RuntimeException('Group booking not found');
        }

        $email = $gb->getCorporateContactEmail();
        if (empty($email)) {
            throw new \InvalidArgumentException(
                'No corporate contact email set on this group booking. ' .
                'Please update the corporate settings first.'
            );
        }

        if ($this->folioService === null) {
            throw new \RuntimeException('FolioService not available');
        }

        $summary  = $this->folioService->getCorporateSummary($groupBookingId);
        $folios   = $summary['folios'] ?? [];
        $groupName = $gb->getName();
        $contactName = $gb->getContactName();
        $refNumber = $gb->getCorporateRefNumber();
        $checkIn  = $gb->getCheckIn()->format('d M Y');
        $checkOut = $gb->getCheckOut()->format('d M Y');

        $outstanding = (float) ($summary['outstanding'] ?? 0);
        $totalCharges = (float) ($summary['total_charges'] ?? 0);
        $totalPaid = (float) ($summary['total_payments'] ?? 0);

        // Build folio breakdown rows
        $folioRows = '';
        foreach ($folios as $folio) {
            $folioNum   = $folio['folio_number'] ?? '—';
            $charges    = number_format((float)($folio['total_charges'] ?? 0), 2);
            $paid       = number_format((float)($folio['total_payments'] ?? 0), 2);
            $balance    = number_format((float)($folio['balance'] ?? 0), 2);
            $balanceColor = (float)($folio['balance'] ?? 0) > 0 ? '#dc2626' : '#16a34a';
            $folioRows .= "
            <tr>
                <td style='padding:8px 12px;border-bottom:1px solid #f0f0f0;font-size:13px;font-family:monospace;'>{$folioNum}</td>
                <td style='padding:8px 12px;border-bottom:1px solid #f0f0f0;font-size:13px;text-align:right;'>₦{$charges}</td>
                <td style='padding:8px 12px;border-bottom:1px solid #f0f0f0;font-size:13px;text-align:right;color:#16a34a;'>₦{$paid}</td>
                <td style='padding:8px 12px;border-bottom:1px solid #f0f0f0;font-size:13px;text-align:right;color:{$balanceColor};font-weight:600;'>₦{$balance}</td>
            </tr>";
        }

        $refLine = $refNumber ? "<p style='margin:4px 0;color:#6b7280;font-size:13px;'>Reference: <strong>{$refNumber}</strong></p>" : '';
        $outstandingColor = $outstanding > 0 ? '#dc2626' : '#16a34a';
        $outstandingLabel = $outstanding > 0 ? 'Amount Due' : 'Settled';

        $html = "
<!DOCTYPE html>
<html>
<head><meta charset='UTF-8'></head>
<body style='margin:0;padding:0;background:#f9fafb;font-family:Arial,sans-serif;'>
<div style='max-width:640px;margin:32px auto;background:#ffffff;border-radius:12px;overflow:hidden;border:1px solid #e5e7eb;'>

  <!-- Header -->
  <div style='background:#1e4a35;padding:28px 32px;'>
    <h1 style='margin:0;color:#ffffff;font-size:20px;font-weight:700;'>Corporate Invoice</h1>
    <p style='margin:6px 0 0;color:#a7f3d0;font-size:14px;'>Consolidated billing for group booking</p>
  </div>

  <!-- Group info -->
  <div style='padding:24px 32px;border-bottom:1px solid #f0f0f0;'>
    <h2 style='margin:0 0 8px;font-size:16px;color:#111827;'>{$groupName}</h2>
    {$refLine}
    <p style='margin:4px 0;color:#6b7280;font-size:13px;'>Attention: {$contactName}</p>
    <p style='margin:4px 0;color:#6b7280;font-size:13px;'>Period: {$checkIn} — {$checkOut}</p>
  </div>

  <!-- Folio breakdown -->
  <div style='padding:24px 32px;'>
    <p style='margin:0 0 12px;font-size:13px;font-weight:600;color:#374151;text-transform:uppercase;letter-spacing:0.05em;'>Room Charges Breakdown</p>
    <table style='width:100%;border-collapse:collapse;'>
      <thead>
        <tr style='background:#f9fafb;'>
          <th style='padding:8px 12px;text-align:left;font-size:12px;color:#6b7280;font-weight:600;border-bottom:2px solid #e5e7eb;'>Folio Ref</th>
          <th style='padding:8px 12px;text-align:right;font-size:12px;color:#6b7280;font-weight:600;border-bottom:2px solid #e5e7eb;'>Charges</th>
          <th style='padding:8px 12px;text-align:right;font-size:12px;color:#6b7280;font-weight:600;border-bottom:2px solid #e5e7eb;'>Paid</th>
          <th style='padding:8px 12px;text-align:right;font-size:12px;color:#6b7280;font-weight:600;border-bottom:2px solid #e5e7eb;'>Balance</th>
        </tr>
      </thead>
      <tbody>
        {$folioRows}
      </tbody>
    </table>
  </div>

  <!-- Totals -->
  <div style='padding:16px 32px 24px;background:#f9fafb;border-top:1px solid #e5e7eb;'>
    <table style='width:100%;'>
      <tr>
        <td style='font-size:13px;color:#6b7280;padding:4px 0;'>Total Charges</td>
        <td style='font-size:13px;color:#374151;text-align:right;padding:4px 0;'>₦" . number_format($totalCharges, 2) . "</td>
      </tr>
      <tr>
        <td style='font-size:13px;color:#6b7280;padding:4px 0;'>Total Paid</td>
        <td style='font-size:13px;color:#16a34a;text-align:right;padding:4px 0;'>₦" . number_format($totalPaid, 2) . "</td>
      </tr>
      <tr>
        <td style='font-size:15px;font-weight:700;color:#111827;padding:8px 0 4px;border-top:2px solid #e5e7eb;margin-top:8px;'>{$outstandingLabel}</td>
        <td style='font-size:15px;font-weight:700;color:{$outstandingColor};text-align:right;padding:8px 0 4px;border-top:2px solid #e5e7eb;'>₦" . number_format($outstanding, 2) . "</td>
      </tr>
    </table>
  </div>

  <!-- Footer -->
  <div style='padding:20px 32px;border-top:1px solid #e5e7eb;'>
    <p style='margin:0;font-size:12px;color:#9ca3af;text-align:center;'>
      This is an automated invoice from Lodgik PMS. Please contact the hotel for payment queries.
    </p>
  </div>
</div>
</body>
</html>";

        $subject = "Corporate Invoice — {$groupName}" . ($refNumber ? " ({$refNumber})" : '');

        if ($this->mailer !== null) {
            $sent = $this->mailer->send($email, $contactName ?: 'Billing Contact', $subject, $html);
            if (!$sent) {
                $this->logger?->error("Corporate invoice email failed for group booking {$groupBookingId}", ['email' => $email]);
                throw new \RuntimeException('Failed to send invoice email. Please check the ZeptoMail configuration.');
            }
        }

        $this->logger?->info(
            "Corporate invoice sent for group booking {$groupBookingId}",
            ['email' => $email, 'outstanding' => $outstanding, 'folios' => count($folios)]
        );

        return "Corporate invoice sent to {$email}";
    }
}


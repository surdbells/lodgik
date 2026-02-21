<?php
declare(strict_types=1);
namespace Lodgik\Module\Finance;
use Doctrine\ORM\EntityManagerInterface;
use Lodgik\Entity\{Expense, ExpenseCategory, NightAudit, PoliceReport, PerformanceReview, PricingRule, GroupBooking};

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
    public function generateNightAudit(string $pid, string $date, string $tid): NightAudit { $a = $this->em->getRepository(NightAudit::class)->findOneBy(['propertyId' => $pid, 'auditDate' => new \DateTimeImmutable($date)]); if (!$a) { $a = new NightAudit($pid, new \DateTimeImmutable($date), $tid); $this->em->persist($a); } $this->em->flush(); return $a; }
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

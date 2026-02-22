<?php

declare(strict_types=1);

namespace Lodgik\Module\Gym;

use Doctrine\ORM\EntityManagerInterface;
use Lodgik\Entity\GymMembershipPlan;
use Lodgik\Entity\GymMember;
use Lodgik\Entity\GymMembership;
use Lodgik\Entity\GymMembershipPayment;
use Lodgik\Entity\GymVisitLog;
use Lodgik\Entity\GymClass;
use Lodgik\Entity\GymClassBooking;
use Lodgik\Enum\GymMembershipStatus;
use Lodgik\Enum\PaymentMethod;
use Lodgik\Service\ZeptoMailService;
use Psr\Log\LoggerInterface;

final class GymService
{
    public function __construct(
        private readonly EntityManagerInterface $em,
        private readonly LoggerInterface $logger,
        private readonly ?ZeptoMailService $mail = null,
    ) {}

    // ─── Plans ──────────────────────────────────────────────────

    public function createPlan(string $propertyId, string $name, int $durationDays, string $price, string $tenantId, array $extra = []): GymMembershipPlan
    {
        $p = new GymMembershipPlan($propertyId, $name, $durationDays, $price, $tenantId);
        if (isset($extra['description'])) $p->setDescription($extra['description']);
        if (isset($extra['max_classes'])) $p->setMaxClasses($extra['max_classes']);
        if (isset($extra['includes_pool'])) $p->setIncludesPool($extra['includes_pool']);
        if (isset($extra['includes_classes'])) $p->setIncludesClasses($extra['includes_classes']);
        if (isset($extra['sort_order'])) $p->setSortOrder($extra['sort_order']);
        $this->em->persist($p);
        $this->em->flush();
        return $p;
    }

    public function updatePlan(string $id, array $data): GymMembershipPlan
    {
        $p = $this->em->find(GymMembershipPlan::class, $id) ?? throw new \RuntimeException('Plan not found');
        if (isset($data['name'])) $p->setName($data['name']);
        if (isset($data['description'])) $p->setDescription($data['description']);
        if (isset($data['duration_days'])) $p->setDurationDays($data['duration_days']);
        if (isset($data['price'])) $p->setPrice($data['price']);
        if (isset($data['max_classes'])) $p->setMaxClasses($data['max_classes']);
        if (isset($data['includes_pool'])) $p->setIncludesPool($data['includes_pool']);
        if (isset($data['includes_classes'])) $p->setIncludesClasses($data['includes_classes']);
        if (isset($data['is_active'])) $p->setIsActive($data['is_active']);
        if (isset($data['sort_order'])) $p->setSortOrder($data['sort_order']);
        $this->em->flush();
        return $p;
    }

    /** @return GymMembershipPlan[] */
    public function listPlans(string $propertyId, bool $activeOnly = true): array
    {
        $qb = $this->em->createQueryBuilder()->select('p')->from(GymMembershipPlan::class, 'p')
            ->where('p.propertyId = :pid')->setParameter('pid', $propertyId)
            ->orderBy('p.sortOrder', 'ASC')->addOrderBy('p.price', 'ASC');
        if ($activeOnly) $qb->andWhere('p.isActive = true');
        return $qb->getQuery()->getResult();
    }

    // ─── Members ────────────────────────────────────────────────

    public function registerMember(string $propertyId, string $firstName, string $lastName, string $phone, string $tenantId, array $extra = []): GymMember
    {
        $m = new GymMember($propertyId, $firstName, $lastName, $phone, $tenantId);
        if (isset($extra['email'])) $m->setEmail($extra['email']);
        if (isset($extra['gender'])) $m->setGender($extra['gender']);
        if (isset($extra['date_of_birth'])) $m->setDateOfBirth(new \DateTimeImmutable($extra['date_of_birth']));
        if (isset($extra['emergency_contact'])) $m->setEmergencyContact($extra['emergency_contact']);
        if (isset($extra['member_type'])) $m->setMemberType($extra['member_type']);
        if (isset($extra['guest_id'])) $m->setGuestId($extra['guest_id']);
        if (isset($extra['booking_id'])) $m->setBookingId($extra['booking_id']);
        if (isset($extra['notes'])) $m->setNotes($extra['notes']);
        $this->em->persist($m);
        $this->em->flush();
        return $m;
    }

    public function updateMember(string $id, array $data): GymMember
    {
        $m = $this->em->find(GymMember::class, $id) ?? throw new \RuntimeException('Member not found');
        foreach (['first_name' => 'setFirstName', 'last_name' => 'setLastName', 'email' => 'setEmail', 'phone' => 'setPhone', 'gender' => 'setGender', 'emergency_contact' => 'setEmergencyContact', 'photo_url' => 'setPhotoUrl', 'notes' => 'setNotes'] as $key => $setter) {
            if (isset($data[$key])) $m->$setter($data[$key]);
        }
        if (isset($data['date_of_birth'])) $m->setDateOfBirth(new \DateTimeImmutable($data['date_of_birth']));
        if (isset($data['is_active'])) $m->setIsActive($data['is_active']);
        $this->em->flush();
        return $m;
    }

    public function getMember(string $id): ?GymMember { return $this->em->find(GymMember::class, $id); }

    /** @return GymMember[] */
    public function listMembers(string $propertyId, ?string $search = null, bool $activeOnly = true): array
    {
        $qb = $this->em->createQueryBuilder()->select('m')->from(GymMember::class, 'm')
            ->where('m.propertyId = :pid')->setParameter('pid', $propertyId)
            ->orderBy('m.firstName', 'ASC');
        if ($activeOnly) $qb->andWhere('m.isActive = true');
        if ($search) $qb->andWhere('(m.firstName LIKE :s OR m.lastName LIKE :s OR m.phone LIKE :s OR m.email LIKE :s)')->setParameter('s', "%{$search}%");
        return $qb->getQuery()->getResult();
    }

    public function findMemberByQr(string $qrCode): ?GymMember
    {
        return $this->em->createQueryBuilder()->select('m')->from(GymMember::class, 'm')
            ->where('m.qrCode = :qr')->setParameter('qr', $qrCode)
            ->setMaxResults(1)->getQuery()->getOneOrNullResult();
    }

    // ─── Memberships (lifecycle) ────────────────────────────────

    public function createMembership(string $memberId, string $planId, string $tenantId, ?string $paymentMethod = null, ?string $recordedBy = null): array
    {
        $member = $this->em->find(GymMember::class, $memberId) ?? throw new \RuntimeException('Member not found');
        $plan = $this->em->find(GymMembershipPlan::class, $planId) ?? throw new \RuntimeException('Plan not found');

        $now = new \DateTimeImmutable();
        $expires = $now->modify("+{$plan->getDurationDays()} days");

        $ms = new GymMembership($plan->getPropertyId(), $memberId, $planId, $plan->getName(), $plan->getPrice(), $now, $expires, $tenantId);
        $this->em->persist($ms);

        // Record payment
        $method = PaymentMethod::tryFrom($paymentMethod ?? 'cash') ?? PaymentMethod::CASH;
        $payment = new GymMembershipPayment($plan->getPropertyId(), $ms->getId(), $memberId, $plan->getPrice(), $method, $tenantId);
        $payment->setRecordedBy($recordedBy);
        $payment->setPaymentType('new');
        $this->em->persist($payment);
        $this->em->flush();

        $this->logger->info("Gym membership created: member={$memberId}, plan={$plan->getName()}, expires={$expires->format('Y-m-d')}");
        return ['membership' => $ms, 'payment' => $payment];
    }

    public function renewMembership(string $membershipId, ?string $paymentMethod = null, ?string $recordedBy = null): array
    {
        $ms = $this->em->find(GymMembership::class, $membershipId) ?? throw new \RuntimeException('Membership not found');
        $plan = $this->em->find(GymMembershipPlan::class, $ms->getPlanId());
        $days = $plan ? $plan->getDurationDays() : 30;
        $price = $plan ? $plan->getPrice() : $ms->getPricePaid();

        // Extend from current expiry (or from now if already expired)
        $base = $ms->isExpired() ? new \DateTimeImmutable() : $ms->getExpiresAt();
        $ms->renew($base->modify("+{$days} days"));

        $method = PaymentMethod::tryFrom($paymentMethod ?? 'cash') ?? PaymentMethod::CASH;
        $payment = new GymMembershipPayment($ms->getPropertyId(), $membershipId, $ms->getMemberId(), $price, $method, $ms->getTenantId());
        $payment->setRecordedBy($recordedBy);
        $payment->setPaymentType('renewal');
        $this->em->persist($payment);
        $this->em->flush();

        return ['membership' => $ms, 'payment' => $payment];
    }

    public function suspendMembership(string $id): GymMembership
    {
        $ms = $this->em->find(GymMembership::class, $id) ?? throw new \RuntimeException('Not found');
        $ms->suspend();
        $this->em->flush();
        return $ms;
    }

    public function cancelMembership(string $id): GymMembership
    {
        $ms = $this->em->find(GymMembership::class, $id) ?? throw new \RuntimeException('Not found');
        $ms->cancel();
        $this->em->flush();
        return $ms;
    }

    public function reactivateMembership(string $id): GymMembership
    {
        $ms = $this->em->find(GymMembership::class, $id) ?? throw new \RuntimeException('Not found');
        $ms->reactivate();
        $this->em->flush();
        return $ms;
    }

    public function getActiveMembership(string $memberId): ?GymMembership
    {
        return $this->em->createQueryBuilder()->select('ms')->from(GymMembership::class, 'ms')
            ->where('ms.memberId = :mid')->andWhere('ms.status = :s')
            ->setParameter('mid', $memberId)->setParameter('s', GymMembershipStatus::ACTIVE->value)
            ->orderBy('ms.expiresAt', 'DESC')->setMaxResults(1)
            ->getQuery()->getOneOrNullResult();
    }

    /** @return GymMembership[] */
    public function listMemberships(string $propertyId, ?string $status = null): array
    {
        $qb = $this->em->createQueryBuilder()->select('ms')->from(GymMembership::class, 'ms')
            ->where('ms.propertyId = :pid')->setParameter('pid', $propertyId)
            ->orderBy('ms.expiresAt', 'DESC');
        if ($status) $qb->andWhere('ms.status = :s')->setParameter('s', $status);
        return $qb->getQuery()->getResult();
    }

    /** @return GymMembership[] Memberships expiring within N days */
    public function getExpiringMemberships(string $propertyId, int $withinDays = 7): array
    {
        $now = new \DateTimeImmutable();
        $limit = $now->modify("+{$withinDays} days");
        return $this->em->createQueryBuilder()->select('ms')->from(GymMembership::class, 'ms')
            ->where('ms.propertyId = :pid')->andWhere('ms.status = :s')
            ->andWhere('ms.expiresAt BETWEEN :now AND :limit')
            ->andWhere('ms.expiryAlertSent = false')
            ->setParameter('pid', $propertyId)->setParameter('s', GymMembershipStatus::ACTIVE->value)
            ->setParameter('now', $now)->setParameter('limit', $limit)
            ->getQuery()->getResult();
    }

    /** Send expiry alerts via ZeptoMail */
    public function sendExpiryAlerts(string $propertyId): int
    {
        $expiring = $this->getExpiringMemberships($propertyId);
        $count = 0;
        foreach ($expiring as $ms) {
            $member = $this->em->find(GymMember::class, $ms->getMemberId());
            if (!$member || !$member->getEmail()) continue;

            $days = $ms->daysRemaining();
            $subject = "Your Gym Membership Expires in {$days} Days";
            $body = "<p>Hi {$member->getFullName()},</p><p>Your <strong>{$ms->getPlanName()}</strong> membership expires on <strong>{$ms->getExpiresAt()->format('F j, Y')}</strong>.</p><p>Visit the gym reception to renew and continue enjoying our facilities.</p>";

            if ($this->mail) {
                $this->mail->send($member->getEmail(), $member->getFullName(), $subject, $body);
            }
            $ms->setExpiryAlertSent(true);
            $count++;
        }
        $this->em->flush();
        $this->logger->info("Gym expiry alerts sent: {$count} for property={$propertyId}");
        return $count;
    }

    // ─── Check-in (QR / Name Search / Guest) ────────────────────

    public function checkIn(string $memberId, string $checkInMethod, string $tenantId, ?string $staffId = null): GymVisitLog
    {
        $member = $this->em->find(GymMember::class, $memberId) ?? throw new \RuntimeException('Member not found');

        // Verify active membership (unless guest access)
        if ($member->getMemberType() !== 'guest') {
            $ms = $this->getActiveMembership($memberId);
            if (!$ms || $ms->isExpired()) throw new \RuntimeException('No active membership');
        }

        $visit = new GymVisitLog($member->getPropertyId(), $memberId, $checkInMethod, $tenantId);
        $visit->setCheckedInBy($staffId);
        $ms2 = $this->getActiveMembership($memberId);
        if ($ms2) $visit->setMembershipId($ms2->getId());
        $this->em->persist($visit);
        $this->em->flush();
        return $visit;
    }

    public function checkInByQr(string $qrCode, string $tenantId, ?string $staffId = null): GymVisitLog
    {
        $member = $this->findMemberByQr($qrCode) ?? throw new \RuntimeException('Invalid QR code');
        return $this->checkIn($member->getId(), 'qr_scan', $tenantId, $staffId);
    }

    public function checkOut(string $visitId): GymVisitLog
    {
        $v = $this->em->find(GymVisitLog::class, $visitId) ?? throw new \RuntimeException('Visit not found');
        $v->checkOut();
        $this->em->flush();
        return $v;
    }

    /** @return GymVisitLog[] */
    public function getTodayVisits(string $propertyId): array
    {
        $today = new \DateTimeImmutable('today');
        $tomorrow = $today->modify('+1 day');
        return $this->em->createQueryBuilder()->select('v')->from(GymVisitLog::class, 'v')
            ->where('v.propertyId = :pid')->andWhere('v.checkedInAt BETWEEN :s AND :e')
            ->setParameter('pid', $propertyId)->setParameter('s', $today)->setParameter('e', $tomorrow)
            ->orderBy('v.checkedInAt', 'DESC')
            ->getQuery()->getResult();
    }

    /** Visits per day for the last N days */
    public function getVisitsPerDay(string $propertyId, int $days = 30): array
    {
        $since = (new \DateTimeImmutable())->modify("-{$days} days");
        $rows = $this->em->getConnection()->fetchAllAssociative(
            "SELECT DATE(checked_in_at) as date, COUNT(*) as count FROM gym_visit_logs WHERE property_id = ? AND checked_in_at >= ? GROUP BY DATE(checked_in_at) ORDER BY date",
            [$propertyId, $since->format('Y-m-d')]
        );
        return $rows;
    }

    // ─── Payments ───────────────────────────────────────────────

    /** @return GymMembershipPayment[] */
    public function listPayments(string $propertyId, ?string $memberId = null, int $limit = 50): array
    {
        $qb = $this->em->createQueryBuilder()->select('p')->from(GymMembershipPayment::class, 'p')
            ->where('p.propertyId = :pid')->setParameter('pid', $propertyId)
            ->orderBy('p.paymentDate', 'DESC')->setMaxResults($limit);
        if ($memberId) $qb->andWhere('p.memberId = :mid')->setParameter('mid', $memberId);
        return $qb->getQuery()->getResult();
    }

    /** Monthly revenue for the last N months */
    public function getMonthlyRevenue(string $propertyId, int $months = 12): array
    {
        $since = (new \DateTimeImmutable())->modify("-{$months} months");
        $rows = $this->em->getConnection()->fetchAllAssociative(
            "SELECT DATE_FORMAT(payment_date, '%Y-%m') as month, SUM(amount) as total FROM gym_membership_payments WHERE property_id = ? AND payment_date >= ? AND status = 'confirmed' GROUP BY month ORDER BY month",
            [$propertyId, $since->format('Y-m-d')]
        );
        return $rows;
    }

    // ─── Classes ────────────────────────────────────────────────

    public function createClass(string $propertyId, string $name, string $scheduledAt, string $tenantId, array $extra = []): GymClass
    {
        $c = new GymClass($propertyId, $name, new \DateTimeImmutable($scheduledAt), $tenantId);
        if (isset($extra['description'])) $c->setDescription($extra['description']);
        if (isset($extra['instructor_name'])) $c->setInstructorName($extra['instructor_name']);
        if (isset($extra['duration_minutes'])) $c->setDurationMinutes($extra['duration_minutes']);
        if (isset($extra['max_capacity'])) $c->setMaxCapacity($extra['max_capacity']);
        if (isset($extra['category'])) $c->setCategory($extra['category']);
        if (isset($extra['location'])) $c->setLocation($extra['location']);
        if (isset($extra['recurrence'])) $c->setRecurrence($extra['recurrence']);
        $this->em->persist($c);
        $this->em->flush();
        return $c;
    }

    /** @return GymClass[] */
    public function listClasses(string $propertyId, ?string $from = null, ?string $to = null): array
    {
        $qb = $this->em->createQueryBuilder()->select('c')->from(GymClass::class, 'c')
            ->where('c.propertyId = :pid')->andWhere('c.isCancelled = false')
            ->setParameter('pid', $propertyId)->orderBy('c.scheduledAt', 'ASC');
        if ($from) $qb->andWhere('c.scheduledAt >= :from')->setParameter('from', new \DateTimeImmutable($from));
        if ($to) $qb->andWhere('c.scheduledAt <= :to')->setParameter('to', new \DateTimeImmutable($to));
        return $qb->getQuery()->getResult();
    }

    public function bookClass(string $classId, string $memberId, string $tenantId): GymClassBooking
    {
        $cls = $this->em->find(GymClass::class, $classId) ?? throw new \RuntimeException('Class not found');
        if ($cls->isCancelled()) throw new \RuntimeException('Class is cancelled');
        if ($cls->isFull()) throw new \RuntimeException('Class is full');

        // Check duplicate
        $existing = $this->em->createQueryBuilder()->select('b')->from(GymClassBooking::class, 'b')
            ->where('b.classId = :cid')->andWhere('b.memberId = :mid')->andWhere('b.status != :cancelled')
            ->setParameter('cid', $classId)->setParameter('mid', $memberId)->setParameter('cancelled', 'cancelled')
            ->setMaxResults(1)->getQuery()->getOneOrNullResult();
        if ($existing) throw new \RuntimeException('Already booked');

        $booking = new GymClassBooking($cls->getPropertyId(), $classId, $memberId, $tenantId);
        $cls->incrementBookings();
        $this->em->persist($booking);
        $this->em->flush();
        return $booking;
    }

    public function cancelClassBooking(string $bookingId): GymClassBooking
    {
        $b = $this->em->find(GymClassBooking::class, $bookingId) ?? throw new \RuntimeException('Booking not found');
        $cls = $this->em->find(GymClass::class, $b->getClassId());
        $b->cancel();
        if ($cls) $cls->decrementBookings();
        $this->em->flush();
        return $b;
    }

    /** @return GymClassBooking[] */
    public function getClassBookings(string $classId): array
    {
        return $this->em->createQueryBuilder()->select('b')->from(GymClassBooking::class, 'b')
            ->where('b.classId = :cid')->andWhere('b.status != :cancelled')
            ->setParameter('cid', $classId)->setParameter('cancelled', 'cancelled')
            ->getQuery()->getResult();
    }

    // ─── Dashboard ──────────────────────────────────────────────

    public function getDashboard(string $propertyId): array
    {
        $activeMembers = (int) $this->em->createQueryBuilder()->select('COUNT(m.id)')->from(GymMember::class, 'm')
            ->where('m.propertyId = :pid')->andWhere('m.isActive = true')
            ->setParameter('pid', $propertyId)->getQuery()->getSingleScalarResult();

        $activeMemberships = (int) $this->em->createQueryBuilder()->select('COUNT(ms.id)')->from(GymMembership::class, 'ms')
            ->where('ms.propertyId = :pid')->andWhere('ms.status = :s')
            ->setParameter('pid', $propertyId)->setParameter('s', GymMembershipStatus::ACTIVE->value)
            ->getQuery()->getSingleScalarResult();

        $todayVisits = count($this->getTodayVisits($propertyId));
        $expiring = count($this->getExpiringMemberships($propertyId));

        // Revenue this month
        $monthStart = (new \DateTimeImmutable('first day of this month'))->setTime(0, 0);
        $monthRevenue = $this->em->getConnection()->fetchOne(
            "SELECT COALESCE(SUM(amount), 0) FROM gym_membership_payments WHERE property_id = ? AND payment_date >= ? AND status = 'confirmed'",
            [$propertyId, $monthStart->format('Y-m-d')]
        );

        return [
            'active_members' => $activeMembers,
            'active_memberships' => $activeMemberships,
            'visits_today' => $todayVisits,
            'expiring_soon' => $expiring,
            'month_revenue' => $monthRevenue,
        ];
    }

    public function updateClass(string $id, array $data): GymClass
    {
        $cls = $this->em->find(GymClass::class, $id);
        if (!$cls) throw new \RuntimeException('Class not found');
        if (isset($data['name'])) $cls->setName($data['name']);
        if (isset($data['description'])) $cls->setDescription($data['description']);
        if (isset($data['instructor_name'])) $cls->setInstructorName($data['instructor_name']);
        if (isset($data['max_capacity'])) $cls->setMaxCapacity((int) $data['max_capacity']);
        if (isset($data['scheduled_at'])) $cls->setScheduledAt(new \DateTimeImmutable($data['scheduled_at']));
        if (isset($data['duration_minutes'])) $cls->setDurationMinutes((int) $data['duration_minutes']);
        $this->em->flush();
        return $cls;
    }

    public function recordPayment(array $data): GymMembershipPayment
    {
        $membership = $this->em->find(GymMembership::class, $data['membership_id'] ?? '');
        if (!$membership) throw new \RuntimeException('Membership not found');

        $payment = new GymMembershipPayment();
        $payment->setMembershipId($membership->getId());
        $payment->setMemberId($membership->getMemberId());
        $payment->setAmount((string) ($data['amount'] ?? '0'));
        $payment->setPaymentMethod($data['payment_method'] ?? 'cash');
        $payment->setTenantId($data['tenant_id']);
        $payment->setPropertyId($data['property_id']);
        if (isset($data['recorded_by'])) $payment->setRecordedBy($data['recorded_by']);
        $this->em->persist($payment);
        $this->em->flush();
        return $payment;
    }
}

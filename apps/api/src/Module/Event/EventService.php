<?php
declare(strict_types=1);
namespace Lodgik\Module\Event;

use Doctrine\ORM\EntityManagerInterface;
use Lodgik\Entity\EventSpace;
use Lodgik\Entity\EventBooking;

final class EventService
{
    public function __construct(private readonly EntityManagerInterface $em) {}

    // ── Event Spaces ──────────────────────────────────────────────────────

    public function listSpaces(string $tenantId, string $propertyId, ?bool $active = null): array
    {
        $qb = $this->em->createQueryBuilder()
            ->select('s')->from(EventSpace::class, 's')
            ->where('s.tenantId = :tid AND s.propertyId = :pid')
            ->setParameters(['tid' => $tenantId, 'pid' => $propertyId])
            ->orderBy('s.name', 'ASC');
        if ($active !== null) {
            $qb->andWhere('s.isActive = :active')->setParameter('active', $active);
        }
        return array_map(fn(EventSpace $s) => $s->toArray(), $qb->getQuery()->getResult());
    }

    public function findSpace(string $id): EventSpace
    {
        $s = $this->em->find(EventSpace::class, $id);
        if (!$s) throw new \RuntimeException('Event space not found', 404);
        return $s;
    }

    public function createSpace(string $tenantId, string $propertyId, array $d): EventSpace
    {
        if (empty($d['name'])) throw new \InvalidArgumentException('name is required');
        $s = new EventSpace($tenantId, $propertyId, $d['name']);
        $this->applySpaceFields($s, $d);
        $this->em->persist($s);
        $this->em->flush();
        return $s;
    }

    public function updateSpace(string $id, array $d): EventSpace
    {
        $s = $this->findSpace($id);
        if (isset($d['name'])) $s->setName($d['name']);
        $this->applySpaceFields($s, $d);
        $this->em->flush();
        return $s;
    }

    public function deleteSpace(string $id): void
    {
        $s = $this->findSpace($id);
        // Block deletion if there are upcoming events in this space
        $count = $this->em->createQueryBuilder()
            ->select('COUNT(e.id)')->from(EventBooking::class, 'e')
            ->where('e.eventSpaceId = :sid AND e.status NOT IN (:done)')
            ->setParameters(['sid' => $id, 'done' => ['completed', 'cancelled']])
            ->getQuery()->getSingleScalarResult();
        if ($count > 0) {
            throw new \RuntimeException('Cannot delete a space with active or upcoming events', 409);
        }
        $this->em->remove($s);
        $this->em->flush();
    }

    // ── Event Bookings ────────────────────────────────────────────────────

    public function list(string $tenantId, string $propertyId, array $filters = []): array
    {
        $qb = $this->em->createQueryBuilder()
            ->select('e')->from(EventBooking::class, 'e')
            ->where('e.tenantId = :tid AND e.propertyId = :pid')
            ->setParameters(['tid' => $tenantId, 'pid' => $propertyId])
            ->orderBy('e.eventDate', 'DESC');

        if (!empty($filters['status'])) {
            $qb->andWhere('e.status = :status')->setParameter('status', $filters['status']);
        }
        if (!empty($filters['event_type'])) {
            $qb->andWhere('e.eventType = :etype')->setParameter('etype', $filters['event_type']);
        }
        if (!empty($filters['from'])) {
            $qb->andWhere('e.eventDate >= :from')
               ->setParameter('from', new \DateTimeImmutable($filters['from']));
        }
        if (!empty($filters['to'])) {
            $qb->andWhere('e.eventDate <= :to')
               ->setParameter('to', new \DateTimeImmutable($filters['to']));
        }

        $events = $qb->getQuery()->getResult();
        $spaceIds = array_filter(array_unique(array_map(fn($e) => $e->getEventSpaceId(), $events)));
        $spaces = [];
        if ($spaceIds) {
            $spaceList = $this->em->getRepository(EventSpace::class)->findBy(['id' => $spaceIds]);
            foreach ($spaceList as $sp) $spaces[$sp->getId()] = $sp->getName();
        }

        return array_map(function (EventBooking $e) use ($spaces) {
            $arr = $e->toArray();
            $arr['space_name'] = $e->getEventSpaceId() ? ($spaces[$e->getEventSpaceId()] ?? null) : null;
            return $arr;
        }, $events);
    }

    public function find(string $id): EventBooking
    {
        $e = $this->em->find(EventBooking::class, $id);
        if (!$e) throw new \RuntimeException('Event booking not found', 404);
        return $e;
    }

    public function create(string $tenantId, string $propertyId, array $d, ?string $createdBy = null): EventBooking
    {
        foreach (['event_name', 'event_type', 'event_date', 'client_name'] as $f) {
            if (empty($d[$f])) throw new \InvalidArgumentException("{$f} is required");
        }

        $reference = 'EVT-' . strtoupper(substr(uniqid(), -6));
        $event = new EventBooking(
            $tenantId,
            $propertyId,
            $reference,
            $d['event_name'],
            $d['event_type'],
            new \DateTimeImmutable($d['event_date']),
            $d['client_name'],
        );

        $this->applyEventFields($event, $d);
        if ($createdBy) $event->setCreatedBy($createdBy);
        $this->em->persist($event);
        $this->em->flush();
        return $event;
    }

    public function update(string $id, array $d): EventBooking
    {
        $e = $this->find($id);
        if (isset($d['event_name']))  $e->setEventName($d['event_name']);
        if (isset($d['event_type']))  $e->setEventType($d['event_type']);
        if (isset($d['event_date']))  $e->setEventDate(new \DateTimeImmutable($d['event_date']));
        if (isset($d['client_name'])) $e->setClientName($d['client_name']);
        $this->applyEventFields($e, $d);
        $this->em->flush();
        return $e;
    }

    public function confirm(string $id): EventBooking
    {
        $e = $this->find($id);
        if ($e->getStatus() === 'cancelled') throw new \RuntimeException('Cannot confirm a cancelled event', 409);
        $e->confirm();
        $this->em->flush();
        return $e;
    }

    public function cancel(string $id): EventBooking
    {
        $e = $this->find($id);
        if (in_array($e->getStatus(), ['completed'])) {
            throw new \RuntimeException('Cannot cancel a completed event', 409);
        }
        $e->cancel();
        $this->em->flush();
        return $e;
    }

    public function complete(string $id): EventBooking
    {
        $e = $this->find($id);
        $e->complete();
        $this->em->flush();
        return $e;
    }

    public function recordDeposit(string $id, int $amountKobo): EventBooking
    {
        $e = $this->find($id);
        $e->setDepositPaidKobo($e->getDepositPaidKobo() + $amountKobo);
        $this->em->flush();
        return $e;
    }

    public function getCalendar(string $tenantId, string $propertyId, string $from, string $to): array
    {
        return $this->em->createQueryBuilder()
            ->select('e')->from(EventBooking::class, 'e')
            ->where('e.tenantId = :tid AND e.propertyId = :pid')
            ->andWhere('e.eventDate BETWEEN :from AND :to')
            ->andWhere('e.status NOT IN (:excluded)')
            ->setParameters([
                'tid'      => $tenantId,
                'pid'      => $propertyId,
                'from'     => new \DateTimeImmutable($from),
                'to'       => new \DateTimeImmutable($to),
                'excluded' => ['cancelled'],
            ])
            ->orderBy('e.eventDate', 'ASC')
            ->getQuery()
            ->getResult();
    }

    public function getDashboard(string $tenantId, string $propertyId): array
    {
        $conn = $this->em->getConnection();
        $today = date('Y-m-d');
        $thisMonthStart = date('Y-m-01');
        $thisMonthEnd   = date('Y-m-t');

        $stats = $conn->fetchAssociative(
            "SELECT
                COUNT(*) FILTER (WHERE status NOT IN ('cancelled'))                        AS total_active,
                COUNT(*) FILTER (WHERE event_date = :today AND status NOT IN ('cancelled')) AS today_count,
                COUNT(*) FILTER (WHERE event_date BETWEEN :ms AND :me AND status NOT IN ('cancelled')) AS this_month,
                COUNT(*) FILTER (WHERE event_date >= :today AND status IN ('tentative','confirmed'))    AS upcoming,
                COALESCE(SUM(venue_rate_kobo + catering_total_kobo + extras_total_kobo)
                    FILTER (WHERE event_date BETWEEN :ms AND :me AND status NOT IN ('cancelled')), 0) AS month_revenue_kobo
             FROM event_bookings
             WHERE tenant_id = :tid AND property_id = :pid",
            ['tid' => $tenantId, 'pid' => $propertyId, 'today' => $today, 'ms' => $thisMonthStart, 'me' => $thisMonthEnd]
        );

        $upcomingEvents = $conn->fetchAllAssociative(
            "SELECT eb.reference, eb.event_name, eb.event_type, eb.event_date,
                    eb.expected_guests, eb.status, eb.client_name,
                    es.name AS space_name
             FROM event_bookings eb
             LEFT JOIN event_spaces es ON es.id = eb.event_space_id
             WHERE eb.tenant_id = :tid AND eb.property_id = :pid
               AND eb.event_date >= :today AND eb.status IN ('tentative','confirmed')
             ORDER BY eb.event_date ASC LIMIT 5",
            ['tid' => $tenantId, 'pid' => $propertyId, 'today' => $today]
        );

        return [
            'total_active'        => (int) ($stats['total_active'] ?? 0),
            'today_events'        => (int) ($stats['today_count'] ?? 0),
            'this_month_events'   => (int) ($stats['this_month'] ?? 0),
            'upcoming_events'     => (int) ($stats['upcoming'] ?? 0),
            'month_revenue_ngn'   => round((float) ($stats['month_revenue_kobo'] ?? 0) / 100, 2),
            'next_events'         => $upcomingEvents,
        ];
    }

    // ── Private helpers ───────────────────────────────────────────────────

    private function applySpaceFields(EventSpace $s, array $d): void
    {
        if (array_key_exists('description', $d))     $s->setDescription($d['description'] ?: null);
        if (array_key_exists('capacity', $d))        $s->setCapacity((int) $d['capacity']);
        if (array_key_exists('layouts', $d))         $s->setLayouts($d['layouts'] ?: null);
        if (array_key_exists('amenities', $d))       $s->setAmenities($d['amenities'] ?: null);
        if (array_key_exists('half_day_rate_ngn', $d) && $d['half_day_rate_ngn'] !== null) {
            $s->setHalfDayRateKobo((int) round((float) $d['half_day_rate_ngn'] * 100));
        }
        if (array_key_exists('full_day_rate_ngn', $d) && $d['full_day_rate_ngn'] !== null) {
            $s->setFullDayRateKobo((int) round((float) $d['full_day_rate_ngn'] * 100));
        }
        if (array_key_exists('hourly_rate_ngn', $d) && $d['hourly_rate_ngn'] !== null) {
            $s->setHourlyRateKobo((int) round((float) $d['hourly_rate_ngn'] * 100));
        }
        if (array_key_exists('is_active', $d))  $s->setIsActive((bool) $d['is_active']);
        if (array_key_exists('notes', $d))       $s->setNotes($d['notes'] ?: null);
    }

    private function applyEventFields(EventBooking $e, array $d): void
    {
        if (array_key_exists('event_space_id', $d))      $e->setEventSpaceId($d['event_space_id'] ?: null);
        if (array_key_exists('group_booking_id', $d))    $e->setGroupBookingId($d['group_booking_id'] ?: null);
        if (array_key_exists('start_time', $d))          $e->setStartTime($d['start_time'] ?: null);
        if (array_key_exists('end_time', $d))            $e->setEndTime($d['end_time'] ?: null);
        if (array_key_exists('duration_type', $d))       $e->setDurationType($d['duration_type']);
        if (array_key_exists('expected_guests', $d))     $e->setExpectedGuests((int) $d['expected_guests']);
        if (array_key_exists('layout', $d))              $e->setLayout($d['layout'] ?: null);
        if (array_key_exists('client_email', $d))        $e->setClientEmail($d['client_email'] ?: null);
        if (array_key_exists('client_phone', $d))        $e->setClientPhone($d['client_phone'] ?: null);
        if (array_key_exists('company_name', $d))        $e->setCompanyName($d['company_name'] ?: null);
        if (array_key_exists('venue_rate_ngn', $d))      $e->setVenueRateKobo((int) round((float) $d['venue_rate_ngn'] * 100));
        if (array_key_exists('catering_total_ngn', $d))  $e->setCateringTotalKobo((int) round((float) $d['catering_total_ngn'] * 100));
        if (array_key_exists('extras_total_ngn', $d))    $e->setExtrasTotalKobo((int) round((float) $d['extras_total_ngn'] * 100));
        if (array_key_exists('deposit_paid_ngn', $d))    $e->setDepositPaidKobo((int) round((float) $d['deposit_paid_ngn'] * 100));
        if (array_key_exists('catering_items', $d))      $e->setCateringItems($d['catering_items'] ?: null);
        if (array_key_exists('extra_items', $d))         $e->setExtraItems($d['extra_items'] ?: null);
        if (array_key_exists('special_requirements', $d)) $e->setSpecialRequirements($d['special_requirements'] ?: null);
        if (array_key_exists('notes', $d))               $e->setNotes($d['notes'] ?: null);
    }
}

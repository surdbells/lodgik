<?php
declare(strict_types=1);
namespace Lodgik\Module\Ota;
use Doctrine\ORM\EntityManagerInterface;
use Lodgik\Entity\{OtaChannel, OtaReservation};

final class OtaService
{
    public function __construct(private readonly EntityManagerInterface $em) {}

    // Channels
    public function listChannels(string $propertyId): array { return array_map(fn($c) => $c->toArray(), $this->em->getRepository(OtaChannel::class)->findBy(['propertyId' => $propertyId], ['displayName' => 'ASC'])); }

    public function createChannel(string $pid, string $channelName, string $displayName, string $tid, array $x = []): OtaChannel
    { $c = new OtaChannel($pid, $channelName, $displayName, $tid);
      if (!empty($x['credentials'])) $c->setCredentials($x['credentials']);
      if (!empty($x['room_type_mapping'])) $c->setRoomTypeMapping($x['room_type_mapping']);
      if (!empty($x['rate_plan_mapping'])) $c->setRatePlanMapping($x['rate_plan_mapping']);
      if (isset($x['commission_percentage'])) $c->setCommissionPercentage($x['commission_percentage']);
      $this->em->persist($c); $this->em->flush(); return $c; }

    public function updateChannel(string $id, array $d): OtaChannel
    { $c = $this->em->find(OtaChannel::class, $id);
      if (isset($d['room_type_mapping'])) $c->setRoomTypeMapping($d['room_type_mapping']);
      if (isset($d['rate_plan_mapping'])) $c->setRatePlanMapping($d['rate_plan_mapping']);
      if (isset($d['commission_percentage'])) $c->setCommissionPercentage($d['commission_percentage']);
      if (isset($d['display_name'])) $c->setDisplayName($d['display_name']);
      $this->em->flush(); return $c; }

    public function activateChannel(string $id): OtaChannel { $c = $this->em->find(OtaChannel::class, $id); $c->activate(); $this->em->flush(); return $c; }
    public function pauseChannel(string $id): OtaChannel { $c = $this->em->find(OtaChannel::class, $id); $c->pause(); $this->em->flush(); return $c; }
    public function disconnectChannel(string $id): OtaChannel { $c = $this->em->find(OtaChannel::class, $id); $c->disconnect(); $this->em->flush(); return $c; }
    public function syncChannel(string $id): OtaChannel { $c = $this->em->find(OtaChannel::class, $id); $c->markSynced(); $this->em->flush(); return $c; }

    // Reservations
    public function listReservations(string $tenantId, ?string $channelId = null, ?string $status = null, int $page = 1, int $limit = 20): array
    { $qb = $this->em->createQueryBuilder()->select('r')->from(OtaReservation::class, 'r')->where('r.tenantId = :t')->setParameter('t', $tenantId)->orderBy('r.createdAt', 'DESC');
      if ($channelId) $qb->andWhere('r.channelId = :c')->setParameter('c', $channelId);
      if ($status) $qb->andWhere('r.syncStatus = :s')->setParameter('s', $status);
      $qb->setFirstResult(($page - 1) * $limit)->setMaxResults($limit);
      return array_map(fn($r) => $r->toArray(), $qb->getQuery()->getResult()); }

    public function ingestReservation(string $channelId, string $channelName, string $externalId, string $guestName, string $checkIn, string $checkOut, string $amount, string $tenantId, ?array $rawData = null, ?string $commission = null): OtaReservation
    { $r = new OtaReservation($channelId, $channelName, $externalId, $guestName, new \DateTimeImmutable($checkIn), new \DateTimeImmutable($checkOut), $amount, $tenantId);
      if ($rawData) $r->setRawData($rawData); if ($commission) $r->setCommission($commission);
      $this->em->persist($r); $this->em->flush(); return $r; }

    public function confirmReservation(string $id, ?string $bookingId = null): OtaReservation
    { $r = $this->em->find(OtaReservation::class, $id); $r->confirm(); if ($bookingId) $r->setBookingId($bookingId); $this->em->flush(); return $r; }

    public function cancelReservation(string $id): OtaReservation { $r = $this->em->find(OtaReservation::class, $id); $r->cancel(); $this->em->flush(); return $r; }

    public function getRevenueByChannel(string $tenantId, string $from, string $to): array
    { return $this->em->createQueryBuilder()->select('r.channelName, COUNT(r.id) as bookings, SUM(r.amount) as revenue, SUM(r.commission) as commission')
        ->from(OtaReservation::class, 'r')->where('r.tenantId = :t')->andWhere('r.checkIn >= :f')->andWhere('r.checkIn <= :to')
        ->setParameter('t', $tenantId)->setParameter('f', $from)->setParameter('to', $to)
        ->groupBy('r.channelName')->getQuery()->getResult(); }

    // ── iCal Feed ─────────────────────────────────────────────────────────────

    /**
     * Look up a channel by its iCal token (used by the public feed endpoint).
     */
    public function getChannelByIcalToken(string $token): ?OtaChannel
    {
        return $this->em->getRepository(OtaChannel::class)->findOneBy(['icalToken' => $token]);
    }

    /**
     * Generate an RFC 5545 iCal feed for all confirmed bookings on a property.
     * Called by the public GET /api/ota/feed/{token}.ics endpoint.
     */
    public function generateIcalFeed(string $propertyId, string $tenantId, string $hotelName = 'Hotel'): string
    {
        $bookings = $this->em->createQueryBuilder()
            ->select('b')
            ->from(\Lodgik\Entity\Booking::class, 'b')
            ->where('b.propertyId = :pid')
            ->andWhere('b.tenantId = :tid')
            ->andWhere('b.status IN (:statuses)')
            ->setParameter('pid', $propertyId)
            ->setParameter('tid', $tenantId)
            ->setParameter('statuses', ['confirmed', 'checked_in'])
            ->orderBy('b.checkIn', 'ASC')
            ->getQuery()->getResult();

        $now    = gmdate('Ymd\THis\Z');
        $prodId = '-//Lodgik PMS//EN';
        $cal    = "BEGIN:VCALENDAR\r\n";
        $cal   .= "VERSION:2.0\r\n";
        $cal   .= "PRODID:{$prodId}\r\n";
        $cal   .= "CALSCALE:GREGORIAN\r\n";
        $cal   .= "METHOD:PUBLISH\r\n";
        $cal   .= "X-WR-CALNAME:" . $this->icalEscape($hotelName) . " Bookings\r\n";
        $cal   .= "X-WR-TIMEZONE:Africa/Lagos\r\n";

        foreach ($bookings as $booking) {
            /** @var \Lodgik\Entity\Booking $booking */
            $uid        = $booking->getId() . '@lodgik.co';
            $dtStart    = $booking->getCheckIn()->format('Ymd');
            $dtEnd      = $booking->getCheckOut()->format('Ymd');
            $summary    = 'Booking #' . $booking->getBookingRef();
            $created    = $booking->getCreatedAt()->format('Ymd\THis\Z');

            $cal .= "BEGIN:VEVENT\r\n";
            $cal .= "UID:{$uid}\r\n";
            $cal .= "DTSTAMP:{$now}\r\n";
            $cal .= "CREATED:{$created}\r\n";
            $cal .= "DTSTART;VALUE=DATE:{$dtStart}\r\n";
            $cal .= "DTEND;VALUE=DATE:{$dtEnd}\r\n";
            $cal .= "SUMMARY:" . $this->icalEscape($summary) . "\r\n";
            $cal .= "STATUS:CONFIRMED\r\n";
            $cal .= "TRANSP:OPAQUE\r\n";
            $cal .= "END:VEVENT\r\n";
        }

        $cal .= "END:VCALENDAR\r\n";
        return $cal;
    }

    /**
     * Rotate the iCal token for a channel (invalidates the old feed URL).
     */
    public function rotateIcalToken(string $channelId): OtaChannel
    {
        $c = $this->em->find(OtaChannel::class, $channelId);
        if (!$c) throw new \RuntimeException('Channel not found');
        $c->rotateIcalToken();
        $this->em->flush();
        return $c;
    }

    // ── Webhook Receiver ──────────────────────────────────────────────────────

    /**
     * Receive and parse an inbound reservation webhook from an OTA platform.
     * Supports a generic JSON payload format. Platform-specific adapters can
     * be added here as the integration matures.
     *
     * Expected payload fields (all optional except external_id):
     *   external_id, guest_name, check_in (Y-m-d), check_out (Y-m-d),
     *   amount (string, NGN), commission (string), action (new|cancel|modify)
     */
    public function handleWebhook(string $channelId, array $payload, ?string $hmacSignature = null): array
    {
        $channel = $this->em->find(OtaChannel::class, $channelId);
        if (!$channel) {
            throw new \RuntimeException('OTA channel not found');
        }

        // Verify HMAC if the channel has a webhook secret configured
        if ($channel->getWebhookSecret() !== null && $hmacSignature !== null) {
            $expected = hash_hmac('sha256', json_encode($payload), $channel->getWebhookSecret());
            if (!hash_equals($expected, $hmacSignature)) {
                throw new \RuntimeException('Webhook HMAC verification failed');
            }
        }

        $action     = $payload['action'] ?? 'new';
        $externalId = $payload['external_id'] ?? ($payload['reservation_id'] ?? '');

        if (empty($externalId)) {
            throw new \InvalidArgumentException('Webhook payload missing external_id');
        }

        if ($action === 'cancel') {
            // Find the existing reservation and cancel it
            $existing = $this->em->getRepository(OtaReservation::class)->findOneBy([
                'channelId'  => $channelId,
                'externalId' => $externalId,
            ]);
            if ($existing) {
                $existing->cancel();
                $this->em->flush();
                return ['action' => 'cancelled', 'external_id' => $externalId];
            }
            return ['action' => 'not_found', 'external_id' => $externalId];
        }

        // new or modify — upsert
        $existing = $this->em->getRepository(OtaReservation::class)->findOneBy([
            'channelId'  => $channelId,
            'externalId' => $externalId,
        ]);

        if ($existing) {
            // Update existing (modify action)
            $this->em->flush();
            return ['action' => 'updated', 'external_id' => $externalId, 'id' => $existing->getId()];
        }

        $reservation = $this->ingestReservation(
            channelId:   $channelId,
            channelName: $channel->getChannelName(),
            externalId:  $externalId,
            guestName:   $payload['guest_name']  ?? 'OTA Guest',
            checkIn:     $payload['check_in']     ?? date('Y-m-d'),
            checkOut:    $payload['check_out']    ?? date('Y-m-d', strtotime('+1 day')),
            amount:      (string) ($payload['amount'] ?? '0'),
            tenantId:    $channel->getTenantId(),
            rawData:     $payload,
            commission:  $payload['commission']   ?? null,
        );

        return ['action' => 'created', 'external_id' => $externalId, 'id' => $reservation->getId()];
    }

    // ── Private helpers ───────────────────────────────────────────────────────

    private function icalEscape(string $v): string
    {
        return str_replace(["\n", "\r", ",", ";", "\\"], ["\\n", "", "\\,", "\\;", "\\\\"], $v);
    }
}

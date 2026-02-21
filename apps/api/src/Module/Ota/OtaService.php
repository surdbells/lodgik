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
}

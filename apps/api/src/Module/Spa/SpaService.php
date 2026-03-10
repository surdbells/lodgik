<?php
declare(strict_types=1);
namespace Lodgik\Module\Spa;
use Doctrine\ORM\EntityManagerInterface;
use Lodgik\Entity\{SpaService as SpaServiceEntity, SpaBooking, PoolAccessLog};

final class SpaService
{
    public function __construct(private readonly EntityManagerInterface $em) {}

    // Spa Services
    public function listServices(string $propertyId, ?bool $activeOnly = null): array
    { $c = ['propertyId' => $propertyId]; if ($activeOnly !== null) $c['isActive'] = $activeOnly;
      return array_map(fn($s) => $s->toArray(), $this->em->getRepository(SpaServiceEntity::class)->findBy($c, ['category' => 'ASC', 'name' => 'ASC'])); }

    public function createService(string $pid, string $name, string $category, int $duration, string $price, string $tid, ?string $desc = null): SpaServiceEntity
    { $s = new SpaServiceEntity($pid, $name, $category, $duration, $price, $tid); if ($desc) $s->setDescription($desc); $this->em->persist($s); $this->em->flush(); return $s; }

    public function updateService(string $id, array $d): SpaServiceEntity
    { $s = $this->em->find(SpaServiceEntity::class, $id); if (isset($d['name'])) $s->setName($d['name']); if (isset($d['description'])) $s->setDescription($d['description']); if (isset($d['is_active'])) $s->setIsActive((bool)$d['is_active']); $this->em->flush(); return $s; }

    // Spa Bookings
    public function listBookings(string $propertyId, ?string $date = null, ?string $status = null): array
    { $qb = $this->em->createQueryBuilder()->select('b')->from(SpaBooking::class, 'b')->where('b.propertyId = :p')->setParameter('p', $propertyId)->orderBy('b.bookingDate', 'ASC')->addOrderBy('b.startTime', 'ASC');
      if ($date) $qb->andWhere('b.bookingDate = :d')->setParameter('d', $date);
      if ($status) $qb->andWhere('b.status = :s')->setParameter('s', $status);
      return array_map(fn($b) => $b->toArray(), $qb->getQuery()->getResult()); }

    public function createBooking(string $pid, string $svcId, string $svcName, ?string $gId, string $gName, string $date, string $time, string $price, string $tid, ?string $therapist = null): SpaBooking
    { $b = new SpaBooking($pid, $svcId, $svcName, $gId, $gName, new \DateTimeImmutable($date), $time, $price, $tid); if ($therapist) $b->setTherapistName($therapist); $this->em->persist($b); $this->em->flush(); return $b; }

    public function startBooking(string $id): SpaBooking { $b = $this->em->find(SpaBooking::class, $id); $b->start(); $this->em->flush(); return $b; }
    public function completeBooking(string $id): SpaBooking { $b = $this->em->find(SpaBooking::class, $id); $b->complete(); $this->em->flush(); return $b; }
    public function cancelBooking(string $id): SpaBooking { $b = $this->em->find(SpaBooking::class, $id); $b->cancel(); $this->em->flush(); return $b; }

    // Pool Access
    public function listPoolAccess(string $propertyId, ?string $date = null): array
    { $c = ['propertyId' => $propertyId]; if ($date) $c['accessDate'] = new \DateTimeImmutable($date);
      return array_map(fn($p) => $p->toArray(), $this->em->getRepository(PoolAccessLog::class)->findBy($c, ['checkInTime' => 'DESC'])); }

    public function poolCheckIn(string $pid, ?string $gId, string $gName, string $time, string $tid, string $area = 'main_pool'): PoolAccessLog
    { $p = new PoolAccessLog($pid, $gId, $gName, new \DateTimeImmutable(), $time, $tid); $p->setArea($area); $this->em->persist($p); $this->em->flush(); return $p; }

    public function poolCheckOut(string $id, string $time): PoolAccessLog { $p = $this->em->find(PoolAccessLog::class, $id); $p->checkOut($time); $this->em->flush(); return $p; }

    public function getPoolOccupancy(string $propertyId): int
    { return (int)$this->em->createQueryBuilder()->select('COUNT(p.id)')->from(PoolAccessLog::class, 'p')
        ->where('p.propertyId = :pid')->andWhere('p.accessDate = :today')->andWhere('p.checkOutTime IS NULL')
        ->setParameter('pid', $propertyId)->setParameter('today', date('Y-m-d'))->getQuery()->getSingleScalarResult(); }
}

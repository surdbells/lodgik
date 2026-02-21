<?php
declare(strict_types=1);
namespace Lodgik\Module\Loyalty;
use Doctrine\ORM\EntityManagerInterface;
use Lodgik\Entity\{LoyaltyTier, LoyaltyPoints, Promotion, GuestPreference};

final class LoyaltyService
{
    public function __construct(private readonly EntityManagerInterface $em) {}

    // ─── Tiers ────────────────────────────────────────────────
    public function listTiers(string $tenantId): array { return array_map(fn($t) => $t->toArray(), $this->em->getRepository(LoyaltyTier::class)->findBy(['tenantId' => $tenantId], ['priority' => 'ASC'])); }
    public function createTier(string $name, int $minPoints, string $discount, string $tid, array $x = []): LoyaltyTier
    { $t = new LoyaltyTier($name, $minPoints, $discount, $tid); if (!empty($x['benefits'])) $t->setBenefits($x['benefits']); if (isset($x['priority'])) $t->setPriority((int)$x['priority']); if (!empty($x['color'])) $t->setColor($x['color']); $this->em->persist($t); $this->em->flush(); return $t; }
    public function updateTier(string $id, array $d): LoyaltyTier { $t = $this->em->find(LoyaltyTier::class, $id); if (isset($d['name'])) $t->setName($d['name']); if (isset($d['min_points'])) $t->setMinPoints((int)$d['min_points']); if (isset($d['discount_percentage'])) $t->setDiscountPercentage($d['discount_percentage']); if (isset($d['benefits'])) $t->setBenefits($d['benefits']); if (isset($d['is_active'])) $t->setIsActive((bool)$d['is_active']); $this->em->flush(); return $t; }

    // ─── Points ───────────────────────────────────────────────
    public function getGuestPoints(string $guestId, string $tenantId): int
    { $earned = (int)($this->em->createQueryBuilder()->select('SUM(p.points)')->from(LoyaltyPoints::class, 'p')->where('p.guestId = :g')->andWhere('p.tenantId = :t')->andWhere("p.transactionType = 'earn'")->setParameter('g', $guestId)->setParameter('t', $tenantId)->getQuery()->getSingleScalarResult() ?? 0);
      $redeemed = (int)($this->em->createQueryBuilder()->select('SUM(p.points)')->from(LoyaltyPoints::class, 'p')->where('p.guestId = :g')->andWhere('p.tenantId = :t')->andWhere("p.transactionType IN ('redeem', 'expire')")->setParameter('g', $guestId)->setParameter('t', $tenantId)->getQuery()->getSingleScalarResult() ?? 0);
      return $earned - $redeemed; }

    public function earnPoints(string $guestId, string $propertyId, int $points, string $source, string $tenantId, ?string $refId = null, ?string $notes = null): LoyaltyPoints
    { $p = new LoyaltyPoints($guestId, $propertyId, $points, $source, 'earn', $tenantId); if ($refId) $p->setReferenceId($refId); if ($notes) $p->setNotes($notes); $this->em->persist($p); $this->em->flush(); return $p; }

    public function redeemPoints(string $guestId, string $propertyId, int $points, string $tenantId, ?string $refId = null, ?string $notes = null): LoyaltyPoints
    { $balance = $this->getGuestPoints($guestId, $tenantId); if ($balance < $points) throw new \RuntimeException('Insufficient points'); $p = new LoyaltyPoints($guestId, $propertyId, $points, 'redemption', 'redeem', $tenantId); if ($refId) $p->setReferenceId($refId); if ($notes) $p->setNotes($notes); $this->em->persist($p); $this->em->flush(); return $p; }

    public function getPointsHistory(string $guestId, string $tenantId, int $limit = 50): array
    { return array_map(fn($p) => $p->toArray(), $this->em->getRepository(LoyaltyPoints::class)->findBy(['guestId' => $guestId, 'tenantId' => $tenantId], ['createdAt' => 'DESC'], $limit)); }

    public function getGuestTier(string $guestId, string $tenantId): ?array
    { $points = $this->getGuestPoints($guestId, $tenantId); $tiers = $this->em->getRepository(LoyaltyTier::class)->findBy(['tenantId' => $tenantId, 'isActive' => true], ['minPoints' => 'DESC']);
      foreach ($tiers as $tier) { if ($points >= $tier->getMinPoints()) return array_merge($tier->toArray(), ['current_points' => $points]); } return ['tier' => null, 'current_points' => $points]; }

    /** Auto-earn points on booking (1 point per 100 NGN spent) */
    public function onBookingPayment(string $guestId, string $propertyId, string $amount, string $bookingId, string $tenantId): ?LoyaltyPoints
    { $points = (int)((int)$amount / 10000); if ($points < 1) return null; return $this->earnPoints($guestId, $propertyId, $points, 'booking', $tenantId, $bookingId, 'Auto-earned from booking'); }

    // ─── Promotions ───────────────────────────────────────────
    public function listPromotions(string $propertyId, ?bool $activeOnly = null): array
    { $c = ['propertyId' => $propertyId]; if ($activeOnly !== null) $c['isActive'] = $activeOnly; return array_map(fn($p) => $p->toArray(), $this->em->getRepository(Promotion::class)->findBy($c, ['startDate' => 'DESC'])); }

    public function createPromotion(string $pid, string $code, string $name, string $type, string $value, string $start, string $end, string $tid, array $x = []): Promotion
    { $p = new Promotion($pid, $code, $name, $type, $value, new \DateTimeImmutable($start), new \DateTimeImmutable($end), $tid);
      if (isset($x['usage_limit'])) $p->setUsageLimit((int)$x['usage_limit']); if (!empty($x['min_booking_amount'])) $p->setMinBookingAmount($x['min_booking_amount']);
      if (!empty($x['applicable_room_types'])) $p->setApplicableRoomTypes($x['applicable_room_types']); if (!empty($x['description'])) $p->setDescription($x['description']);
      $this->em->persist($p); $this->em->flush(); return $p; }

    public function validatePromoCode(string $code, string $propertyId, ?string $amount = null): array
    { $p = $this->em->getRepository(Promotion::class)->findOneBy(['code' => strtoupper($code), 'propertyId' => $propertyId]);
      if (!$p) return ['valid' => false, 'error' => 'Invalid code']; if (!$p->isValid()) return ['valid' => false, 'error' => 'Expired or usage limit reached'];
      $result = ['valid' => true, 'promotion' => $p->toArray()]; if ($amount) { $result['discounted_amount'] = $p->apply($amount); $result['savings'] = (string)((int)$amount - (int)$result['discounted_amount']); }
      return $result; }

    public function applyPromotion(string $id): Promotion { $p = $this->em->find(Promotion::class, $id); $p->recordUsage(); $this->em->flush(); return $p; }

    // ─── Guest Preferences ────────────────────────────────────
    public function getPreferences(string $guestId, string $tenantId): ?array
    { $p = $this->em->getRepository(GuestPreference::class)->findOneBy(['guestId' => $guestId, 'tenantId' => $tenantId]); return $p?->toArray(); }

    public function setPreferences(string $guestId, string $tenantId, array $data): GuestPreference
    { $p = $this->em->getRepository(GuestPreference::class)->findOneBy(['guestId' => $guestId, 'tenantId' => $tenantId]) ?? new GuestPreference($guestId, $tenantId);
      if (isset($data['room_preferences'])) $p->setRoomPreferences($data['room_preferences']); if (isset($data['dietary_restrictions'])) $p->setDietaryRestrictions($data['dietary_restrictions']);
      if (isset($data['special_occasions'])) $p->setSpecialOccasions($data['special_occasions']); if (!empty($data['communication_preference'])) $p->setCommunicationPreference($data['communication_preference']);
      if (!empty($data['notes'])) $p->setNotes($data['notes']); if (isset($data['vip_status'])) $p->setVipStatus((bool)$data['vip_status']);
      if (!empty($data['preferred_language'])) $p->setPreferredLanguage($data['preferred_language']);
      if (!$p->getId()) $this->em->persist($p); $this->em->flush(); return $p; }
}

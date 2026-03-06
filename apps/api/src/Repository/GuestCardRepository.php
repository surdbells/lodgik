<?php
declare(strict_types=1);
namespace Lodgik\Repository;

use Lodgik\Entity\GuestCard;
use Lodgik\Enum\GuestCardStatus;

/** @extends BaseRepository<GuestCard> */
final class GuestCardRepository extends BaseRepository
{
    protected function getEntityClass(): string { return GuestCard::class; }

    public function findByUid(string $cardUid): ?GuestCard
    {
        return $this->findOneBy(['cardUid' => $cardUid]);
    }

    public function findByUidOrFail(string $cardUid): GuestCard
    {
        $card = $this->findByUid($cardUid);
        if (!$card) throw new \RuntimeException("Card UID '{$cardUid}' not found");
        return $card;
    }

    public function findByNumber(string $cardNumber, string $propertyId): ?GuestCard
    {
        return $this->findOneBy(['cardNumber' => $cardNumber, 'propertyId' => $propertyId]);
    }

    public function findActiveByBooking(string $bookingId): array
    {
        return $this->createQueryBuilder('c')
            ->where('c.bookingId = :bid')
            ->andWhere('c.status IN (:statuses)')
            ->setParameter('bid', $bookingId)
            ->setParameter('statuses', [GuestCardStatus::ACTIVE->value, GuestCardStatus::ISSUED->value])
            ->getQuery()->getResult();
    }

    /** Available cards in stock ready to be issued */
    public function findAvailable(string $propertyId, int $limit = 20): array
    {
        return $this->createQueryBuilder('c')
            ->where('c.propertyId = :pid')
            ->andWhere('c.status = :status')
            ->setParameter('pid', $propertyId)
            ->setParameter('status', GuestCardStatus::AVAILABLE->value)
            ->setMaxResults($limit)
            ->getQuery()->getResult();
    }

    public function countByStatus(string $propertyId): array
    {
        $rows = $this->createQueryBuilder('c')
            ->select('c.status, COUNT(c.id) as cnt')
            ->where('c.propertyId = :pid')
            ->setParameter('pid', $propertyId)
            ->groupBy('c.status')
            ->getQuery()->getArrayResult();

        $result = [];
        foreach ($rows as $r) {
            $result[$r['status']->value ?? $r['status']] = (int) $r['cnt'];
        }
        return $result;
    }

    public function findByProperty(string $propertyId, ?string $status = null, int $page = 1, int $limit = 30): array
    {
        $qb = $this->createQueryBuilder('c')
            ->where('c.propertyId = :pid')
            ->setParameter('pid', $propertyId)
            ->orderBy('c.createdAt', 'DESC');

        if ($status) {
            $qb->andWhere('c.status = :status')->setParameter('status', $status);
        }

        return $this->paginate($qb, $page, $limit, 'c');
    }

    /** Check whether a card UID already exists globally (across all tenants) */
    public function uidExists(string $cardUid): bool
    {
        return (bool) $this->createQueryBuilder('c')
            ->select('1')
            ->where('c.cardUid = :uid')
            ->setParameter('uid', $cardUid)
            ->setMaxResults(1)
            ->getQuery()->getOneOrNullResult();
    }

    public function findOrFail(string $id): GuestCard
    {
        $card = $this->find($id);
        if (!$card) throw new \RuntimeException('Guest card not found');
        return $card;
    }
}

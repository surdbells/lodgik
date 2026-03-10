<?php

declare(strict_types=1);

namespace Lodgik\Repository;

use Doctrine\ORM\EntityManagerInterface;
use Lodgik\Entity\Guest;
use Lodgik\Entity\Room;
use Lodgik\Entity\ServiceRequest;
use Lodgik\Enum\ServiceRequestStatus;

/** @extends BaseRepository<ServiceRequest> */
final class ServiceRequestRepository extends BaseRepository
{
    protected function getEntityClass(): string { return ServiceRequest::class; }

    // ─── Enrichment ──────────────────────────────────────────────

    /**
     * Enrich a list of ServiceRequests with room_number and guest_name.
     * Batches lookups to avoid N+1 queries.
     *
     * @param ServiceRequest[] $requests
     * @return ServiceRequest[]
     */
    public function enrich(array $requests): array
    {
        if (empty($requests)) return [];

        $em = $this->getEntityManager();

        // Collect unique IDs
        $roomIds  = array_unique(array_filter(array_map(fn($r) => $r->getRoomId(),  $requests)));
        $guestIds = array_unique(array_filter(array_map(fn($r) => $r->getGuestId(), $requests)));

        // Batch load rooms
        $roomMap = [];
        if (!empty($roomIds)) {
            $rooms = $em->createQueryBuilder()
                ->select('r')
                ->from(Room::class, 'r')
                ->where('r.id IN (:ids)')
                ->setParameter('ids', $roomIds)
                ->getQuery()->getResult();
            foreach ($rooms as $room) {
                $roomMap[$room->getId()] = $room->getRoomNumber();
            }
        }

        // Batch load guests
        $guestMap = [];
        if (!empty($guestIds)) {
            $guests = $em->createQueryBuilder()
                ->select('g')
                ->from(Guest::class, 'g')
                ->where('g.id IN (:ids)')
                ->setParameter('ids', $guestIds)
                ->getQuery()->getResult();
            foreach ($guests as $guest) {
                $guestMap[$guest->getId()] = $guest->getFullName();
            }
        }

        // Inject transient fields
        foreach ($requests as $sr) {
            if ($sr->getRoomId() && isset($roomMap[$sr->getRoomId()])) {
                $sr->setRoomNumber($roomMap[$sr->getRoomId()]);
            }
            if (isset($guestMap[$sr->getGuestId()])) {
                $sr->setGuestName($guestMap[$sr->getGuestId()]);
            }
        }

        return $requests;
    }

    // ─── Queries ─────────────────────────────────────────────────

    /** @return ServiceRequest[] */
    public function findByProperty(string $propertyId, ?string $status = null): array
    {
        $qb = $this->createQueryBuilder('sr')
            ->where('sr.propertyId = :pid')
            ->setParameter('pid', $propertyId)
            ->orderBy('sr.createdAt', 'DESC');
        if ($status) $qb->andWhere('sr.status = :s')->setParameter('s', $status);
        return $this->enrich($qb->getQuery()->getResult());
    }

    /** @return ServiceRequest[] */
    public function findByBooking(string $bookingId): array
    {
        return $this->enrich(
            $this->createQueryBuilder('sr')
                ->where('sr.bookingId = :bid')
                ->setParameter('bid', $bookingId)
                ->orderBy('sr.createdAt', 'DESC')
                ->getQuery()->getResult()
        );
    }

    /** @return ServiceRequest[] Active (non-completed/cancelled) */
    public function findActive(string $propertyId): array
    {
        return $this->enrich(
            $this->createQueryBuilder('sr')
                ->where('sr.propertyId = :pid')
                ->andWhere('sr.status NOT IN (:done)')
                ->setParameter('pid', $propertyId)
                ->setParameter('done', [ServiceRequestStatus::COMPLETED->value, ServiceRequestStatus::CANCELLED->value])
                ->orderBy('sr.priority', 'DESC')
                ->addOrderBy('sr.createdAt', 'ASC')
                ->getQuery()->getResult()
        );
    }

    /** @return array{pending:int, acknowledged:int, in_progress:int, completed:int} */
    public function summarize(string $propertyId): array
    {
        $rows = $this->createQueryBuilder('sr')
            ->select('sr.status, COUNT(sr.id) as cnt')
            ->where('sr.propertyId = :pid')
            ->setParameter('pid', $propertyId)
            ->groupBy('sr.status')
            ->getQuery()->getResult();
        $map = array_fill_keys(ServiceRequestStatus::values(), 0);
        foreach ($rows as $r) {
            $key = $r['status'] instanceof ServiceRequestStatus ? $r['status']->value : $r['status'];
            $map[$key] = (int) $r['cnt'];
        }
        // Add total
        $map['total'] = array_sum($map);
        return $map;
    }
}

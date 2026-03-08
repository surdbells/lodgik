<?php
declare(strict_types=1);

namespace Lodgik\Module\Housekeeping;

use Doctrine\ORM\EntityManagerInterface;
use Lodgik\Entity\HousekeepingConsumable;
use Lodgik\Entity\HousekeepingStoreRequest;
use Lodgik\Entity\HousekeepingStoreRequestItem;
use Lodgik\Entity\HousekeepingConsumableDiscrepancy;
use Lodgik\Repository\PropertyRepository;
use Psr\Log\LoggerInterface;

final class ConsumableService
{
    public function __construct(
        private readonly EntityManagerInterface $em,
        private readonly ?PropertyRepository $propertyRepo = null,
        private readonly ?LoggerInterface $logger = null,
    ) {}

    // ══ Catalogue ═══════════════════════════════════════════════════════

    public function listConsumables(string $propertyId, string $tenantId): array
    {
        return array_map(
            fn($c) => $c->toArray(),
            $this->em->getRepository(HousekeepingConsumable::class)->findBy(
                ['propertyId' => $propertyId, 'tenantId' => $tenantId, 'isActive' => true],
                ['name' => 'ASC']
            )
        );
    }

    public function createConsumable(
        string $propertyId, string $name, string $unit,
        string $expectedPerRoom, string $reorderThreshold, string $tenantId, ?string $notes = null
    ): HousekeepingConsumable {
        $c = new HousekeepingConsumable($propertyId, $name, $unit, $tenantId);
        $c->setExpectedPerRoom($expectedPerRoom);
        $c->setReorderThreshold($reorderThreshold);
        $c->setNotes($notes);
        $this->em->persist($c);
        $this->em->flush();
        return $c;
    }

    public function updateConsumable(string $id, array $data): HousekeepingConsumable
    {
        $c = $this->em->find(HousekeepingConsumable::class, $id);
        if ($c === null) throw new \RuntimeException('Consumable not found');

        if (isset($data['name']))               $c->setName($data['name']);
        if (isset($data['unit']))               $c->setUnit($data['unit']);
        if (isset($data['expected_per_room']))   $c->setExpectedPerRoom((string)$data['expected_per_room']);
        if (isset($data['reorder_threshold']))   $c->setReorderThreshold((string)$data['reorder_threshold']);
        if (array_key_exists('notes', $data))    $c->setNotes($data['notes'] ?: null);
        if (isset($data['is_active']))            $c->setIsActive((bool)$data['is_active']);

        $this->em->flush();
        return $c;
    }

    public function deleteConsumable(string $id): void
    {
        $c = $this->em->find(HousekeepingConsumable::class, $id);
        if ($c === null) return;
        $c->setIsActive(false); // soft delete
        $this->em->flush();
    }

    // ══ Store Requests ══════════════════════════════════════════════════

    public function listRequests(string $propertyId, ?string $status = null): array
    {
        $results = [];
        $qb = $this->em->createQueryBuilder()
            ->select('r')
            ->from(HousekeepingStoreRequest::class, 'r')
            ->where('r.propertyId = :pid')->setParameter('pid', $propertyId)
            ->orderBy('r.createdAt', 'DESC');
        if ($status) $qb->andWhere('r.status = :s')->setParameter('s', $status);

        foreach ($qb->getQuery()->getResult() as $req) {
            $data = $req->toArray();
            $data['items'] = array_map(
                fn($i) => $i->toArray(),
                $this->em->getRepository(HousekeepingStoreRequestItem::class)
                    ->findBy(['requestId' => $req->getId()])
            );
            $results[] = $data;
        }
        return $results;
    }

    public function createRequest(
        string $propertyId, string $requestedBy, string $requestedByName,
        array $items, string $tenantId, ?string $notes = null
    ): HousekeepingStoreRequest {
        if (empty($items)) {
            throw new \InvalidArgumentException('At least one item is required');
        }

        $req = new HousekeepingStoreRequest($propertyId, $requestedBy, $requestedByName, $tenantId);
        $req->setNotes($notes);
        $this->em->persist($req);
        $this->em->flush(); // get ID for line items

        foreach ($items as $item) {
            $consumable = $this->em->find(HousekeepingConsumable::class, $item['consumable_id']);
            $name = $consumable?->getName() ?? ($item['consumable_name'] ?? 'Unknown');
            $unit = $consumable?->getUnit() ?? ($item['unit'] ?? 'piece');

            $line = new HousekeepingStoreRequestItem(
                $req->getId(),
                $item['consumable_id'],
                $name,
                (string)$item['quantity'],
                $unit
            );
            $this->em->persist($line);
        }
        $this->em->flush();

        $this->logger?->info("Housekeeping store request created: {$req->getId()} by {$requestedByName}");
        return $req;
    }

    public function approveByStorekeeper(string $requestId, string $userId, string $userName, array $issuedQtys = []): HousekeepingStoreRequest
    {
        $req = $this->em->find(HousekeepingStoreRequest::class, $requestId);
        if ($req === null) throw new \RuntimeException('Request not found');

        $req->approveByStorekeeper($userId, $userName);

        // Update issued quantities on line items if provided
        if (!empty($issuedQtys)) {
            $items = $this->em->getRepository(HousekeepingStoreRequestItem::class)
                ->findBy(['requestId' => $requestId]);
            foreach ($items as $item) {
                if (isset($issuedQtys[$item->getConsumableId()])) {
                    $item->setQuantityIssued((string)$issuedQtys[$item->getConsumableId()]);
                }
            }
        }

        $this->em->flush();
        return $req;
    }

    public function approveByAdmin(string $requestId, string $userId, string $userName): HousekeepingStoreRequest
    {
        $req = $this->em->find(HousekeepingStoreRequest::class, $requestId);
        if ($req === null) throw new \RuntimeException('Request not found');
        $req->approveByAdmin($userId, $userName);
        $this->em->flush();
        return $req;
    }

    public function reject(string $requestId, string $reason): HousekeepingStoreRequest
    {
        $req = $this->em->find(HousekeepingStoreRequest::class, $requestId);
        if ($req === null) throw new \RuntimeException('Request not found');
        $req->reject($reason);
        $this->em->flush();
        return $req;
    }

    public function fulfill(string $requestId, string $tenantId): HousekeepingStoreRequest
    {
        $req = $this->em->find(HousekeepingStoreRequest::class, $requestId);
        if ($req === null) throw new \RuntimeException('Request not found');

        // Check if admin approval required
        $property = $this->propertyRepo?->find($req->getPropertyId());
        $requireAdmin = $property?->getSetting('require_admin_approval_for_consumables', false);

        if ($requireAdmin && $req->getStatus() === 'storekeeper_approved') {
            throw new \DomainException(
                'This property requires admin approval before fulfillment. ' .
                'Please have an admin approve the request first.'
            );
        }

        $req->fulfill();
        $this->em->flush();
        $this->logger?->info("Housekeeping store request fulfilled: {$requestId}");
        return $req;
    }

    // ══ Discrepancies ═══════════════════════════════════════════════════

    public function listDiscrepancies(string $propertyId, bool $unresolvedOnly = true): array
    {
        $qb = $this->em->createQueryBuilder()
            ->select('d')
            ->from(HousekeepingConsumableDiscrepancy::class, 'd')
            ->where('d.propertyId = :pid')->setParameter('pid', $propertyId)
            ->orderBy('d.createdAt', 'DESC');
        if ($unresolvedOnly) $qb->andWhere('d.resolved = false');

        return array_map(fn($d) => $d->toArray(), $qb->getQuery()->getResult());
    }

    public function resolveDiscrepancy(string $id, string $userId, ?string $notes = null): HousekeepingConsumableDiscrepancy
    {
        $d = $this->em->find(HousekeepingConsumableDiscrepancy::class, $id);
        if ($d === null) throw new \RuntimeException('Discrepancy not found');
        $d->resolve($userId, $notes);
        $this->em->flush();
        return $d;
    }

    /**
     * Run discrepancy check for a date range.
     * Compares expected consumption (rooms serviced × expected_per_room)
     * vs actual (quantities issued on fulfilled requests).
     * Called by the weekly cron or manually from the UI.
     */
    public function runDiscrepancyCheck(string $propertyId, string $tenantId, string $from, string $to): array
    {
        $periodStart = new \DateTimeImmutable($from);
        $periodEnd   = new \DateTimeImmutable($to);

        // Count rooms serviced (completed housekeeping tasks) in period
        $roomsServiced = (int) $this->em->createQueryBuilder()
            ->select('COUNT(t.id)')
            ->from(\Lodgik\Entity\HousekeepingTask::class, 't')
            ->where('t.propertyId = :pid')->setParameter('pid', $propertyId)
            ->andWhere('t.status = :s')->setParameter('s', 'completed')
            ->andWhere('t.completedAt >= :from')->setParameter('from', $periodStart)
            ->andWhere('t.completedAt <= :to')->setParameter('to', $periodEnd)
            ->getQuery()->getSingleScalarResult();

        $consumables = $this->em->getRepository(HousekeepingConsumable::class)
            ->findBy(['propertyId' => $propertyId, 'tenantId' => $tenantId, 'isActive' => true]);

        $flagged = [];
        foreach ($consumables as $c) {
            $expected = (float)$c->getExpectedPerRoom() * $roomsServiced;

            // Sum quantities issued in fulfilled requests in period
            $actual = (float) $this->em->createQueryBuilder()
                ->select('COALESCE(SUM(i.quantityIssued), 0)')
                ->from(HousekeepingStoreRequestItem::class, 'i')
                ->join(HousekeepingStoreRequest::class, 'r', 'WITH', 'r.id = i.requestId')
                ->where('i.consumableId = :cid')->setParameter('cid', $c->getId())
                ->andWhere('r.propertyId = :pid')->setParameter('pid', $propertyId)
                ->andWhere('r.status = :s')->setParameter('s', 'fulfilled')
                ->andWhere('r.fulfilledAt >= :from')->setParameter('from', $periodStart)
                ->andWhere('r.fulfilledAt <= :to')->setParameter('to', $periodEnd)
                ->getQuery()->getSingleScalarResult();

            $variancePct = $expected > 0 ? abs(($actual - $expected) / $expected) * 100 : 0;

            // Flag if variance > 20% and expected > 0
            if ($variancePct > 20 && $expected > 0) {
                $disc = new HousekeepingConsumableDiscrepancy(
                    $propertyId, $c->getId(), $c->getName(),
                    $periodStart, $periodEnd,
                    $roomsServiced,
                    (string)$expected,
                    (string)$actual,
                    $tenantId
                );
                $this->em->persist($disc);
                $flagged[] = $disc->toArray();
            }
        }

        $this->em->flush();
        $this->logger?->info("Discrepancy check: {$propertyId}. Period {$from}–{$to}. Flagged: " . count($flagged));
        return [
            'period_start'    => $from,
            'period_end'      => $to,
            'rooms_serviced'  => $roomsServiced,
            'flagged_count'   => count($flagged),
            'discrepancies'   => $flagged,
        ];
    }
}

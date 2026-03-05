<?php
declare(strict_types=1);
namespace Lodgik\Repository;

use Lodgik\Entity\CardScanPoint;

/** @extends BaseRepository<CardScanPoint> */
final class CardScanPointRepository extends BaseRepository
{
    protected function getEntityClass(): string { return CardScanPoint::class; }

    public function findByProperty(string $propertyId): array
    {
        return $this->createQueryBuilder('s')
            ->where('s.propertyId = :pid')
            ->setParameter('pid', $propertyId)
            ->orderBy('s.name', 'ASC')
            ->getQuery()->getResult();
    }

    public function findByDeviceKey(string $deviceKey): ?CardScanPoint
    {
        return $this->findOneBy(['deviceKey' => $deviceKey]);
    }

    public function findOrFail(string $id): CardScanPoint
    {
        $sp = $this->find($id);
        if (!$sp) throw new \RuntimeException('Scan point not found');
        return $sp;
    }
}

<?php

declare(strict_types=1);

namespace Lodgik\Repository;

use Lodgik\Entity\FolioPayment;
use Lodgik\Enum\PaymentStatus;

/** @extends BaseRepository<FolioPayment> */
final class FolioPaymentRepository extends BaseRepository
{
    protected function getEntityClass(): string { return FolioPayment::class; }

    /** @return FolioPayment[] */
    public function findByFolio(string $folioId): array
    {
        return $this->createQueryBuilder('p')
            ->where('p.folioId = :fid')->setParameter('fid', $folioId)
            ->orderBy('p.paymentDate', 'ASC')->addOrderBy('p.createdAt', 'ASC')
            ->getQuery()->getResult();
    }

    public function sumConfirmedByFolio(string $folioId): string
    {
        $r = $this->createQueryBuilder('p')
            ->select('COALESCE(SUM(p.amount), 0)')
            ->where('p.folioId = :fid')->setParameter('fid', $folioId)
            ->andWhere('p.status = :s')->setParameter('s', PaymentStatus::CONFIRMED->value)
            ->getQuery()->getSingleScalarResult();
        return number_format((float)$r, 2, '.', '');
    }

    /** @return FolioPayment[] */
    public function findPendingByProperty(string $propertyId): array
    {
        return $this->em->createQuery(
            'SELECT p FROM Lodgik\Entity\FolioPayment p JOIN Lodgik\Entity\Folio f WITH f.id = p.folioId WHERE f.propertyId = :pid AND p.status = :s ORDER BY p.createdAt DESC'
        )->setParameter('pid', $propertyId)->setParameter('s', PaymentStatus::PENDING->value)->getResult();
    }
}

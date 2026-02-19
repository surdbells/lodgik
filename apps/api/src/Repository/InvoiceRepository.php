<?php

declare(strict_types=1);

namespace Lodgik\Repository;

use Lodgik\Entity\Invoice;

/** @extends BaseRepository<Invoice> */
final class InvoiceRepository extends BaseRepository
{
    protected function getEntityClass(): string { return Invoice::class; }

    public function findByBooking(string $bookingId): ?Invoice
    {
        return $this->createQueryBuilder('i')
            ->where('i.bookingId = :bid')->setParameter('bid', $bookingId)
            ->setMaxResults(1)->getQuery()->getOneOrNullResult();
    }

    public function findByFolio(string $folioId): ?Invoice
    {
        return $this->createQueryBuilder('i')
            ->where('i.folioId = :fid')->setParameter('fid', $folioId)
            ->setMaxResults(1)->getQuery()->getOneOrNullResult();
    }

    public function findByProperty(string $propertyId, ?string $status = null, int $page = 1, int $limit = 20): array
    {
        $qb = $this->createQueryBuilder('i')
            ->where('i.propertyId = :pid')->setParameter('pid', $propertyId)
            ->orderBy('i.invoiceDate', 'DESC');
        if ($status) $qb->andWhere('i.status = :s')->setParameter('s', $status);
        $total = (clone $qb)->select('COUNT(i.id)')->getQuery()->getSingleScalarResult();
        $items = $qb->setFirstResult(($page - 1) * $limit)->setMaxResults($limit)->getQuery()->getResult();
        return ['items' => $items, 'total' => (int)$total];
    }

    public function generateInvoiceNumber(string $tenantId): string
    {
        $date = date('Ymd');
        $qb = $this->createQueryBuilder('i')
            ->select('COUNT(i.id)')
            ->where('i.tenantId = :t')->setParameter('t', $tenantId)
            ->andWhere('i.invoiceNumber LIKE :prefix')->setParameter('prefix', "INV-{$date}-%");
        $count = (int)$qb->getQuery()->getSingleScalarResult();
        return sprintf('INV-%s-%03d', $date, $count + 1);
    }
}

<?php

declare(strict_types=1);

namespace Lodgik\Repository;

use Lodgik\Entity\InvoiceItem;

/** @extends BaseRepository<InvoiceItem> */
final class InvoiceItemRepository extends BaseRepository
{
    protected function getEntityClass(): string { return InvoiceItem::class; }

    /** @return InvoiceItem[] */
    public function findByInvoice(string $invoiceId): array
    {
        return $this->createQueryBuilder('i')
            ->where('i.invoiceId = :iid')->setParameter('iid', $invoiceId)
            ->orderBy('i.sortOrder', 'ASC')
            ->getQuery()->getResult();
    }
}

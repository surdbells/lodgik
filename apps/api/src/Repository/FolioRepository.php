<?php

declare(strict_types=1);

namespace Lodgik\Repository;

use Lodgik\Entity\Folio;

/** @extends BaseRepository<Folio> */
final class FolioRepository extends BaseRepository
{
    protected function getEntityClass(): string { return Folio::class; }

    public function findByBooking(string $bookingId): ?Folio
    {
        return $this->createQueryBuilder('f')
            ->where('f.bookingId = :bid')->setParameter('bid', $bookingId)
            ->setMaxResults(1)->getQuery()->getOneOrNullResult();
    }

    public function findByProperty(
        string $propertyId,
        ?string $status = null,
        int $page = 1,
        int $limit = 20,
        ?string $search = null,
        bool $invoiceableOnly = false,
    ): array {
        $em  = $this->getEntityManager();
        $conn = $em->getConnection();

        // Use native SQL so we can join guests table without a Doctrine association
        $where  = ['f.property_id = :pid'];
        $params = ['pid' => $propertyId];

        if ($status) {
            $where[]         = 'f.status = :status';
            $params['status'] = $status;
        }

        if ($invoiceableOnly) {
            // Closed folios that don't yet have an invoice
            $where[] = "f.status = 'closed'";
            $where[] = 'NOT EXISTS (SELECT 1 FROM invoices i WHERE i.folio_id = f.id)';
        }

        if ($search !== null && trim($search) !== '') {
            $s = '%' . strtolower(trim($search)) . '%';
            $where[] = "(LOWER(f.folio_number) LIKE :s OR LOWER(CONCAT(g.first_name,' ',g.last_name)) LIKE :s OR LOWER(g.email) LIKE :s)";
            $params['s'] = $s;
        }

        $whereClause = implode(' AND ', $where);

        $countSql = "SELECT COUNT(f.id) FROM folios f LEFT JOIN guests g ON g.id = f.guest_id WHERE {$whereClause}";
        $total = (int) $conn->fetchOne($countSql, $params);

        $offset = ($page - 1) * $limit;
        $dataSql = "SELECT f.id FROM folios f LEFT JOIN guests g ON g.id = f.guest_id WHERE {$whereClause} ORDER BY f.created_at DESC LIMIT :limit OFFSET :offset";
        $params['limit']  = $limit;
        $params['offset'] = $offset;

        $ids = $conn->fetchFirstColumn($dataSql, $params);
        if (empty($ids)) {
            return ['items' => [], 'total' => $total];
        }

        // Re-load as Doctrine entities to preserve toArray() usage
        $items = $this->createQueryBuilder('f')
            ->where('f.id IN (:ids)')
            ->setParameter('ids', $ids)
            ->orderBy('f.createdAt', 'DESC')
            ->getQuery()
            ->getResult();

        return ['items' => $items, 'total' => $total];
    }

    /** Search folios for autocomplete (invoice creation) */
    public function searchForAutocomplete(string $propertyId, string $query, int $limit = 10): array
    {
        $conn = $this->getEntityManager()->getConnection();
        $s    = '%' . strtolower(trim($query)) . '%';
        $sql  = "
            SELECT f.id, f.folio_number, f.status, f.balance,
                   CONCAT(g.first_name,' ',g.last_name) AS guest_name,
                   g.email AS guest_email, b.booking_ref
            FROM folios f
            LEFT JOIN guests g ON g.id = f.guest_id
            LEFT JOIN bookings b ON b.id = f.booking_id
            WHERE f.property_id = :pid
              AND (LOWER(f.folio_number) LIKE :s
                   OR LOWER(CONCAT(g.first_name,' ',g.last_name)) LIKE :s
                   OR LOWER(g.email) LIKE :s
                   OR LOWER(b.booking_ref) LIKE :s)
            ORDER BY f.created_at DESC
            LIMIT :limit
        ";
        return $conn->fetchAllAssociative($sql, ['pid' => $propertyId, 's' => $s, 'limit' => $limit]);
    }

    public function generateFolioNumber(string $tenantId): string
    {
        $date = date('Ymd');
        $qb = $this->createQueryBuilder('f')
            ->select('COUNT(f.id)')
            ->where('f.tenantId = :t')->setParameter('t', $tenantId)
            ->andWhere('f.folioNumber LIKE :prefix')->setParameter('prefix', "FL-{$date}-%");
        $count = (int)$qb->getQuery()->getSingleScalarResult();
        return sprintf('FL-%s-%03d', $date, $count + 1);
    }

    /** Phase 3: Return all folios linked to a corporate group booking. */
    public function findByGroupBooking(string $groupBookingId): array
    {
        return $this->createQueryBuilder('f')
            ->where('f.groupBookingId = :gbid')
            ->setParameter('gbid', $groupBookingId)
            ->orderBy('f.createdAt', 'ASC')
            ->getQuery()
            ->getResult();
    }
}

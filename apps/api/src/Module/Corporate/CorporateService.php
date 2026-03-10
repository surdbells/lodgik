<?php
declare(strict_types=1);
namespace Lodgik\Module\Corporate;

use Doctrine\ORM\EntityManagerInterface;
use Lodgik\Entity\CorporateProfile;
use Lodgik\Entity\Booking;
use Lodgik\Entity\Folio;
use Lodgik\Entity\FolioCharge;
use Lodgik\Entity\FolioPayment;
use Lodgik\Entity\Guest;

final class CorporateService
{
    public function __construct(private readonly EntityManagerInterface $em) {}

    // ── CRUD ─────────────────────────────────────────────────────────────

    public function list(string $tenantId, string $propertyId, ?bool $active = null): array
    {
        $qb = $this->em->createQueryBuilder()
            ->select('c')
            ->from(CorporateProfile::class, 'c')
            ->where('c.tenantId = :tid AND c.propertyId = :pid')
            ->setParameter('tid', $tenantId)
            ->setParameter('pid', $propertyId)
            ->orderBy('c.companyName', 'ASC');

        if ($active !== null) {
            $qb->andWhere('c.isActive = :active')->setParameter('active', $active);
        }

        return array_map(fn(CorporateProfile $c) => $c->toArray(), $qb->getQuery()->getResult());
    }

    public function find(string $id): CorporateProfile
    {
        $c = $this->em->find(CorporateProfile::class, $id);
        if (!$c) throw new \RuntimeException('Corporate profile not found', 404);
        return $c;
    }

    public function create(string $tenantId, string $propertyId, array $d): CorporateProfile
    {
        $c = new CorporateProfile(
            $tenantId,
            $propertyId,
            $d['company_name'] ?? '',
            $d['contact_name'] ?? '',
        );

        $this->applyFields($c, $d);
        $this->em->persist($c);
        $this->em->flush();
        return $c;
    }

    public function update(string $id, array $d): CorporateProfile
    {
        $c = $this->find($id);
        if (isset($d['company_name'])) $c->setCompanyName($d['company_name']);
        if (isset($d['contact_name'])) $c->setContactName($d['contact_name']);
        $this->applyFields($c, $d);
        $this->em->flush();
        return $c;
    }

    public function delete(string $id): void
    {
        $c = $this->find($id);
        $this->em->remove($c);
        $this->em->flush();
    }

    public function toggleActive(string $id): CorporateProfile
    {
        $c = $this->find($id);
        $c->setIsActive(!$c->isActive());
        $this->em->flush();
        return $c;
    }

    // ── Intelligence / Analytics ─────────────────────────────────────────

    /**
     * Lifetime analytics for a corporate account:
     * - Total bookings
     * - Total revenue
     * - Total outstanding balance
     * - Recent group bookings
     * - Top guests (most frequent employees staying)
     */
    public function getIntelligence(string $id): array
    {
        $c = $this->find($id);

        // Aggregate bookings tied to this company name
        $conn = $this->em->getConnection();

        // Group bookings linked to this company
        $groupRows = $conn->fetchAllAssociative(
            "SELECT gb.id, gb.name, gb.status, gb.check_in, gb.check_out,
                    gb.total_rooms, gb.discount_percentage, gb.contact_name, gb.contact_email,
                    gb.corporate_contact_email, gb.corporate_ref_number, gb.created_at
             FROM group_bookings gb
             WHERE gb.tenant_id = :tid
               AND gb.property_id = :pid
               AND LOWER(gb.company_name) = LOWER(:company)
             ORDER BY gb.created_at DESC
             LIMIT 20",
            ['tid' => $c->getTenantId(), 'pid' => $c->getPropertyId(), 'company' => $c->getCompanyName()]
        );

        // Revenue from confirmed group bookings via master folios
        $revenueRow = $conn->fetchAssociative(
            "SELECT COUNT(gb.id) AS total_bookings,
                    COALESCE(SUM(fc.total_charges), 0) AS total_revenue,
                    COALESCE(SUM(fp.total_paid), 0) AS total_paid
             FROM group_bookings gb
             LEFT JOIN (
                 SELECT folio_id, SUM(amount) AS total_charges
                 FROM folio_charges WHERE is_void = FALSE GROUP BY folio_id
             ) fc ON fc.folio_id = gb.master_folio_id
             LEFT JOIN (
                 SELECT folio_id, SUM(amount) AS total_paid
                 FROM folio_payments GROUP BY folio_id
             ) fp ON fp.folio_id = gb.master_folio_id
             WHERE gb.tenant_id = :tid
               AND gb.property_id = :pid
               AND LOWER(gb.company_name) = LOWER(:company)",
            ['tid' => $c->getTenantId(), 'pid' => $c->getPropertyId(), 'company' => $c->getCompanyName()]
        );

        $totalRevenue = (float) ($revenueRow['total_revenue'] ?? 0);
        $totalPaid    = (float) ($revenueRow['total_paid'] ?? 0);
        $outstanding  = max(0, $totalRevenue - $totalPaid);

        return [
            'corporate_profile'  => $c->toArray(),
            'total_bookings'     => (int) ($revenueRow['total_bookings'] ?? 0),
            'total_revenue_ngn'  => round($totalRevenue, 2),
            'total_paid_ngn'     => round($totalPaid, 2),
            'outstanding_ngn'    => round($outstanding, 2),
            'recent_bookings'    => $groupRows,
        ];
    }

    // ── Private helpers ──────────────────────────────────────────────────

    private function applyFields(CorporateProfile $c, array $d): void
    {
        if (array_key_exists('contact_email', $d))             $c->setContactEmail($d['contact_email'] ?: null);
        if (array_key_exists('contact_phone', $d))             $c->setContactPhone($d['contact_phone'] ?: null);
        if (array_key_exists('billing_address', $d))           $c->setBillingAddress($d['billing_address'] ?: null);
        if (array_key_exists('tax_id', $d))                    $c->setTaxId($d['tax_id'] ?: null);
        if (array_key_exists('credit_limit_type', $d))         $c->setCreditLimitType($d['credit_limit_type']);
        if (array_key_exists('credit_limit_ngn', $d) && $d['credit_limit_ngn'] !== null && $d['credit_limit_ngn'] !== '') {
            $c->setCreditLimitKobo((int) round((float) $d['credit_limit_ngn'] * 100));
        } elseif (array_key_exists('credit_limit_kobo', $d)) {
            $c->setCreditLimitKobo($d['credit_limit_kobo'] !== null ? (int) $d['credit_limit_kobo'] : null);
        }
        if (array_key_exists('negotiated_rate_discount', $d))  $c->setNegotiatedRateDiscount((string)(float) $d['negotiated_rate_discount']);
        if (array_key_exists('payment_terms', $d))             $c->setPaymentTerms($d['payment_terms'] ?: null);
        if (array_key_exists('is_active', $d))                 $c->setIsActive((bool) $d['is_active']);
        if (array_key_exists('notes', $d))                     $c->setNotes($d['notes'] ?: null);
    }
}

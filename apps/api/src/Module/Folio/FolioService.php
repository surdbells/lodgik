<?php

declare(strict_types=1);

namespace Lodgik\Module\Folio;

use Doctrine\ORM\EntityManagerInterface;
use Lodgik\Entity\Folio;
use Lodgik\Entity\FolioCharge;
use Lodgik\Entity\FolioPayment;
use Lodgik\Entity\FolioAdjustment;
use Lodgik\Entity\Booking;
use Lodgik\Enum\FolioStatus;
use Lodgik\Enum\ChargeCategory;
use Lodgik\Enum\PaymentMethod;
use Lodgik\Enum\PaymentStatus;
use Lodgik\Repository\FolioRepository;
use Lodgik\Repository\FolioChargeRepository;
use Lodgik\Repository\FolioPaymentRepository;
use Lodgik\Repository\FolioAdjustmentRepository;
use Lodgik\Repository\PropertyBankAccountRepository;
use Lodgik\Repository\GroupBookingRepository;
use Psr\Log\LoggerInterface;

final class FolioService
{
    public function __construct(
        private readonly EntityManagerInterface $em,
        private readonly FolioRepository $folioRepo,
        private readonly FolioChargeRepository $chargeRepo,
        private readonly FolioPaymentRepository $paymentRepo,
        private readonly FolioAdjustmentRepository $adjustmentRepo,
        private readonly LoggerInterface $logger,
        private readonly ?GroupBookingRepository $groupBookingRepo = null,
    ) {}

    // ═══ Create Folio ══════════════════════════════════════════

    public function createForBooking(Booking $booking): Folio
    {
        // Check if folio already exists
        $existing = $this->folioRepo->findByBooking($booking->getId());
        if ($existing !== null) {
            return $existing;
        }

        $folioNumber = $this->folioRepo->generateFolioNumber($booking->getTenantId());
        $folio = new Folio(
            $booking->getPropertyId(),
            $booking->getId(),
            $booking->getGuestId(),
            $folioNumber,
            $booking->getTenantId(),
        );
        $this->em->persist($folio);

        // Auto-post room charge
        $charge = new FolioCharge(
            $folio->getId(),
            ChargeCategory::ROOM,
            'Room charge — ' . $booking->getBookingRef(),
            $booking->getTotalAmount(),
            1,
            $booking->getTenantId(),
        );
        $this->em->persist($charge);

        // Recalculate balance
        $folio->recalculate($booking->getTotalAmount(), '0.00', '0.00');

        $this->em->flush();
        $this->logger->info("Folio created: {$folioNumber} for booking {$booking->getBookingRef()}");

        return $folio;
    }

    // ═══ Get ═══════════════════════════════════════════════════

    public function getByBooking(string $bookingId): ?Folio
    {
        return $this->folioRepo->findByBooking($bookingId);
    }

    public function getById(string $folioId): Folio
    {
        return $this->folioRepo->findOrFail($folioId);
    }

    public function getByProperty(
        string $propertyId,
        ?string $status = null,
        int $page = 1,
        int $limit = 20,
        ?string $search = null,
        bool $invoiceableOnly = false,
    ): array {
        return $this->folioRepo->findByProperty($propertyId, $status, $page, $limit, $search, $invoiceableOnly);
    }

    public function searchForAutocomplete(string $propertyId, string $query): array
    {
        return $this->folioRepo->searchForAutocomplete($propertyId, $query, 10);
    }

    public function getDetail(string $folioId): array
    {
        $folio = $this->folioRepo->findOrFail($folioId);
        $charges = $this->chargeRepo->findByFolio($folioId);
        $payments = $this->paymentRepo->findByFolio($folioId);
        $adjustments = $this->adjustmentRepo->findByFolio($folioId);

        return [
            'folio' => $folio->toArray(),
            'charges' => array_map(fn(FolioCharge $c) => $c->toArray(), $charges),
            'payments' => array_map(fn(FolioPayment $p) => $p->toArray(), $payments),
            'adjustments' => array_map(fn(FolioAdjustment $a) => $a->toArray(), $adjustments),
        ];
    }

    // ═══ Add Charge ═══════════════════════════════════════════

    public function addCharge(string $folioId, string $category, string $description, string $amount, int $quantity = 1, ?string $userId = null, ?string $notes = null): FolioCharge
    {
        $folio = $this->folioRepo->findOrFail($folioId);
        if ($folio->getStatus() !== FolioStatus::OPEN) {
            throw new \InvalidArgumentException('Cannot add charges to a closed/voided folio');
        }

        // Phase 3: Corporate credit limit enforcement
        if ($folio->isCorporate() && $folio->getGroupBookingId() !== null && $this->groupBookingRepo !== null) {
            $gb = $this->groupBookingRepo->find($folio->getGroupBookingId());
            if ($gb !== null) {
                $chargeKobo = (int) round(((float) $amount) * $quantity * 100);
                if (!$gb->creditLimitAllows($folio->getCorporateCreditUsedKobo(), $chargeKobo)) {
                    $limitNgn = $gb->getCreditLimitKobo() !== null
                        ? number_format($gb->getCreditLimitKobo() / 100, 2)
                        : '0.00';
                    throw new \DomainException(
                        "Corporate credit limit of ₦{$limitNgn} would be exceeded. " .
                        "Used: ₦" . number_format($folio->getCorporateCreditUsedKobo() / 100, 2) . "."
                    );
                }
                $folio->addCorporateCreditUsed($chargeKobo);
            }
        }

        $cat = ChargeCategory::from($category);

        // ── Sanity guard: detect runaway amounts before persisting ────────
        // A single F&B charge exceeding ₦500,000 is almost certainly a
        // kobo-passed-as-naira error (e.g. 50000000 kobo = ₦500,000 stored as ₦500,000,000).
        $amountFloat = (float) $amount * $quantity;
        if ($amountFloat > 500000.00) {
            $this->logger->critical('FolioService::addCharge — suspiciously large amount', [
                'folio_id'    => $folioId,
                'category'    => $category,
                'description' => $description,
                'amount'      => $amount,
                'quantity'    => $quantity,
                'computed'    => $amountFloat,
                'hint'        => 'Possible kobo→naira conversion error. Check caller.',
            ]);
        }

        $charge = new FolioCharge($folioId, $cat, $description, $amount, $quantity, $folio->getTenantId());
        $charge->setPostedBy($userId);
        $charge->setNotes($notes);
        $this->em->persist($charge);

        $this->em->flush();         // Write charge first
        $this->recalculate($folio); // DB sum now includes new charge
        $this->em->flush();         // Write updated balance

        return $charge;
    }

    // ═══ Phase 3: Corporate Folio ══════════════════════════════

    /**
     * Create a corporate folio linked to a group booking.
     * Called when a corporate group booking is confirmed.
     */
    public function createCorporateFolio(
        string $propertyId,
        string $bookingId,
        string $guestId,
        string $groupBookingId,
        string $tenantId,
        bool $allowCheckoutWithoutPayment = true
    ): Folio {
        $existing = $this->folioRepo->findByBooking($bookingId);
        if ($existing !== null) {
            // If already exists, just mark it corporate
            if (!$existing->isCorporate()) {
                $existing->markAsCorporate($groupBookingId, $allowCheckoutWithoutPayment);
                $this->em->flush();
            }
            return $existing;
        }

        $folioNumber = 'CF-' . strtoupper(substr($groupBookingId, 0, 8)) . '-' . strtoupper(substr($bookingId, 0, 6));
        $folio = new Folio($propertyId, $bookingId, $guestId, $folioNumber, $tenantId);
        $folio->markAsCorporate($groupBookingId, $allowCheckoutWithoutPayment);
        $this->em->persist($folio);
        $this->em->flush();

        return $folio;
    }

    /**
     * Get all folios belonging to a corporate group booking.
     * Used when generating the consolidated corporate invoice.
     */
    public function getCorporateFolios(string $groupBookingId): array
    {
        return $this->folioRepo->findByGroupBooking($groupBookingId);
    }

    /**
     * Aggregate totals across all corporate folios for a group booking.
     * Returns summary figures used for the consolidated invoice.
     */
    public function getCorporateSummary(string $groupBookingId): array
    {
        $folios = $this->getCorporateFolios($groupBookingId);
        $totalCharges     = 0.0;
        $totalPayments    = 0.0;
        $totalAdjustments = 0.0;
        $totalBalance     = 0.0;

        foreach ($folios as $f) {
            $totalCharges     += (float) $f->getTotalCharges();
            $totalPayments    += (float) $f->getTotalPayments();
            $totalAdjustments += (float) $f->getTotalAdjustments();
            $totalBalance     += (float) $f->getBalance();
        }

        return [
            'group_booking_id'  => $groupBookingId,
            'folio_count'       => count($folios),
            'total_charges'     => number_format($totalCharges,     2, '.', ''),
            'total_payments'    => number_format($totalPayments,    2, '.', ''),
            'total_adjustments' => number_format($totalAdjustments, 2, '.', ''),
            'outstanding'       => number_format($totalBalance,     2, '.', ''),
            'folios'            => array_map(fn(Folio $f) => $f->toArray(), $folios),
        ];
    }

    // ═══ Record Payment ═══════════════════════════════════════

    public function recordPayment(
        string $folioId,
        string $method,
        string $amount,
        ?string $senderName = null,
        ?string $transferRef = null,
        ?string $proofImageUrl = null,
        ?string $userId = null,
        ?string $notes = null,
    ): FolioPayment {
        $folio = $this->folioRepo->findOrFail($folioId);
        if ($folio->getStatus() !== FolioStatus::OPEN) {
            throw new \InvalidArgumentException('Cannot record payments on a closed/voided folio');
        }

        $pm = PaymentMethod::from($method);
        $payment = new FolioPayment($folioId, $pm, $amount, $folio->getTenantId());
        $payment->setRecordedBy($userId);
        $payment->setNotes($notes);

        // For cash, auto-confirm
        if ($pm === PaymentMethod::CASH) {
            $payment->setStatus(PaymentStatus::CONFIRMED);
            $payment->setConfirmedBy($userId);
            $payment->setConfirmedAt(new \DateTimeImmutable());
        }

        // Bank transfer fields
        if ($pm === PaymentMethod::BANK_TRANSFER) {
            $payment->setSenderName($senderName);
            $payment->setTransferReference($transferRef);
            $payment->setProofImageUrl($proofImageUrl);
        }

        $this->em->persist($payment);
        $this->em->flush();          // Write payment to DB first
        $this->recalculate($folio);  // Now DB sum includes the new payment
        $this->em->flush();          // Write updated folio balance

        return $payment;
    }

    // ═══ Confirm / Reject Payment ═════════════════════════════

    public function confirmPayment(string $paymentId, ?string $userId = null): FolioPayment
    {
        $payment = $this->paymentRepo->findOrFail($paymentId);
        if ($payment->getStatus() !== PaymentStatus::PENDING) {
            throw new \InvalidArgumentException('Payment is not pending');
        }

        $payment->setStatus(PaymentStatus::CONFIRMED);
        $payment->setConfirmedBy($userId);
        $payment->setConfirmedAt(new \DateTimeImmutable());

        $folio = $this->folioRepo->findOrFail($payment->getFolioId());
        $this->em->flush();          // Write confirmed status to DB first
        $this->recalculate($folio);  // Now DB sum includes the newly confirmed payment
        $this->em->flush();          // Write updated folio balance

        return $payment;
    }

    public function rejectPayment(string $paymentId, ?string $reason = null, ?string $userId = null): FolioPayment
    {
        $payment = $this->paymentRepo->findOrFail($paymentId);
        if ($payment->getStatus() !== PaymentStatus::PENDING) {
            throw new \InvalidArgumentException('Payment is not pending');
        }

        $payment->setStatus(PaymentStatus::REJECTED);
        $payment->setRejectionReason($reason);
        $payment->setConfirmedBy($userId);

        $folio = $this->folioRepo->findOrFail($payment->getFolioId());
        $this->em->flush();          // Write rejected status first
        $this->recalculate($folio);  // Recalculate without the rejected payment
        $this->em->flush();          // Write updated folio balance

        return $payment;
    }

    // ═══ Add Adjustment ═══════════════════════════════════════

    public function addAdjustment(string $folioId, string $type, string $description, string $amount, ?string $userId = null, ?string $reason = null): FolioAdjustment
    {
        $folio = $this->folioRepo->findOrFail($folioId);
        if ($folio->getStatus() !== FolioStatus::OPEN) {
            throw new \InvalidArgumentException('Cannot adjust a closed/voided folio');
        }

        $adj = new FolioAdjustment($folioId, $type, $description, $amount, $folio->getTenantId());
        $adj->setAdjustedBy($userId);
        $adj->setReason($reason);
        $this->em->persist($adj);

        $this->em->flush();
        $this->recalculate($folio);
        $this->em->flush();

        return $adj;
    }

    // ═══ Close / Void ═════════════════════════════════════════

    public function close(string $folioId, ?string $userId = null): Folio
    {
        $folio = $this->folioRepo->findOrFail($folioId);
        if ($folio->getStatus() !== FolioStatus::OPEN) {
            throw new \InvalidArgumentException('Folio is not open');
        }

        $folio->setStatus(FolioStatus::CLOSED);
        $folio->setClosedAt(new \DateTimeImmutable());
        $folio->setClosedBy($userId);
        $this->em->flush();

        return $folio;
    }

    public function voidFolio(string $folioId, ?string $userId = null): Folio
    {
        $folio = $this->folioRepo->findOrFail($folioId);
        $folio->setStatus(FolioStatus::VOID);
        $folio->setClosedAt(new \DateTimeImmutable());
        $folio->setClosedBy($userId);
        $this->em->flush();

        return $folio;
    }

    // ═══ Pending Payments ═════════════════════════════════════

    public function getPendingPayments(string $propertyId): array
    {
        return $this->paymentRepo->findPendingByProperty($propertyId);
    }

    /**
     * Returns flat context array for a payment receipt email.
     * Includes folio_number + payment fields.
     * @throws \InvalidArgumentException if payment not found
     */
    public function getPaymentReceiptContext(string $paymentId): array
    {
        /** @var \Lodgik\Entity\FolioPayment|null $payment */
        $payment = $this->paymentRepo->findOrFail($paymentId);
        $folio   = $this->folioRepo->findOrFail($payment->getFolioId());

        $data = $payment->toArray();
        $data['folio_number'] = $folio->getFolioNumber();
        $data['receipt_url']  = $payment->getProofImageUrl();

        return $data;
    }

    // ═══ Internal ═════════════════════════════════════════════

    private function recalculate(Folio $folio): void
    {
        $charges = $this->chargeRepo->sumByFolio($folio->getId());
        $payments = $this->paymentRepo->sumConfirmedByFolio($folio->getId());
        $adjustments = $this->adjustmentRepo->sumByFolio($folio->getId());
        $folio->recalculate($charges, $payments, $adjustments);
    }
}

<?php
declare(strict_types=1);

namespace Lodgik\Module\GuestCard;

use Doctrine\ORM\EntityManagerInterface;
use Lodgik\Entity\GuestCard;
use Lodgik\Entity\GuestCardEvent;
use Lodgik\Entity\CardScanPoint;
use Lodgik\Enum\GuestCardEventType;
use Lodgik\Enum\GuestCardStatus;
use Lodgik\Enum\ScanPointType;
use Lodgik\Helper\UuidHelper;
use Lodgik\Module\Folio\FolioService;
use Lodgik\Repository\BookingRepository;
use Lodgik\Repository\CardScanPointRepository;
use Lodgik\Repository\FolioRepository;
use Lodgik\Repository\GuestCardEventRepository;
use Lodgik\Repository\GuestCardRepository;
use Lodgik\Repository\GuestRepository;
use Psr\Log\LoggerInterface;

final class GuestCardService
{
    public function __construct(
        private readonly EntityManagerInterface   $em,
        private readonly GuestCardRepository      $cardRepo,
        private readonly GuestCardEventRepository $eventRepo,
        private readonly CardScanPointRepository  $scanPointRepo,
        private readonly BookingRepository        $bookingRepo,
        private readonly GuestRepository          $guestRepo,
        private readonly FolioRepository          $folioRepo,
        private readonly FolioService             $folioService,
        private readonly LoggerInterface          $logger,
    ) {}

    // ══════════════════════════════════════════════════════════════
    // PHASE A — Card Issuance & Core Scan
    // ══════════════════════════════════════════════════════════════

    /**
     * Register blank cards into property inventory.
     * card_uid is the pre-printed value on the card (from RFID manufacturer).
     */
    public function registerCard(string $propertyId, string $cardUid, string $cardNumber, string $tenantId): GuestCard
    {
        if ($this->cardRepo->uidExists($cardUid)) {
            throw new \RuntimeException("Card UID '{$cardUid}' is already registered in the system.");
        }

        $card = new GuestCard($propertyId, $cardUid, $cardNumber, $tenantId);
        $this->em->persist($card);
        $this->em->flush();

        $this->logger->info("Card registered: {$cardNumber} ({$cardUid}) for property {$propertyId}");
        return $card;
    }

    /**
     * Register cards in bulk from a CSV-style array: [[card_uid, card_number], ...]
     */
    public function registerCardsBulk(string $propertyId, array $cards, string $tenantId): array
    {
        $registered = [];
        $skipped    = [];

        foreach ($cards as $item) {
            $uid    = trim($item['card_uid']    ?? $item[0] ?? '');
            $number = trim($item['card_number'] ?? $item[1] ?? '');

            if (!$uid || !$number) { $skipped[] = $item; continue; }

            if ($this->cardRepo->uidExists($uid)) {
                $skipped[] = ['uid' => $uid, 'reason' => 'duplicate'];
                continue;
            }

            $card = new GuestCard($propertyId, $uid, $number, $tenantId);
            $this->em->persist($card);
            $registered[] = $card;
        }

        $this->em->flush();
        $this->logger->info(count($registered) . " cards registered, " . count($skipped) . " skipped for property {$propertyId}");
        return ['registered' => $registered, 'skipped' => $skipped];
    }

    /**
     * Issue a card to a booking at check-in. Returns the card.
     */
    public function issueCard(string $bookingId, ?string $cardUid, string $issuedBy, string $tenantId): GuestCard
    {
        $booking = $this->bookingRepo->find($bookingId);
        if (!$booking) throw new \RuntimeException('Booking not found');

        // If specific card UID provided, use it; otherwise auto-assign next available
        if ($cardUid) {
            $card = $this->cardRepo->findByUidOrFail($cardUid);
            if (!in_array($card->getStatus(), [GuestCardStatus::AVAILABLE, GuestCardStatus::DEACTIVATED])) {
                throw new \RuntimeException("Card {$cardUid} is not available (status: {$card->getStatus()->value})");
            }
        } else {
            $available = $this->cardRepo->findAvailable($booking->getPropertyId(), 1);
            if (empty($available)) throw new \RuntimeException('No available cards in inventory. Please register more cards first.');
            $card = $available[0];
        }

        $card->issue($bookingId, $booking->getGuestId(), $issuedBy);
        $this->em->flush();

        // Log the issuance event
        $this->logEvent($card, GuestCardEventType::CHECK_IN, $tenantId, $booking->getPropertyId(), [
            'booking_ref' => $booking->getBookingRef(),
            'issued_by'   => $issuedBy,
        ], scannedBy: $issuedBy);

        $this->logger->info("Card {$card->getCardNumber()} issued to booking {$booking->getBookingRef()}");
        return $card;
    }

    // ══════════════════════════════════════════════════════════════
    // PHASE A — Universal Scan
    // ══════════════════════════════════════════════════════════════

    /**
     * The single entry-point for ALL scan operations across the property.
     * Returns context-specific response data.
     */
    public function scan(
        string  $cardUid,
        string  $context,
        string  $tenantId,
        ?string $scanPointId   = null,
        ?string $scanDeviceId  = null,
        ?string $chargeAmount  = null,
        ?string $chargeDesc    = null,
        ?string $scannedBy     = null,
    ): array {
        // 1. Resolve card
        $card = $this->cardRepo->findByUid($cardUid);
        if (!$card) {
            return $this->denyResponse('Card not found in system', 'unknown_card');
        }

        // 2. Resolve scan point metadata
        $scanPoint     = null;
        $scanPointName = null;
        $scanPointType = null;

        if ($scanPointId) {
            $scanPoint     = $this->scanPointRepo->find($scanPointId);
            $scanPointName = $scanPoint?->getName();
            $scanPointType = $scanPoint?->getScanPointType();
        }

        // 3. Reject lost/deactivated/replaced cards immediately
        if (!$card->isUsable()) {
            $event = $this->logEvent($card, GuestCardEventType::ACCESS_DENIED, $tenantId, $card->getPropertyId(), [
                'reason'      => "Card status: {$card->getStatus()->value}",
                'context'     => $context,
                'scan_point'  => $scanPointName,
            ], $scanPointId, $scanPointType, $scanDeviceId, $scannedBy);

            return $this->denyResponse(
                "This card is {$card->getStatus()->label()} and cannot be used.",
                $card->getStatus()->value,
                $this->buildCardMeta($card)
            );
        }

        // 4. Route to context handler
        return match($context) {
            'reception_lookup' => $this->handleReceptionLookup($card, $tenantId, $scanPointId, $scanPointName, $scanPointType, $scanDeviceId, $scannedBy),
            'checkout'         => $this->handleCheckout($card, $tenantId, $scanPointId, $scanPointName, $scanPointType, $scanDeviceId, $scannedBy),
            'entry'            => $this->handleMovement($card, GuestCardEventType::ENTRY, $tenantId, $scanPointId, $scanPointName, $scanPointType, $scanDeviceId, $scannedBy),
            'exit'             => $this->handleMovement($card, GuestCardEventType::EXIT, $tenantId, $scanPointId, $scanPointName, $scanPointType, $scanDeviceId, $scannedBy),
            'security_entry'   => $this->handleSecurityEntry($card, $tenantId, $scanPointId, $scanPointName, $scanPointType, $scanDeviceId, $scannedBy),
            'security_exit'    => $this->handleSecurityExit($card, $tenantId, $scanPointId, $scanPointName, $scanPointType, $scanDeviceId, $scannedBy),
            'facility_access'  => $this->handleFacilityAccess($card, $tenantId, $scanPointId, $scanPointName, $scanPointType, $scanDeviceId, $scannedBy),
            'pos_charge'       => $this->handlePosCharge($card, $tenantId, $scanPointId, $scanPointName, $scanPointType, $scanDeviceId, $chargeAmount, $chargeDesc, $scannedBy),
            default            => $this->denyResponse("Unknown scan context: {$context}", 'invalid_context'),
        };
    }

    // ── Context handlers ─────────────────────────────────────────

    private function handleReceptionLookup(GuestCard $card, string $tenantId, ?string $spId, ?string $spName, ?ScanPointType $spType, ?string $deviceId, ?string $scannedBy): array
    {
        $this->logEvent($card, GuestCardEventType::RECEPTION_LOOKUP, $tenantId, $card->getPropertyId(), ['scan_point' => $spName], $spId, $spType, $deviceId, $scannedBy);

        $booking = $card->getBookingId() ? $this->bookingRepo->find($card->getBookingId()) : null;
        $guest   = $card->getGuestId()   ? $this->guestRepo->find($card->getGuestId())   : null;
        $folio   = $booking              ? $this->folioRepo->findByBooking($booking->getId()) : null;

        return [
            'allowed'      => true,
            'context'      => 'reception_lookup',
            'card'         => $this->serializeCard($card),
            'guest'        => $guest ? $this->serializeGuest($guest) : null,
            'booking'      => $booking ? $this->serializeBooking($booking) : null,
            'folio_summary'=> $folio ? $this->serializeFolioSummary($folio) : null,
        ];
    }

    private function handleCheckout(GuestCard $card, string $tenantId, ?string $spId, ?string $spName, ?ScanPointType $spType, ?string $deviceId, ?string $scannedBy): array
    {
        $this->logEvent($card, GuestCardEventType::CHECK_OUT, $tenantId, $card->getPropertyId(), ['scan_point' => $spName], $spId, $spType, $deviceId, $scannedBy);

        $booking = $card->getBookingId() ? $this->bookingRepo->find($card->getBookingId()) : null;
        $guest   = $card->getGuestId()   ? $this->guestRepo->find($card->getGuestId())   : null;
        $folio   = $booking              ? $this->folioRepo->findByBooking($booking->getId()) : null;

        return [
            'allowed'       => true,
            'context'       => 'checkout',
            'action_required'=> 'confirm_checkout',    // Staff must confirm via booking endpoint
            'card'          => $this->serializeCard($card),
            'guest'         => $guest ? $this->serializeGuest($guest) : null,
            'booking'       => $booking ? $this->serializeBooking($booking) : null,
            'folio_summary' => $folio ? $this->serializeFolioSummary($folio) : null,
            'message'       => 'Folio loaded. Confirm checkout to proceed.',
        ];
    }

    private function handleMovement(GuestCard $card, GuestCardEventType $type, string $tenantId, ?string $spId, ?string $spName, ?ScanPointType $spType, ?string $deviceId, ?string $scannedBy): array
    {
        $this->logEvent($card, $type, $tenantId, $card->getPropertyId(), ['scan_point' => $spName], $spId, $spType, $deviceId, $scannedBy);
        $guest = $card->getGuestId() ? $this->guestRepo->find($card->getGuestId()) : null;

        return [
            'allowed'  => true,
            'context'  => $type->value,
            'card'     => $this->serializeCard($card),
            'guest'    => $guest ? ['name' => $guest->getFullName(), 'id' => $guest->getId()] : null,
            'message'  => $type === GuestCardEventType::ENTRY ? 'Entry logged.' : 'Exit logged.',
        ];
    }

    private function handleSecurityEntry(GuestCard $card, string $tenantId, ?string $spId, ?string $spName, ?ScanPointType $spType, ?string $deviceId, ?string $scannedBy): array
    {
        $booking = $card->getBookingId() ? $this->bookingRepo->find($card->getBookingId()) : null;
        $guest   = $card->getGuestId()   ? $this->guestRepo->find($card->getGuestId())   : null;

        $this->logEvent($card, GuestCardEventType::SECURITY_ENTRY, $tenantId, $card->getPropertyId(), [
            'scan_point'  => $spName,
            'guest_name'  => $guest?->getFullName(),
            'room_number' => $booking?->getRoomId(),
        ], $spId, $spType, $deviceId, $scannedBy);

        return [
            'allowed'    => true,
            'context'    => 'security_entry',
            'card'       => $this->serializeCard($card),
            'guest'      => $guest ? $this->serializeGuest($guest) : null,
            'booking'    => $booking ? [
                'booking_ref' => $booking->getBookingRef(),
                'check_out'   => $booking->getCheckOut()->format('c'),
                'status'      => $booking->getStatus()->value,
            ] : null,
            'message'    => 'Security entry logged.',
        ];
    }

    private function handleSecurityExit(GuestCard $card, string $tenantId, ?string $spId, ?string $spName, ?ScanPointType $spType, ?string $deviceId, ?string $scannedBy): array
    {
        $booking = $card->getBookingId() ? $this->bookingRepo->find($card->getBookingId()) : null;
        $guest   = $card->getGuestId()   ? $this->guestRepo->find($card->getGuestId())   : null;
        $folio   = $booking              ? $this->folioRepo->findByBooking($booking->getId()) : null;

        // Check for outstanding balance — alert but don't block (guest is leaving)
        $outstandingBalance = '0.00';
        $hasOutstanding     = false;
        if ($folio) {
            $outstandingBalance = $folio->getBalance();
            $hasOutstanding     = (float) $outstandingBalance > 0;
        }

        $this->logEvent($card, GuestCardEventType::SECURITY_EXIT, $tenantId, $card->getPropertyId(), [
            'scan_point'          => $spName,
            'guest_name'          => $guest?->getFullName(),
            'outstanding_balance' => $outstandingBalance,
            'has_outstanding'     => $hasOutstanding,
        ], $spId, $spType, $deviceId, $scannedBy);

        return [
            'allowed'             => true,
            'context'             => 'security_exit',
            'card'                => $this->serializeCard($card),
            'guest'               => $guest ? $this->serializeGuest($guest) : null,
            'outstanding_balance' => $outstandingBalance,
            'has_outstanding'     => $hasOutstanding,
            'alert'               => $hasOutstanding
                ? "⚠️ Guest has outstanding balance of ₦{$outstandingBalance}. Notify reception."
                : null,
            'message'             => 'Final exit logged.',
        ];
    }

    private function handleFacilityAccess(GuestCard $card, string $tenantId, ?string $spId, ?string $spName, ?ScanPointType $spType, ?string $deviceId, ?string $scannedBy): array
    {
        $booking = $card->getBookingId() ? $this->bookingRepo->find($card->getBookingId()) : null;
        $guest   = $card->getGuestId()   ? $this->guestRepo->find($card->getGuestId())   : null;

        // Booking must be in checked_in status to access facilities
        $allowed = $booking && $booking->getStatus()->value === 'checked_in';

        $eventType = $allowed ? GuestCardEventType::FACILITY_ACCESS : GuestCardEventType::ACCESS_DENIED;
        $this->logEvent($card, $eventType, $tenantId, $card->getPropertyId(), [
            'facility'    => $spName,
            'reason'      => $allowed ? null : 'Booking not in checked_in status',
        ], $spId, $spType, $deviceId, $scannedBy);

        if (!$allowed) {
            return $this->denyResponse(
                'Facility access denied. No active checked-in booking found.',
                'booking_not_active',
                $this->buildCardMeta($card)
            );
        }

        return [
            'allowed'  => true,
            'context'  => 'facility_access',
            'facility' => $spName,
            'guest'    => $guest ? ['name' => $guest->getFullName()] : null,
            'message'  => "Access granted to {$spName}.",
        ];
    }

    private function handlePosCharge(GuestCard $card, string $tenantId, ?string $spId, ?string $spName, ?ScanPointType $spType, ?string $deviceId, ?string $chargeAmount, ?string $chargeDesc, ?string $scannedBy): array
    {
        if (!$chargeAmount || (float) $chargeAmount <= 0) {
            return $this->denyResponse('charge_amount is required and must be > 0 for pos_charge context', 'missing_amount');
        }

        $booking = $card->getBookingId() ? $this->bookingRepo->find($card->getBookingId()) : null;
        if (!$booking || $booking->getStatus()->value !== 'checked_in') {
            return $this->denyResponse('No active booking found for this card. Cannot post charge.', 'no_active_booking', $this->buildCardMeta($card));
        }

        $folio = $this->folioRepo->findByBooking($booking->getId());
        if (!$folio) {
            return $this->denyResponse('No open folio found for this booking.', 'no_folio', $this->buildCardMeta($card));
        }

        // Post charge to folio
        $desc   = $chargeDesc ?? ($spName ? "Charge at {$spName}" : 'Card Scan Charge');
        $charge = $this->folioService->addCharge(
            $folio->getId(),
            'bar',          // category — POS charges always 'bar' (covers F&B + misc)
            $desc,
            $chargeAmount,
            1,
            $scannedBy
        );

        $this->logEvent($card, GuestCardEventType::POS_CHARGE, $tenantId, $card->getPropertyId(), [
            'amount'       => $chargeAmount,
            'description'  => $desc,
            'scan_point'   => $spName,
        ], $spId, $spType, $deviceId, $scannedBy, $folio->getId(), $chargeAmount);

        $guest = $card->getGuestId() ? $this->guestRepo->find($card->getGuestId()) : null;

        return [
            'allowed'         => true,
            'context'         => 'pos_charge',
            'guest'           => $guest ? ['name' => $guest->getFullName()] : null,
            'charge'          => [
                'id'          => $charge->getId(),
                'description' => $desc,
                'amount'      => $chargeAmount,
            ],
            'folio_balance'   => $this->folioRepo->findByBooking($booking->getId())?->getBalance(),
            'message'         => "₦{$chargeAmount} charged to room.",
        ];
    }

    // ══════════════════════════════════════════════════════════════
    // PHASE B — Lost / Replace / Deactivate
    // ══════════════════════════════════════════════════════════════

    public function reportLost(string $cardId, string $tenantId, ?string $replaceWith = null, ?string $notes = null, ?string $userId = null): array
    {
        $card = $this->cardRepo->findOrFail($cardId);

        // Issue replacement if requested
        $newCard = null;
        if ($replaceWith) {
            $newCard = $this->cardRepo->findByUidOrFail($replaceWith);
            if (!in_array($newCard->getStatus(), [GuestCardStatus::AVAILABLE, GuestCardStatus::DEACTIVATED])) {
                throw new \RuntimeException("Replacement card {$replaceWith} is not available.");
            }
            if ($card->getBookingId()) {
                $newCard->issue($card->getBookingId(), $card->getGuestId() ?? '', $userId ?? 'system');
            }
        }

        $card->markLost($newCard?->getId() ?? '');
        if ($notes) $card->setNotes($notes);

        $this->logEvent($card, GuestCardEventType::LOST_REPORTED, $tenantId, $card->getPropertyId(), [
            'notes'           => $notes,
            'replaced_by_uid' => $newCard?->getCardUid(),
        ], scannedBy: $userId);

        $this->em->flush();
        $this->logger->info("Card {$card->getCardNumber()} reported lost" . ($newCard ? ", replaced by {$newCard->getCardNumber()}" : ''));

        return ['original' => $this->serializeCard($card), 'replacement' => $newCard ? $this->serializeCard($newCard) : null];
    }

    public function deactivate(string $cardId, string $tenantId, string $reason = 'manual', ?string $userId = null): GuestCard
    {
        $card = $this->cardRepo->findOrFail($cardId);
        $card->deactivate($reason);

        $this->logEvent($card, GuestCardEventType::DEACTIVATED, $tenantId, $card->getPropertyId(), [
            'reason'       => $reason,
            'deactivated_by'=> $userId,
        ], scannedBy: $userId);

        $this->em->flush();
        return $card;
    }

    /**
     * Deactivate all cards linked to a booking — called automatically at checkout.
     */
    public function deactivateForBooking(string $bookingId, string $tenantId): int
    {
        $cards = $this->cardRepo->findActiveByBooking($bookingId);
        foreach ($cards as $card) {
            $card->deactivate('checkout');
            $this->logEvent($card, GuestCardEventType::DEACTIVATED, $tenantId, $card->getPropertyId(), [
                'reason' => 'Auto-deactivated at checkout',
            ]);
        }
        if ($cards) $this->em->flush();
        return count($cards);
    }

    // ══════════════════════════════════════════════════════════════
    // PHASE C & D — Scan Points & Reporting
    // ══════════════════════════════════════════════════════════════

    public function createScanPoint(string $propertyId, string $name, string $type, string $tenantId, ?string $locationDesc = null): CardScanPoint
    {
        $sp = new CardScanPoint($propertyId, $name, ScanPointType::from($type), $tenantId);
        if ($locationDesc) $sp->setLocationDesc($locationDesc);
        $this->em->persist($sp);
        $this->em->flush();
        return $sp;
    }

    public function updateScanPoint(string $id, array $data): CardScanPoint
    {
        $sp = $this->scanPointRepo->findOrFail($id);
        if (isset($data['name']))          $sp->setName($data['name']);
        if (isset($data['scan_point_type'])) $sp->setScanPointType(ScanPointType::from($data['scan_point_type']));
        if (isset($data['location_desc'])) $sp->setLocationDesc($data['location_desc']);
        if (isset($data['is_active']))     $sp->setIsActive((bool) $data['is_active']);
        $this->em->flush();
        return $sp;
    }

    public function regenerateScanPointKey(string $id): CardScanPoint
    {
        $sp = $this->scanPointRepo->findOrFail($id);
        $sp->regenerateDeviceKey();
        $this->em->flush();
        return $sp;
    }

    public function deleteScanPoint(string $id): void
    {
        $sp = $this->scanPointRepo->findOrFail($id);
        $this->em->remove($sp);
        $this->em->flush();
    }

    public function getInventoryReport(string $propertyId): array
    {
        $counts    = $this->cardRepo->countByStatus($propertyId);
        $available = $counts[GuestCardStatus::AVAILABLE->value] ?? 0;
        $active    = $counts[GuestCardStatus::ACTIVE->value]    ?? 0;
        $issued    = $counts[GuestCardStatus::ISSUED->value]    ?? 0;
        $lost      = $counts[GuestCardStatus::LOST->value]      ?? 0;
        $deactivated = $counts[GuestCardStatus::DEACTIVATED->value] ?? 0;
        $replaced  = $counts[GuestCardStatus::REPLACED->value]  ?? 0;
        $total     = array_sum($counts);

        return [
            'total'       => $total,
            'available'   => $available,
            'in_use'      => $active + $issued,
            'deactivated' => $deactivated,
            'lost'        => $lost,
            'replaced'    => $replaced,
            'breakdown'   => $counts,
        ];
    }

    // ══════════════════════════════════════════════════════════════
    // Private helpers
    // ══════════════════════════════════════════════════════════════

    private function logEvent(
        GuestCard          $card,
        GuestCardEventType $type,
        string             $tenantId,
        string             $propertyId,
        array              $metadata    = [],
        ?string            $scanPointId = null,
        ?ScanPointType     $spType      = null,
        ?string            $deviceId    = null,
        ?string            $scannedBy   = null,
        ?string            $folioId     = null,
        ?string            $chargeAmount= null,
    ): GuestCardEvent {
        $event = new GuestCardEvent($tenantId, $propertyId, $card->getId(), $type);
        $event->setBookingId($card->getBookingId())
              ->setGuestId($card->getGuestId())
              ->setScanPointId($scanPointId)
              ->setScanPointType($spType)
              ->setScanDeviceId($deviceId)
              ->setScannedBy($scannedBy)
              ->setMetadata(array_filter($metadata, fn($v) => $v !== null))
              ->setFolioId($folioId)
              ->setChargeAmount($chargeAmount);

        // Resolve scan point name from metadata or ID
        if (!empty($metadata['scan_point'])) $event->setScanPoint($metadata['scan_point']);

        $this->em->persist($event);
        // Note: caller is responsible for flush or we batch flush
        $this->em->flush();
        return $event;
    }

    private function denyResponse(string $message, string $code, array $extra = []): array
    {
        return array_merge(['allowed' => false, 'error_code' => $code, 'message' => $message], $extra);
    }

    private function buildCardMeta(GuestCard $card): array
    {
        return ['card' => ['id' => $card->getId(), 'card_number' => $card->getCardNumber(), 'status' => $card->getStatus()->value]];
    }

    private function serializeCard(GuestCard $card): array
    {
        return [
            'id'           => $card->getId(),
            'card_uid'     => $card->getCardUid(),
            'card_number'  => $card->getCardNumber(),
            'status'       => $card->getStatus()->value,
            'status_label' => $card->getStatus()->label(),
            'status_color' => $card->getStatus()->color(),
            'booking_id'   => $card->getBookingId(),
            'guest_id'     => $card->getGuestId(),
            'issued_at'    => $card->getIssuedAt()?->format('c'),
        ];
    }

    private function serializeGuest(\Lodgik\Entity\Guest $guest): array
    {
        return [
            'id'    => $guest->getId(),
            'name'  => $guest->getFullName(),
            'email' => $guest->getEmail(),
            'phone' => $guest->getPhone(),
        ];
    }

    private function serializeBooking(\Lodgik\Entity\Booking $b): array
    {
        return [
            'id'           => $b->getId(),
            'booking_ref'  => $b->getBookingRef(),
            'status'       => $b->getStatus()->value,
            'room_id'      => $b->getRoomId(),
            'check_in'     => $b->getCheckIn()->format('c'),
            'check_out'    => $b->getCheckOut()->format('c'),
            'total_amount' => $b->getTotalAmount(),
        ];
    }

    private function serializeFolioSummary(\Lodgik\Entity\Folio $folio): array
    {
        return [
            'id'      => $folio->getId(),
            'status'  => $folio->getStatus()->value,
            'balance' => $folio->getBalance(),
        ];
    }
}

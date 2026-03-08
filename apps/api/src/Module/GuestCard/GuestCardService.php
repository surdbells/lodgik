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

    // ──────────────────────────────────────────────────────────────
    // Security-gate issuance (Feature: security-first card flow)
    // ──────────────────────────────────────────────────────────────

    /**
     * Security gate: scan an AVAILABLE card UID, optionally record a plate number.
     * Card moves to PENDING_CHECKIN — sits in the pending pool until reception
     * attaches it to a booking during check-in.
     *
     * Called by: POST /api/cards/security-issue
     * Roles: security, front_desk, receptionist, manager, property_admin
     */
    /**
     * Issue a card at the security gate by card_id (from search results).
     * Accepts guest name, phone, plate number — no booking needed yet.
     * Transitions card: AVAILABLE → PENDING_CHECKIN.
     */
    public function gateIssueCardById(
        string  $cardId,
        string  $propertyId,
        string  $issuedBy,
        string  $tenantId,
        ?string $guestName   = null,
        ?string $phone       = null,
        ?string $plateNumber = null,
        ?string $bookingRef  = null,
        ?string $notes       = null,
    ): GuestCard {
        $card = $this->cardRepo->find($cardId);
        if (!$card) throw new \DomainException('Card not found.');

        if ($card->getStatus() !== GuestCardStatus::AVAILABLE) {
            throw new \DomainException(
                "Card {$card->getCardNumber()} cannot be issued at gate — status: {$card->getStatus()->label()}."
            );
        }
        if ($card->getPropertyId() !== $propertyId) {
            throw new \DomainException('Card does not belong to this property.');
        }

        $card->issueAtGate($issuedBy, $plateNumber, $guestName, $phone);
        if ($notes) $card->setNotes($notes);
        $this->em->flush();

        $this->logEvent(
            $card, GuestCardEventType::ISSUED, $tenantId, $propertyId,
            ['method' => 'security_gate', 'guest_name' => $guestName, 'phone' => $phone, 'plate' => $plateNumber, 'booking_ref' => $bookingRef],
            scannedBy: $issuedBy,
        );

        return $card;
    }

    public function securityIssueCard(
        string  $propertyId,
        string  $cardUid,
        string  $issuedBy,
        string  $tenantId,
        ?string $plateNumber = null,
    ): GuestCard {
        $card = $this->cardRepo->findByUidOrFail($cardUid);

        // Guard: only AVAILABLE cards can be issued at the gate
        if ($card->getStatus() !== GuestCardStatus::AVAILABLE) {
            throw new \DomainException(
                "Card {$card->getCardNumber()} cannot be issued at gate — current status: {$card->getStatus()->label()}. " .
                "Only 'available' cards can be issued at the gate."
            );
        }

        // Guard: card must belong to the same property
        if ($card->getPropertyId() !== $propertyId) {
            throw new \DomainException('Card does not belong to this property.');
        }

        $card->issueAtGate($issuedBy, $plateNumber);
        $this->em->flush();

        $this->logEvent(
            $card,
            GuestCardEventType::ISSUED,
            $tenantId,
            $propertyId,
            [
                'issued_by'    => $issuedBy,
                'plate_number' => $plateNumber,
                'method'       => 'security_gate',
            ],
            scannedBy: $issuedBy,
        );

        $plateInfo = $plateNumber ? " (plate: {$plateNumber})" : '';
        $this->logger->info("Card {$card->getCardNumber()} issued at gate by security{$plateInfo}");
        return $card;
    }

    /**
     * Reception: attach a PENDING_CHECKIN card to a booking.
     * Card transitions PENDING_CHECKIN → ACTIVE.
     * The booking's check-in process should call this before (or instead of) issueCard
     * when card enforcement is enabled.
     *
     * Called by: POST /api/cards/{id}/attach-booking
     * Roles: front_desk, receptionist, manager, property_admin
     */
    public function attachCardToBooking(
        string $cardId,
        string $bookingId,
        string $userId,
        string $tenantId,
    ): GuestCard {
        $card    = $this->cardRepo->findOrFail($cardId);
        $booking = $this->bookingRepo->find($bookingId);

        if (!$booking) {
            throw new \RuntimeException('Booking not found.');
        }

        // Allow attaching PENDING_CHECKIN or AVAILABLE cards
        // (AVAILABLE = enforcement off or card was not pre-issued at gate)
        if (!in_array($card->getStatus(), [GuestCardStatus::PENDING_CHECKIN, GuestCardStatus::AVAILABLE])) {
            throw new \DomainException(
                "Card {$card->getCardNumber()} cannot be attached — status: {$card->getStatus()->label()}. " .
                "Only 'pending_checkin' or 'available' cards can be attached to a booking."
            );
        }

        // Guard: ensure card belongs to the same property as the booking
        if ($card->getPropertyId() !== $booking->getPropertyId()) {
            throw new \DomainException('Card property does not match booking property.');
        }

        // Guard: booking must not already have an active card
        $existing = $this->cardRepo->findActiveCardForBooking($bookingId);
        if ($existing !== null) {
            throw new \DomainException(
                "Booking {$booking->getBookingRef()} already has an active card ({$existing->getCardNumber()})."
            );
        }

        $card->attachToBooking($bookingId, $booking->getGuestId());
        $this->em->flush();

        $this->logEvent(
            $card,
            GuestCardEventType::CHECK_IN,
            $tenantId,
            $booking->getPropertyId(),
            [
                'booking_ref'         => $booking->getBookingRef(),
                'attached_by'         => $userId,
                'plate_number'        => $card->getPlateNumber(),
                'issued_by_security'  => $card->isIssuedBySecurity(),
            ],
            scannedBy: $userId,
        );

        $this->logger->info("Card {$card->getCardNumber()} attached to booking {$booking->getBookingRef()}");
        return $card;
    }

    /**
     * Return all PENDING_CHECKIN cards for a property.
     * Reception uses this to pick a card for a guest checking in.
     *
     * Called by: GET /api/cards/pending?property_id=
     */
    public function listPendingCards(string $propertyId, string $tenantId): array
    {
        return $this->cardRepo->findByPropertyAndStatus($propertyId, GuestCardStatus::PENDING_CHECKIN);
    }



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
        $counts         = $this->cardRepo->countByStatus($propertyId);
        $available      = $counts[GuestCardStatus::AVAILABLE->value]        ?? 0;
        $active         = $counts[GuestCardStatus::ACTIVE->value]           ?? 0;
        $issued         = $counts[GuestCardStatus::ISSUED->value]           ?? 0;
        $pendingCheckin = $counts[GuestCardStatus::PENDING_CHECKIN->value]  ?? 0;
        $lost           = $counts[GuestCardStatus::LOST->value]             ?? 0;
        $deactivated    = $counts[GuestCardStatus::DEACTIVATED->value]      ?? 0;
        $replaced       = $counts[GuestCardStatus::REPLACED->value]         ?? 0;
        $total          = array_sum($counts);

        return [
            'total'           => $total,
            'available'       => $available,
            'pending_checkin' => $pendingCheckin,
            'in_use'          => $active + $issued,
            'deactivated'     => $deactivated,
            'lost'            => $lost,
            'replaced'        => $replaced,
            'breakdown'       => $counts,
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

    // ── Security Exit (processes guest leaving the premises) ──────

    /**
     * Security confirms a guest has exited the premises.
     * Revokes the card, logs the event, and triggers discrepancy check.
     */
    public function securityProcessExit(
        string $cardId,
        string $propertyId,
        string $tenantId,
        string $processedBy,
    ): GuestCard {
        $card = $this->cardRepo->find($cardId);
        if (!$card) throw new \DomainException('Card not found.');
        if ($card->getPropertyId() !== $propertyId) throw new \DomainException('Card does not belong to this property.');

        $allowedStatuses = [GuestCardStatus::ACTIVE, GuestCardStatus::PENDING_CHECKIN, GuestCardStatus::ISSUED];
        if (!in_array($card->getStatus(), $allowedStatuses, true)) {
            throw new \DomainException("Cannot process exit — card status: {$card->getStatus()->label()}.");
        }

        $now = new \DateTimeImmutable();
        $card->setSecurityExitAt($now);
        $card->deactivate($processedBy, 'Security exit — premises cleared');

        $this->em->flush();

        $this->logEvent(
            $card, GuestCardEventType::SECURITY_EXIT, $tenantId, $propertyId,
            ['processed_by' => $processedBy, 'method' => 'security_tablet'],
            scannedBy: $processedBy,
        );

        // Trigger discrepancy check
        $this->checkoutDiscrepancyCheck($card, $tenantId, $propertyId);

        return $card;
    }

    /**
     * Called by booking checkout — records the receptionist checkout time on the card.
     * Triggers discrepancy check if security exit already happened (or deferred if not yet).
     */
    public function recordReceptionistCheckout(GuestCard $card, string $tenantId, string $propertyId): void
    {
        $card->setReceptionistCheckoutAt(new \DateTimeImmutable());
        $this->em->flush();
        $this->checkoutDiscrepancyCheck($card, $tenantId, $propertyId);
    }

    /**
     * Look up a card by card_number or card_uid from a query string.
     * Used by the exit checkout search box.
     */
    public function lookupByQuery(string $propertyId, string $q): ?array
    {
        $q = trim($q);
        if (strlen($q) < 2) return null;

        // Try card_number first, then card_uid
        $card = $this->cardRepo->findOneBy(['cardNumber' => $q, 'propertyId' => $propertyId])
             ?? $this->cardRepo->findOneBy(['cardUid' => $q, 'propertyId' => $propertyId]);

        if (!$card) return null;
        return $this->serializeCard($card);
    }

    /**
     * Get discrepancy report for a property.
     */
    public function getDiscrepancies(string $propertyId, ?string $type = null, int $page = 1, int $limit = 30): array
    {
        $conn = $this->em->getConnection();
        $sql  = "SELECT * FROM checkout_discrepancies WHERE property_id = :pid";
        $params = ['pid' => $propertyId];
        if ($type) { $sql .= " AND discrepancy_type = :type"; $params['type'] = $type; }
        $sql .= " ORDER BY created_at DESC LIMIT :lim OFFSET :off";
        $params['lim'] = $limit;
        $params['off'] = ($page - 1) * $limit;
        return $conn->fetchAllAssociative($sql, $params);
    }

    // ── Private: Discrepancy check ────────────────────────────────

    private function checkoutDiscrepancyCheck(GuestCard $card, string $tenantId, string $propertyId): void
    {
        $receptionAt  = $card->getReceptionistCheckoutAt();
        $securityAt   = $card->getSecurityExitAt();

        // Load property threshold setting
        $threshold = 30; // default
        try {
            $conn      = $this->em->getConnection();
            $settings  = $conn->fetchOne("SELECT settings FROM properties WHERE id = :id", ['id' => $propertyId]);
            if ($settings) {
                $s = json_decode($settings, true);
                $threshold = (int) ($s['checkout_discrepancy_threshold_minutes'] ?? 30);
            }
        } catch (\Throwable) {}

        $discrepancyType = null;
        $gapMinutes      = null;
        $severity        = 'medium';

        if ($receptionAt && !$securityAt) {
            // Receptionist checked out but no security exit within threshold
            $minsElapsed = (int) round((time() - $receptionAt->getTimestamp()) / 60);
            if ($minsElapsed >= $threshold) {
                $discrepancyType = 'missing_security_exit';
                $gapMinutes      = $minsElapsed;
                $severity        = 'high';
            }
        } elseif ($securityAt && !$receptionAt) {
            // Security exited but receptionist never checked out
            $discrepancyType = 'missing_receptionist_checkout';
            $severity        = 'medium';
        } elseif ($receptionAt && $securityAt) {
            // Both happened — check gap
            $gapMinutes = (int) round(abs($securityAt->getTimestamp() - $receptionAt->getTimestamp()) / 60);
            if ($gapMinutes > $threshold) {
                $discrepancyType = 'gap_exceeded';
                $severity        = $gapMinutes > ($threshold * 2) ? 'high' : 'medium';
            }
        }

        if (!$discrepancyType) return;

        // Insert discrepancy record
        try {
            $conn = $this->em->getConnection();
            $conn->insert('checkout_discrepancies', [
                'id'                         => \Lodgik\Helper\UuidHelper::generate(),
                'tenant_id'                  => $tenantId,
                'property_id'                => $propertyId,
                'guest_card_id'              => $card->getId(),
                'card_number'                => $card->getCardNumber(),
                'guest_name'                 => $card->getGateGuestName(),
                'discrepancy_type'           => $discrepancyType,
                'receptionist_checkout_at'   => $receptionAt?->format('c'),
                'security_exit_at'           => $securityAt?->format('c'),
                'gap_minutes'                => $gapMinutes,
                'threshold_minutes'          => $threshold,
                'severity'                   => $severity,
                'created_at'                 => (new \DateTimeImmutable())->format('c'),
            ]);
        } catch (\Throwable $e) {
            $this->logger->warning("Failed to write checkout discrepancy: {$e->getMessage()}");
        }
    }
}

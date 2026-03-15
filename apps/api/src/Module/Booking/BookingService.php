<?php

declare(strict_types=1);

namespace Lodgik\Module\Booking;

use Doctrine\ORM\EntityManagerInterface;
use Lodgik\Entity\AutoCheckoutLog;
use Lodgik\Entity\Booking;
use Lodgik\Entity\BookingAddon;
use Lodgik\Entity\BookingStatusLog;
use Lodgik\Entity\Guest;
use Lodgik\Entity\Property;
use Lodgik\Entity\Room;
use Lodgik\Entity\RoomStatusLog;
use Lodgik\Entity\RoomType;
use Lodgik\Enum\BookingStatus;
use Lodgik\Enum\BookingType;
use Lodgik\Enum\RoomStatus;
use Lodgik\Module\Booking\DTO\CreateBookingRequest;
use Lodgik\Module\Room\RoomStatusMachine;
use Lodgik\Repository\BookingAddonRepository;
use Lodgik\Repository\BookingRepository;
use Lodgik\Repository\BookingStatusLogRepository;
use Lodgik\Repository\GuestRepository;
use Lodgik\Repository\RoomRepository;
use Lodgik\Repository\RoomTypeRepository;
use Psr\Log\LoggerInterface;

final class BookingService
{
    public function __construct(
        private readonly EntityManagerInterface $em,
        private readonly BookingRepository $bookingRepo,
        private readonly BookingAddonRepository $addonRepo,
        private readonly BookingStatusLogRepository $statusLogRepo,
        private readonly GuestRepository $guestRepo,
        private readonly RoomRepository $roomRepo,
        private readonly RoomTypeRepository $roomTypeRepo,
        private readonly BookingStateMachine $stateMachine,
        private readonly RoomStatusMachine $roomStateMachine,
        private readonly RateCalculator $rateCalc,
        private readonly LoggerInterface $logger,
        private readonly \Lodgik\Module\Folio\FolioService $folioService,
        private readonly \Lodgik\Module\Invoice\InvoiceService $invoiceService,
        private readonly ?\Lodgik\Module\GuestAuth\GuestAuthService $guestAuthService = null,
        private readonly ?\Lodgik\Module\Housekeeping\HousekeepingService $housekeepingService = null,
        private readonly ?\Lodgik\Repository\GuestCardRepository $cardRepo = null,
        private readonly ?\Lodgik\Repository\PropertyRepository $propertyRepo = null,
        private readonly ?\Lodgik\Service\TermiiService $termii = null,
        private readonly ?\Lodgik\Module\Notification\NotificationService $notificationService = null,
    ) {}

    // ═══ List / Get ════════════════════════════════════════════

    /** @return array{items: Booking[], total: int} */
    public function list(
        ?string $propertyId = null,
        ?string $status = null,
        ?string $guestId = null,
        ?string $roomId = null,
        ?string $dateFrom = null,
        ?string $dateTo = null,
        ?string $search = null,
        int $page = 1,
        int $limit = 20,
    ): array {
        return $this->bookingRepo->listBookings($propertyId, $status, $guestId, $roomId, $dateFrom, $dateTo, $search, $page, $limit);
    }

    public function searchForAutocomplete(string $propertyId, string $query): array
    {
        return $this->bookingRepo->searchForAutocomplete($propertyId, $query, 10);
    }

    public function getById(string $id): ?Booking
    {
        $b = $this->bookingRepo->find($id);
        return ($b !== null && !$b->isDeleted()) ? $b : null;
    }

    /** Resolve tenant slug for generating guest PWA deep-links. */
    public function getTenantSlug(string $tenantId): ?string
    {
        try {
            $tenant = $this->em->find(\Lodgik\Entity\Tenant::class, $tenantId);
            return $tenant?->getSlug();
        } catch (\Throwable) {
            return null;
        }
    }

    /** @return Booking[] */
    public function getToday(string $propertyId): array
    {
        return $this->bookingRepo->getToday($propertyId);
    }

    /** @return Booking[] */
    public function getCalendar(string $propertyId, string $from, string $to): array
    {
        return $this->bookingRepo->getCalendar($propertyId, $from, $to);
    }

    /** @return Booking[] */
    public function getGuestHistory(string $guestId): array
    {
        return $this->bookingRepo->findByGuest($guestId);
    }

    /** @return BookingAddon[] */
    public function getAddons(string $bookingId): array
    {
        return $this->addonRepo->findByBooking($bookingId);
    }

    /** @return BookingStatusLog[] */
    public function getStatusHistory(string $bookingId): array
    {
        return $this->statusLogRepo->getHistory($bookingId);
    }

    // ═══ Create ════════════════════════════════════════════════

    public function create(CreateBookingRequest $dto, string $tenantId, ?string $userId = null): Booking
    {
        // Validate property
        $property = $this->em->find(Property::class, $dto->propertyId);
        if ($property === null) {
            throw new \InvalidArgumentException('Property not found');
        }

        // Validate guest
        $guest = $this->guestRepo->find($dto->guestId);
        if ($guest === null) {
            throw new \InvalidArgumentException('Guest not found');
        }

        $bookingType = BookingType::from($dto->bookingType);
        $checkIn = $dto->parseDate($dto->checkIn);
        $checkOut = $dto->parseDate($dto->checkOut);

        // If room assigned, get room type and check availability
        $roomType = null;
        if ($dto->roomId !== null) {
            $room = $this->roomRepo->find($dto->roomId);
            if ($room === null) {
                throw new \InvalidArgumentException('Room not found');
            }
            $roomType = $this->roomTypeRepo->find($room->getRoomTypeId());

            if ($this->bookingRepo->hasOverlap($dto->roomId, $checkIn, $checkOut)) {
                throw new \InvalidArgumentException('Room is not available for the selected dates');
            }
        }

        if ($roomType === null) {
            throw new \InvalidArgumentException('Room must be assigned to calculate rate');
        }

        // Calculate rate
        $calc = $halfDayHours = (int) ($property?->getSetting('half_day_hours', 6) ?? 6);
        $this->rateCalc->calculate($roomType, $bookingType, $checkIn, $checkOut, $dto->discountAmount, $halfDayHours);

        // Generate reference
        $ref = $this->bookingRepo->generateRef($tenantId);

        $booking = new Booking(
            bookingRef: $ref,
            bookingType: $bookingType,
            guestId: $dto->guestId,
            propertyId: $dto->propertyId,
            tenantId: $tenantId,
            checkIn: $checkIn,
            checkOut: $checkOut,
            ratePerNight: $calc['rate'],
            totalAmount: $calc['total'],
        );

        $booking->setRoomId($dto->roomId);
        $booking->setDurationHours($calc['hours']);
        $booking->setAdults($dto->adults);
        $booking->setChildren($dto->children);
        $booking->setDiscountAmount($calc['discount']);
        $booking->setNotes($dto->notes);
        $booking->setSource($dto->source);
        $booking->setSpecialRequests($dto->specialRequests);
        $booking->setCreatedBy($userId);
        $booking->setStatus(BookingStatus::CONFIRMED);

        $this->em->persist($booking);

        // Create addons
        $addonTotal = '0.00';
        foreach ($dto->addons as $a) {
            $addon = new BookingAddon(
                $booking->getId(),
                $a['name'],
                (string) $a['amount'],
                $tenantId,
                (int) ($a['quantity'] ?? 1),
            );
            $this->em->persist($addon);
            $addonTotal = number_format((float) $addonTotal + (float) $addon->getLineTotal(), 2, '.', '');
        }

        // Add addon total to booking total
        if ((float) $addonTotal > 0) {
            $booking->setTotalAmount(number_format((float) $booking->getTotalAmount() + (float) $addonTotal, 2, '.', ''));
        }

        // Log status
        $log = new BookingStatusLog($booking->getId(), BookingStatus::PENDING, BookingStatus::CONFIRMED, $tenantId);
        $log->setChangedBy($userId);
        $this->em->persist($log);

        $this->em->flush();
        $this->logger->info("Booking created: {$ref}");

        return $booking;
    }

    // ═══ Check-In ══════════════════════════════════════════════

    public function checkIn(string $bookingId, ?string $roomId = null, ?string $userId = null): Booking
    {
        $booking = $this->bookingRepo->findOrFail($bookingId);

        $this->stateMachine->assertTransition($booking->getStatus(), BookingStatus::CHECKED_IN);

        // If room override provided, update booking
        if ($roomId !== null && $roomId !== $booking->getRoomId()) {
            $room = $this->roomRepo->find($roomId);
            if ($room === null) {
                throw new \InvalidArgumentException('Room not found');
            }
            // Check availability excluding this booking
            if ($this->bookingRepo->hasOverlap($roomId, $booking->getCheckIn(), $booking->getCheckOut(), $bookingId)) {
                throw new \InvalidArgumentException('Room is not available for the selected dates');
            }
            $booking->setRoomId($roomId);
        }

        if ($booking->getRoomId() === null) {
            throw new \InvalidArgumentException('Room must be assigned before check-in');
        }

        // ── Card Enforcement (optional, per-property setting) ────────
        // When enabled: a PENDING_CHECKIN or ACTIVE card must already be
        // issued (at the gate) for this property before the booking can be
        // checked in. Reception must call POST /api/cards/{id}/attach-booking
        // first, which transitions the card to ACTIVE and sets booking_id.
        if ($this->propertyRepo !== null && $this->cardRepo !== null) {
            $property = $this->propertyRepo->find($booking->getPropertyId());
            if ($property !== null && $property->getSetting('card_enforcement_enabled', false)) {
                $activeCard = $this->cardRepo->findActiveCardForBooking($bookingId);
                if ($activeCard === null) {
                    throw new \DomainException(
                        'Card enforcement is enabled for this property. ' .
                        'A guest card must be issued at the security gate and attached to this booking ' .
                        'before check-in can proceed. Please attach a card via the Guest Cards screen.'
                    );
                }
            }
        }
        // ────────────────────────────────────────────────────────────

        // Set room to occupied
        $room = $this->roomRepo->findOrFail($booking->getRoomId());
        if ($this->roomStateMachine->canTransition($room->getStatus(), RoomStatus::OCCUPIED)) {
            $oldStatus = $room->getStatus();
            $room->setStatus(RoomStatus::OCCUPIED);
            $roomLog = new RoomStatusLog($room->getId(), $oldStatus, RoomStatus::OCCUPIED, $booking->getTenantId());
            $roomLog->setChangedBy($userId);
            $roomLog->setNotes("Check-in: {$booking->getBookingRef()}");
            $this->em->persist($roomLog);
        }

        // Update booking
        $oldStatus = $booking->getStatus();
        $booking->setStatus(BookingStatus::CHECKED_IN);
        $booking->setCheckedInAt(new \DateTimeImmutable());

        // Log status change
        $log = new BookingStatusLog($booking->getId(), $oldStatus, BookingStatus::CHECKED_IN, $booking->getTenantId());
        $log->setChangedBy($userId);
        $this->em->persist($log);

        // Update guest stats
        $guest = $this->guestRepo->find($booking->getGuestId());
        if ($guest !== null) {
            $guest->incrementStays();
            $guest->setLastVisitAt(new \DateTimeImmutable());
        }

        $this->em->flush();
        $this->logger->info("Check-in: {$booking->getBookingRef()}");

        // Auto-create folio
        try {
            $this->folioService->createForBooking($booking);
        } catch (\Throwable $e) {
            $this->logger->error("Failed to create folio for {$booking->getBookingRef()}: {$e->getMessage()}");
        }

        // Generate guest access code and bind tablet
        if ($this->guestAuthService) {
            try {
                $this->guestAuthService->generateAccessCode(
                    $booking->getId(), $booking->getGuestId(), $booking->getPropertyId(),
                    $booking->getRoomId(), $booking->getTenantId()
                );
                if ($booking->getRoomId()) {
                    $this->guestAuthService->bindTabletToBooking($booking->getRoomId(), $booking->getId(), $booking->getGuestId());
                }
            } catch (\Throwable $e) {
                $this->logger->error("Guest auth setup failed for {$booking->getBookingRef()}: {$e->getMessage()}");
            }
        }

        // Notify staff of check-in
        if ($this->notificationService !== null) {
            try {
                $ciGuest = $this->guestRepo->find($booking->getGuestId());
                $ciName  = $ciGuest?->getFullName() ?? 'Guest';
                $room    = $booking->getRoomId() ? $this->roomRepo->find($booking->getRoomId()) : null;
                $roomNum = $room?->getRoomNumber() ?? '—';
                $this->notificationService->create(
                    $booking->getPropertyId(), 'staff', 'all', 'booking',
                    "🏨 Check-in: {$ciName} — Room {$roomNum}",
                    $booking->getTenantId(),
                    "Booking: {$booking->getBookingRef()}",
                );
            } catch (\Throwable $e) {
                $this->logger->error("Check-in notification failed: {$e->getMessage()}");
            }
        }

        return $booking;
    }

    // ═══ Check-Out ═════════════════════════════════════════════

    public function checkOut(string $bookingId, ?string $userId = null): Booking
    {
        $booking = $this->bookingRepo->findOrFail($bookingId);

        $this->stateMachine->assertTransition($booking->getStatus(), BookingStatus::CHECKED_OUT);

        // Set room to vacant_dirty
        if ($booking->getRoomId() !== null) {
            $room = $this->roomRepo->find($booking->getRoomId());
            if ($room !== null && $this->roomStateMachine->canTransition($room->getStatus(), RoomStatus::VACANT_DIRTY)) {
                $oldStatus = $room->getStatus();
                $room->setStatus(RoomStatus::VACANT_DIRTY);
                $roomLog = new RoomStatusLog($room->getId(), $oldStatus, RoomStatus::VACANT_DIRTY, $booking->getTenantId());
                $roomLog->setChangedBy($userId);
                $roomLog->setNotes("Check-out: {$booking->getBookingRef()}");
                $this->em->persist($roomLog);
            }
        }

        $oldStatus = $booking->getStatus();
        $booking->setStatus(BookingStatus::CHECKED_OUT);
        $booking->setCheckedOutAt(new \DateTimeImmutable());

        $log = new BookingStatusLog($booking->getId(), $oldStatus, BookingStatus::CHECKED_OUT, $booking->getTenantId());
        $log->setChangedBy($userId);
        $this->em->persist($log);

        // Update guest spending
        $guest = $this->guestRepo->find($booking->getGuestId());
        if ($guest !== null) {
            $guest->addSpent($booking->getTotalAmount());
        }

        $this->em->flush();
        $this->logger->info("Check-out: {$booking->getBookingRef()}");

        // Close folio and generate invoice
        try {
            $folio = $this->folioService->getByBooking($booking->getId());
            if ($folio !== null) {
                // Phase 3: Corporate folios with deferred payment are closed
                // without requiring a zero balance. The consolidated invoice
                // will be sent to the corporate client separately.
                if ($folio->isCorporate() && $folio->getAllowCheckoutWithoutPayment()) {
                    $this->logger->info(
                        "Corporate folio checkout (deferred payment) for {$booking->getBookingRef()}. " .
                        "Outstanding: ₦" . number_format((float)$folio->getBalance(), 2)
                    );
                }
                $this->folioService->close($folio->getId(), $userId);
                $this->invoiceService->generateFromFolio($folio);
            }
        } catch (\Throwable $e) {
            $this->logger->error("Failed to close folio/generate invoice for {$booking->getBookingRef()}: {$e->getMessage()}");
        }

        // Invalidate guest sessions and unbind tablet
        if ($this->guestAuthService) {
            try {
                $this->guestAuthService->invalidateBookingSessions($booking->getId());
                if ($booking->getRoomId()) {
                    $this->guestAuthService->unbindTablet($booking->getRoomId());
                }
            } catch (\Throwable $e) {
                $this->logger->error("Guest auth cleanup failed for {$booking->getBookingRef()}: {$e->getMessage()}");
            }
        }

        // Auto-generate housekeeping task on checkout
        if ($this->housekeepingService && $booking->getRoomId()) {
            try {
                $roomNum = '';
                if ($booking->getRoomId()) {
                    $rm = $this->roomRepo->find($booking->getRoomId());
                    $roomNum = $rm ? $rm->getRoomNumber() : '';
                }
                $this->housekeepingService->generateCheckoutTask(
                    $booking->getPropertyId(), $booking->getRoomId(), $roomNum,
                    $booking->getId(), $booking->getTenantId()
                );
            } catch (\Throwable $e) {
                $this->logger->error("Housekeeping task gen failed for {$booking->getBookingRef()}: {$e->getMessage()}");
            }
        }

        return $booking;
    }

    // ═══ Cancel / No-Show ══════════════════════════════════════

    public function confirm(string $bookingId, ?string $userId = null): Booking
    {
        $booking = $this->bookingRepo->findOrFail($bookingId);

        $this->stateMachine->assertTransition($booking->getStatus(), BookingStatus::CONFIRMED);

        $oldStatus = $booking->getStatus();
        $booking->setStatus(BookingStatus::CONFIRMED);

        $log = new BookingStatusLog($booking->getId(), $oldStatus, BookingStatus::CONFIRMED, $booking->getTenantId());
        $log->setChangedBy($userId);
        $log->setNotes('Manually confirmed by staff');
        $this->em->persist($log);

        $this->em->flush();

        // ── Generate guest access code at confirmation ───────────────────────
        $accessCode = null;
        if ($this->guestAuthService) {
            try {
                $ac = $this->guestAuthService->generateAccessCode(
                    $booking->getId(),
                    $booking->getGuestId(),
                    $booking->getPropertyId(),
                    $booking->getRoomId(),
                    $booking->getTenantId()
                );
                $accessCode = $ac->getCode();
            } catch (\Throwable $e) {
                $this->logger->error("Access code generation failed for {$booking->getBookingRef()}: {$e->getMessage()}");
            }
        }

        // ── Send booking confirmation SMS to guest ───────────────────────────
        if ($this->termii !== null && $this->guestRepo !== null) {
            try {
                $guest   = $this->guestRepo->find($booking->getGuestId());
                $phone   = $guest?->getPhone();
                if ($phone) {
                    $hotelAppUrl = rtrim($_ENV['HOTEL_APP_URL'] ?? 'https://hotel.lodgik.co', '/');
                    $pwaPart     = $accessCode ? "/guest?c={$accessCode}" : '/guest';
                    $pwUrl       = $hotelAppUrl . $pwaPart;
                    $checkIn     = $booking->getCheckIn()->format('d M Y, g:i a');
                    $checkOut    = $booking->getCheckOut()->format('d M Y, g:i a');
                    $ref         = $booking->getBookingRef();

                    $msg = "Booking Confirmed! 🎉\n"
                        . "Booking No: {$ref}\n"
                        . "Check-in:   {$checkIn}\n"
                        . "Check-out:  {$checkOut}\n"
                        . ($accessCode ? "Access Code: {$accessCode}\n" : '')
                        . "Manage your stay: {$pwUrl}";

                    $this->termii->send($phone, $msg);

                    // WhatsApp (Termii 'whatsapp' channel)
                    $this->termii->sendWhatsApp($phone, $msg);
                }
            } catch (\Throwable $e) {
                $this->logger->error("Booking confirmation SMS failed for {$booking->getBookingRef()}: {$e->getMessage()}");
            }
        }

        // ── Notify staff ─────────────────────────────────────────────────────
        if ($this->notificationService !== null) {
            try {
                $guest    = $this->guestRepo?->find($booking->getGuestId());
                $guestName = $guest?->getFullName() ?? 'Guest';
                $this->notificationService->create(
                    $booking->getPropertyId(), 'staff', 'all', 'booking',
                    "✅ Booking confirmed: {$booking->getBookingRef()} — {$guestName}",
                    $booking->getTenantId(),
                    "Check-in: {$booking->getCheckIn()->format('d M Y')} | Check-out: {$booking->getCheckOut()->format('d M Y')}",
                );
            } catch (\Throwable $e) {
                $this->logger->error("Notification failed for {$booking->getBookingRef()}: {$e->getMessage()}");
            }
        }

        return $booking;
    }

    public function cancel(string $bookingId, ?string $reason = null, ?string $userId = null): Booking
    {
        $booking = $this->bookingRepo->findOrFail($bookingId);

        $this->stateMachine->assertTransition($booking->getStatus(), BookingStatus::CANCELLED);

        // Release room reservation if it was reserved
        if ($booking->getRoomId() !== null) {
            $room = $this->roomRepo->find($booking->getRoomId());
            if ($room !== null && $room->getStatus() === RoomStatus::RESERVED) {
                if ($this->roomStateMachine->canTransition(RoomStatus::RESERVED, RoomStatus::VACANT_CLEAN)) {
                    $oldStatus = $room->getStatus();
                    $room->setStatus(RoomStatus::VACANT_CLEAN);
                    $roomLog = new RoomStatusLog($room->getId(), $oldStatus, RoomStatus::VACANT_CLEAN, $booking->getTenantId());
                    $roomLog->setChangedBy($userId);
                    $roomLog->setNotes("Cancelled: {$booking->getBookingRef()}");
                    $this->em->persist($roomLog);
                }
            }
        }

        $oldStatus = $booking->getStatus();
        $booking->setStatus(BookingStatus::CANCELLED);

        $log = new BookingStatusLog($booking->getId(), $oldStatus, BookingStatus::CANCELLED, $booking->getTenantId());
        $log->setChangedBy($userId);
        $log->setNotes($reason);
        $this->em->persist($log);

        $this->em->flush();
        return $booking;
    }

    public function noShow(string $bookingId, ?string $userId = null): Booking
    {
        $booking = $this->bookingRepo->findOrFail($bookingId);

        $this->stateMachine->assertTransition($booking->getStatus(), BookingStatus::NO_SHOW);

        $oldStatus = $booking->getStatus();
        $booking->setStatus(BookingStatus::NO_SHOW);

        $log = new BookingStatusLog($booking->getId(), $oldStatus, BookingStatus::NO_SHOW, $booking->getTenantId());
        $log->setChangedBy($userId);
        $this->em->persist($log);

        // Release room
        if ($booking->getRoomId() !== null) {
            $room = $this->roomRepo->find($booking->getRoomId());
            if ($room !== null && $room->getStatus() === RoomStatus::RESERVED) {
                if ($this->roomStateMachine->canTransition(RoomStatus::RESERVED, RoomStatus::VACANT_CLEAN)) {
                    $oldRoomStatus = $room->getStatus();
                    $room->setStatus(RoomStatus::VACANT_CLEAN);
                    $roomLog = new RoomStatusLog($room->getId(), $oldRoomStatus, RoomStatus::VACANT_CLEAN, $booking->getTenantId());
                    $roomLog->setChangedBy($userId);
                    $this->em->persist($roomLog);
                }
            }
        }

        $this->em->flush();
        return $booking;
    }

    // ═══ Rate Preview ══════════════════════════════════════════

    /**

    // ─── Fraud-prevention clearance ──────────────────────────────────────────

    public function clearFrontDesk(string $bookingId, string $userId): Booking
    {
        $booking = $this->em->find(Booking::class, $bookingId);
        if (!$booking) throw new \InvalidArgumentException('Booking not found');
        $booking->clearFrontDesk($userId);
        $this->em->flush();
        $this->logger?->info("[Booking] Front-desk clearance: booking={$bookingId}, by={$userId}");
        return $booking;
    }

    public function clearSecurity(string $bookingId, string $userId): Booking
    {
        $booking = $this->em->find(Booking::class, $bookingId);
        if (!$booking) throw new \InvalidArgumentException('Booking not found');
        $booking->clearSecurity($userId);
        $this->em->flush();
        $this->logger?->info("[Booking] Security clearance: booking={$bookingId}, by={$userId}");
        return $booking;
    }

    // ── Shadow Rate (Invoice Override) ───────────────────────────

    /**
     * Set an invoice rate override for a booking.
     * Only property_admin may call this (enforced in controller + route).
     * Revenue reports must NEVER use shadow_rate_per_night.
     *
     * @throws \RuntimeException   if booking not found or doesn't belong to tenant
     * @throws \DomainException    if shadow rate is lower than the actual rate
     *                             (shadow rate should always be the higher invoice amount)
     */
    public function setShadowRate(
        string $bookingId,
        string $tenantId,
        string $setBy,
        string $shadowRatePerNight,
        string $shadowTotalAmount,
    ): Booking {
        $booking = $this->bookingRepo->findOrFail($bookingId);

        if ($booking->getTenantId() !== $tenantId) {
            throw new \RuntimeException('Booking not found');
        }

        // Business rule: shadow rate must exceed the actual rate —
        // it represents the higher invoice amount, not a discount.
        if ((float)$shadowRatePerNight <= (float)$booking->getRatePerNight()) {
            throw new \DomainException(
                sprintf(
                    'Invoice override rate (₦%s) must be higher than the actual booking rate (₦%s). ' .
                    'The shadow rate is the amount shown on the invoice; the difference is returned to the guest.',
                    number_format((float)$shadowRatePerNight, 2),
                    number_format((float)$booking->getRatePerNight(), 2),
                )
            );
        }

        $booking->setShadowRate($shadowRatePerNight, $shadowTotalAmount, $setBy);
        $this->em->flush();

        $this->logger?->info(sprintf(
            '[Booking] Shadow rate set: booking=%s actual=₦%s invoice=₦%s by=%s',
            $bookingId,
            $booking->getRatePerNight(),
            $shadowRatePerNight,
            $setBy,
        ));

        return $booking;
    }

    /**
     * Remove the invoice rate override, restoring the actual rate on the invoice.
     */
    public function clearShadowRate(string $bookingId, string $tenantId, string $clearedBy): Booking
    {
        $booking = $this->bookingRepo->findOrFail($bookingId);

        if ($booking->getTenantId() !== $tenantId) {
            throw new \RuntimeException('Booking not found');
        }

        $booking->setShadowRate(null, null, $clearedBy);
        $this->em->flush();

        $this->logger?->info("[Booking] Shadow rate cleared: booking={$bookingId} by={$clearedBy}");

        return $booking;
    }

    /**
     * Returns bookings that are checked-in but past their checkout date.
     * Used by the NoonCheckoutCommand and FraudAutoCheckoutCommand.
     *
     * @return Booking[]
     */
    public function getOverdue(string $propertyId, string $tenantId): array
    {
        $now = new \DateTimeImmutable();
        return $this->em->createQueryBuilder()
            ->select('b')
            ->from(Booking::class, 'b')
            ->where('b.propertyId = :pid')
            ->andWhere('b.tenantId  = :tid')
            ->andWhere('b.status   = :status')
            ->andWhere('b.checkOut < :now')
            ->setParameter('pid',    $propertyId)
            ->setParameter('tid',    $tenantId)
            ->setParameter('status', \Lodgik\Enum\BookingStatus::CHECKED_IN)
            ->setParameter('now',    $now)
            ->orderBy('b.checkOut', 'ASC')
            ->getQuery()->getResult();
    }

    /**
     * Returns bookings where both front-desk AND security clearance are marked
     * but the booking has not been formally checked out yet.
     *
     * @return Booking[]
     */
    public function getDualClearedPending(string $tenantId): array
    {
        return $this->em->createQueryBuilder()
            ->select('b')
            ->from(Booking::class, 'b')
            ->where('b.tenantId       = :tid')
            ->andWhere('b.status      = :status')
            ->andWhere('b.frontDeskCleared = TRUE')
            ->andWhere('b.securityCleared  = TRUE')
            ->setParameter('tid',    $tenantId)
            ->setParameter('status', \Lodgik\Enum\BookingStatus::CHECKED_IN)
            ->getQuery()->getResult();
    }

    /**
     * Writes an AutoCheckoutLog record. Called by the cron commands to
     * maintain an immutable audit trail of system-initiated checkouts.
     */
    public function logAutoCheckout(
        Booking $booking,
        string  $reason,
        int     $hoursOverdue = 0,
    ): AutoCheckoutLog {
        $log = new AutoCheckoutLog($booking->getId(), $booking->getPropertyId(), $booking->getTenantId(), $reason);
        $log->setGuestId($booking->getGuestId());
        $log->setRoomNumber($booking->getRoomId());    // will store room_id; controller can resolve name
        $log->setBookingRef($booking->getBookingRef());
        $log->setOriginalCheckoutDate($booking->getCheckOut());
        $log->setHoursOverdue($hoursOverdue);
        $log->setMetadata([
            'front_desk_cleared' => $booking->isFrontDeskCleared(),
            'security_cleared'   => $booking->isSecurityCleared(),
            'auto_checked_out'   => (new \DateTimeImmutable())->format('Y-m-d H:i:s'),
        ]);
        $this->em->persist($log);
        // Caller is responsible for flush() after batch processing
        return $log;
    }

    /**
     * Preview rate calculation without creating a booking.
     *
     * @return array{rate: string, nights: int, hours: int|null, subtotal: string, discount: string, total: string}
     */
    public function previewRate(string $roomTypeId, string $bookingType, string $checkIn, string $checkOut, string $discount = '0.00'): array
    {
        $roomType = $this->roomTypeRepo->find($roomTypeId);
        if ($roomType === null) {
            throw new \InvalidArgumentException('Room type not found');
        }

        $bt = BookingType::from($bookingType);
        $ci = \DateTimeImmutable::createFromFormat('Y-m-d H:i', $checkIn) ?: \DateTimeImmutable::createFromFormat('Y-m-d', $checkIn);
        $co = \DateTimeImmutable::createFromFormat('Y-m-d H:i', $checkOut) ?: \DateTimeImmutable::createFromFormat('Y-m-d', $checkOut);

        if ($ci === false || $co === false) {
            throw new \InvalidArgumentException('Invalid date format');
        }

        return $halfDayHours2 = (int) ($property?->getSetting('half_day_hours', 6) ?? 6);
        $this->rateCalc->calculate($roomType, $bt, $ci, $co, $discount, $halfDayHours2);
    }

    // ═══ Stay Extension ════════════════════════════════════════

    /**
     * Extend a checked-in booking's checkout date.
     *
     * - Validates booking is currently checked_in
     * - Checks for room availability overlap (excludes this booking)
     * - Updates check_out and recalculates total_amount
     * - Adds folio charge for the extra nights
     * - Logs the status change
     * - Notifies guest via notification
     *
     * @throws \InvalidArgumentException
     * @throws \DomainException
     */
    public function extendCheckout(
        string  $bookingId,
        string  $newCheckoutDate,
        ?string $staffId = null,
        ?string $reason  = null,
    ): Booking {
        $booking = $this->bookingRepo->findOrFail($bookingId);

        if ($booking->getStatus() !== BookingStatus::CHECKED_IN) {
            throw new \InvalidArgumentException('Can only extend a currently checked-in booking.');
        }

        // Parse new checkout
        $newCheckout = \DateTimeImmutable::createFromFormat('Y-m-d H:i:s', $newCheckoutDate)
            ?: \DateTimeImmutable::createFromFormat('Y-m-d H:i', $newCheckoutDate)
            ?: \DateTimeImmutable::createFromFormat('Y-m-d', $newCheckoutDate);

        if ($newCheckout === false) {
            throw new \InvalidArgumentException('Invalid new_checkout_date format. Use Y-m-d or Y-m-d H:i:s.');
        }

        $originalCheckout = $booking->getCheckOut();

        if ($newCheckout <= $originalCheckout) {
            throw new \InvalidArgumentException('New checkout date must be after the current checkout date.');
        }

        // Check room overlap for the extension window
        $roomId = $booking->getRoomId();
        if ($roomId && $this->bookingRepo->hasOverlap($roomId, $originalCheckout, $newCheckout, $bookingId)) {
            throw new \DomainException('Room is not available for the requested extension period — another booking exists.');
        }

        // Calculate extra nights and charge
        $extraNights    = max(1, (int) $originalCheckout->diff($newCheckout)->days);
        $ratePerNight   = (float) $booking->getRatePerNight();
        $extraAmount    = $extraNights * $ratePerNight;
        $newTotal       = (float) $booking->getTotalAmount() + $extraAmount;

        // Update booking dates + total
        $booking->setCheckOut($newCheckout);
        $booking->setTotalAmount((string) $newTotal);

        // Log the extension as a status-log entry (informational)
        $log = new BookingStatusLog($booking->getId(), $booking->getStatus(), $booking->getStatus(), $booking->getTenantId());
        $log->setChangedBy($staffId);
        $log->setNotes(
            "Stay extended from {$originalCheckout->format('d M Y')} to {$newCheckout->format('d M Y')}" .
            " (+{$extraNights} night(s), ₦" . number_format($extraAmount, 2) . ")." .
            ($reason ? " Reason: {$reason}" : '')
        );
        $this->em->persist($log);

        // Add folio charge for extra nights
        try {
            $folio = $this->folioService->getByBooking($bookingId);
            if ($folio) {
                $this->folioService->addCharge(
                    $folio->getId(),
                    'room',
                    "Stay Extension: +{$extraNights} night(s) (until {$newCheckout->format('d M Y')})",
                    (string) ($ratePerNight),
                    $extraNights,
                    $staffId,
                    $reason,
                );
            }
        } catch (\Throwable $e) {
            $this->logger->warning("[ExtendCheckout] Could not post folio charge: {$e->getMessage()}");
        }

        $this->em->flush();

        // Notify guest
        if ($this->notificationService) {
            try {
                $this->notificationService->create(
                    $booking->getPropertyId(),
                    'guest',
                    $booking->getGuestId(),
                    'booking',
                    '✅ Stay Extension Confirmed',
                    $booking->getTenantId(),
                    "Your stay has been extended to {$newCheckout->format('d M Y')}. Extra charges of ₦" . number_format($extraAmount, 2) . " have been added to your folio.",
                    ['booking_id' => $bookingId, 'new_checkout' => $newCheckout->format('Y-m-d H:i:s')],
                );
            } catch (\Throwable $e) {
                $this->logger->warning("[ExtendCheckout] Could not send guest notification: {$e->getMessage()}");
            }
        }

        $this->logger->info("[ExtendCheckout] Booking {$bookingId} extended to {$newCheckout->format('Y-m-d H:i:s')} by staff={$staffId}");

        return $booking;
    }
    /**
     * Change the room assigned to a booking (same type or upgrade only).
     *
     * Rules:
     *  - Booking must be confirmed or checked_in
     *  - New room must belong to same property and be available for the booking dates
     *  - New room type sort_order must be >= current room type sort_order (no downgrades)
     *  - If upgrade (higher sort_order / higher base rate), a pro-rata upgrade charge
     *    is added to the folio: (newRate - currentRate) × remainingNights
     *  - Old room is released; new room is set to reserved/occupied accordingly
     *  - A BookingStatusLog entry is created for audit trail
     */
    public function changeRoom(
        string $bookingId,
        string $newRoomId,
        ?string $userId = null,
        ?string $reason = null
    ): array {
        $booking = $this->bookingRepo->find($bookingId);
        if (!$booking) {
            throw new \InvalidArgumentException('Booking not found');
        }

        $allowed = [BookingStatus::CONFIRMED, BookingStatus::CHECKED_IN];
        if (!in_array($booking->getStatus(), $allowed, true)) {
            throw new \DomainException('Room can only be changed for confirmed or checked-in bookings');
        }

        $oldRoomId = $booking->getRoomId();
        if ($oldRoomId === $newRoomId) {
            throw new \InvalidArgumentException('Guest is already assigned to that room');
        }

        // ── Validate new room ────────────────────────────────────────────────
        $newRoom = $this->roomRepo->find($newRoomId);
        if (!$newRoom || !$newRoom->isActive()) {
            throw new \InvalidArgumentException('Room not found or inactive');
        }
        if ($newRoom->getPropertyId() !== $booking->getPropertyId()) {
            throw new \InvalidArgumentException('Room does not belong to this property');
        }
        if ($this->bookingRepo->hasOverlap($newRoomId, $booking->getCheckIn(), $booking->getCheckOut(), $bookingId)) {
            throw new \DomainException('Selected room is not available for the booking dates');
        }

        // ── Enforce same-or-higher room type ─────────────────────────────────
        $newRoomType = $this->roomTypeRepo->find($newRoom->getRoomTypeId());
        if (!$newRoomType) {
            throw new \InvalidArgumentException('New room type not found');
        }

        $currentRoomType = null;
        if ($oldRoomId) {
            $oldRoom = $this->roomRepo->find($oldRoomId);
            if ($oldRoom) {
                $currentRoomType = $this->roomTypeRepo->find($oldRoom->getRoomTypeId());
            }
        }

        if ($currentRoomType !== null && $newRoomType->getSortOrder() < $currentRoomType->getSortOrder()) {
            throw new \DomainException(
                "Cannot downgrade room type. Current type: {$currentRoomType->getName()}. "
                . "Please select a room of the same type or higher."
            );
        }

        // ── Pro-rata upgrade charge ──────────────────────────────────────────
        $upgradeCharge  = null;
        $remainingNights = 0;
        $rateDifference  = 0.0;

        $isUpgrade = $currentRoomType !== null
            && $newRoomType->getSortOrder() > $currentRoomType->getSortOrder();

        if ($isUpgrade) {
            $newBaseRate     = (float) $newRoomType->getBaseRate();
            $currentBaseRate = (float) $currentRoomType->getBaseRate();
            $rateDifference  = $newBaseRate - $currentBaseRate;

            if ($rateDifference > 0) {
                // Remaining nights from today (or check-in) until checkout
                $now       = new \DateTimeImmutable('today');
                $checkOut  = $booking->getCheckOut();
                $from      = max($now, $booking->getCheckIn()->modify('midnight'));
                $diffDays  = (int) $from->diff($checkOut)->days;
                $remainingNights = max(1, $diffDays);

                $upgradeAmount = $rateDifference * $remainingNights;

                // Post to folio if one exists
                $folio = $this->folioService->getByBooking($bookingId);
                if ($folio) {
                    $description = sprintf(
                        'Room upgrade: %s → %s (%d night%s × ₦%s/night difference)',
                        $currentRoomType->getName(),
                        $newRoomType->getName(),
                        $remainingNights,
                        $remainingNights === 1 ? '' : 's',
                        number_format($rateDifference, 2)
                    );
                    $this->folioService->addCharge(
                        $folio->getId(),
                        'room',
                        $description,
                        (string) $rateDifference,
                        $remainingNights,
                        $userId,
                        $reason
                    );
                }

                $upgradeCharge = [
                    'nights'          => $remainingNights,
                    'rate_difference' => $rateDifference,
                    'total'           => $upgradeAmount,
                    'from_type'       => $currentRoomType->getName(),
                    'to_type'         => $newRoomType->getName(),
                ];
            }
        }

        // ── Release old room ─────────────────────────────────────────────────
        if (!empty($oldRoom)) {
            $oldStatus     = $oldRoom->getStatus();
            $releaseStatus = ($booking->getStatus() === BookingStatus::CHECKED_IN)
                ? RoomStatus::VACANT_DIRTY
                : RoomStatus::VACANT_CLEAN;

            if ($this->roomStateMachine->canTransition($oldRoom->getStatus(), $releaseStatus)) {
                $oldRoom->setStatus($releaseStatus);
                $log = new RoomStatusLog($oldRoom->getId(), $oldStatus, $releaseStatus, $booking->getTenantId());
                $this->em->persist($log);
                $this->em->persist($oldRoom);
            }
        }

        // ── Assign new room ──────────────────────────────────────────────────
        $booking->setRoomId($newRoomId);

        $newRoomOldStatus = $newRoom->getStatus();
        $targetRoomStatus = ($booking->getStatus() === BookingStatus::CHECKED_IN)
            ? RoomStatus::OCCUPIED
            : RoomStatus::RESERVED;

        if ($this->roomStateMachine->canTransition($newRoom->getStatus(), $targetRoomStatus)) {
            $newRoom->setStatus($targetRoomStatus);
            $newRoomLog = new RoomStatusLog($newRoom->getId(), $newRoomOldStatus, $targetRoomStatus, $booking->getTenantId());
            $this->em->persist($newRoomLog);
            $this->em->persist($newRoom);
        }

        // ── Audit log ────────────────────────────────────────────────────────
        $oldRoomNum = isset($oldRoom) ? $oldRoom->getRoomNumber() : 'unassigned';
        $note = "Room changed: {$oldRoomNum} → {$newRoom->getRoomNumber()}";
        if ($isUpgrade && $rateDifference > 0) {
            $note .= " (upgrade, ₦" . number_format($rateDifference * $remainingNights, 2) . " added to folio)";
        }
        if ($reason) {
            $note .= ". Reason: {$reason}";
        }

        $statusLog = new BookingStatusLog(
            $booking->getId(),
            $booking->getStatus(),
            $booking->getStatus(),
            $userId,
            $note,
            $booking->getTenantId(),
        );
        $this->em->persist($statusLog);
        $this->em->flush();

        $this->logger->info(
            "[ChangeRoom] Booking {$bookingId}: {$oldRoomNum} → {$newRoom->getRoomNumber()}"
            . ($upgradeCharge ? " | upgrade charge ₦" . number_format($upgradeCharge['total'], 2) : '')
            . " | staff={$userId}"
        );

        return [
            'booking'        => $booking,
            'upgrade_charge' => $upgradeCharge,
        ];
    }

}

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
        $calc = $this->rateCalc->calculate($roomType, $bookingType, $checkIn, $checkOut, $dto->discountAmount);

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

        return $this->rateCalc->calculate($roomType, $bt, $ci, $co, $discount);
    }
}

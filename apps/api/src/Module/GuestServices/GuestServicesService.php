<?php

declare(strict_types=1);

namespace Lodgik\Module\GuestServices;

use Doctrine\ORM\EntityManagerInterface;
use Lodgik\Entity\AmenityVoucher;
use Lodgik\Entity\WaitlistEntry;
use Lodgik\Entity\ChargeTransfer;
use Lodgik\Entity\Booking;
use Lodgik\Module\Folio\FolioService;
use Psr\Log\LoggerInterface;

final class GuestServicesService
{
    public function __construct(
        private readonly EntityManagerInterface $em,
        private readonly LoggerInterface $logger,
        private readonly ?FolioService $folioService = null,
    ) {}

    // ─── Amenity Vouchers ───────────────────────────────────

    public function createVoucher(string $bookingId, string $propertyId, string $guestId, string $amenityType, string $amenityName, string $validDate, string $tenantId, array $extra = []): AmenityVoucher
    {
        $v = new AmenityVoucher($bookingId, $propertyId, $guestId, $amenityType, $amenityName, new \DateTimeImmutable($validDate), $tenantId);
        if (!empty($extra['max_uses'])) $v->setMaxUses((int)$extra['max_uses']);
        if (!empty($extra['notes'])) $v->setNotes($extra['notes']);
        $this->em->persist($v);
        $this->em->flush();
        return $v;
    }

    public function redeemVoucher(string $code, string $propertyId): AmenityVoucher
    {
        $v = $this->em->getRepository(AmenityVoucher::class)->findOneBy(['code' => $code, 'propertyId' => $propertyId]) ?? throw new \RuntimeException('Voucher not found');
        if (!$v->canRedeem()) throw new \RuntimeException('Voucher cannot be redeemed: ' . $v->getStatus());
        $v->redeem();
        $this->em->flush();
        return $v;
    }

    public function listVouchers(string $bookingId): array
    {
        return $this->em->getRepository(AmenityVoucher::class)->findBy(['bookingId' => $bookingId], ['createdAt' => 'DESC']);
    }

    // ─── Waitlist ───────────────────────────────────────────

    public function joinWaitlist(string $propertyId, string $bookingId, string $guestId, string $guestName, string $type, string $item, string $tenantId, array $extra = []): WaitlistEntry
    {
        $w = new WaitlistEntry($propertyId, $bookingId, $guestId, $guestName, $type, $item, $tenantId);
        if (!empty($extra['target_id'])) $w->setTargetId($extra['target_id']);
        if (!empty($extra['preferred_date'])) $w->setPreferredDate(new \DateTimeImmutable($extra['preferred_date']));
        if (!empty($extra['notes'])) $w->setNotes($extra['notes']);

        // Auto-set position
        $count = count($this->em->getRepository(WaitlistEntry::class)->findBy(['propertyId' => $propertyId, 'waitlistType' => $type, 'requestedItem' => $item, 'status' => 'waiting']));
        $w->setPosition($count + 1);

        $this->em->persist($w);
        $this->em->flush();
        return $w;
    }

    public function notifyWaitlist(string $id): WaitlistEntry
    {
        $w = $this->em->find(WaitlistEntry::class, $id) ?? throw new \RuntimeException('Waitlist entry not found');
        $w->notify();
        $this->em->flush();
        return $w;
    }

    public function fulfillWaitlist(string $id): WaitlistEntry
    {
        $w = $this->em->find(WaitlistEntry::class, $id) ?? throw new \RuntimeException('Waitlist entry not found');
        $w->fulfill();
        $this->em->flush();
        return $w;
    }

    public function cancelWaitlist(string $id): WaitlistEntry
    {
        $w = $this->em->find(WaitlistEntry::class, $id) ?? throw new \RuntimeException('Waitlist entry not found');
        $w->cancel();
        $this->em->flush();
        return $w;
    }

    public function listWaitlist(string $propertyId, ?string $status = null): array
    {
        $criteria = ['propertyId' => $propertyId];
        if ($status) $criteria['status'] = $status;
        return $this->em->getRepository(WaitlistEntry::class)->findBy($criteria, ['position' => 'ASC']);
    }

    public function guestWaitlist(string $bookingId): array
    {
        return $this->em->getRepository(WaitlistEntry::class)->findBy(['bookingId' => $bookingId], ['createdAt' => 'DESC']);
    }

    // ─── Charge Transfers ───────────────────────────────────

    public function requestTransfer(string $propertyId, string $fromBookingId, string $fromRoom, string $toBookingId, string $toRoom, string $requestedBy, string $requestedByName, string $description, string $amount, string $tenantId, ?string $reason = null): ChargeTransfer
    {
        $ct = new ChargeTransfer($propertyId, $fromBookingId, $fromRoom, $toBookingId, $toRoom, $requestedBy, $requestedByName, $description, $amount, $tenantId);
        if ($reason) $ct->setReason($reason);
        $this->em->persist($ct);
        $this->em->flush();
        return $ct;
    }

    public function approveTransfer(string $id, string $userId, string $name): ChargeTransfer
    {
        $ct = $this->em->find(ChargeTransfer::class, $id) ?? throw new \RuntimeException('Transfer not found');
        $ct->approve($userId, $name);
        $this->em->flush();
        return $ct;
    }

    public function rejectTransfer(string $id, string $userId, string $name, ?string $reason = null): ChargeTransfer
    {
        $ct = $this->em->find(ChargeTransfer::class, $id) ?? throw new \RuntimeException('Transfer not found');
        $ct->reject($userId, $name, $reason);
        $this->em->flush();
        return $ct;
    }

    public function listTransfers(string $propertyId, ?string $status = null): array
    {
        $criteria = ['propertyId' => $propertyId];
        if ($status) $criteria['status'] = $status;
        return $this->em->getRepository(ChargeTransfer::class)->findBy($criteria, ['createdAt' => 'DESC']);
    }

    public function guestTransfers(string $bookingId): array
    {
        $from = $this->em->getRepository(ChargeTransfer::class)->findBy(['fromBookingId' => $bookingId]);
        $to = $this->em->getRepository(ChargeTransfer::class)->findBy(['toBookingId' => $bookingId]);
        return array_merge($from, $to);
    }

    // ─── Booking Extensions ─────────────────────────────────

    public function checkExtensionAvailability(string $bookingId, int $extraNights): array
    {
        $booking = $this->em->find(Booking::class, $bookingId) ?? throw new \RuntimeException('Booking not found');
        $newCheckout = $booking->getCheckOut()->modify("+{$extraNights} days");
        // Check room availability for extended dates (simplified)
        $available = true; // In production, check against other bookings for same room
        return [
            'available' => $available,
            'current_checkout' => $booking->getCheckOut()->format('Y-m-d'),
            'new_checkout' => $newCheckout->format('Y-m-d'),
            'extra_nights' => $extraNights,
            'rate_per_night' => $booking->getRatePerNight(),
            'extra_amount' => (string)((int)$booking->getRatePerNight() * $extraNights),
        ];
    }

    public function requestExtension(string $bookingId, int $extraNights, string $tenantId, ?string $reason = null): array
    {
        $avail = $this->checkExtensionAvailability($bookingId, $extraNights);
        if (!$avail['available']) throw new \RuntimeException('Room not available for extension');

        $booking = $this->em->find(Booking::class, $bookingId);
        // Update booking checkout date
        $newCheckout = $booking->getCheckOut()->modify("+{$extraNights} days");
        $booking->setCheckOut($newCheckout);
        $newTotal = (string)((int)$booking->getTotalAmount() + (int)$avail['extra_amount']);
        $booking->setTotalAmount($newTotal);
        $this->em->flush();

        // Add charge to folio
        if ($this->folioService) {
            $folio = $this->folioService->getByBooking($bookingId);
            if ($folio) {
                $this->folioService->addCharge($folio->getId(), 'room', "Stay extension ({$extraNights} nights)", $avail['extra_amount'], 1);
            }
        }

        return array_merge($avail, ['booking' => $booking->toArray()]);
    }
}

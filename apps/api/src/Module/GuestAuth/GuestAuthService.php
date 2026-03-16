<?php

declare(strict_types=1);

namespace Lodgik\Module\GuestAuth;

use Doctrine\ORM\EntityManagerInterface;
use Lodgik\Entity\GuestAccessCode;
use Lodgik\Entity\GuestSession;
use Lodgik\Entity\TabletDevice;
use Lodgik\Enum\BookingStatus;
use Lodgik\Repository\GuestAccessCodeRepository;
use Lodgik\Repository\GuestSessionRepository;
use Lodgik\Repository\TabletDeviceRepository;
use Lodgik\Repository\BookingRepository;
use Lodgik\Repository\GuestRepository;
use Lodgik\Repository\RoomRepository;
use Lodgik\Service\TermiiService;
use Lodgik\Helper\UuidHelper;
use Psr\Log\LoggerInterface;

final class GuestAuthService
{
    private const SESSION_TTL_HOURS = 24;
    private const ACCESS_CODE_LENGTH = 6;

    public function __construct(
        private readonly EntityManagerInterface $em,
        private readonly GuestAccessCodeRepository $codeRepo,
        private readonly GuestSessionRepository $sessionRepo,
        private readonly TabletDeviceRepository $tabletRepo,
        private readonly BookingRepository $bookingRepo,
        private readonly GuestRepository $guestRepo,
        private readonly RoomRepository $roomRepo,
        private readonly TermiiService $termii,
        private readonly LoggerInterface $logger,
    ) {}

    // ─── Access Code Management ─────────────────────────────────

    /**
     * Generate a 6-digit access code for a booking (called at check-in).
     */
    public function generateAccessCode(string $bookingId, string $guestId, string $propertyId, ?string $roomId, string $tenantId): GuestAccessCode
    {
        // Deactivate any existing codes for this booking
        $this->codeRepo->deactivateForBooking($bookingId);

        // Generate unique code within tenant
        $code = $this->generateUniqueCode($tenantId);

        // Expires 14 days after checkout to allow lost & found reporting.
        // For hourly bookings, checkout could be same day — 14 days ensures guest
        // can still log a lost item after the stay.
        $booking   = $this->bookingRepo->find($bookingId);
        $checkOut  = $booking?->getCheckOut() ?? new \DateTimeImmutable();
        $expiresAt = $checkOut->modify('+14 days');

        $ac = new GuestAccessCode($bookingId, $guestId, $propertyId, $code, $expiresAt, $tenantId);
        $ac->setRoomId($roomId);
        $this->em->persist($ac);
        $this->em->flush();

        $this->logger->info("Access code generated: booking={$bookingId}, code={$code}");
        return $ac;
    }

    /**
     * Login via 6-digit access code.
     */
    public function loginWithAccessCode(string $code, string $tenantId): array
    {
        $ac = $this->codeRepo->findActiveByCode($code);
        if (!$ac) throw new \RuntimeException('Invalid or expired access code');
        if ($ac->getTenantId() !== $tenantId) throw new \RuntimeException('Invalid access code');

        $ac->setLastUsedAt(new \DateTimeImmutable());
        $session = $this->createSession($ac->getGuestId(), $ac->getBookingId(), $ac->getPropertyId(), $ac->getRoomId(), 'access_code', $tenantId);

        return $this->buildLoginResponse($session, $ac->getBookingId(), $ac->getGuestId());
    }

    // ─── OTP Login ──────────────────────────────────────────────

    /**
     * Send OTP to guest phone. Guest must have an active booking.
     */
    public function sendOtp(string $phone, string $tenantId): array
    {
        // Find guest by phone
        $guest = $this->guestRepo->findByPhone($phone);
        if (!$guest) throw new \RuntimeException('No guest found with this phone number');

        // Find active booking for this guest
        $booking = $this->bookingRepo->findActiveForGuest($guest->getId());
        if (!$booking) throw new \RuntimeException('No active booking found');

        $otp = $this->termii->sendOtp($phone, $tenantId);

        return [
            'message' => 'OTP sent to your phone',
            'phone_masked' => substr($phone, 0, 4) . '****' . substr($phone, -2),
            'expires_in' => 600,
            // In dev mode, return OTP for testing
            'dev_otp' => empty($_ENV['TERMII_API_KEY']) ? $otp : null,
        ];
    }

    /**
     * Verify OTP and create session.
     */
    public function verifyOtp(string $phone, string $otp, string $tenantId): array
    {
        if (!$this->termii->verifyOtp($phone, $otp, $tenantId)) {
            throw new \RuntimeException('Invalid or expired OTP');
        }

        $guest = $this->guestRepo->findByPhone($phone);
        if (!$guest) throw new \RuntimeException('Guest not found');

        $booking = $this->bookingRepo->findActiveForGuest($guest->getId());
        if (!$booking) throw new \RuntimeException('No active booking found');

        $session = $this->createSession($guest->getId(), $booking->getId(), $booking->getPropertyId(), $booking->getRoomId(), 'otp', $tenantId);

        return $this->buildLoginResponse($session, $booking->getId(), $guest->getId());
    }

    // ─── Tablet Auth ────────────────────────────────────────────

    /**
     * Authenticate tablet device — returns guest context if room has active booking.
     */
    public function authenticateTablet(string $deviceToken): array
    {
        $tablet = $this->tabletRepo->findByDeviceToken($deviceToken);
        if (!$tablet) throw new \RuntimeException('Unknown device');

        $tablet->ping();

        $data = ['device' => $tablet->toArray(), 'has_guest' => false];

        if ($tablet->getCurrentBookingId()) {
            $booking = $this->bookingRepo->find($tablet->getCurrentBookingId());
            if ($booking && $booking->getStatus() === BookingStatus::CHECKED_IN) {
                $guest = $this->guestRepo->find($tablet->getCurrentGuestId());
                $session = $this->createSession(
                    $tablet->getCurrentGuestId(),
                    $tablet->getCurrentBookingId(),
                    $tablet->getPropertyId(),
                    $tablet->getRoomId(),
                    'tablet',
                    $tablet->getTenantId()
                );
                $data['has_guest'] = true;
                $data['session'] = $session->toArray();
                $data['session']['token'] = $session->getToken();
                $data['guest_name'] = $guest?->getFullName();
                $data['booking_ref'] = $booking->getBookingRef();
            }
        }

        $this->em->flush();
        return $data;
    }

    /**
     * Register a new tablet device for a room.
     */
    public function registerTablet(string $propertyId, string $roomId, string $name, string $tenantId): TabletDevice
    {
        $token = UuidHelper::generate() . '-' . bin2hex(random_bytes(8));
        $tablet = new TabletDevice($propertyId, $roomId, $name, $token, $tenantId);
        $this->em->persist($tablet);
        $this->em->flush();
        return $tablet;
    }

    /** @return TabletDevice[] */
    public function listTablets(string $propertyId): array
    {
        return $this->tabletRepo->findByProperty($propertyId);
    }

    // ─── Session Management ─────────────────────────────────────

    /**
     * Validate a guest session token. Returns session context or null.
     */
    public function validateSession(string $token): ?GuestSession
    {
        $session = $this->sessionRepo->findActiveByToken($token);
        if (!$session) return null;
        $session->touch();
        $this->em->flush();
        return $session;
    }

    public function logout(string $token): void
    {
        $session = $this->sessionRepo->findActiveByToken($token);
        if ($session) {
            $session->invalidate();
            $this->em->flush();
        }
    }

    /**
     * Invalidate all sessions for a booking (called at checkout).
     */
    public function invalidateBookingSessions(string $bookingId): void
    {
        $this->sessionRepo->invalidateForBooking($bookingId);
        $this->codeRepo->deactivateForBooking($bookingId);
    }

    // ─── Tablet Binding (called from BookingService) ────────────

    /**
     * Bind tablet to booking on check-in.
     */
    public function bindTabletToBooking(string $roomId, string $bookingId, string $guestId): void
    {
        $tablet = $this->tabletRepo->findByRoom($roomId);
        if ($tablet) {
            $tablet->bindToBooking($bookingId, $guestId);
            $this->em->flush();
        }
    }

    /**
     * Unbind tablet on checkout.
     */
    public function unbindTablet(string $roomId): void
    {
        $tablet = $this->tabletRepo->findByRoom($roomId);
        if ($tablet) {
            $tablet->unbind();
            $this->em->flush();
        }
    }

    // ─── Helpers ────────────────────────────────────────────────

    private function createSession(string $guestId, string $bookingId, string $propertyId, ?string $roomId, string $authMethod, string $tenantId): GuestSession
    {
        $token = UuidHelper::generate();
        $expiresAt = new \DateTimeImmutable('+' . self::SESSION_TTL_HOURS . ' hours');
        $session = new GuestSession($guestId, $bookingId, $propertyId, $token, $authMethod, $expiresAt, $tenantId);
        $session->setRoomId($roomId);
        $this->em->persist($session);
        $this->em->flush();
        return $session;
    }

    private function generateUniqueCode(string $tenantId): string
    {
        for ($i = 0; $i < 10; $i++) {
            $code = str_pad((string) random_int(100000, 999999), 6, '0', STR_PAD_LEFT);
            $existing = $this->codeRepo->findActiveByCode($code);
            if (!$existing || $existing->getTenantId() !== $tenantId) return $code;
        }
        throw new \RuntimeException('Failed to generate unique access code');
    }

    private function buildLoginResponse(GuestSession $session, string $bookingId, string $guestId): array
    {
        $booking = $this->bookingRepo->find($bookingId);
        $guest = $this->guestRepo->find($guestId);

        // Resolve room number for display in the guest PWA
        $roomNumber = null;
        if ($booking?->getRoomId()) {
            $room = $this->roomRepo->find($booking->getRoomId());
            $roomNumber = $room?->getRoomNumber();
        }

        return [
            'token' => $session->getToken(),
            'expires_at' => $session->getExpiresAt()->format('Y-m-d H:i:s'),
            'guest' => [
                'id'   => $guest?->getId(),
                'name' => $guest?->getFullName(),
            ],
            'booking' => [
                'id'          => $booking?->getId(),
                'ref'         => $booking?->getBookingRef(),
                'room_id'     => $booking?->getRoomId(),
                'room_number' => $roomNumber,
                'check_in'    => $booking?->getCheckIn()->format('Y-m-d'),
                'check_out'   => $booking?->getCheckOut()->format('Y-m-d'),
            ],
            'property_id' => $session->getPropertyId(),
        ];
    }
    /**
     * Extend the active guest access code for a booking to +14 days after new checkout.
     * Called when a lodge stay is extended so the guest portal remains accessible.
     */
    public function extendAccessCode(string $bookingId, \DateTimeImmutable $newCheckout): void
    {
        $ac = $this->codeRepo->findActiveByBooking($bookingId);
        if ($ac === null) {
            return; // no active code — nothing to extend
        }
        $ac->setExpiresAt($newCheckout->modify('+14 days'));
        $this->em->flush();
    }

}

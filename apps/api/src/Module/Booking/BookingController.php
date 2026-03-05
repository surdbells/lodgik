<?php

declare(strict_types=1);

namespace Lodgik\Module\Booking;

use Lodgik\Entity\Booking;
use Lodgik\Entity\BookingAddon;
use Lodgik\Entity\BookingStatusLog;
use Lodgik\Enum\BookingStatus;
use Lodgik\Enum\BookingType;
use Lodgik\Helper\PaginationHelper;
use Lodgik\Helper\ResponseHelper;
use Lodgik\Module\Booking\DTO\CreateBookingRequest;
use Psr\Http\Message\ResponseInterface as Response;
use Psr\Http\Message\ServerRequestInterface as Request;

final class BookingController
{
    public function __construct(
        private readonly BookingService $bookingService,
        private readonly ResponseHelper $response,
        private readonly ?\Lodgik\Service\ZeptoMailService $mailService = null,
        private readonly ?\Lodgik\Repository\GuestAccessCodeRepository $accessCodeRepo = null,
    ) {}

    /** GET /api/bookings */
    public function list(Request $request, Response $response): Response
    {
        $pagination = PaginationHelper::fromRequest($request);
        $search = PaginationHelper::searchFromRequest($request);
        $filters = PaginationHelper::filtersFromRequest($request, ['property_id', 'status', 'guest_id', 'room_id', 'date_from', 'date_to']);

        $result = $this->bookingService->list(
            propertyId: $filters['property_id'] ?? null,
            status: $filters['status'] ?? null,
            guestId: $filters['guest_id'] ?? null,
            roomId: $filters['room_id'] ?? null,
            dateFrom: $filters['date_from'] ?? null,
            dateTo: $filters['date_to'] ?? null,
            search: $search,
            page: $pagination['page'],
            limit: $pagination['limit'],
        );

        $items = array_map(fn(Booking $b) => $this->serialize($b), $result['items']);
        return $this->response->paginated($response, $items, $result['total'], $pagination['page'], $pagination['limit']);
    }

    /** GET /api/bookings/{id} */
    public function show(Request $request, Response $response, array $args): Response
    {
        $booking = $this->bookingService->getById($args['id']);
        if ($booking === null) {
            return $this->response->notFound($response, 'Booking not found');
        }

        $data = $this->serialize($booking);
        $data['addons'] = array_map(fn(BookingAddon $a) => [
            'id' => $a->getId(),
            'name' => $a->getName(),
            'amount' => $a->getAmount(),
            'quantity' => $a->getQuantity(),
            'line_total' => $a->getLineTotal(),
        ], $this->bookingService->getAddons($booking->getId()));

        return $this->response->success($response, $data);
    }

    /** POST /api/bookings */
    public function create(Request $request, Response $response): Response
    {
        $body = (array) ($request->getParsedBody() ?? []);
        $dto = CreateBookingRequest::fromArray($body);

        $errors = $dto->validate();
        if (!empty($errors)) {
            return $this->response->validationError($response, $errors);
        }

        try {
            $tenantId = $request->getAttribute('auth.tenant_id');
            $userId = $request->getAttribute('user_id');
            $booking = $this->bookingService->create($dto, $tenantId, $userId);

            return $this->response->created($response, $this->serialize($booking));
        } catch (\InvalidArgumentException $e) {
            return $this->response->validationError($response, ['error' => $e->getMessage()]);
        }
    }

    /** POST /api/bookings/{id}/check-in */
    public function checkIn(Request $request, Response $response, array $args): Response
    {
        $body = (array) ($request->getParsedBody() ?? []);
        try {
            $userId = $request->getAttribute('user_id');
            $booking = $this->bookingService->checkIn($args['id'], $body['room_id'] ?? null, $userId);
            return $this->response->success($response, $this->serialize($booking), 'Guest checked in');
        } catch (\RuntimeException | \InvalidArgumentException $e) {
            return $this->response->validationError($response, ['error' => $e->getMessage()]);
        }
    }

    /** POST /api/bookings/{id}/check-out */
    public function checkOut(Request $request, Response $response, array $args): Response
    {
        try {
            $userId = $request->getAttribute('user_id');
            $booking = $this->bookingService->checkOut($args['id'], $userId);
            return $this->response->success($response, $this->serialize($booking), 'Guest checked out');
        } catch (\RuntimeException | \InvalidArgumentException $e) {
            return $this->response->validationError($response, ['error' => $e->getMessage()]);
        }
    }

    /** POST /api/bookings/{id}/cancel */
    public function cancel(Request $request, Response $response, array $args): Response
    {
        $body = (array) ($request->getParsedBody() ?? []);
        try {
            $userId = $request->getAttribute('user_id');
            $booking = $this->bookingService->cancel($args['id'], $body['reason'] ?? null, $userId);
            return $this->response->success($response, $this->serialize($booking), 'Booking cancelled');
        } catch (\RuntimeException | \InvalidArgumentException $e) {
            return $this->response->validationError($response, ['error' => $e->getMessage()]);
        }
    }

    /** POST /api/bookings/{id}/no-show */
    public function noShow(Request $request, Response $response, array $args): Response
    {
        try {
            $userId = $request->getAttribute('user_id');
            $booking = $this->bookingService->noShow($args['id'], $userId);
            return $this->response->success($response, $this->serialize($booking), 'Booking marked as no-show');
        } catch (\RuntimeException | \InvalidArgumentException $e) {
            return $this->response->validationError($response, ['error' => $e->getMessage()]);
        }
    }


    /** POST /api/bookings/{id}/clear-front-desk */
    public function clearFrontDesk(Request $request, Response $response, array $args): Response
    {
        try {
            $userId  = $request->getAttribute('auth.user_id');
            $booking = $this->bookingService->clearFrontDesk($args['id'], $userId ?? 'unknown');
            return $this->response->success($response, $this->serialize($booking), 'Front desk clearance recorded');
        } catch (\RuntimeException | \InvalidArgumentException $e) {
            return $this->response->validationError($response, ['error' => $e->getMessage()]);
        }
    }

    /** POST /api/bookings/{id}/clear-security */
    public function clearSecurity(Request $request, Response $response, array $args): Response
    {
        try {
            $userId  = $request->getAttribute('auth.user_id');
            $booking = $this->bookingService->clearSecurity($args['id'], $userId ?? 'unknown');
            return $this->response->success($response, $this->serialize($booking), 'Security clearance recorded');
        } catch (\RuntimeException | \InvalidArgumentException $e) {
            return $this->response->validationError($response, ['error' => $e->getMessage()]);
        }
    }

    /** GET /api/bookings/overdue */
    public function overdue(Request $request, Response $response): Response
    {
        $propertyId = $request->getQueryParams()['property_id'] ?? null;
        $tenantId   = $request->getAttribute('auth.tenant_id');
        $bookings   = $this->bookingService->getOverdue($propertyId ?? '', $tenantId);
        return $this->response->success($response, array_map([$this, 'serialize'], $bookings));
    }

    /** GET /api/bookings/today */
    public function today(Request $request, Response $response): Response
    {
        $propertyId = $request->getQueryParams()['property_id'] ?? null;
        if ($propertyId === null) {
            return $this->response->validationError($response, ['property_id' => 'Required']);
        }

        $bookings = $this->bookingService->getToday($propertyId);
        $items = array_map(fn(Booking $b) => $this->serialize($b), $bookings);
        return $this->response->success($response, $items);
    }

    /** GET /api/bookings/calendar */
    public function calendar(Request $request, Response $response): Response
    {
        $params = $request->getQueryParams();
        $propertyId = $params['property_id'] ?? null;
        $from = $params['from'] ?? null;
        $to = $params['to'] ?? null;

        if ($propertyId === null || $from === null || $to === null) {
            return $this->response->validationError($response, ['error' => 'property_id, from, and to are required']);
        }

        $bookings = $this->bookingService->getCalendar($propertyId, $from, $to);
        $items = array_map(fn(Booking $b) => $this->serialize($b), $bookings);
        return $this->response->success($response, $items);
    }

    /** GET /api/bookings/{id}/status-history */
    public function statusHistory(Request $request, Response $response, array $args): Response
    {
        $logs = $this->bookingService->getStatusHistory($args['id']);
        $items = array_map(fn(BookingStatusLog $l) => [
            'id' => $l->getId(),
            'old_status' => $l->getOldStatus()->value,
            'new_status' => $l->getNewStatus()->value,
            'changed_by' => $l->getChangedBy(),
            'notes' => $l->getNotes(),
            'created_at' => $l->getCreatedAt()->format('c'),
        ], $logs);
        return $this->response->success($response, $items);
    }

    /** POST /api/bookings/preview-rate */
    public function previewRate(Request $request, Response $response): Response
    {
        $body = (array) ($request->getParsedBody() ?? []);
        try {
            $calc = $this->bookingService->previewRate(
                $body['room_type_id'] ?? '',
                $body['booking_type'] ?? '',
                $body['check_in'] ?? '',
                $body['check_out'] ?? '',
                (string) ($body['discount_amount'] ?? '0.00'),
            );
            return $this->response->success($response, $calc);
        } catch (\InvalidArgumentException $e) {
            return $this->response->validationError($response, ['error' => $e->getMessage()]);
        }
    }

    /**
     * GET /api/bookings/{id}/guest-access
     *
     * Returns the active guest access code + deep-link PWA URL for a booking.
     * Called by staff after check-in to display / print the QR code.
     *
     * Response:
     *   {
     *     access_code: "123456",
     *     pwa_url: "https://hotel.lodgik.co/guest?t=<slug>&c=123456",
     *     qr_data: "https://hotel.lodgik.co/guest?t=<slug>&c=123456",
     *     expires_at: "2026-03-10T12:00:00+00:00",
     *     booking_ref: "BKG-XXXX"
     *   }
     */
    public function guestAccess(Request $request, Response $response, array $args): Response
    {
        if (!$this->accessCodeRepo) {
            return $this->response->error($response, 'Guest access not configured', 500);
        }

        $bookingId = $args['id'];

        // Verify booking belongs to this tenant (TenantMiddleware scopes the query)
        $booking = $this->bookingService->getById($bookingId);
        if (!$booking) {
            return $this->response->error($response, 'Booking not found', 404);
        }

        $ac = $this->accessCodeRepo->findActiveByBooking($bookingId);
        if (!$ac) {
            return $this->response->error($response, 'No active access code for this booking. Ensure the guest is checked in.', 404);
        }

        // Build the deep-link URL
        // tenant_slug is resolved from the booking's tenant — use the request attribute
        // set by TenantMiddleware (we query the tenant slug from DB via the tenant_id)
        $hotelAppUrl = rtrim($_ENV['HOTEL_APP_URL'] ?? 'https://hotel.lodgik.co', '/');
        $tenantId    = $request->getAttribute('auth.tenant_id');

        // Resolve tenant slug (cached: the Doctrine entity manager has it in identity map)
        $tenant = $this->bookingService->getTenantSlug($tenantId);
        $slug   = $tenant ?? $tenantId; // fallback to UUID if slug unavailable

        $pwaPart = "/guest?t={$slug}&c={$ac->getCode()}";
        $deepLink = $hotelAppUrl . $pwaPart;

        return $this->response->success($response, [
            'access_code' => $ac->getCode(),
            'pwa_url'     => $deepLink,
            'qr_data'     => $deepLink,   // client renders this as QR
            'expires_at'  => $ac->getExpiresAt()->format('c'),
            'booking_ref' => $booking->getBookingRef(),
            'guest_id'    => $booking->getGuestId(),
            'room_id'     => $booking->getRoomId(),
        ]);
    }

    // ─── Serializer ───────────────────────────────────────────

    private function serialize(Booking $b): array
    {
        return [
            'id' => $b->getId(),
            'property_id' => $b->getPropertyId(),
            'guest_id' => $b->getGuestId(),
            'room_id' => $b->getRoomId(),
            'booking_ref' => $b->getBookingRef(),
            'booking_type' => $b->getBookingType()->value,
            'booking_type_label' => $b->getBookingType()->label(),
            'status' => $b->getStatus()->value,
            'status_label' => $b->getStatus()->label(),
            'status_color' => $b->getStatus()->color(),
            'check_in' => $b->getCheckIn()->format('c'),
            'check_out' => $b->getCheckOut()->format('c'),
            'duration_hours' => $b->getDurationHours(),
            'nights' => $b->getNights(),
            'adults' => $b->getAdults(),
            'children' => $b->getChildren(),
            'rate_per_night' => $b->getRatePerNight(),
            'total_amount' => $b->getTotalAmount(),
            'discount_amount' => $b->getDiscountAmount(),
            'notes' => $b->getNotes(),
            'source' => $b->getSource(),
            'special_requests' => $b->getSpecialRequests(),
            'created_by' => $b->getCreatedBy(),
            'checked_in_at' => $b->getCheckedInAt()?->format('c'),
            'checked_out_at' => $b->getCheckedOutAt()?->format('c'),
            'created_at' => $b->getCreatedAt()?->format('c'),
        ];
    }
}

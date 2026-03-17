<?php
declare(strict_types=1);

namespace Lodgik\Module\GuestPortal;

use Doctrine\ORM\EntityManagerInterface;
use Lodgik\Entity\Amenity;
use Lodgik\Entity\AmenityVoucher;
use Lodgik\Entity\Room;
use Lodgik\Entity\RoomType;
use Lodgik\Module\Chat\ChatService;
use Lodgik\Module\Folio\FolioService;
use Lodgik\Module\Gym\GymService;
use Lodgik\Module\RoomControl\RoomControlService;
use Lodgik\Module\Security\SecurityService;
use Lodgik\Module\ServiceRequest\ServiceRequestService;
use Lodgik\Module\Spa\SpaService;
use Lodgik\Repository\BookingRepository;
use Lodgik\Repository\GuestRepository;
use Lodgik\Repository\PropertyBankAccountRepository;
use Lodgik\Repository\PropertyRepository;
use Lodgik\Service\TermiiService;
use Lodgik\Util\JsonResponse;
use Psr\Http\Message\ResponseInterface as Response;
use Psr\Http\Message\ServerRequestInterface as Request;

/**
 * Guest-facing API — authenticated via GuestMiddleware (session token).
 *
 * Request attributes set by GuestMiddleware:
 *   guest.guest_id, guest.booking_id, guest.property_id, guest.tenant_id, guest.session_id
 */
final class GuestPortalController
{
    public function __construct(
        private readonly FolioService                  $folioService,
        private readonly ServiceRequestService         $serviceRequestService,
        private readonly BookingRepository             $bookingRepo,
        private readonly GuestRepository               $guestRepo,
        private readonly PropertyBankAccountRepository $bankAccountRepo,
        private readonly PropertyRepository            $propertyRepo,
        private readonly ChatService                   $chatService,
        private readonly SecurityService               $securityService,
        private readonly RoomControlService            $roomControlService,
        private readonly SpaService                    $spaService,
        private readonly GymService                    $gymService,
        private readonly EntityManagerInterface        $em,
        private readonly TermiiService                 $termii,
        private readonly \Lodgik\Module\Loyalty\LoyaltyService $loyaltyService,
    ) {}

    // ─────────────────────────────────────────────────────────────
    // BOOKING & FOLIO
    // ─────────────────────────────────────────────────────────────

    /** GET /api/guest/booking */
    public function booking(Request $req, Response $res): Response
    {
        $booking = $this->bookingRepo->find($req->getAttribute('guest.booking_id'));
        if (!$booking) return JsonResponse::error($res, 'Booking not found', 404);
        return JsonResponse::ok($res, $booking->toArray());
    }

    /** GET /api/guest/folio */
    public function folio(Request $req, Response $res): Response
    {
        $bookingId  = $req->getAttribute('guest.booking_id');
        $propertyId = $req->getAttribute('guest.property_id');
        $folio      = $this->folioService->getByBooking($bookingId);
        if (!$folio) return JsonResponse::error($res, 'No folio found', 404);

        $detail       = $this->folioService->getDetail($folio->getId());
        $bankAccounts = $this->bankAccountRepo->findActiveByProperty($propertyId);

        return JsonResponse::ok($res, array_merge($detail, [
            'bank_accounts' => array_map(fn($b) => $b->toArray(), $bankAccounts),
        ]));
    }

    // ─────────────────────────────────────────────────────────────
    // SERVICE REQUESTS
    // ─────────────────────────────────────────────────────────────

    /** GET /api/guest/service-requests */
    public function listServiceRequests(Request $req, Response $res): Response
    {
        $requests = $this->serviceRequestService->listByBooking($req->getAttribute('guest.booking_id'));
        return JsonResponse::ok($res, array_map(fn($r) => $r->toArray(), $requests));
    }

    /** POST /api/guest/service-requests */
    public function createServiceRequest(Request $req, Response $res): Response
    {
        $body       = (array) ($req->getParsedBody() ?? []);
        $guestId    = $req->getAttribute('guest.guest_id');
        $bookingId  = $req->getAttribute('guest.booking_id');
        $propertyId = $req->getAttribute('guest.property_id');
        $tenantId   = $req->getAttribute('guest.tenant_id');

        foreach (['title', 'category'] as $f) {
            if (empty($body[$f])) return JsonResponse::error($res, "$f is required", 422);
        }

        $booking = $this->bookingRepo->find($bookingId);
        $sr = $this->serviceRequestService->create(
            propertyId:  $propertyId,
            bookingId:   $bookingId,
            guestId:     $guestId,
            category:    $body['category'],
            title:       $body['title'],
            tenantId:    $tenantId,
            description: $body['description'] ?? null,
            roomId:      $booking?->getRoomId(),
            priority:    (int) ($body['priority'] ?? 2),
        );

        return JsonResponse::created($res, $sr->toArray(), 'Service request submitted');
    }

    // ─────────────────────────────────────────────────────────────
    // CHAT
    // ─────────────────────────────────────────────────────────────

    /** GET /api/guest/chat/messages */
    public function chatMessages(Request $req, Response $res): Response
    {
        $messages = $this->chatService->getMessages($req->getAttribute('guest.booking_id'), 50);
        return JsonResponse::ok($res, array_map(fn($m) => $m->toArray(), $messages));
    }

    /** POST /api/guest/chat/send */
    public function chatSend(Request $req, Response $res): Response
    {
        $body      = (array) ($req->getParsedBody() ?? []);
        $guestId   = $req->getAttribute('guest.guest_id');
        $bookingId = $req->getAttribute('guest.booking_id');
        $propId    = $req->getAttribute('guest.property_id');
        $tenantId  = $req->getAttribute('guest.tenant_id');

        if (empty($body['message'])) return JsonResponse::error($res, 'message is required', 422);

        $guest     = $this->guestRepo->find($guestId);
        $guestName = $guest?->getFullName() ?? 'Guest';

        $message = $this->chatService->sendMessage(
            bookingId:  $bookingId,
            propertyId: $propId,
            senderType: 'guest',
            senderId:   $guestId,
            senderName: $guestName,
            message:    trim($body['message']),
            tenantId:   $tenantId,
        );

        return JsonResponse::created($res, $message->toArray(), 'Message sent');
    }

    /** POST /api/guest/chat/read */
    public function chatMarkRead(Request $req, Response $res): Response
    {
        $this->chatService->markRead($req->getAttribute('guest.booking_id'), 'staff');
        return JsonResponse::ok($res, null, 'Messages marked as read');
    }

    // ─────────────────────────────────────────────────────────────
    // VISITOR CODES
    // ─────────────────────────────────────────────────────────────

    /** GET /api/guest/visitor-codes */
    public function listVisitorCodes(Request $req, Response $res): Response
    {
        $codes = $this->securityService->listVisitorCodes($req->getAttribute('guest.booking_id'));
        return JsonResponse::ok($res, array_map(fn($c) => $c->toArray(), $codes));
    }

    /** POST /api/guest/visitor-codes */
    public function createVisitorCode(Request $req, Response $res): Response
    {
        $body       = (array) ($req->getParsedBody() ?? []);
        $guestId    = $req->getAttribute('guest.guest_id');
        $bookingId  = $req->getAttribute('guest.booking_id');
        $propertyId = $req->getAttribute('guest.property_id');
        $tenantId   = $req->getAttribute('guest.tenant_id');

        foreach (['visitor_name', 'valid_from', 'valid_until'] as $f) {
            if (empty($body[$f])) return JsonResponse::error($res, "$f is required", 422);
        }

        try {
            $from  = new \DateTimeImmutable($body['valid_from']);
            $until = new \DateTimeImmutable($body['valid_until']);
        } catch (\Exception) {
            return JsonResponse::error($res, 'Invalid date/time format', 422);
        }

        if ($until <= $from) {
            return JsonResponse::error($res, 'valid_until must be after valid_from', 422);
        }

        $booking     = $this->bookingRepo->find($bookingId);
        $guest       = $this->guestRepo->find($guestId);
        $property    = $this->propertyRepo->find($propertyId);
        $visitorName = trim($body['visitor_name']);
        $guestName   = $guest?->getFullName() ?? 'Guest';
        $bookingRoom = $booking?->getRoomId() ? $this->em->find(Room::class, $booking->getRoomId()) : null;

        $code = $this->securityService->createVisitorCode(
            bookingId:   $bookingId,
            propertyId:  $propertyId,
            guestId:     $guestId,
            visitorName: $visitorName,
            validFrom:   $body['valid_from'],
            validUntil:  $body['valid_until'],
            tenantId:    $tenantId,
            extra: [
                'visitor_phone' => $body['visitor_phone'] ?? null,
                'purpose'       => $body['purpose'] ?? null,
                'room_number'   => $bookingRoom?->getRoomNumber(),
                'guest_name'    => $guestName,
            ],
        );

        $hotelName = $property?->getName() ?? 'Our Hotel';
        $codeStr   = $code->getCode();
        $fromFmt   = $from->format('d M, g:ia');
        $untilFmt  = $until->format('d M, g:ia');

        // SMS to visitor
        if (!empty($body['visitor_phone'])) {
            $this->termii->send(
                $body['visitor_phone'],
                "Your visitor code for {$hotelName} is: {$codeStr}. " .
                "Valid: {$fromFmt} – {$untilFmt}. Show this code at the gate on arrival."
            );
        }

        // System chat message to guest
        $this->chatService->sendMessage(
            bookingId:  $bookingId,
            propertyId: $propertyId,
            senderType: 'staff',
            senderId:   'system',
            senderName: 'Lodgik',
            message:    "✅ Visitor code generated for {$visitorName}: *{$codeStr}*. " .
                        "Valid {$fromFmt} – {$untilFmt}. " .
                        (!empty($body['visitor_phone']) ? 'Code sent to their phone.' : 'Share the code with them directly.'),
            tenantId:   $tenantId,
        );

        return JsonResponse::created($res, $code->toArray(), 'Visitor code created');
    }

    /** DELETE /api/guest/visitor-codes/{id} */
    public function revokeVisitorCode(Request $req, Response $res, array $args): Response
    {
        $code = $this->securityService->revokeVisitorCode($args['id']);
        return JsonResponse::ok($res, $code->toArray(), 'Visitor code revoked');
    }

    // ─────────────────────────────────────────────────────────────
    // STAY EXTENSION
    // ─────────────────────────────────────────────────────────────

    /** POST /api/guest/stay-extension */
    public function requestStayExtension(Request $req, Response $res): Response
    {
        $body       = (array) ($req->getParsedBody() ?? []);
        $guestId    = $req->getAttribute('guest.guest_id');
        $bookingId  = $req->getAttribute('guest.booking_id');
        $propertyId = $req->getAttribute('guest.property_id');
        $tenantId   = $req->getAttribute('guest.tenant_id');

        if (empty($body['requested_checkout'])) {
            return JsonResponse::error($res, 'requested_checkout is required', 422);
        }

        $booking = $this->bookingRepo->find($bookingId);
        if (!$booking) {
            return JsonResponse::error($res, 'Booking not found', 404);
        }

        $originalCheckout  = $booking->getCheckOut()->format('Y-m-d H:i:s');
        $requestedCheckout = $body['requested_checkout'];

        $desc = "Requested new check-out: {$requestedCheckout}. Original check-out: {$originalCheckout}.";
        if (!empty($body['reason'])) $desc .= " Reason: {$body['reason']}";

        // Calculate extra nights for display in notification
        try {
            $newDate  = new \DateTimeImmutable($requestedCheckout);
            $origDate = $booking->getCheckOut();
            $extraNights = (int) $origDate->diff($newDate)->days;
        } catch (\Throwable) {
            $extraNights = 0;
        }

        $metadata = [
            'requested_checkout' => $requestedCheckout,
            'original_checkout'  => $originalCheckout,
            'extra_nights'       => $extraNights,
            'rate_per_night'     => $booking->getRatePerNight(),
            'reason'             => $body['reason'] ?? null,
        ];

        $sr = $this->serviceRequestService->create(
            propertyId:  $propertyId,
            bookingId:   $bookingId,
            guestId:     $guestId,
            category:    'stay_extension',
            title:       'Stay Extension Request',
            tenantId:    $tenantId,
            description: $desc,
            roomId:      $booking->getRoomId(),
            priority:    3,
            metadata:    $metadata,
        );

        return JsonResponse::created($res, $sr->toArray(), 'Extension request submitted. Our team will confirm shortly.');
    }

    // ─────────────────────────────────────────────────────────────
    // ROOM CONTROLS
    // ─────────────────────────────────────────────────────────────

    /** GET /api/guest/room-controls/status */
    public function getRoomControlStatus(Request $req, Response $res): Response
    {
        $status = $this->roomControlService->getRoomStatus($req->getAttribute('guest.booking_id'));
        return JsonResponse::ok($res, $status);
    }

    /** POST /api/guest/room-controls/dnd */
    public function toggleDnd(Request $req, Response $res): Response
    {
        $body    = (array) ($req->getParsedBody() ?? []);
        $booking = $this->bookingRepo->find($req->getAttribute('guest.booking_id'));
        if (!$booking) return JsonResponse::error($res, 'Booking not found', 404);

        $active     = (bool) ($body['active'] ?? true);
        $room       = $booking->getRoomId() ? $this->em->find(Room::class, $booking->getRoomId()) : null;

        $r = $this->roomControlService->toggleDnd(
            $req->getAttribute('guest.property_id'),
            $booking->getId(),
            $req->getAttribute('guest.guest_id'),
            $booking->getRoomId(),
            $room?->getRoomNumber() ?? '',
            $active,
            $req->getAttribute('guest.tenant_id'),
        );

        return JsonResponse::ok($res, $r->toArray(), $active ? 'Do Not Disturb activated' : 'Do Not Disturb deactivated');
    }

    /** POST /api/guest/room-controls/make-up */
    public function toggleMakeUp(Request $req, Response $res): Response
    {
        $body    = (array) ($req->getParsedBody() ?? []);
        $booking = $this->bookingRepo->find($req->getAttribute('guest.booking_id'));
        if (!$booking) return JsonResponse::error($res, 'Booking not found', 404);

        $active     = (bool) ($body['active'] ?? true);
        $room       = $booking->getRoomId() ? $this->em->find(Room::class, $booking->getRoomId()) : null;

        $r = $this->roomControlService->toggleMakeUpRoom(
            $req->getAttribute('guest.property_id'),
            $booking->getId(),
            $req->getAttribute('guest.guest_id'),
            $booking->getRoomId(),
            $room?->getRoomNumber() ?? '',
            $active,
            $req->getAttribute('guest.tenant_id'),
        );

        return JsonResponse::ok($res, $r->toArray(), $active ? 'Make-up room requested' : 'Make-up room request cancelled');
    }

    /** POST /api/guest/room-controls/maintenance */
    public function reportMaintenance(Request $req, Response $res): Response
    {
        $body    = (array) ($req->getParsedBody() ?? []);
        $booking = $this->bookingRepo->find($req->getAttribute('guest.booking_id'));
        if (!$booking) return JsonResponse::error($res, 'Booking not found', 404);

        if (empty($body['description'])) return JsonResponse::error($res, 'description is required', 422);

        $room = $booking->getRoomId() ? $this->em->find(Room::class, $booking->getRoomId()) : null;
        $r = $this->roomControlService->reportMaintenance(
            $req->getAttribute('guest.property_id'),
            $booking->getId(),
            $req->getAttribute('guest.guest_id'),
            $booking->getRoomId(),
            $room?->getRoomNumber() ?? '',
            trim($body['description']),
            $req->getAttribute('guest.tenant_id'),
            $body['photo_url'] ?? null,
        );

        return JsonResponse::created($res, $r->toArray(), 'Maintenance request submitted');
    }

    // ─────────────────────────────────────────────────────────────
    // LOST & FOUND
    // ─────────────────────────────────────────────────────────────

    /** GET /api/guest/lost-and-found */
    public function listLostReports(Request $req, Response $res): Response
    {
        $all      = $this->serviceRequestService->listByBooking($req->getAttribute('guest.booking_id'));
        $filtered = array_filter($all, fn($r) => $r->getCategory()->value === 'lost_and_found');
        return JsonResponse::ok($res, array_values(array_map(fn($r) => $r->toArray(), $filtered)));
    }

    /** POST /api/guest/lost-and-found */
    public function reportLostItem(Request $req, Response $res): Response
    {
        $body       = (array) ($req->getParsedBody() ?? []);
        $guestId    = $req->getAttribute('guest.guest_id');
        $bookingId  = $req->getAttribute('guest.booking_id');
        $propertyId = $req->getAttribute('guest.property_id');
        $tenantId   = $req->getAttribute('guest.tenant_id');

        if (empty($body['item_description'])) {
            return JsonResponse::error($res, 'item_description is required', 422);
        }

        $desc = "Lost item: {$body['item_description']}";
        if (!empty($body['last_seen_location'])) $desc .= ". Last seen: {$body['last_seen_location']}";
        if (!empty($body['additional_details'])) $desc .= ". Details: {$body['additional_details']}";

        $booking = $this->bookingRepo->find($bookingId);

        $sr = $this->serviceRequestService->create(
            propertyId:  $propertyId,
            bookingId:   $bookingId,
            guestId:     $guestId,
            category:    'lost_and_found',
            title:       "Lost item: {$body['item_description']}",
            tenantId:    $tenantId,
            description: $desc,
            roomId:      $booking?->getRoomId(),
            priority:    2,
        );

        return JsonResponse::created($res, $sr->toArray(), 'Lost item report submitted. Our staff will assist you.');
    }

    // ─────────────────────────────────────────────────────────────
    // HOTEL INFO (WiFi + Amenities + Vouchers)
    // ─────────────────────────────────────────────────────────────

    /** GET /api/guest/hotel-info */
    public function hotelInfo(Request $req, Response $res): Response
    {
        $propertyId = $req->getAttribute('guest.property_id');
        $guestId    = $req->getAttribute('guest.guest_id');
        $bookingId  = $req->getAttribute('guest.booking_id');
        $tenantId   = $req->getAttribute('guest.tenant_id');

        $property = $this->propertyRepo->find($propertyId);

        // ── WiFi: only expose credentials if the guest's room has a WiFi amenity
        //    AND the property has wifi_ssid configured in operational settings
        $wifi = null;
        $wifiSsid     = $property?->getSetting('wifi_ssid');
        $wifiPassword = $property?->getSetting('wifi_password');

        if ($wifiSsid) {
            $booking = $this->bookingRepo->find($bookingId);
            $roomHasWifi = false;

            if ($booking?->getRoomId()) {
                $room = $this->em->getRepository(Room::class)->find($booking->getRoomId());
                if ($room) {
                    // Check room-level custom amenities first
                    $roomAmenities = $room->getAmenities() ?? [];
                    foreach ($roomAmenities as $a) {
                        $name = strtolower(is_array($a) ? ($a['name'] ?? '') : (string) $a);
                        if (str_contains($name, 'wifi') || str_contains($name, 'internet') || str_contains($name, 'wi-fi')) {
                            $roomHasWifi = true;
                            break;
                        }
                    }

                    // Also check room type amenities if room-level didn't match
                    if (!$roomHasWifi) {
                        $roomType = $this->em->getRepository(RoomType::class)->find($room->getRoomTypeId());
                        $typeAmenities = $roomType?->getAmenities() ?? [];
                        foreach ($typeAmenities as $a) {
                            $name = strtolower(is_array($a) ? ($a['name'] ?? '') : (string) $a);
                            if (str_contains($name, 'wifi') || str_contains($name, 'internet') || str_contains($name, 'wi-fi')) {
                                $roomHasWifi = true;
                                break;
                            }
                        }
                    }
                }
            }

            if ($roomHasWifi) {
                $wifi = [
                    'ssid'     => $wifiSsid,
                    'password' => $wifiPassword,
                ];
            }
        }

        $amenities = $this->em->getRepository(Amenity::class)
            ->findBy(['tenantId' => $tenantId, 'isActive' => true]);

        $vouchers = $this->em->getRepository(AmenityVoucher::class)
            ->findBy(['bookingId' => $bookingId, 'guestId' => $guestId]);

        return JsonResponse::ok($res, [
            'wifi'      => $wifi,
            'amenities' => array_map(fn($a) => $a->toArray(), $amenities),
            'vouchers'  => array_map(fn($v) => $v->toArray(), $vouchers),
            'hotel'     => [
                'name'    => $property?->getName(),
                'address' => $property?->getAddress(),
                'phone'   => $property?->getPhone(),
                'email'   => $property?->getEmail(),
            ],
        ]);
    }

    // ─────────────────────────────────────────────────────────────
    // SPA
    // ─────────────────────────────────────────────────────────────

    /** GET /api/guest/spa/services */
    public function listSpaServices(Request $req, Response $res): Response
    {
        $services = $this->spaService->listServices($req->getAttribute('guest.property_id'), true);
        return JsonResponse::ok($res, $services);
    }

    /** GET /api/guest/spa/bookings */
    public function listSpaBookings(Request $req, Response $res): Response
    {
        $guestId = $req->getAttribute('guest.guest_id');
        $all     = $this->spaService->listBookings($req->getAttribute('guest.property_id'));
        $mine    = array_values(array_filter($all, fn($b) => ($b['guest_id'] ?? null) === $guestId));
        return JsonResponse::ok($res, $mine);
    }

    /** POST /api/guest/spa/book */
    public function bookSpa(Request $req, Response $res): Response
    {
        $body       = (array) ($req->getParsedBody() ?? []);
        $guestId    = $req->getAttribute('guest.guest_id');
        $propertyId = $req->getAttribute('guest.property_id');
        $tenantId   = $req->getAttribute('guest.tenant_id');

        foreach (['service_id', 'service_name', 'date', 'start_time', 'price'] as $f) {
            if (empty($body[$f])) return JsonResponse::error($res, "$f is required", 422);
        }

        $guest     = $this->guestRepo->find($guestId);
        $guestName = $guest?->getFullName() ?? 'Guest';

        $booking = $this->spaService->createBooking(
            pid:       $propertyId,
            svcId:     $body['service_id'],
            svcName:   $body['service_name'],
            gId:       $guestId,
            gName:     $guestName,
            date:      $body['date'],
            time:      $body['start_time'],
            price:     (string) $body['price'],
            tid:       $tenantId,
            therapist: $body['therapist_name'] ?? null,
        );

        return JsonResponse::created($res, $booking->toArray(), 'Spa appointment booked');
    }

    /** DELETE /api/guest/spa/bookings/{id} */
    public function cancelSpaBooking(Request $req, Response $res, array $args): Response
    {
        $booking = $this->spaService->cancelBooking($args['id']);
        return JsonResponse::ok($res, $booking->toArray(), 'Spa booking cancelled');
    }

    // ─────────────────────────────────────────────────────────────
    // GYM
    // ─────────────────────────────────────────────────────────────

    /** GET /api/guest/gym/plans */
    public function listGymPlans(Request $req, Response $res): Response
    {
        $plans = $this->gymService->listPlans($req->getAttribute('guest.property_id'), true);
        return JsonResponse::ok($res, array_map(fn($p) => $p->toArray(), $plans));
    }

    /** GET /api/guest/gym/classes */
    public function listGymClasses(Request $req, Response $res): Response
    {
        $q     = $req->getQueryParams();
        $classes = $this->gymService->listClasses(
            $req->getAttribute('guest.property_id'),
            $q['from'] ?? null,
            $q['to']   ?? null,
        );
        return JsonResponse::ok($res, array_map(fn($c) => $c->toArray(), $classes));
    }

    /** POST /api/guest/gym/classes/{id}/book */
    public function bookGymClass(Request $req, Response $res, array $args): Response
    {
        $guestId  = $req->getAttribute('guest.guest_id');
        $tenantId = $req->getAttribute('guest.tenant_id');

        // Guest ID is used as memberId — guests book classes without a membership record
        $classBooking = $this->gymService->bookClass($args['id'], $guestId, $tenantId);
        return JsonResponse::created($res, $classBooking->toArray(), 'Class booked successfully');
    }

    /** GET /api/guest/gym/class-bookings */
    public function listGymClassBookings(Request $req, Response $res): Response
    {
        $bookings = $this->gymService->listClassBookingsByGuest($req->getAttribute('guest.guest_id'));
        return JsonResponse::ok($res, array_map(fn($b) => $b->toArray(), $bookings));
    }

    /** DELETE /api/guest/gym/class-bookings/{id} */
    public function cancelGymClassBooking(Request $req, Response $res, array $args): Response
    {
        $booking = $this->em->find(\Lodgik\Entity\GymClassBooking::class, $args['id']);
        if (!$booking) return JsonResponse::error($res, 'Booking not found', 404);

        // Security: only the guest who booked can cancel
        if ($booking->getMemberId() !== $req->getAttribute('guest.guest_id')) {
            return JsonResponse::error($res, 'Forbidden', 403);
        }

        $booking->cancel();
        $this->em->flush();
        return JsonResponse::ok($res, $booking->toArray(), 'Class booking cancelled');
    }

    // ─────────────────────────────────────────────────────────────
    // GUEST PREFERENCES
    // ─────────────────────────────────────────────────────────────

    /** GET /api/guest/preferences */
    public function getPreferences(Request $req, Response $res): Response
    {
        $guestId  = $req->getAttribute('guest.guest_id');
        $tenantId = $req->getAttribute('guest.tenant_id');
        $prefs    = $this->loyaltyService->getPreferences($guestId, $tenantId);
        return JsonResponse::ok($res, $prefs ?? (object)[]);
    }

    /** PUT /api/guest/preferences */
    public function updatePreferences(Request $req, Response $res): Response
    {
        $guestId  = $req->getAttribute('guest.guest_id');
        $tenantId = $req->getAttribute('guest.tenant_id');
        $body     = (array) ($req->getParsedBody() ?? []);
        $prefs    = $this->loyaltyService->setPreferences($guestId, $tenantId, $body);
        return JsonResponse::ok($res, $prefs->toArray(), 'Preferences saved');
    }
}

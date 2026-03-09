<?php
declare(strict_types=1);

namespace Lodgik\Module\GuestPortal;

use Lodgik\Module\Chat\ChatService;
use Lodgik\Module\Folio\FolioService;
use Lodgik\Module\ServiceRequest\ServiceRequestService;
use Lodgik\Repository\BookingRepository;
use Lodgik\Repository\GuestRepository;
use Lodgik\Repository\PropertyBankAccountRepository;
use Lodgik\Util\JsonResponse;
use Psr\Http\Message\ResponseInterface as Response;
use Psr\Http\Message\ServerRequestInterface as Request;

/**
 * Guest-facing API endpoints — authenticated via GuestMiddleware (session token).
 *
 * All endpoints read guest context from request attributes set by GuestMiddleware:
 *   guest.guest_id, guest.booking_id, guest.property_id, guest.tenant_id
 */
final class GuestPortalController
{
    public function __construct(
        private readonly FolioService                  $folioService,
        private readonly ServiceRequestService         $serviceRequestService,
        private readonly BookingRepository             $bookingRepo,
        private readonly GuestRepository               $guestRepo,
        private readonly PropertyBankAccountRepository $bankAccountRepo,
        private readonly ChatService                   $chatService,
    ) {}

    // ── GET /api/guest/booking ──────────────────────────────────
    public function booking(Request $req, Response $res): Response
    {
        $bookingId = $req->getAttribute('guest.booking_id');
        $booking   = $this->bookingRepo->find($bookingId);

        if (!$booking) {
            return JsonResponse::error($res, 'Booking not found', 404);
        }

        return JsonResponse::ok($res, $booking->toArray());
    }

    // ── GET /api/guest/folio ────────────────────────────────────
    public function folio(Request $req, Response $res): Response
    {
        $bookingId  = $req->getAttribute('guest.booking_id');
        $propertyId = $req->getAttribute('guest.property_id');

        $folio = $this->folioService->getByBooking($bookingId);

        if (!$folio) {
            return JsonResponse::error($res, 'No folio found for your booking', 404);
        }

        $detail       = $this->folioService->getDetail($folio->getId());
        $bankAccounts = $this->bankAccountRepo->findActiveByProperty($propertyId);

        return JsonResponse::ok($res, array_merge($detail, [
            'bank_accounts' => array_map(fn($b) => $b->toArray(), $bankAccounts),
        ]));
    }

    // ── POST /api/guest/service-requests ───────────────────────
    public function createServiceRequest(Request $req, Response $res): Response
    {
        $body       = (array) ($req->getParsedBody() ?? []);
        $guestId    = $req->getAttribute('guest.guest_id');
        $bookingId  = $req->getAttribute('guest.booking_id');
        $propertyId = $req->getAttribute('guest.property_id');
        $tenantId   = $req->getAttribute('guest.tenant_id');

        foreach (['title', 'category'] as $f) {
            if (empty($body[$f])) {
                return JsonResponse::error($res, "$f is required", 422);
            }
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

    // ── GET /api/guest/service-requests ────────────────────────
    public function listServiceRequests(Request $req, Response $res): Response
    {
        $bookingId = $req->getAttribute('guest.booking_id');
        $requests  = $this->serviceRequestService->listByBooking($bookingId);

        return JsonResponse::ok($res, array_map(fn($r) => $r->toArray(), $requests));
    }
    // ── GET /api/guest/chat/messages ───────────────────────────
    public function chatMessages(Request $req, Response $res): Response
    {
        $bookingId = $req->getAttribute('guest.booking_id');
        $messages  = $this->chatService->getMessages($bookingId, 50);

        return JsonResponse::ok($res, array_map(fn($m) => $m->toArray(), $messages));
    }

    // ── POST /api/guest/chat/send ───────────────────────────────
    public function chatSend(Request $req, Response $res): Response
    {
        $body       = (array) ($req->getParsedBody() ?? []);
        $guestId    = $req->getAttribute('guest.guest_id');
        $bookingId  = $req->getAttribute('guest.booking_id');
        $propertyId = $req->getAttribute('guest.property_id');
        $tenantId   = $req->getAttribute('guest.tenant_id');

        if (empty($body['message'])) {
            return JsonResponse::error($res, 'message is required', 422);
        }

        $booking   = $this->bookingRepo->find($bookingId);
        $guest     = $this->guestRepo->find($guestId);
        $guestName = $guest?->getFullName() ?? 'Guest';

        $message = $this->chatService->sendMessage(
            bookingId:   $bookingId,
            propertyId:  $propertyId,
            senderType:  'guest',
            senderId:    $guestId,
            senderName:  $guestName,
            message:     trim($body['message']),
            tenantId:    $tenantId,
        );

        return JsonResponse::created($res, $message->toArray(), 'Message sent');
    }

    // ── POST /api/guest/chat/read ───────────────────────────────
    public function chatMarkRead(Request $req, Response $res): Response
    {
        $bookingId = $req->getAttribute('guest.booking_id');
        $this->chatService->markRead($bookingId, 'staff');

        return JsonResponse::ok($res, null, 'Messages marked as read');
    }


}
<?php

declare(strict_types=1);

namespace Lodgik\Module\Security;

use Psr\Http\Message\ResponseInterface as Response;
use Psr\Http\Message\ServerRequestInterface as Request;
use Lodgik\Util\JsonResponse;

final class SecurityController
{
    public function __construct(
        private readonly SecurityService $service,
        private readonly ?\Lodgik\Repository\BookingRepository $bookingRepo = null,
        private readonly ?\Lodgik\Repository\GuestRepository $guestRepo = null,
        private readonly ?\Lodgik\Repository\RoomRepository $roomRepo = null,
        private readonly ?\Lodgik\Service\TermiiService $termii = null,
        private readonly ?\Lodgik\Service\ZeptoMailService $mailService = null,
        private readonly ?\Lodgik\Module\Chat\ChatService $chatService = null,
    ) {}

    // Visitor codes
    public function createVisitorCode(Request $req, Response $res): Response
    {
        $d = (array) $req->getParsedBody();
        foreach (['booking_id', 'property_id', 'guest_id', 'visitor_name', 'valid_from', 'valid_until'] as $f)
            if (empty($d[$f])) return JsonResponse::error($res, "$f required", 422);
        $code = $this->service->createVisitorCode($d['booking_id'], $d['property_id'], $d['guest_id'], $d['visitor_name'], $d['valid_from'], $d['valid_until'], $req->getAttribute('auth.tenant_id'), $d);
        return JsonResponse::ok($res, $code->toArray(), 'Visitor code created');
    }

    public function listVisitorCodes(Request $req, Response $res): Response
    {
        $bid = $req->getQueryParams()['booking_id'] ?? '';
        return JsonResponse::ok($res, array_map(fn($c) => $c->toArray(), $this->service->listVisitorCodes($bid)));
    }

    public function revokeVisitorCode(Request $req, Response $res, array $args): Response
    {
        return JsonResponse::ok($res, $this->service->revokeVisitorCode($args['id'])->toArray());
    }

    /**
     * POST /api/security/visitor-codes/validate
     * Validates a visitor code and returns full booking/guest/room context.
     * Optionally notifies the primary guest of the visitor's arrival.
     *
     * Body: { code: string, property_id: string, notify?: bool, notify_channels?: string[] }
     */
    public function validateVisitorCode(Request $req, Response $res): Response
    {
        $d          = (array) $req->getParsedBody();
        $tenantId   = $req->getAttribute('auth.tenant_id');
        $staffId    = $req->getAttribute('auth.user_id');
        $propertyId = $d['property_id'] ?? '';

        $vc = $this->service->validateVisitorCode($d['code'] ?? '', $propertyId);
        if (!$vc) {
            return JsonResponse::error($res, 'Invalid or expired visitor code', 404);
        }

        // Enrich with booking + primary guest + room details
        $booking     = $this->bookingRepo?->find($vc->getBookingId());
        $primaryGuest = $booking ? $this->guestRepo?->find($booking->getGuestId()) : null;
        $room        = $booking?->getRoomId() ? $this->roomRepo?->find($booking->getRoomId()) : null;

        $enriched = array_merge($vc->toArray(), [
            'booking' => $booking ? [
                'id'              => $booking->getId(),
                'booking_ref'     => $booking->getBookingRef(),
                'booking_type'    => $booking->getBookingType()->value,
                'status'          => $booking->getStatus()->value,
                'check_in'        => $booking->getCheckIn()->format('c'),
                'check_out'       => $booking->getCheckOut()->format('c'),
                'adults'          => $booking->getAdults(),
                'children'        => $booking->getChildren(),
                'total_amount'    => $booking->getTotalAmount(),
            ] : null,
            'primary_guest' => $primaryGuest ? [
                'id'    => $primaryGuest->getId(),
                'name'  => $primaryGuest->getFullName(),
                'phone' => $primaryGuest->getPhone(),
                'email' => $primaryGuest->getEmail(),
            ] : null,
            'room' => $room ? [
                'id'          => $room->getId(),
                'room_number' => $room->getRoomNumber(),
                'floor'       => $room->getFloor(),
            ] : null,
        ]);

        // Optionally notify primary guest of visitor arrival
        $notify         = !empty($d['notify']);
        $notifyChannels = (array) ($d['notify_channels'] ?? ['sms', 'whatsapp']);
        $visitorName    = $vc->getVisitorName();
        $roomNum        = $room?->getRoomNumber() ?? 'your room';
        $message        = "Hi {$primaryGuest?->getFullName()}, your visitor {$visitorName} has arrived at the front desk and is requesting access to room {$roomNum}. Please confirm if you are expecting them.";

        $notified = [];
        if ($notify && $primaryGuest) {
            foreach ($notifyChannels as $channel) {
                try {
                    if (in_array($channel, ['sms', 'whatsapp'], true) && $primaryGuest->getPhone() && $this->termii) {
                        $this->termii->send($primaryGuest->getPhone(), $message);
                        $notified[] = $channel;
                    } elseif ($channel === 'email' && $primaryGuest->getEmail() && $this->mailService) {
                        $this->mailService->send(
                            $primaryGuest->getEmail(),
                            $primaryGuest->getFullName(),
                            "Visitor Arrival — {$visitorName}",
                            '<p>' . nl2br(htmlspecialchars($message)) . '</p>'
                        );
                        $notified[] = 'email';
                    } elseif ($channel === 'chat' && $this->chatService && $booking) {
                        $this->chatService->sendMessage(
                            bookingId:  $booking->getId(),
                            propertyId: $propertyId,
                            senderType: 'staff',
                            senderId:   $staffId ?? 'reception',
                            senderName: 'Front Desk',
                            message:    "👤 Your visitor **{$visitorName}** is at the front desk requesting access to your room. Please confirm if they are expected.",
                            tenantId:   $tenantId,
                        );
                        $notified[] = 'chat';
                    }
                } catch (\Throwable) {}
            }
        }

        return JsonResponse::ok($res, array_merge($enriched, ['notified_via' => $notified]), 'Visitor code valid');
    }

    // Gate passes
    public function createGatePass(Request $req, Response $res): Response
    {
        $d = (array) $req->getParsedBody();
        foreach (['property_id', 'booking_id', 'pass_type', 'person_name', 'guest_name'] as $f)
            if (empty($d[$f])) return JsonResponse::error($res, "$f required", 422);
        $gp = $this->service->createGatePass($d['property_id'], $d['booking_id'], $d['pass_type'], $d['person_name'], $d['guest_name'], $req->getAttribute('auth.tenant_id'), $d);
        return JsonResponse::ok($res, $gp->toArray(), 'Gate pass created');
    }

    public function listGatePasses(Request $req, Response $res): Response
    {
        $q = $req->getQueryParams();
        $passes = $q['booking_id'] ?? false ? $this->service->listGatePassesByBooking($q['booking_id']) : $this->service->listGatePasses($q['property_id'] ?? '', $q['status'] ?? null);
        return JsonResponse::ok($res, array_map(fn($p) => $p->toArray(), $passes));
    }

    public function approveGatePass(Request $req, Response $res, array $args): Response
    {
        return JsonResponse::ok($res, $this->service->approveGatePass($args['id'], $req->getAttribute('auth.user_id', 'system'))->toArray());
    }

    public function denyGatePass(Request $req, Response $res, array $args): Response
    {
        $d = (array) $req->getParsedBody();
        return JsonResponse::ok($res, $this->service->denyGatePass($args['id'], $req->getAttribute('auth.user_id', 'system'), $d['notes'] ?? null)->toArray());
    }

    public function gatePassCheckIn(Request $req, Response $res, array $args): Response
    {
        return JsonResponse::ok($res, $this->service->gatePassCheckIn($args['id'])->toArray());
    }

    public function gatePassCheckOut(Request $req, Response $res, array $args): Response
    {
        return JsonResponse::ok($res, $this->service->gatePassCheckOut($args['id'])->toArray());
    }

    // Guest movements
    public function recordMovement(Request $req, Response $res): Response
    {
        $d = (array) $req->getParsedBody();
        foreach (['property_id', 'booking_id', 'guest_id', 'guest_name', 'direction'] as $f)
            if (empty($d[$f])) return JsonResponse::error($res, "$f required", 422);
        $m = $this->service->recordMovement($d['property_id'], $d['booking_id'], $d['guest_id'], $d['guest_name'], $d['direction'], $req->getAttribute('auth.tenant_id'), $d);
        return JsonResponse::ok($res, $m->toArray());
    }

    public function getMovements(Request $req, Response $res): Response
    {
        $q = $req->getQueryParams();
        return JsonResponse::ok($res, array_map(fn($m) => $m->toArray(), $this->service->getMovements($q['property_id'] ?? '', $q['booking_id'] ?? null)));
    }

    public function getOnPremise(Request $req, Response $res): Response
    {
        return JsonResponse::ok($res, array_map(fn($m) => $m->toArray(), $this->service->getOnPremise($req->getQueryParams()['property_id'] ?? '')));
    }
}

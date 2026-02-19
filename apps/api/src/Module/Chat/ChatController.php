<?php

declare(strict_types=1);

namespace Lodgik\Module\Chat;

use Psr\Http\Message\ResponseInterface as Response;
use Psr\Http\Message\ServerRequestInterface as Request;
use Lodgik\Util\JsonResponse;

final class ChatController
{
    public function __construct(private readonly ChatService $service) {}

    /** POST /chat/messages — Send a message */
    public function send(Request $req, Response $res): Response
    {
        $d = (array) $req->getParsedBody();
        foreach (['booking_id', 'property_id', 'sender_type', 'sender_id', 'sender_name', 'message'] as $f) {
            if (empty($d[$f])) return JsonResponse::error($res, "$f required", 422);
        }
        $msg = $this->service->sendMessage($d['booking_id'], $d['property_id'], $d['sender_type'], $d['sender_id'], $d['sender_name'], $d['message'], $req->getAttribute('auth.tenant_id'), $d['image_url'] ?? null);
        return JsonResponse::ok($res, $msg->toArray(), 'Message sent');
    }

    /** GET /chat/messages/{bookingId} — Get messages for a booking */
    public function messages(Request $req, Response $res, array $args): Response
    {
        $q = $req->getQueryParams();
        $msgs = $this->service->getMessages($args['bookingId'], (int)($q['limit'] ?? 50), (int)($q['offset'] ?? 0));
        return JsonResponse::ok($res, array_map(fn($m) => $m->toArray(), $msgs));
    }

    /** POST /chat/messages/{bookingId}/read — Mark messages as read */
    public function markRead(Request $req, Response $res, array $args): Response
    {
        $d = (array) $req->getParsedBody();
        $readerType = $d['reader_type'] ?? 'staff';
        $count = $this->service->markRead($args['bookingId'], $readerType);
        return JsonResponse::ok($res, ['marked_read' => $count]);
    }

    /** GET /chat/active — Active chats with unread counts (staff dashboard) */
    public function activeChats(Request $req, Response $res): Response
    {
        $pid = $req->getQueryParams()['property_id'] ?? '';
        if (empty($pid)) return JsonResponse::error($res, 'property_id required', 422);
        return JsonResponse::ok($res, $this->service->getActiveChats($pid));
    }

    /** GET /chat/unread/{bookingId} — Unread count for a booking */
    public function unreadCount(Request $req, Response $res, array $args): Response
    {
        $forType = $req->getQueryParams()['for'] ?? 'staff';
        return JsonResponse::ok($res, ['unread' => $this->service->getUnreadCount($args['bookingId'], $forType)]);
    }
}

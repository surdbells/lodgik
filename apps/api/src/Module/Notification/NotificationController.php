<?php

declare(strict_types=1);

namespace Lodgik\Module\Notification;

use Psr\Http\Message\ResponseInterface as Response;
use Psr\Http\Message\ServerRequestInterface as Request;
use Lodgik\Util\JsonResponse;

final class NotificationController
{
    public function __construct(private readonly NotificationService $service) {}

    public function list(Request $req, Response $res): Response
    {
        $userId = $req->getAttribute('auth.user_id');
        $unreadOnly = ($req->getQueryParams()['unread'] ?? '') === '1';
        $limit = (int) ($req->getQueryParams()['limit'] ?? 50);
        return JsonResponse::ok($res, array_map(fn($n) => $n->toArray(), $this->service->listForRecipient($userId, $unreadOnly, $limit)));
    }

    public function unreadCount(Request $req, Response $res): Response
    {
        return JsonResponse::ok($res, ['count' => $this->service->countUnread($req->getAttribute('auth.user_id'))]);
    }

    public function markRead(Request $req, Response $res, array $args): Response
    {
        $n = $this->service->markRead($args['id']);
        return $n ? JsonResponse::ok($res, $n->toArray()) : JsonResponse::error($res, 'Not found', 404);
    }

    public function markAllRead(Request $req, Response $res): Response
    {
        $count = $this->service->markAllRead($req->getAttribute('auth.user_id'));
        return JsonResponse::ok($res, ['marked' => $count], 'All read');
    }

    public function registerToken(Request $req, Response $res): Response
    {
        $d = (array) $req->getParsedBody();
        if (empty($d['token']) || empty($d['platform'])) return JsonResponse::error($res, 'token and platform required', 422);
        $ownerType = $d['owner_type'] ?? 'staff';
        $ownerId = $d['owner_id'] ?? $req->getAttribute('auth.user_id');
        $dt = $this->service->registerToken($ownerType, $ownerId, $d['token'], $d['platform'], $req->getAttribute('auth.tenant_id'));
        return JsonResponse::ok($res, $dt->toArray(), 'Token registered');
    }

    public function removeToken(Request $req, Response $res): Response
    {
        $d = (array) $req->getParsedBody();
        if (empty($d['token'])) return JsonResponse::error($res, 'token required', 422);
        $this->service->removeToken($d['token']);
        return JsonResponse::ok($res, null, 'Token removed');
    }
}

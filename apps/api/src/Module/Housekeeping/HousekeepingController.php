<?php

declare(strict_types=1);

namespace Lodgik\Module\Housekeeping;

use Psr\Http\Message\ResponseInterface as Response;
use Psr\Http\Message\ServerRequestInterface as Request;
use Lodgik\Util\JsonResponse;

final class HousekeepingController
{
    public function __construct(private readonly HousekeepingService $service) {}

    public function listTasks(Request $req, Response $res): Response
    {
        $q = $req->getQueryParams();
        $tasks = $this->service->listTasks($q['property_id'] ?? '', $q['status'] ?? null, $q['assigned_to'] ?? null);
        return JsonResponse::ok($res, array_map(fn($t) => $t->toArray(), $tasks));
    }

    public function createTask(Request $req, Response $res): Response
    {
        $d = (array) $req->getParsedBody();
        foreach (['property_id', 'room_id', 'room_number', 'task_type'] as $f) {
            if (empty($d[$f])) return JsonResponse::error($res, "$f required", 422);
        }
        $t = $this->service->createTask($d['property_id'], $d['room_id'], $d['room_number'], $d['task_type'], $req->getAttribute('auth.tenant_id'), $d);
        return JsonResponse::ok($res, $t->toArray(), 'Task created', 201);
    }

    public function assignTask(Request $req, Response $res, array $args): Response
    {
        $d = (array) $req->getParsedBody();
        if (empty($d['user_id']) || empty($d['user_name'])) return JsonResponse::error($res, 'user_id and user_name required', 422);
        try { return JsonResponse::ok($res, $this->service->assignTask($args['id'], $d['user_id'], $d['user_name'])->toArray()); }
        catch (\RuntimeException $e) { return JsonResponse::error($res, $e->getMessage(), 404); }
    }

    public function startTask(Request $req, Response $res, array $args): Response
    {
        try { return JsonResponse::ok($res, $this->service->startTask($args['id'])->toArray()); }
        catch (\RuntimeException $e) { return JsonResponse::error($res, $e->getMessage(), 404); }
    }

    public function completeTask(Request $req, Response $res, array $args): Response
    {
        $d = (array) $req->getParsedBody();
        try { return JsonResponse::ok($res, $this->service->completeTask($args['id'], $d['checklist'] ?? null, $d['photo_after'] ?? null)->toArray()); }
        catch (\RuntimeException $e) { return JsonResponse::error($res, $e->getMessage(), 404); }
    }

    public function inspectTask(Request $req, Response $res, array $args): Response
    {
        $d = (array) $req->getParsedBody();
        try {
            $t = $this->service->inspectTask($args['id'], $req->getAttribute('auth.user_id') ?? '', (bool)($d['passed'] ?? false), $d['notes'] ?? null);
            return JsonResponse::ok($res, $t->toArray());
        } catch (\RuntimeException $e) { return JsonResponse::error($res, $e->getMessage(), 404); }
    }

    public function uploadPhoto(Request $req, Response $res, array $args): Response
    {
        $d = (array) $req->getParsedBody();
        try { return JsonResponse::ok($res, $this->service->updateTaskPhotos($args['id'], $d['photo_before'] ?? null, $d['photo_after'] ?? null)->toArray()); }
        catch (\RuntimeException $e) { return JsonResponse::error($res, $e->getMessage(), 404); }
    }

    public function todayStats(Request $req, Response $res): Response
    {
        return JsonResponse::ok($res, $this->service->getTodayStats($req->getQueryParams()['property_id'] ?? ''));
    }

    // Lost & Found
    public function listLostAndFound(Request $req, Response $res): Response
    {
        $q = $req->getQueryParams();
        $items = $this->service->listLostAndFound($q['property_id'] ?? '', $q['status'] ?? null);
        return JsonResponse::ok($res, array_map(fn($i) => $i->toArray(), $items));
    }

    public function reportLostItem(Request $req, Response $res): Response
    {
        $d = (array) $req->getParsedBody();
        foreach (['property_id', 'description', 'found_location'] as $f) {
            if (empty($d[$f])) return JsonResponse::error($res, "$f required", 422);
        }
        $lf = $this->service->reportLostItem($d['property_id'], $d['description'], $d['found_location'], $req->getAttribute('auth.user_id') ?? '', $req->getAttribute('auth.tenant_id'), $d);
        return JsonResponse::ok($res, $lf->toArray(), 'Item reported', 201);
    }

    public function claimItem(Request $req, Response $res, array $args): Response
    {
        $d = (array) $req->getParsedBody();
        try { return JsonResponse::ok($res, $this->service->claimItem($args['id'], $d['claimed_by'] ?? '')->toArray()); }
        catch (\RuntimeException $e) { return JsonResponse::error($res, $e->getMessage(), 404); }
    }
}

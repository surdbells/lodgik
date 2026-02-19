<?php

declare(strict_types=1);

use Lodgik\Middleware\AuthMiddleware;
use Lodgik\Middleware\FeatureMiddleware;
use Lodgik\Middleware\RoleMiddleware;
use Lodgik\Middleware\TenantMiddleware;
use Lodgik\Module\Room\RoomController;
use Slim\App;
use Slim\Routing\RouteCollectorProxy;

return function (App $app): void {
    // ─── Room Types ────────────────────────────────────────
    $app->group('/api/room-types', function (RouteCollectorProxy $group) {
        $group->get('', [RoomController::class, 'listRoomTypes']);
        $group->get('/{id}', [RoomController::class, 'showRoomType']);
        $group->post('', [RoomController::class, 'createRoomType']);
        $group->put('/{id}', [RoomController::class, 'updateRoomType']);
        $group->delete('/{id}', [RoomController::class, 'deleteRoomType']);
    })
        ->add(new RoleMiddleware(['property_admin', 'manager', 'front_desk']))
        ->add(TenantMiddleware::class)
        ->add(AuthMiddleware::class);

    // ─── Rooms ─────────────────────────────────────────────
    $app->group('/api/rooms', function (RouteCollectorProxy $group) {
        $group->get('', [RoomController::class, 'listRooms']);
        $group->get('/status-counts', [RoomController::class, 'statusCounts']);
        $group->get('/available', [RoomController::class, 'available']);
        $group->get('/floors', [RoomController::class, 'floors']);
        $group->get('/{id}', [RoomController::class, 'showRoom']);
        $group->post('', [RoomController::class, 'createRoom']);
        $group->post('/bulk-create', [RoomController::class, 'bulkCreateRooms']);
        $group->put('/{id}', [RoomController::class, 'updateRoom']);
        $group->delete('/{id}', [RoomController::class, 'deleteRoom']);
        $group->patch('/{id}/status', [RoomController::class, 'changeStatus']);
        $group->get('/{id}/status-history', [RoomController::class, 'statusHistory']);
    })
        ->add(new RoleMiddleware(['property_admin', 'manager', 'front_desk', 'housekeeping']))
        ->add(TenantMiddleware::class)
        ->add(AuthMiddleware::class);

    // ─── Amenities ─────────────────────────────────────────
    $app->group('/api/amenities', function (RouteCollectorProxy $group) {
        $group->get('', [RoomController::class, 'listAmenities']);
        $group->post('', [RoomController::class, 'createAmenity']);
    })
        ->add(new RoleMiddleware(['property_admin', 'manager']))
        ->add(TenantMiddleware::class)
        ->add(AuthMiddleware::class);
};

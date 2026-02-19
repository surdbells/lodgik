<?php

declare(strict_types=1);

namespace Lodgik\Module\Room;

use Lodgik\Enum\RoomStatus;
use Lodgik\Helper\PaginationHelper;
use Lodgik\Helper\ResponseHelper;
use Lodgik\Entity\Room;
use Lodgik\Entity\RoomType;
use Lodgik\Entity\RoomStatusLog;
use Lodgik\Entity\Amenity;
use Lodgik\Module\Room\DTO\BulkCreateRoomsRequest;
use Lodgik\Module\Room\DTO\CreateRoomRequest;
use Lodgik\Module\Room\DTO\CreateRoomTypeRequest;
use Lodgik\Module\Room\DTO\UpdateRoomRequest;
use Lodgik\Module\Room\DTO\UpdateRoomTypeRequest;
use Psr\Http\Message\ResponseInterface as Response;
use Psr\Http\Message\ServerRequestInterface as Request;

final class RoomController
{
    public function __construct(
        private readonly RoomService $roomService,
        private readonly ResponseHelper $response,
    ) {}

    // ─── Room Types ────────────────────────────────────────────

    /** GET /api/room-types */
    public function listRoomTypes(Request $request, Response $response): Response
    {
        $pagination = PaginationHelper::fromRequest($request);
        $filters = PaginationHelper::filtersFromRequest($request, ['property_id', 'active']);

        $propertyId = $filters['property_id'] ?? null;
        if ($propertyId === null) {
            return $this->response->validationError($response, ['property_id' => 'Property ID is required']);
        }

        $activeOnly = isset($filters['active']) ? ($filters['active'] === 'true' || $filters['active'] === '1') : null;

        $result = $this->roomService->listRoomTypes($propertyId, $activeOnly, $pagination['page'], $pagination['limit']);
        $items = array_map(fn(RoomType $rt) => $this->serializeRoomType($rt), $result['items']);

        return $this->response->paginated($response, $items, $result['total'], $pagination['page'], $pagination['limit']);
    }

    /** GET /api/room-types/{id} */
    public function showRoomType(Request $request, Response $response, array $args): Response
    {
        $roomType = $this->roomService->getRoomType($args['id']);
        if ($roomType === null) {
            return $this->response->notFound($response, 'Room type not found');
        }

        return $this->response->success($response, $this->serializeRoomType($roomType));
    }

    /** POST /api/room-types */
    public function createRoomType(Request $request, Response $response): Response
    {
        $body = (array) ($request->getParsedBody() ?? []);
        $dto = CreateRoomTypeRequest::fromArray($body);

        $errors = $dto->validate();
        if (!empty($errors)) {
            return $this->response->validationError($response, $errors);
        }

        try {
            $tenantId = $request->getAttribute('tenant_id');
            $userId = $request->getAttribute('user_id');
            $roomType = $this->roomService->createRoomType($dto, $tenantId, $userId);

            return $this->response->created($response, $this->serializeRoomType($roomType));
        } catch (\InvalidArgumentException $e) {
            return $this->response->validationError($response, ['error' => $e->getMessage()]);
        }
    }

    /** PUT /api/room-types/{id} */
    public function updateRoomType(Request $request, Response $response, array $args): Response
    {
        $body = (array) ($request->getParsedBody() ?? []);
        $dto = UpdateRoomTypeRequest::fromArray($body);

        $errors = $dto->validate();
        if (!empty($errors)) {
            return $this->response->validationError($response, $errors);
        }

        try {
            $userId = $request->getAttribute('user_id');
            $roomType = $this->roomService->updateRoomType($args['id'], $dto, $userId);

            return $this->response->success($response, $this->serializeRoomType($roomType));
        } catch (\RuntimeException | \InvalidArgumentException $e) {
            return $this->response->notFound($response, $e->getMessage());
        }
    }

    /** DELETE /api/room-types/{id} */
    public function deleteRoomType(Request $request, Response $response, array $args): Response
    {
        try {
            $userId = $request->getAttribute('user_id');
            $this->roomService->deleteRoomType($args['id'], $userId);

            return $this->response->success($response, null, 'Room type deleted');
        } catch (\RuntimeException | \InvalidArgumentException $e) {
            return $this->response->validationError($response, ['error' => $e->getMessage()]);
        }
    }

    // ─── Rooms ─────────────────────────────────────────────────

    /** GET /api/rooms */
    public function listRooms(Request $request, Response $response): Response
    {
        $pagination = PaginationHelper::fromRequest($request);
        $search = PaginationHelper::searchFromRequest($request);
        $filters = PaginationHelper::filtersFromRequest($request, ['property_id', 'room_type_id', 'status', 'floor', 'active']);

        $activeOnly = isset($filters['active']) ? ($filters['active'] === 'true' || $filters['active'] === '1') : null;
        $floor = isset($filters['floor']) ? (int) $filters['floor'] : null;

        $result = $this->roomService->listRooms(
            propertyId: $filters['property_id'] ?? null,
            roomTypeId: $filters['room_type_id'] ?? null,
            status: $filters['status'] ?? null,
            floor: $floor,
            search: $search,
            activeOnly: $activeOnly,
            page: $pagination['page'],
            limit: $pagination['limit'],
        );

        $items = array_map(fn(Room $r) => $this->serializeRoom($r), $result['items']);

        return $this->response->paginated($response, $items, $result['total'], $pagination['page'], $pagination['limit']);
    }

    /** GET /api/rooms/{id} */
    public function showRoom(Request $request, Response $response, array $args): Response
    {
        $room = $this->roomService->getRoom($args['id']);
        if ($room === null) {
            return $this->response->notFound($response, 'Room not found');
        }

        return $this->response->success($response, $this->serializeRoom($room));
    }

    /** POST /api/rooms */
    public function createRoom(Request $request, Response $response): Response
    {
        $body = (array) ($request->getParsedBody() ?? []);
        $dto = CreateRoomRequest::fromArray($body);

        $errors = $dto->validate();
        if (!empty($errors)) {
            return $this->response->validationError($response, $errors);
        }

        try {
            $tenantId = $request->getAttribute('tenant_id');
            $userId = $request->getAttribute('user_id');
            $room = $this->roomService->createRoom($dto, $tenantId, $userId);

            return $this->response->created($response, $this->serializeRoom($room));
        } catch (\InvalidArgumentException $e) {
            return $this->response->validationError($response, ['error' => $e->getMessage()]);
        }
    }

    /** POST /api/rooms/bulk-create */
    public function bulkCreateRooms(Request $request, Response $response): Response
    {
        $body = (array) ($request->getParsedBody() ?? []);
        $dto = BulkCreateRoomsRequest::fromArray($body);

        $errors = $dto->validate();
        if (!empty($errors)) {
            return $this->response->validationError($response, $errors);
        }

        try {
            $tenantId = $request->getAttribute('tenant_id');
            $userId = $request->getAttribute('user_id');
            $rooms = $this->roomService->bulkCreateRooms($dto, $tenantId, $userId);

            $items = array_map(fn(Room $r) => $this->serializeRoom($r), $rooms);

            return $this->response->created($response, [
                'rooms' => $items,
                'count' => count($rooms),
            ], count($rooms) . ' rooms created');
        } catch (\InvalidArgumentException $e) {
            return $this->response->validationError($response, ['error' => $e->getMessage()]);
        }
    }

    /** PUT /api/rooms/{id} */
    public function updateRoom(Request $request, Response $response, array $args): Response
    {
        $body = (array) ($request->getParsedBody() ?? []);
        $dto = UpdateRoomRequest::fromArray($body);

        $errors = $dto->validate();
        if (!empty($errors)) {
            return $this->response->validationError($response, $errors);
        }

        try {
            $userId = $request->getAttribute('user_id');
            $room = $this->roomService->updateRoom($args['id'], $dto, $userId);

            return $this->response->success($response, $this->serializeRoom($room));
        } catch (\RuntimeException | \InvalidArgumentException $e) {
            return $this->response->notFound($response, $e->getMessage());
        }
    }

    /** DELETE /api/rooms/{id} */
    public function deleteRoom(Request $request, Response $response, array $args): Response
    {
        try {
            $userId = $request->getAttribute('user_id');
            $this->roomService->deleteRoom($args['id'], $userId);

            return $this->response->success($response, null, 'Room deleted');
        } catch (\RuntimeException | \InvalidArgumentException $e) {
            return $this->response->validationError($response, ['error' => $e->getMessage()]);
        }
    }

    /** PATCH /api/rooms/{id}/status */
    public function changeStatus(Request $request, Response $response, array $args): Response
    {
        $body = (array) ($request->getParsedBody() ?? []);
        $statusValue = $body['status'] ?? '';
        $notes = $body['notes'] ?? null;

        if (!in_array($statusValue, RoomStatus::values(), true)) {
            return $this->response->validationError($response, [
                'status' => 'Invalid status. Valid: ' . implode(', ', RoomStatus::values()),
            ]);
        }

        try {
            $userId = $request->getAttribute('user_id');
            $newStatus = RoomStatus::from($statusValue);
            $room = $this->roomService->changeStatus($args['id'], $newStatus, $userId, $notes);

            return $this->response->success($response, $this->serializeRoom($room), 'Room status updated');
        } catch (\RuntimeException | \InvalidArgumentException $e) {
            return $this->response->validationError($response, ['error' => $e->getMessage()]);
        }
    }

    /** GET /api/rooms/{id}/status-history */
    public function statusHistory(Request $request, Response $response, array $args): Response
    {
        $limit = (int) ($request->getQueryParams()['limit'] ?? 20);
        $logs = $this->roomService->getStatusHistory($args['id'], $limit);

        $items = array_map(fn(RoomStatusLog $l) => [
            'id' => $l->getId(),
            'room_id' => $l->getRoomId(),
            'old_status' => $l->getOldStatus()->value,
            'new_status' => $l->getNewStatus()->value,
            'changed_by' => $l->getChangedBy(),
            'notes' => $l->getNotes(),
            'created_at' => $l->getCreatedAt()->format('c'),
        ], $logs);

        return $this->response->success($response, $items);
    }

    /** GET /api/rooms/status-counts */
    public function statusCounts(Request $request, Response $response): Response
    {
        $propertyId = $request->getQueryParams()['property_id'] ?? null;
        if ($propertyId === null) {
            return $this->response->validationError($response, ['property_id' => 'Property ID is required']);
        }

        $counts = $this->roomService->getStatusCounts($propertyId);

        return $this->response->success($response, $counts);
    }

    /** GET /api/rooms/available */
    public function available(Request $request, Response $response): Response
    {
        $params = $request->getQueryParams();
        $propertyId = $params['property_id'] ?? null;

        if ($propertyId === null) {
            return $this->response->validationError($response, ['property_id' => 'Property ID is required']);
        }

        $roomTypeId = $params['room_type_id'] ?? null;
        $rooms = $this->roomService->getAvailableRooms($propertyId, $roomTypeId);

        $items = array_map(fn(Room $r) => $this->serializeRoom($r), $rooms);

        return $this->response->success($response, $items);
    }

    /** GET /api/rooms/floors */
    public function floors(Request $request, Response $response): Response
    {
        $propertyId = $request->getQueryParams()['property_id'] ?? null;
        if ($propertyId === null) {
            return $this->response->validationError($response, ['property_id' => 'Property ID is required']);
        }

        $floors = $this->roomService->getFloors($propertyId);

        return $this->response->success($response, $floors);
    }

    // ─── Amenities ────────────────────────────────────────────

    /** GET /api/amenities */
    public function listAmenities(Request $request, Response $response): Response
    {
        $category = $request->getQueryParams()['category'] ?? null;
        $amenities = $this->roomService->listAmenities($category);

        $items = array_map(fn(Amenity $a) => [
            'id' => $a->getId(),
            'name' => $a->getName(),
            'category' => $a->getCategory(),
            'icon' => $a->getIcon(),
            'is_active' => $a->isActive(),
        ], $amenities);

        return $this->response->success($response, $items);
    }

    /** POST /api/amenities */
    public function createAmenity(Request $request, Response $response): Response
    {
        $body = (array) ($request->getParsedBody() ?? []);
        $name = $body['name'] ?? '';

        if (trim($name) === '') {
            return $this->response->validationError($response, ['name' => 'Name is required']);
        }

        $tenantId = $request->getAttribute('tenant_id');
        $amenity = $this->roomService->createAmenity($name, $tenantId, $body['category'] ?? null, $body['icon'] ?? null);

        return $this->response->created($response, [
            'id' => $amenity->getId(),
            'name' => $amenity->getName(),
            'category' => $amenity->getCategory(),
            'icon' => $amenity->getIcon(),
            'is_active' => $amenity->isActive(),
        ]);
    }

    // ─── Serializers ──────────────────────────────────────────

    private function serializeRoomType(RoomType $rt): array
    {
        return [
            'id' => $rt->getId(),
            'property_id' => $rt->getPropertyId(),
            'name' => $rt->getName(),
            'description' => $rt->getDescription(),
            'base_rate' => $rt->getBaseRate(),
            'hourly_rate' => $rt->getHourlyRate(),
            'max_occupancy' => $rt->getMaxOccupancy(),
            'amenities' => $rt->getAmenities(),
            'photos' => $rt->getPhotos(),
            'sort_order' => $rt->getSortOrder(),
            'is_active' => $rt->isActive(),
            'created_at' => $rt->getCreatedAt()?->format('c'),
            'updated_at' => $rt->getUpdatedAt()?->format('c'),
        ];
    }

    private function serializeRoom(Room $r): array
    {
        return [
            'id' => $r->getId(),
            'property_id' => $r->getPropertyId(),
            'room_type_id' => $r->getRoomTypeId(),
            'room_number' => $r->getRoomNumber(),
            'floor' => $r->getFloor(),
            'status' => $r->getStatus()->value,
            'status_label' => $r->getStatus()->label(),
            'status_color' => $r->getStatus()->color(),
            'notes' => $r->getNotes(),
            'amenities' => $r->getAmenities(),
            'is_active' => $r->isActive(),
            'created_at' => $r->getCreatedAt()?->format('c'),
            'updated_at' => $r->getUpdatedAt()?->format('c'),
        ];
    }
}

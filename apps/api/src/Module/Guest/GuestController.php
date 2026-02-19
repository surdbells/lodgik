<?php

declare(strict_types=1);

namespace Lodgik\Module\Guest;

use Lodgik\Entity\Guest;
use Lodgik\Entity\GuestDocument;
use Lodgik\Helper\PaginationHelper;
use Lodgik\Helper\ResponseHelper;
use Lodgik\Module\Guest\DTO\CreateGuestRequest;
use Lodgik\Module\Guest\DTO\UpdateGuestRequest;
use Psr\Http\Message\ResponseInterface as Response;
use Psr\Http\Message\ServerRequestInterface as Request;

final class GuestController
{
    public function __construct(
        private readonly GuestService $guestService,
        private readonly ResponseHelper $response,
    ) {}

    /** GET /api/guests */
    public function list(Request $request, Response $response): Response
    {
        $pagination = PaginationHelper::fromRequest($request);
        $search = PaginationHelper::searchFromRequest($request);
        $filters = PaginationHelper::filtersFromRequest($request, ['vip_status', 'nationality']);

        $result = $this->guestService->list(
            search: $search,
            vipStatus: $filters['vip_status'] ?? null,
            nationality: $filters['nationality'] ?? null,
            page: $pagination['page'],
            limit: $pagination['limit'],
        );

        $items = array_map(fn(Guest $g) => $this->serialize($g), $result['items']);
        return $this->response->paginated($response, $items, $result['total'], $pagination['page'], $pagination['limit']);
    }

    /** GET /api/guests/{id} */
    public function show(Request $request, Response $response, array $args): Response
    {
        $guest = $this->guestService->getById($args['id']);
        if ($guest === null) {
            return $this->response->notFound($response, 'Guest not found');
        }
        return $this->response->success($response, $this->serialize($guest, true));
    }

    /** POST /api/guests */
    public function create(Request $request, Response $response): Response
    {
        $body = (array) ($request->getParsedBody() ?? []);
        $dto = CreateGuestRequest::fromArray($body);

        $errors = $dto->validate();
        if (!empty($errors)) {
            return $this->response->validationError($response, $errors);
        }

        $tenantId = $request->getAttribute('tenant_id');
        $guest = $this->guestService->create($dto, $tenantId);

        return $this->response->created($response, $this->serialize($guest));
    }

    /** PUT /api/guests/{id} */
    public function update(Request $request, Response $response, array $args): Response
    {
        $body = (array) ($request->getParsedBody() ?? []);
        $dto = UpdateGuestRequest::fromArray($body);

        $errors = $dto->validate();
        if (!empty($errors)) {
            return $this->response->validationError($response, $errors);
        }

        try {
            $guest = $this->guestService->update($args['id'], $dto);
            return $this->response->success($response, $this->serialize($guest));
        } catch (\RuntimeException $e) {
            return $this->response->notFound($response, $e->getMessage());
        }
    }

    /** DELETE /api/guests/{id} */
    public function delete(Request $request, Response $response, array $args): Response
    {
        try {
            $this->guestService->delete($args['id']);
            return $this->response->success($response, null, 'Guest deleted');
        } catch (\RuntimeException $e) {
            return $this->response->notFound($response, $e->getMessage());
        }
    }

    /** GET /api/guests/search?q= */
    public function search(Request $request, Response $response): Response
    {
        $q = $request->getQueryParams()['q'] ?? '';
        $limit = (int) ($request->getQueryParams()['limit'] ?? 10);

        $guests = $this->guestService->search($q, min($limit, 20));
        $items = array_map(fn(Guest $g) => $this->serializeCompact($g), $guests);

        return $this->response->success($response, $items);
    }

    /** GET /api/guests/nationalities */
    public function nationalities(Request $request, Response $response): Response
    {
        return $this->response->success($response, $this->guestService->getNationalities());
    }

    /** POST /api/guests/merge */
    public function merge(Request $request, Response $response): Response
    {
        $body = (array) ($request->getParsedBody() ?? []);
        $primaryId = $body['primary_id'] ?? '';
        $duplicateId = $body['duplicate_id'] ?? '';

        if (trim($primaryId) === '' || trim($duplicateId) === '') {
            return $this->response->validationError($response, [
                'error' => 'Both primary_id and duplicate_id are required',
            ]);
        }

        try {
            $guest = $this->guestService->merge($primaryId, $duplicateId);
            return $this->response->success($response, $this->serialize($guest), 'Guests merged successfully');
        } catch (\RuntimeException | \InvalidArgumentException $e) {
            return $this->response->validationError($response, ['error' => $e->getMessage()]);
        }
    }

    /** GET /api/guests/{id}/documents */
    public function documents(Request $request, Response $response, array $args): Response
    {
        $docs = $this->guestService->getDocuments($args['id']);
        $items = array_map(fn(GuestDocument $d) => [
            'id' => $d->getId(),
            'guest_id' => $d->getGuestId(),
            'document_type' => $d->getDocumentType(),
            'file_url' => $d->getFileUrl(),
            'file_name' => $d->getFileName(),
            'uploaded_at' => $d->getUploadedAt()->format('c'),
        ], $docs);

        return $this->response->success($response, $items);
    }

    // ─── Serializers ──────────────────────────────────────────

    private function serialize(Guest $g, bool $detailed = false): array
    {
        $data = [
            'id' => $g->getId(),
            'first_name' => $g->getFirstName(),
            'last_name' => $g->getLastName(),
            'full_name' => $g->getFullName(),
            'email' => $g->getEmail(),
            'phone' => $g->getPhone(),
            'nationality' => $g->getNationality(),
            'id_type' => $g->getIdType(),
            'id_number' => $g->getIdNumber(),
            'date_of_birth' => $g->getDateOfBirth()?->format('Y-m-d'),
            'gender' => $g->getGender(),
            'vip_status' => $g->getVipStatus(),
            'company_name' => $g->getCompanyName(),
            'total_stays' => $g->getTotalStays(),
            'total_spent' => $g->getTotalSpent(),
            'last_visit_at' => $g->getLastVisitAt()?->format('c'),
            'created_at' => $g->getCreatedAt()?->format('c'),
        ];

        if ($detailed) {
            $data['address'] = $g->getAddress();
            $data['city'] = $g->getCity();
            $data['state'] = $g->getState();
            $data['country'] = $g->getCountry();
            $data['notes'] = $g->getNotes();
            $data['preferences'] = $g->getPreferences();
            $data['updated_at'] = $g->getUpdatedAt()?->format('c');
        }

        return $data;
    }

    private function serializeCompact(Guest $g): array
    {
        return [
            'id' => $g->getId(),
            'first_name' => $g->getFirstName(),
            'last_name' => $g->getLastName(),
            'full_name' => $g->getFullName(),
            'email' => $g->getEmail(),
            'phone' => $g->getPhone(),
            'vip_status' => $g->getVipStatus(),
            'total_stays' => $g->getTotalStays(),
        ];
    }
}

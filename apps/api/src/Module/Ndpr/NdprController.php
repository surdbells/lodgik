<?php

declare(strict_types=1);

namespace Lodgik\Module\Ndpr;

use Psr\Http\Message\ResponseInterface as Response;
use Psr\Http\Message\ServerRequestInterface as Request;

final class NdprController
{
    public function __construct(private readonly NdprService $svc) {}

    private function json(Response $r, mixed $d, int $s = 200): Response
    {
        $r->getBody()->write(json_encode($d));
        return $r->withHeader('Content-Type', 'application/json')->withStatus($s);
    }

    // GET /api/compliance/data-requests
    public function list(Request $req, Response $res): Response
    {
        $q      = $req->getQueryParams();
        $tid    = $req->getAttribute('auth.tenant_id');
        $result = $this->svc->listRequests(
            tenantId: $tid,
            status:   $q['status'] ?? null,
            type:     $q['type']   ?? null,
            page:     max(1, (int) ($q['page'] ?? 1)),
            perPage:  min(100, (int) ($q['per_page'] ?? 30)),
        );

        return $this->json($res, [
            'success' => true,
            'data'    => $result['items'],
            'meta'    => ['total' => $result['total']],
        ]);
    }

    // POST /api/compliance/data-requests
    public function create(Request $req, Response $res): Response
    {
        $d   = (array) $req->getParsedBody();
        $tid = $req->getAttribute('auth.tenant_id');
        $uid = $req->getAttribute('auth.user_id');

        $errors = [];
        if (empty($d['type']))         $errors[] = 'type is required (export or erasure)';
        if (empty($d['subject_type'])) $errors[] = 'subject_type is required (guest or employee)';
        if (empty($d['subject_id']))   $errors[] = 'subject_id is required';
        if (!empty($errors)) {
            return $this->json($res, ['success' => false, 'errors' => $errors], 422);
        }

        try {
            $request = $this->svc->createRequest(
                type:            $d['type'],
                subjectType:     $d['subject_type'],
                subjectId:       $d['subject_id'],
                tenantId:        $tid,
                requestedById:   $uid,
                requestedByName: $d['requested_by_name'] ?? 'Admin',
                propertyId:      $d['property_id'] ?? $req->getAttribute('auth.property_id') ?? null,
            );
            return $this->json($res, ['success' => true, 'data' => $request->toArray()], 201);
        } catch (\DomainException $e) {
            return $this->json($res, ['success' => false, 'message' => $e->getMessage()], 422);
        } catch (\RuntimeException $e) {
            return $this->json($res, ['success' => false, 'message' => $e->getMessage()], 404);
        }
    }

    // POST /api/compliance/data-requests/{id}/process
    public function process(Request $req, Response $res, array $args): Response
    {
        $tid = $req->getAttribute('auth.tenant_id');
        $d   = (array) $req->getParsedBody();

        try {
            $request = $this->svc->processRequest(
                requestId:     $args['id'],
                tenantId:      $tid,
                processorName: $d['processor_name'] ?? 'Admin',
            );
            return $this->json($res, ['success' => true, 'data' => $request->toArray()]);
        } catch (\DomainException $e) {
            return $this->json($res, ['success' => false, 'message' => $e->getMessage()], 422);
        } catch (\RuntimeException $e) {
            $code = $e->getCode() === 404 ? 404 : 500;
            return $this->json($res, ['success' => false, 'message' => $e->getMessage()], $code);
        }
    }

    // POST /api/compliance/data-requests/{id}/reject
    public function reject(Request $req, Response $res, array $args): Response
    {
        $tid    = $req->getAttribute('auth.tenant_id');
        $d      = (array) $req->getParsedBody();
        $reason = trim($d['reason'] ?? '');

        if ($reason === '') {
            return $this->json($res, ['success' => false, 'message' => 'rejection reason is required'], 422);
        }

        try {
            $request = $this->svc->rejectRequest($args['id'], $tid, $reason);
            return $this->json($res, ['success' => true, 'data' => $request->toArray()]);
        } catch (\DomainException $e) {
            return $this->json($res, ['success' => false, 'message' => $e->getMessage()], 422);
        } catch (\RuntimeException $e) {
            return $this->json($res, ['success' => false, 'message' => $e->getMessage()], 404);
        }
    }

    // GET /api/compliance/exports/{filename}
    public function downloadExport(Request $req, Response $res, array $args): Response
    {
        $filename    = basename($args['filename']); // prevent path traversal
        $storagePath = rtrim($_ENV['STORAGE_PATH'] ?? '/www/wwwroot/lodgik/storage', '/');
        $filepath    = $storagePath . '/ndpr-exports/' . $filename;

        if (!file_exists($filepath) || !str_ends_with($filename, '.json')) {
            return $this->json($res, ['success' => false, 'message' => 'Export not found'], 404);
        }

        $res->getBody()->write((string) file_get_contents($filepath));
        return $res
            ->withHeader('Content-Type', 'application/json')
            ->withHeader('Content-Disposition', 'attachment; filename="' . $filename . '"');
    }
}


    // GET /api/compliance/data-requests
    public function list(Request $req, Response $res): Response
    {
        $q      = $req->getQueryParams();
        $tid    = $req->getAttribute('auth.tenant_id');
        $result = $this->svc->listRequests(
            tenantId: $tid,
            status:   $q['status'] ?? null,
            type:     $q['type']   ?? null,
            page:     max(1, (int) ($q['page'] ?? 1)),
            perPage:  min(100, (int) ($q['per_page'] ?? 30)),
        );

        return ResponseHelper::json($res, [
            'success' => true,
            'data'    => $result['items'],
            'meta'    => ['total' => $result['total']],
        ]);
    }

    // POST /api/compliance/data-requests
    public function create(Request $req, Response $res): Response
    {
        $d   = (array) $req->getParsedBody();
        $tid = $req->getAttribute('auth.tenant_id');
        $uid = $req->getAttribute('auth.user_id');

        $errors = [];
        if (empty($d['type']))         $errors[] = 'type is required (export or erasure)';
        if (empty($d['subject_type'])) $errors[] = 'subject_type is required (guest or employee)';
        if (empty($d['subject_id']))   $errors[] = 'subject_id is required';
        if (!empty($errors)) {
            return ResponseHelper::json($res, ['success' => false, 'errors' => $errors], 422);
        }

        try {
            $request = $this->svc->createRequest(
                type:            $d['type'],
                subjectType:     $d['subject_type'],
                subjectId:       $d['subject_id'],
                tenantId:        $tid,
                requestedById:   $uid,
                requestedByName: $d['requested_by_name'] ?? 'Admin',
                propertyId:      $d['property_id'] ?? $req->getAttribute('auth.property_id') ?? null,
            );
            return ResponseHelper::json($res, ['success' => true, 'data' => $request->toArray()], 201);
        } catch (\DomainException $e) {
            return ResponseHelper::json($res, ['success' => false, 'message' => $e->getMessage()], 422);
        } catch (\RuntimeException $e) {
            return ResponseHelper::json($res, ['success' => false, 'message' => $e->getMessage()], 404);
        }
    }

    // POST /api/compliance/data-requests/{id}/process
    public function process(Request $req, Response $res, array $args): Response
    {
        $tid  = $req->getAttribute('auth.tenant_id');
        $d    = (array) $req->getParsedBody();

        try {
            $request = $this->svc->processRequest(
                requestId:     $args['id'],
                tenantId:      $tid,
                processorName: $d['processor_name'] ?? 'Admin',
            );
            return ResponseHelper::json($res, ['success' => true, 'data' => $request->toArray()]);
        } catch (\DomainException $e) {
            return ResponseHelper::json($res, ['success' => false, 'message' => $e->getMessage()], 422);
        } catch (\RuntimeException $e) {
            $code = $e->getCode() === 404 ? 404 : 500;
            return ResponseHelper::json($res, ['success' => false, 'message' => $e->getMessage()], $code);
        }
    }

    // POST /api/compliance/data-requests/{id}/reject
    public function reject(Request $req, Response $res, array $args): Response
    {
        $tid    = $req->getAttribute('auth.tenant_id');
        $d      = (array) $req->getParsedBody();
        $reason = trim($d['reason'] ?? '');

        if ($reason === '') {
            return ResponseHelper::json($res, ['success' => false, 'message' => 'rejection reason is required'], 422);
        }

        try {
            $request = $this->svc->rejectRequest($args['id'], $tid, $reason);
            return ResponseHelper::json($res, ['success' => true, 'data' => $request->toArray()]);
        } catch (\DomainException $e) {
            return ResponseHelper::json($res, ['success' => false, 'message' => $e->getMessage()], 422);
        } catch (\RuntimeException $e) {
            return ResponseHelper::json($res, ['success' => false, 'message' => $e->getMessage()], 404);
        }
    }

    // GET /api/compliance/exports/{filename}
    // Serves a previously generated export JSON file
    public function downloadExport(Request $req, Response $res, array $args): Response
    {
        $filename    = basename($args['filename']); // prevent path traversal
        $storagePath = rtrim($_ENV['STORAGE_PATH'] ?? '/www/wwwroot/lodgik/storage', '/');
        $filepath    = $storagePath . '/ndpr-exports/' . $filename;

        if (!file_exists($filepath) || !str_ends_with($filename, '.json')) {
            return ResponseHelper::json($res, ['success' => false, 'message' => 'Export not found'], 404);
        }

        $res->getBody()->write(file_get_contents($filepath));
        return $res
            ->withHeader('Content-Type', 'application/json')
            ->withHeader('Content-Disposition', 'attachment; filename="' . $filename . '"');
    }
}

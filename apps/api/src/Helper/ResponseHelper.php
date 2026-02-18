<?php

declare(strict_types=1);

namespace Lodgik\Helper;

use Psr\Http\Message\ResponseInterface as Response;

final class ResponseHelper
{
    /**
     * Success response with data.
     */
    public function success(Response $response, mixed $data = null, string $message = '', int $status = 200): Response
    {
        $body = [
            'success' => true,
        ];

        if ($message !== '') {
            $body['message'] = $message;
        }

        if ($data !== null) {
            $body['data'] = $data;
        }

        return $this->json($response, $body, $status);
    }

    /**
     * Created response (201).
     */
    public function created(Response $response, mixed $data = null, string $message = 'Resource created successfully'): Response
    {
        return $this->success($response, $data, $message, 201);
    }

    /**
     * Paginated response with meta.
     */
    public function paginated(
        Response $response,
        array $data,
        int $total,
        int $page,
        int $limit,
        string $message = ''
    ): Response {
        $body = [
            'success' => true,
            'data' => $data,
            'meta' => [
                'page' => $page,
                'limit' => $limit,
                'total' => $total,
                'total_pages' => (int) ceil($total / max($limit, 1)),
                'has_next' => ($page * $limit) < $total,
                'has_previous' => $page > 1,
            ],
        ];

        if ($message !== '') {
            $body['message'] = $message;
        }

        return $this->json($response, $body);
    }

    /**
     * Error response.
     */
    public function error(Response $response, string $message, int $status = 400, array $errors = []): Response
    {
        $body = [
            'success' => false,
            'message' => $message,
        ];

        if (!empty($errors)) {
            $body['errors'] = $errors;
        }

        return $this->json($response, $body, $status);
    }

    /**
     * Validation error response (422).
     */
    public function validationError(Response $response, array $errors, string $message = 'Validation failed'): Response
    {
        return $this->error($response, $message, 422, $errors);
    }

    /**
     * Not found response (404).
     */
    public function notFound(Response $response, string $message = 'Resource not found'): Response
    {
        return $this->error($response, $message, 404);
    }

    /**
     * Unauthorized response (401).
     */
    public function unauthorized(Response $response, string $message = 'Unauthorized'): Response
    {
        return $this->error($response, $message, 401);
    }

    /**
     * Forbidden response (403).
     */
    public function forbidden(Response $response, string $message = 'Forbidden'): Response
    {
        return $this->error($response, $message, 403);
    }

    /**
     * Feature not available (403 with upgrade hint).
     */
    public function featureNotAvailable(Response $response, string $feature, string $upgradeTo): Response
    {
        return $this->json($response, [
            'success' => false,
            'message' => "The '{$feature}' feature is not available on your current plan.",
            'upgrade_to' => $upgradeTo,
        ], 403);
    }

    /**
     * No content response (204).
     */
    public function noContent(Response $response): Response
    {
        return $response->withStatus(204);
    }

    /**
     * Write JSON to response.
     */
    private function json(Response $response, array $body, int $status = 200): Response
    {
        $response->getBody()->write(json_encode($body, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES));

        return $response
            ->withHeader('Content-Type', 'application/json')
            ->withStatus($status);
    }
}

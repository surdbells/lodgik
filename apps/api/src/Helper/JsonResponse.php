<?php
declare(strict_types=1);
namespace Lodgik\Helper;

use Psr\Http\Message\ResponseInterface as Response;

class JsonResponse
{
    public static function ok(Response $response, mixed $data = null, string $message = '', ?array $meta = null): Response
    {
        $body = ['success' => true, 'data' => $data];
        if ($message) $body['message'] = $message;
        if ($meta) $body['meta'] = $meta;
        return self::json($response, $body);
    }

    public static function created(Response $response, mixed $data = null, string $message = 'Resource created successfully'): Response
    {
        return self::json($response, [
            'success' => true,
            'data' => $data,
            'message' => $message,
        ], 201);
    }

    public static function error(Response $response, string $message, int $status = 400): Response
    {
        return self::json($response, [
            'success' => false,
            'message' => $message,
        ], $status);
    }

    public static function validationError(Response $response, array $errors, string $message = 'Validation failed'): Response
    {
        return self::json($response, [
            'success' => false,
            'message' => $message,
            'errors' => $errors,
        ], 422);
    }

    public static function notFound(Response $response, string $message = 'Resource not found'): Response
    {
        return self::json($response, [
            'success' => false,
            'message' => $message,
        ], 404);
    }

    private static function json(Response $response, array $body, int $status = 200): Response
    {
        $response->getBody()->write(json_encode($body, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES));
        return $response
            ->withHeader('Content-Type', 'application/json')
            ->withStatus($status);
    }
}

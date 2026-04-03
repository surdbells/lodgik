<?php

declare(strict_types=1);

namespace Lodgik\Middleware;

use Lodgik\Service\JwtService;
use Psr\Http\Message\ResponseInterface as Response;
use Psr\Http\Message\ServerRequestInterface as Request;
use Psr\Http\Server\MiddlewareInterface;
use Psr\Http\Server\RequestHandlerInterface as Handler;
use Slim\Psr7\Response as SlimResponse;

/**
 * Verifies JWT access token from Authorization header.
 * Injects decoded claims into request attributes:
 *   - auth.user_id
 *   - auth.tenant_id
 *   - auth.role
 *   - auth.property_id (optional)
 *   - auth.claims (full decoded payload)
 */
final class AuthMiddleware implements MiddlewareInterface
{
    public function __construct(
        private readonly JwtService $jwt,
    ) {}

    public function process(Request $request, Handler $handler): Response
    {
        $authHeader = $request->getHeaderLine('Authorization');

        // Fallback: Apache + PHP-FPM may strip Authorization header
        if ($authHeader === '') {
            $serverParams = $request->getServerParams();
            $authHeader = $serverParams['HTTP_AUTHORIZATION']
                ?? $serverParams['REDIRECT_HTTP_AUTHORIZATION']
                ?? '';
        }

        // Fallback for SSE / EventSource: token passed as ?token= query param
        // (EventSource cannot set custom headers)
        if (($authHeader === '' || !str_starts_with($authHeader, 'Bearer '))
            && !empty($request->getQueryParams()['token'])
        ) {
            $authHeader = 'Bearer ' . $request->getQueryParams()['token'];
        }

        if ($authHeader === '' || !str_starts_with($authHeader, 'Bearer ')) {
            return $this->unauthorized('Missing or invalid Authorization header');
        }

        $token = substr($authHeader, 7);

        if ($token === '') {
            return $this->unauthorized('Empty token');
        }

        try {
            $claims = $this->jwt->decode($token);
        } catch (\RuntimeException $e) {
            return $this->unauthorized($e->getMessage());
        }

        // Verify token type
        if (($claims['type'] ?? '') !== 'access') {
            return $this->unauthorized('Invalid token type');
        }

        // Verify required claims
        if (empty($claims['sub']) || empty($claims['tenant_id']) || empty($claims['role'])) {
            return $this->unauthorized('Incomplete token claims');
        }

        // Inject claims into request attributes
        $request = $request
            ->withAttribute('auth.user_id', $claims['sub'])
            ->withAttribute('auth.tenant_id', $claims['tenant_id'])
            ->withAttribute('auth.role', $claims['role'])
            ->withAttribute('auth.property_id', $claims['property_id'] ?? null)
            ->withAttribute('auth.claims', $claims);

        return $handler->handle($request);
    }

    private function unauthorized(string $message): Response
    {
        $response = new SlimResponse();
        $body = json_encode([
            'success' => false,
            'message' => $message,
        ], JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);

        $response->getBody()->write($body);

        return $response
            ->withHeader('Content-Type', 'application/json')
            ->withStatus(401);
    }
}

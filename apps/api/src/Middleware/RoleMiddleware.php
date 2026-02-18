<?php

declare(strict_types=1);

namespace Lodgik\Middleware;

use Psr\Http\Message\ResponseInterface as Response;
use Psr\Http\Message\ServerRequestInterface as Request;
use Psr\Http\Server\MiddlewareInterface;
use Psr\Http\Server\RequestHandlerInterface as Handler;
use Slim\Psr7\Response as SlimResponse;

/**
 * Checks if the authenticated user's role matches one of the allowed roles.
 * Must run AFTER AuthMiddleware.
 *
 * Usage in routes:
 *   ->add(new RoleMiddleware(['super_admin', 'property_admin']))
 */
final class RoleMiddleware implements MiddlewareInterface
{
    /**
     * @param array<string> $allowedRoles
     */
    public function __construct(
        private readonly array $allowedRoles,
    ) {}

    public function process(Request $request, Handler $handler): Response
    {
        $userRole = $request->getAttribute('auth.role');

        if ($userRole === null) {
            return $this->forbidden('Authentication required');
        }

        // super_admin always passes (platform-level access)
        if ($userRole === 'super_admin') {
            return $handler->handle($request);
        }

        if (!in_array($userRole, $this->allowedRoles, true)) {
            return $this->forbidden(
                sprintf(
                    'Your role (%s) does not have access to this resource',
                    $userRole
                )
            );
        }

        return $handler->handle($request);
    }

    private function forbidden(string $message): Response
    {
        $response = new SlimResponse();
        $body = json_encode([
            'success' => false,
            'message' => $message,
        ], JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);

        $response->getBody()->write($body);

        return $response
            ->withHeader('Content-Type', 'application/json')
            ->withStatus(403);
    }
}

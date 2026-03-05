<?php
declare(strict_types=1);

namespace Lodgik\Middleware;

use Lodgik\Module\GuestAuth\GuestAuthService;
use Psr\Http\Message\ResponseInterface as Response;
use Psr\Http\Message\ServerRequestInterface as Request;
use Psr\Http\Server\MiddlewareInterface;
use Psr\Http\Server\RequestHandlerInterface;
use Slim\Psr7\Response as SlimResponse;

/**
 * GuestMiddleware — validates a guest session token from the Authorization header.
 *
 * On success, injects into request attributes:
 *   - guest.session_id
 *   - guest.guest_id
 *   - guest.booking_id
 *   - guest.property_id
 *   - guest.tenant_id
 */
final class GuestMiddleware implements MiddlewareInterface
{
    public function __construct(private readonly GuestAuthService $guestAuthService) {}

    public function process(Request $request, RequestHandlerInterface $handler): Response
    {
        $header = $request->getHeaderLine('Authorization');
        $token  = str_replace('Bearer ', '', $header);

        if (empty($token)) {
            return $this->unauthorized('Guest session token required');
        }

        $session = $this->guestAuthService->validateSession($token);

        if (!$session) {
            return $this->unauthorized('Invalid or expired guest session');
        }

        $request = $request
            ->withAttribute('guest.session_id',  $session->getId())
            ->withAttribute('guest.guest_id',     $session->getGuestId())
            ->withAttribute('guest.booking_id',   $session->getBookingId())
            ->withAttribute('guest.property_id',  $session->getPropertyId())
            ->withAttribute('guest.tenant_id',    $session->getTenantId());

        return $handler->handle($request);
    }

    private function unauthorized(string $message): Response
    {
        $response = new SlimResponse(401);
        $response->getBody()->write(json_encode([
            'success' => false,
            'error'   => ['code' => 'GUEST_UNAUTHORIZED', 'message' => $message],
        ]));
        return $response->withHeader('Content-Type', 'application/json');
    }
}

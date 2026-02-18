<?php

declare(strict_types=1);

namespace Lodgik\Middleware;

use Lodgik\Helper\UuidHelper;
use Psr\Http\Message\ResponseInterface as Response;
use Psr\Http\Message\ServerRequestInterface as Request;
use Psr\Http\Server\MiddlewareInterface;
use Psr\Http\Server\RequestHandlerInterface as Handler;

final class RequestIdMiddleware implements MiddlewareInterface
{
    public function process(Request $request, Handler $handler): Response
    {
        // Use existing request ID from header or generate a new one
        $requestId = $request->getHeaderLine('X-Request-ID');

        if ($requestId === '') {
            $requestId = UuidHelper::generate();
        }

        $request = $request->withAttribute('request_id', $requestId);

        $response = $handler->handle($request);

        return $response->withHeader('X-Request-ID', $requestId);
    }
}

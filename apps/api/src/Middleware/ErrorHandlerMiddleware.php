<?php

declare(strict_types=1);

namespace Lodgik\Middleware;

use Lodgik\Exception\ValidationException;
use Psr\Http\Message\ResponseInterface as Response;
use Psr\Http\Message\ServerRequestInterface as Request;
use Psr\Http\Server\MiddlewareInterface;
use Psr\Http\Server\RequestHandlerInterface as Handler;
use Psr\Log\LoggerInterface;
use Slim\Exception\HttpException;
use Slim\Exception\HttpMethodNotAllowedException;
use Slim\Exception\HttpNotFoundException;
use Slim\Psr7\Response as SlimResponse;

final class ErrorHandlerMiddleware implements MiddlewareInterface
{
    public function __construct(
        private readonly LoggerInterface $logger,
        private readonly bool $debug = false,
    ) {}

    public function process(Request $request, Handler $handler): Response
    {
        try {
            return $handler->handle($request);
        } catch (HttpNotFoundException $e) {
            return $this->jsonError(
                'Route not found',
                404,
                $request
            );
        } catch (HttpMethodNotAllowedException $e) {
            return $this->jsonError(
                'Method not allowed',
                405,
                $request
            );
        } catch (HttpException $e) {
            return $this->jsonError(
                $e->getMessage(),
                $e->getCode(),
                $request
            );
        } catch (ValidationException $e) {
            return $this->jsonError(
                $e->getMessage(),
                422,
                $request,
                $e->getErrors()
            );
        } catch (\Throwable $e) {
            $requestId = $request->getAttribute('request_id', 'unknown');

            $this->logger->error('Unhandled exception', [
                'request_id' => $requestId,
                'exception' => $e::class,
                'message' => $e->getMessage(),
                'file' => $e->getFile(),
                'line' => $e->getLine(),
                'trace' => $e->getTraceAsString(),
            ]);

            $message = $this->debug
                ? $e->getMessage()
                : 'An internal server error occurred';

            $extra = [];
            if ($this->debug) {
                $extra = [
                    'exception' => $e::class,
                    'file' => $e->getFile(),
                    'line' => $e->getLine(),
                ];
            }

            return $this->jsonError($message, 500, $request, $extra);
        }
    }

    private function jsonError(string $message, int $status, Request $request, array $errors = []): Response
    {
        $body = [
            'success' => false,
            'message' => $message,
        ];

        if (!empty($errors)) {
            $body['errors'] = $errors;
        }

        $requestId = $request->getAttribute('request_id');
        if ($requestId) {
            $body['request_id'] = $requestId;
        }

        $response = new SlimResponse();
        $response->getBody()->write(json_encode($body, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES));

        return $response
            ->withHeader('Content-Type', 'application/json')
            ->withStatus($status);
    }
}

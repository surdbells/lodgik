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
    private static bool $sentryInitialized = false;

    public function __construct(
        private readonly LoggerInterface $logger,
        private readonly bool $debug = false,
        private readonly string $sentryDsn = '',
    ) {
        // Initialise Sentry once on first instantiation
        if ($this->sentryDsn !== '' && !self::$sentryInitialized && class_exists('\Sentry\SentrySdk')) {
            \Sentry\init([
                'dsn'                => $this->sentryDsn,
                'environment'        => $_ENV['APP_ENV'] ?? 'production',
                'traces_sample_rate' => 0.1, // 10% of requests for performance monitoring
                'send_default_pii'   => false,
            ]);
            self::$sentryInitialized = true;
        }
    }

    public function process(Request $request, Handler $handler): Response
    {
        try {
            return $handler->handle($request);
        } catch (HttpNotFoundException $e) {
            return $this->jsonError('Route not found', 404, $request);
        } catch (HttpMethodNotAllowedException $e) {
            return $this->jsonError('Method not allowed', 405, $request);
        } catch (HttpException $e) {
            return $this->jsonError($e->getMessage(), $e->getCode(), $request);
        } catch (ValidationException $e) {
            return $this->jsonError($e->getMessage(), 422, $request, $e->getErrors());
        } catch (\RuntimeException $e) {
            // Business logic errors (thrown intentionally by services)
            $code = ($e->getCode() >= 400 && $e->getCode() < 600) ? $e->getCode() : 400;
            return $this->jsonError($e->getMessage(), $code, $request);
        } catch (\Throwable $e) {
            return $this->handleServerError($e, $request);
        }
    }

    private function handleServerError(\Throwable $e, Request $request): Response
    {
        $requestId = $request->getAttribute('request_id', substr(md5(microtime()), 0, 8));

        // Capture in Sentry if configured
        if (self::$sentryInitialized && class_exists('\Sentry\SentrySdk')) {
            \Sentry\withScope(function (\Sentry\State\Scope $scope) use ($e, $request, $requestId): void {
                $scope->setTag('request_id', $requestId);
                $scope->setTag('method', $request->getMethod());
                $scope->setExtra('uri', (string) $request->getUri());
                \Sentry\captureException($e);
            });
        }

        // ALWAYS log full error details
        $this->logger->error('Unhandled exception', [
            'request_id' => $requestId,
            'method' => $request->getMethod(),
            'uri' => (string) $request->getUri(),
            'exception' => $e::class,
            'message' => $e->getMessage(),
            'file' => $e->getFile(),
            'line' => $e->getLine(),
            'trace' => $e->getTraceAsString(),
        ]);

        // Also write to a dedicated error log file for easy access
        $errorLogPath = dirname(__DIR__, 2) . '/var/logs';
        if (!is_dir($errorLogPath)) @mkdir($errorLogPath, 0755, true);
        $logEntry = sprintf(
            "[%s] %s | %s %s | %s: %s in %s:%d\n",
            date('Y-m-d H:i:s'),
            $requestId,
            $request->getMethod(),
            $request->getUri()->getPath(),
            $e::class,
            $e->getMessage(),
            $e->getFile(),
            $e->getLine(),
        );
        @file_put_contents($errorLogPath . '/errors.log', $logEntry, FILE_APPEND | LOCK_EX);

        // Show details if debug mode or X-Debug header present
        $showDetails = $this->debug || $request->hasHeader('X-Debug');

        $body = [
            'success' => false,
            'message' => $showDetails ? $e->getMessage() : 'An internal server error occurred',
            'request_id' => $requestId,
        ];

        if ($showDetails) {
            $body['error'] = [
                'type' => $e::class,
                'message' => $e->getMessage(),
                'file' => $e->getFile(),
                'line' => $e->getLine(),
            ];
        }

        $response = new SlimResponse();
        $response->getBody()->write(json_encode($body, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES));

        return $response
            ->withHeader('Content-Type', 'application/json')
            ->withStatus(500);
    }

    private function jsonError(string $message, int $status, Request $request, array $errors = []): Response
    {
        $body = ['success' => false, 'message' => $message];

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

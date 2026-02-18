<?php

declare(strict_types=1);

namespace Lodgik\Module\Health;

use Doctrine\ORM\EntityManagerInterface;
use Lodgik\Helper\ResponseHelper;
use Predis\Client as RedisClient;
use Psr\Http\Message\ResponseInterface as Response;
use Psr\Http\Message\ServerRequestInterface as Request;

final class HealthController
{
    public function __construct(
        private readonly ResponseHelper $response,
        private readonly EntityManagerInterface $em,
        private readonly RedisClient $redis,
    ) {}

    /**
     * Basic health check.
     */
    public function check(Request $request, Response $response): Response
    {
        return $this->response->success($response, [
            'status' => 'ok',
            'service' => 'lodgik-api',
            'timestamp' => (new \DateTimeImmutable())->format(\DateTimeInterface::ATOM),
        ]);
    }

    /**
     * Detailed health check with dependency status.
     */
    public function detailed(Request $request, Response $response): Response
    {
        $checks = [
            'api' => ['status' => 'ok'],
            'database' => $this->checkDatabase(),
            'redis' => $this->checkRedis(),
        ];

        $allHealthy = true;
        foreach ($checks as $check) {
            if ($check['status'] !== 'ok') {
                $allHealthy = false;
                break;
            }
        }

        $data = [
            'status' => $allHealthy ? 'ok' : 'degraded',
            'service' => 'lodgik-api',
            'version' => '0.1.0',
            'timestamp' => (new \DateTimeImmutable())->format(\DateTimeInterface::ATOM),
            'checks' => $checks,
        ];

        return $this->response->success(
            $response,
            $data,
            status: $allHealthy ? 200 : 503
        );
    }

    private function checkDatabase(): array
    {
        try {
            $this->em->getConnection()->executeQuery('SELECT 1');
            return ['status' => 'ok'];
        } catch (\Throwable $e) {
            return ['status' => 'error', 'message' => 'Database connection failed'];
        }
    }

    private function checkRedis(): array
    {
        try {
            $pong = $this->redis->ping();
            return ['status' => ($pong ? 'ok' : 'error')];
        } catch (\Throwable $e) {
            return ['status' => 'error', 'message' => 'Redis connection failed'];
        }
    }
}

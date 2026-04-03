<?php

declare(strict_types=1);

namespace Lodgik\Module\Pos;

use Psr\Http\Message\ResponseInterface as Response;
use Psr\Http\Message\ServerRequestInterface as Request;
use Predis\Client as RedisClient;

/**
 * Server-Sent Events endpoint for the kitchen display.
 *
 * GET /api/pos/kitchen/stream?property_id={pid}
 *
 * Holds the HTTP connection open and pushes an SSE event whenever any
 * kitchen-relevant change occurs on the given property (new order sent to
 * kitchen, item marked preparing/ready).
 *
 * Events pushed:
 *   - "kitchen_update" with data: {"type":"refresh","property_id":"…"}
 *     → frontend re-fetches the full kitchen queue
 *   - heartbeat comment ": ping" every 25 s to keep the connection alive
 *     through proxies and load-balancers
 *
 * Timeout: the loop exits after MAX_DURATION seconds so PHP-FPM workers
 * are not held forever. The EventSource client auto-reconnects.
 */
final class KitchenSseController
{
    private const MAX_DURATION  = 55;   // seconds before forcing reconnect
    private const HEARTBEAT_INT = 25;   // seconds between heartbeats
    private const CHANNEL_PFX   = 'kitchen:';

    public function __construct(
        private readonly array $redisSettings,
    ) {}

    public function stream(Request $request, Response $response): Response
    {
        $pid = $request->getQueryParams()['property_id'] ?? '';
        if ($pid === '') {
            return $response->withStatus(400);
        }

        // Disable output buffering so events reach the client immediately
        while (ob_get_level() > 0) {
            ob_end_clean();
        }

        // Slim PSR-7 responses buffer everything — we bypass that and write
        // directly to stdout for SSE.  Tell Slim not to send its own response.
        header('Content-Type: text/event-stream');
        header('Cache-Control: no-cache');
        header('X-Accel-Buffering: no');   // Nginx: disable proxy buffering
        header('Connection: keep-alive');

        $channel   = self::CHANNEL_PFX . $pid;
        $startTime = time();
        $lastHb    = time();

        // Create a dedicated Redis connection for blocking pub/sub
        $params = [
            'scheme' => 'tcp',
            'host'   => $this->redisSettings['host'],
            'port'   => $this->redisSettings['port'],
        ];
        if (!empty($this->redisSettings['password'])) {
            $params['password'] = $this->redisSettings['password'];
        }
        $redis = new RedisClient($params);

        try {
            $pubsub = $redis->pubSubLoop();
            $pubsub->subscribe($channel);

            foreach ($pubsub as $message) {
                $now = time();

                // Send heartbeat if due
                if ($now - $lastHb >= self::HEARTBEAT_INT) {
                    echo ": ping\n\n";
                    flush();
                    $lastHb = $now;
                }

                // Exit loop after MAX_DURATION — client will auto-reconnect
                if ($now - $startTime >= self::MAX_DURATION) {
                    echo "event: reconnect\ndata: {}\n\n";
                    flush();
                    break;
                }

                if ($message->kind === 'message') {
                    echo "event: kitchen_update\n";
                    echo "data: " . $message->payload . "\n\n";
                    flush();
                }

                // Check if client disconnected
                if (connection_aborted()) {
                    break;
                }
            }
        } finally {
            try { $pubsub->unsubscribe(); } catch (\Throwable) {}
            $redis->disconnect();
        }

        exit(0); // Prevent Slim from writing its own response after we've streamed
    }
}

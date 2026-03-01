<?php

declare(strict_types=1);

namespace Lodgik\Module\System;

use Lodgik\Command\DatabaseBackupCommand;
use Lodgik\Command\FraudAutoCheckoutCommand;
use Lodgik\Command\LateCheckoutChargeCommand;
use Lodgik\Command\NightAuditCommand;
use Lodgik\Command\NoonCheckoutCommand;
use Lodgik\Command\VisitorOverstayCommand;
use Lodgik\Helper\ResponseHelper;
use Psr\Http\Message\ResponseInterface as Response;
use Psr\Http\Message\ServerRequestInterface as Request;
use Symfony\Component\Console\Application;
use Symfony\Component\Console\Input\ArrayInput;
use Symfony\Component\Console\Output\BufferedOutput;

/**
 * Provides HTTP endpoints for super-admins to manually trigger
 * and check the status of scheduled cron jobs.
 *
 * All endpoints require role: super_admin.
 */
final class SystemJobController
{
    /** Map of public job names → command names */
    private const JOBS = [
        'noon-checkout'      => 'lodgik:noon-checkout',
        'fraud-checkout'     => 'lodgik:fraud-auto-checkout',
        'night-audit'        => 'lodgik:night-audit',
        'database-backup'    => 'lodgik:database-backup',
        'visitor-overstay'   => 'lodgik:visitor-overstay',
        'late-checkout'      => 'lodgik:late-checkout-charge',
    ];

    public function __construct(
        private readonly Application $consoleApp,
        private readonly ResponseHelper $response,
    ) {}

    /** GET /api/system/jobs */
    public function list(Request $request, Response $response): Response
    {
        $jobs = array_map(
            fn(string $name, string $cmd) => [
                'name'    => $name,
                'command' => $cmd,
                'trigger' => "POST /api/system/jobs/{$name}/run",
            ],
            array_keys(self::JOBS),
            array_values(self::JOBS),
        );

        return $this->response->success($response, $jobs);
    }

    /** POST /api/system/jobs/{job}/run */
    public function run(Request $request, Response $response, array $args): Response
    {
        $jobName = $args['job'] ?? '';
        $cmdName = self::JOBS[$jobName] ?? null;

        if (!$cmdName) {
            return $this->response->notFound($response, "Job '{$jobName}' not found. Available: " . implode(', ', array_keys(self::JOBS)));
        }

        $body    = (array) ($request->getParsedBody() ?? []);
        $dryRun  = (bool) ($body['dry_run'] ?? false);
        $options = $body['options'] ?? [];

        $input = ['command' => $cmdName];
        if ($dryRun) $input['--dry-run'] = true;
        foreach ($options as $k => $v) {
            $input["--{$k}"] = $v;
        }

        $output   = new BufferedOutput();
        $exitCode = 0;

        try {
            $this->consoleApp->setAutoExit(false);
            $exitCode = $this->consoleApp->run(new ArrayInput($input), $output);
        } catch (\Throwable $e) {
            return $this->response->error($response, $e->getMessage(), 500);
        }

        $log = $output->fetch();

        if ($exitCode !== 0) {
            return $this->response->error(
                $response,
                "Job '{$jobName}' completed with errors (exit code {$exitCode})",
                500,
            );
        }

        return $this->response->success($response, [
            'job'       => $jobName,
            'command'   => $cmdName,
            'exit_code' => $exitCode,
            'dry_run'   => $dryRun,
            'output'    => $log,
        ], "Job '{$jobName}' executed successfully");
    }
}

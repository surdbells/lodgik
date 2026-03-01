<?php

declare(strict_types=1);

namespace Lodgik\Command;

use Doctrine\ORM\EntityManagerInterface;
use Psr\Log\LoggerInterface;
use Symfony\Component\Console\Command\Command;
use Symfony\Component\Console\Input\InputInterface;
use Symfony\Component\Console\Output\OutputInterface;
use Symfony\Component\Console\Style\SymfonyStyle;

/**
 * Base class for all Lodgik scheduled / CLI commands.
 *
 * Provides:
 *  - Shared EntityManager and Logger injection
 *  - Consistent success/failure output via SymfonyStyle
 *  - runJob() template method that catches all exceptions and returns
 *    a standardised exit code — so cron never receives an unhandled exception.
 */
abstract class AbstractCommand extends Command
{
    protected EntityManagerInterface $em;
    protected LoggerInterface $logger;
    protected SymfonyStyle $io;

    public function __construct(
        EntityManagerInterface $em,
        LoggerInterface $logger,
    ) {
        parent::__construct();
        $this->em     = $em;
        $this->logger = $logger;
    }

    final protected function execute(InputInterface $input, OutputInterface $output): int
    {
        $this->io = new SymfonyStyle($input, $output);
        $name     = static::getDefaultName() ?? static::class;

        $this->logger->info("[Command:{$name}] started");
        $this->io->title("Lodgik Job: {$name}");

        try {
            $result = $this->handle($input, $this->io);
            $this->logger->info("[Command:{$name}] completed");
            return $result ?? self::SUCCESS;
        } catch (\Throwable $e) {
            $this->logger->error("[Command:{$name}] failed: {$e->getMessage()}", [
                'file'  => $e->getFile(),
                'line'  => $e->getLine(),
                'trace' => $e->getTraceAsString(),
            ]);
            $this->io->error("Command failed: {$e->getMessage()}");
            return self::FAILURE;
        }
    }

    /**
     * Implement the actual job logic here.
     * Return self::SUCCESS (0) or self::FAILURE (1).
     */
    abstract protected function handle(InputInterface $input, SymfonyStyle $io): int;
}

#!/usr/bin/env php
<?php

declare(strict_types=1);

use DI\ContainerBuilder;
use Doctrine\ORM\EntityManagerInterface;
use Doctrine\ORM\Tools\Console\ConsoleRunner;
use Doctrine\ORM\Tools\Console\EntityManagerProvider\SingleManagerProvider;
use Doctrine\Migrations\Configuration\EntityManager\ExistingEntityManager;
use Doctrine\Migrations\Configuration\Migration\PhpFile;
use Doctrine\Migrations\DependencyFactory;
use Doctrine\Migrations\Tools\Console\Command as MigrationCommand;
use Symfony\Component\Console\Application;
use Lodgik\Module\Booking\BookingService;
use Lodgik\Module\Finance\FinanceService;
use Lodgik\Module\Housekeeping\HousekeepingService;
use Lodgik\Module\Notification\NotificationService;
use Lodgik\Command\DatabaseBackupCommand;
use Lodgik\Command\FraudAutoCheckoutCommand;
use Lodgik\Command\NightAuditCommand;
use Lodgik\Command\NoonCheckoutCommand;
use Lodgik\Command\LateCheckoutChargeCommand;
use Lodgik\Command\VisitorOverstayCommand;
use Lodgik\Module\Folio\FolioService;
use Psr\Log\LoggerInterface;

require __DIR__ . '/../vendor/autoload.php';

// ─── Build DI Container ───────────────────────────────────
$containerBuilder = new ContainerBuilder();
(require __DIR__ . '/../config/dependencies.php')($containerBuilder);
$container = $containerBuilder->build();

// ─── Get Entity Manager ──────────────────────────────────
$entityManager = $container->get(EntityManagerInterface::class);

// ─── Migrations Config ───────────────────────────────────
$migrationConfig = new PhpFile(__DIR__ . '/../config/migrations.php');
$dependencyFactory = DependencyFactory::fromEntityManager(
    $migrationConfig,
    new ExistingEntityManager($entityManager)
);

// ─── Console Application ─────────────────────────────────
$app = new Application('Lodgik CLI', '0.1.0');

// Doctrine ORM commands
$emProvider = new SingleManagerProvider($entityManager);
ConsoleRunner::addCommands($app, $emProvider);

// Doctrine Migration commands
$app->addCommands([
    new MigrationCommand\CurrentCommand($dependencyFactory),
    new MigrationCommand\DiffCommand($dependencyFactory),
    new MigrationCommand\DumpSchemaCommand($dependencyFactory),
    new MigrationCommand\ExecuteCommand($dependencyFactory),
    new MigrationCommand\GenerateCommand($dependencyFactory),
    new MigrationCommand\LatestCommand($dependencyFactory),
    new MigrationCommand\ListCommand($dependencyFactory),
    new MigrationCommand\MigrateCommand($dependencyFactory),
    new MigrationCommand\RollupCommand($dependencyFactory),
    new MigrationCommand\StatusCommand($dependencyFactory),
    new MigrationCommand\SyncMetadataCommand($dependencyFactory),
    new MigrationCommand\VersionCommand($dependencyFactory),
]);

// ─── Lodgik Automation Commands ─────────────────────────────
$logger = $container->get(LoggerInterface::class);
$em     = $container->get(EntityManagerInterface::class);

$app->addCommands([
    // Runs at 12:00 PM — flags overdue rooms, creates housekeeping tasks
    new NoonCheckoutCommand(
        em:                 $em,
        logger:             $logger,
        bookingService:     $container->get(BookingService::class),
        housekeepingService:$container->get(HousekeepingService::class),
        notificationService:$container->get(NotificationService::class),
    ),

    // Runs at 01:00 AM — auto-closes dual-cleared or 24h+ overdue bookings
    new FraudAutoCheckoutCommand(
        em:                 $em,
        logger:             $logger,
        bookingService:     $container->get(BookingService::class),
        notificationService:$container->get(NotificationService::class),
    ),

    // Runs at 02:00 AM — generates and auto-closes night audits for all properties
    new NightAuditCommand(
        em:                 $em,
        logger:             $logger,
        financeService:     $container->get(FinanceService::class),
        notificationService:$container->get(NotificationService::class),
    ),

    // Runs at 02:30 AM — encrypted pg_dump backup with 30-day retention
    new DatabaseBackupCommand(
        em:     $em,
        logger: $logger,
    ),

    // Runs at 12:30 PM — posts late-checkout folio charges past grace period
    new LateCheckoutChargeCommand(
        em:                 $em,
        logger:             $logger,
        notificationService:$container->get(NotificationService::class),
        folioService:       $container->get(FolioService::class),
    ),

    // Runs every 30 min (8 AM–10 PM) — detects visitor overstay
    new VisitorOverstayCommand(
        em:                 $em,
        logger:             $logger,
        notificationService:$container->get(NotificationService::class),
    ),
]);

$app->run();

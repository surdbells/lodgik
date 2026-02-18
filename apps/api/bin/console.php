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

// Custom commands will be registered here as we build them
// $app->add($container->get(SeedCommand::class));

$app->run();

<?php

declare(strict_types=1);

namespace Lodgik\Command;

use Doctrine\ORM\EntityManagerInterface;
use Lodgik\Entity\Property;
use Lodgik\Module\Finance\FinanceService;
use Lodgik\Module\Notification\NotificationService;
use Psr\Log\LoggerInterface;
use Symfony\Component\Console\Attribute\AsCommand;
use Symfony\Component\Console\Input\InputInterface;
use Symfony\Component\Console\Input\InputOption;
use Symfony\Component\Console\Style\SymfonyStyle;

/**
 * Runs at 02:00 AM daily (see crontab.example).
 *
 * For every active property across every tenant:
 *   1. Generates the night audit for yesterday (date = today - 1 day).
 *   2. If no discrepancies are found, closes (locks) the audit automatically.
 *   3. If discrepancies exist, leaves the audit open and notifies the
 *      property manager to review manually before closing.
 *   4. Notifies staff of the completed audit and any revenue summary.
 */
#[AsCommand(
    name: 'lodgik:night-audit',
    description: 'Run the nightly audit for all active properties (2 AM)',
)]
final class NightAuditCommand extends AbstractCommand
{
    public function __construct(
        EntityManagerInterface   $em,
        LoggerInterface          $logger,
        private readonly FinanceService      $financeService,
        private readonly NotificationService $notificationService,
    ) {
        parent::__construct($em, $logger);
    }

    protected function configure(): void
    {
        $this->addOption('date',        null, InputOption::VALUE_OPTIONAL, 'Audit date (Y-m-d) — defaults to yesterday');
        $this->addOption('property-id', null, InputOption::VALUE_OPTIONAL, 'Run for a single property only');
        $this->addOption('dry-run',     null, InputOption::VALUE_NONE,     'Preview without persisting');
    }

    protected function handle(InputInterface $input, SymfonyStyle $io): int
    {
        $dryRun     = (bool) $input->getOption('dry-run');
        $dateOpt    = $input->getOption('date');
        $propertyId = $input->getOption('property-id');

        // Default to yesterday
        $auditDate = $dateOpt
            ? new \DateTimeImmutable($dateOpt)
            : new \DateTimeImmutable('yesterday');

        $io->text("Audit date: <info>{$auditDate->format('Y-m-d')}</info>");
        if ($dryRun) $io->caution('DRY-RUN — no changes will be persisted');

        // Fetch all active properties (or just the one requested)
        $qb = $this->em->createQueryBuilder()
            ->select('p')
            ->from(Property::class, 'p')
            ->where('p.isActive = TRUE');

        if ($propertyId) {
            $qb->andWhere('p.id = :pid')->setParameter('pid', $propertyId);
        }

        /** @var Property[] $properties */
        $properties = $qb->getQuery()->getResult();

        if (empty($properties)) {
            $io->warning('No active properties found.');
            return self::SUCCESS;
        }

        $io->text(sprintf('Processing <info>%d</info> propert%s', count($properties), count($properties) === 1 ? 'y' : 'ies'));
        $io->newLine();

        $generated = 0;
        $closed    = 0;
        $openCount = 0;
        $errors    = 0;

        foreach ($properties as $property) {
            $pid      = $property->getId();
            $tid      = $property->getTenantId();
            $propName = $property->getName();

            $io->text("  📋 <comment>{$propName}</comment> ({$pid})");

            if ($dryRun) {
                $io->text("     [DRY-RUN] Would generate audit for {$auditDate->format('Y-m-d')}");
                $generated++;
                continue;
            }

            try {
                // 1. Generate (upsert) the night audit record
                $audit = $this->financeService->generateNightAudit($pid, $auditDate->format('Y-m-d'), $tid);
                $generated++;

                $hasDiscrepancies = !empty($audit->getDiscrepancies());
                $revenue          = number_format((int) $audit->toArray()['total_revenue'] / 100, 2, '.', ',');
                $occupancy        = $audit->toArray()['occupancy_rate'] . '%';

                $io->text("     Occupancy: {$occupancy} | Revenue: ₦{$revenue}");

                // 2. Auto-close only if no discrepancies
                if (!$hasDiscrepancies && $audit->getStatus() === 'open') {
                    $this->financeService->closeNightAudit(
                        $audit->getId(),
                        'SYSTEM',
                        'Auto Night Audit',
                        'Automatically closed by scheduled job — no discrepancies',
                    );
                    $closed++;
                    $io->text('     ✅ Auto-closed (no discrepancies)');

                    // 3a. Notify managers: clean close
                    $this->notificationService->create(
                        $pid, 'staff', 'all', 'night_audit',
                        '📊 Night Audit Complete',
                        $tid,
                        "Night audit for {$auditDate->format('d M Y')} closed. Occupancy: {$occupancy}. Revenue: ₦{$revenue}.",
                        ['audit_id' => $audit->getId(), 'date' => $auditDate->format('Y-m-d')],
                    );
                } else {
                    $openCount++;
                    $discCount = count($audit->getDiscrepancies() ?? []);
                    $io->text("     ⚠️  Left open — {$discCount} discrepanc" . ($discCount === 1 ? 'y' : 'ies') . ' require manual review');

                    // 3b. Notify managers: discrepancies found, manual review needed
                    $this->notificationService->create(
                        $pid, 'staff', 'all', 'night_audit',
                        '⚠️ Night Audit Needs Review',
                        $tid,
                        "Night audit for {$auditDate->format('d M Y')} has {$discCount} discrepanc" . ($discCount === 1 ? 'y' : 'ies') . ". Please review and close manually.",
                        ['audit_id' => $audit->getId(), 'date' => $auditDate->format('Y-m-d'), 'discrepancies' => $audit->getDiscrepancies()],
                    );
                }

            } catch (\Throwable $e) {
                $this->logger->error("[NightAudit] Failed for property {$pid}: {$e->getMessage()}");
                $io->error("     Failed: {$e->getMessage()}");
                $errors++;
            }
        }

        $io->newLine();
        $io->table(
            ['Result', 'Count'],
            [
                ['Properties processed', $generated],
                ['Auto-closed (clean)',   $closed],
                ['Left open (review)',    $openCount],
                ['Errors',               $errors],
            ],
        );

        $io->success('Night audit job complete.');
        return $errors > 0 ? self::FAILURE : self::SUCCESS;
    }
}

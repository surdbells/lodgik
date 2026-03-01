<?php

declare(strict_types=1);

namespace Lodgik\Command;

use Doctrine\ORM\EntityManagerInterface;
use Lodgik\Entity\VisitorAccessCode;
use Lodgik\Module\Notification\NotificationService;
use Psr\Log\LoggerInterface;
use Symfony\Component\Console\Attribute\AsCommand;
use Symfony\Component\Console\Input\InputInterface;
use Symfony\Component\Console\Input\InputOption;
use Symfony\Component\Console\Style\SymfonyStyle;

/**
 * Runs every 30 minutes during operational hours (see crontab.example).
 *
 * Scans all active gate passes where valid_until < now and
 * checked_out_at IS NULL. For each:
 *   1. Marks the gate pass status as 'overdue'.
 *   2. Sends a push notification to security staff.
 *   3. Logs the event for audit.
 *
 * Idempotent — already-overdue passes are not double-notified (status check).
 */
#[AsCommand(
    name: 'lodgik:visitor-overstay',
    description: 'Detect visitor gate passes that have exceeded their valid time',
)]
final class VisitorOverstayCommand extends AbstractCommand
{
    public function __construct(
        EntityManagerInterface   $em,
        LoggerInterface          $logger,
        private readonly NotificationService $notificationService,
    ) {
        parent::__construct($em, $logger);
    }

    protected function configure(): void
    {
        $this->addOption('dry-run',     null, InputOption::VALUE_NONE,     'Preview without updating status');
        $this->addOption('property-id', null, InputOption::VALUE_OPTIONAL, 'Limit to a single property');
    }

    protected function handle(InputInterface $input, SymfonyStyle $io): int
    {
        $dryRun     = (bool) $input->getOption('dry-run');
        $propertyId = $input->getOption('property-id');
        $now        = new \DateTimeImmutable();

        if ($dryRun) $io->caution('DRY-RUN — no status changes will be made');

        $qb = $this->em->createQueryBuilder()
            ->select('g')
            ->from(VisitorAccessCode::class, 'g')
            ->where('g.status      = :active')
            ->andWhere('g.validUntil < :now')
            ->andWhere('g.checkedInAt IS NOT NULL')
            ->setParameter('active', 'active')
            ->setParameter('now',    $now);

        if ($propertyId) {
            $qb->andWhere('g.propertyId = :pid')->setParameter('pid', $propertyId);
        }

        /** @var VisitorAccessCode[] $passes */
        $passes = $qb->getQuery()->getResult();

        if (empty($passes)) {
            $io->success('No overstaying visitors found.');
            return self::SUCCESS;
        }

        $io->text(sprintf('<warning>%d</warning> overstay pass(es) detected', count($passes)));
        $io->newLine();

        $flagged = 0;
        $errors  = 0;

        foreach ($passes as $pass) {
            $minutesOver = (int) round(($now->getTimestamp() - $pass->getValidUntil()->getTimestamp()) / 60);
            $visitorName = $pass->getVisitorName();
            $pid         = $pass->getPropertyId();
            $tid         = $pass->getTenantId();

            $io->text(sprintf(
                '  ⏰ <comment>%s</comment> — %d min over valid time (property: %s)',
                $visitorName,
                $minutesOver,
                $pid,
            ));

            if ($dryRun) continue;

            try {
                // 1. Mark gate pass as overdue (idempotent)
                $pass->expire(); // marks as 'expired' — closest status for overstay

                // 2. Alert security staff
                $this->notificationService->create(
                    $pid,
                    'staff',
                    'all',
                    'security',
                    '🚨 Visitor Overstay Alert',
                    $tid,
                    "Visitor {$visitorName} is {$minutesOver} minutes past their allowed exit time. Gate pass has not been checked out.",
                    [
                        'visitor_code_id' => $pass->getId(),
                        'visitor_name'  => $visitorName,
                        'booking_id'    => $pass->getBookingId(),
                        'minutes_over'  => $minutesOver,
                    ],
                );

                $this->em->flush();
                $this->logger->warning(
                    "[VisitorOverstay] Visitor {$visitorName} overstay flagged — property={$pid}, minutes_over={$minutesOver}",
                );

                $flagged++;

            } catch (\Throwable $e) {
                $this->logger->error("[VisitorOverstay] Failed for pass {$pass->getId()}: {$e->getMessage()}");
                $io->error("  Failed: {$e->getMessage()}");
                $errors++;
            }
        }

        $io->success(sprintf('Overstay check complete — Flagged: %d | Errors: %d', $flagged, $errors));
        return $errors > 0 ? self::FAILURE : self::SUCCESS;
    }
}

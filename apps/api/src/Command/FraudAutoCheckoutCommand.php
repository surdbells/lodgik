<?php

declare(strict_types=1);

namespace Lodgik\Command;

use Doctrine\ORM\EntityManagerInterface;
use Lodgik\Entity\AutoCheckoutLog;
use Lodgik\Entity\Booking;
use Lodgik\Enum\BookingStatus;
use Lodgik\Module\Booking\BookingService;
use Lodgik\Module\Notification\NotificationService;
use Psr\Log\LoggerInterface;
use Symfony\Component\Console\Attribute\AsCommand;
use Symfony\Component\Console\Input\InputInterface;
use Symfony\Component\Console\Input\InputOption;
use Symfony\Component\Console\Style\SymfonyStyle;

/**
 * Runs once daily at 01:00 AM (see crontab.example).
 *
 * Fraud-prevention auto-checkout identifies and closes bookings where:
 *
 *   (A) DUAL_CLEARANCE — Both front desk AND security have marked the booking
 *       as cleared, indicating the guest has left but a formal checkout was
 *       not processed in the system.
 *
 *   (B) 24H_OVERDUE — The booking's checkout date is more than 24 hours in
 *       the past and the booking is still in CHECKED_IN status. This prevents
 *       rooms from being permanently blocked by abandoned records.
 *
 * For each matched booking:
 *   1. Calls BookingService::checkOut() to close the folio and release the room.
 *   2. Writes an AutoCheckoutLog entry for the audit trail.
 *   3. Notifies the property manager via push notification.
 */
#[AsCommand(
    name: 'lodgik:fraud-auto-checkout',
    description: 'Auto-checkout bookings with dual clearance or >24h overdue',
)]
final class FraudAutoCheckoutCommand extends AbstractCommand
{
    public function __construct(
        EntityManagerInterface  $em,
        LoggerInterface         $logger,
        private readonly BookingService      $bookingService,
        private readonly NotificationService $notificationService,
    ) {
        parent::__construct($em, $logger);
    }

    protected function configure(): void
    {
        $this->addOption('dry-run', null, InputOption::VALUE_NONE, 'Preview without making changes');
        $this->addOption('tenant-id', null, InputOption::VALUE_OPTIONAL, 'Limit to one tenant (for testing)');
    }

    protected function handle(InputInterface $input, SymfonyStyle $io): int
    {
        $dryRun   = (bool) $input->getOption('dry-run');
        $tenantId = $input->getOption('tenant-id');
        $now      = new \DateTimeImmutable();
        $threshold24h = $now->modify('-24 hours');

        if ($dryRun) $io->caution('DRY-RUN mode — no changes will be made');

        // ── Scenario A: Dual-cleared bookings ────────────────────────────────
        $dualQb = $this->em->createQueryBuilder()
            ->select('b')
            ->from(Booking::class, 'b')
            ->where('b.status            = :status')
            ->andWhere('b.frontDeskCleared = TRUE')
            ->andWhere('b.securityCleared  = TRUE')
            ->setParameter('status', BookingStatus::CHECKED_IN);

        if ($tenantId) $dualQb->andWhere('b.tenantId = :tid')->setParameter('tid', $tenantId);
        /** @var Booking[] $dualCleared */
        $dualCleared = $dualQb->getQuery()->getResult();

        // ── Scenario B: 24h+ overdue ─────────────────────────────────────────
        $overdueQb = $this->em->createQueryBuilder()
            ->select('b')
            ->from(Booking::class, 'b')
            ->where('b.status    = :status')
            ->andWhere('b.checkOut <= :threshold')
            ->setParameter('status',    BookingStatus::CHECKED_IN)
            ->setParameter('threshold', $threshold24h);

        if ($tenantId) $overdueQb->andWhere('b.tenantId = :tid')->setParameter('tid', $tenantId);
        /** @var Booking[] $longOverdue */
        $longOverdue = $overdueQb->getQuery()->getResult();

        // Deduplicate — a booking can match both criteria
        $all = [];
        foreach (array_merge($dualCleared, $longOverdue) as $b) {
            $all[$b->getId()] = $b;
        }

        $io->table(
            ['Scenario', 'Count'],
            [
                ['A — Dual clearance pending checkout', count($dualCleared)],
                ['B — 24h+ overdue',                   count($longOverdue)],
                ['Total unique bookings',               count($all)],
            ]
        );

        if (empty($all)) {
            $io->success('No fraud/overdue bookings found.');
            return self::SUCCESS;
        }

        $processed = 0;
        $errors    = 0;

        foreach ($all as $booking) {
            $isDual    = $booking->isBothCleared();
            $hoursOver = (int) max(0, round(($now->getTimestamp() - $booking->getCheckOut()->getTimestamp()) / 3600));
            $reason    = $isDual ? AutoCheckoutLog::REASON_DUAL_CLEARANCE : AutoCheckoutLog::REASON_24H_OVERDUE;

            $io->text(sprintf(
                '  [%s] Booking <comment>%s</comment> | Tenant %s | %d h overdue',
                strtoupper($reason),
                $booking->getBookingRef(),
                $booking->getTenantId(),
                $hoursOver,
            ));

            if ($dryRun) continue;

            try {
                // 1. Execute checkout — this closes folio, releases room, fires WhatsApp
                $this->bookingService->checkOut($booking->getId(), 'SYSTEM');

                // 2. Audit log
                $this->bookingService->logAutoCheckout($booking, $reason, $hoursOver);
                $this->em->flush();

                // 3. Notify property manager
                $this->notificationService->create(
                    $booking->getPropertyId(),
                    'staff',
                    'all',
                    'fraud_checkout',
                    '⚠️ Auto-checkout executed',
                    $booking->getTenantId(),
                    "Booking {$booking->getBookingRef()} was automatically checked out. Reason: {$reason}. Please review.",
                    [
                        'booking_id' => $booking->getId(),
                        'reason'     => $reason,
                        'hours_over' => $hoursOver,
                    ],
                );

                $this->logger->warning(
                    "[FraudAutoCheckout] Booking {$booking->getBookingRef()} auto-checked-out. Reason: {$reason}. Hours overdue: {$hoursOver}",
                );

                $processed++;

            } catch (\Throwable $e) {
                $this->logger->error("[FraudAutoCheckout] Failed for {$booking->getId()}: {$e->getMessage()}");
                $io->error("  Failed: {$booking->getBookingRef()} — {$e->getMessage()}");
                $errors++;
            }
        }

        $io->success(sprintf('Auto-checkout complete — Processed: %d | Errors: %d', $processed, $errors));

        return $errors > 0 ? self::FAILURE : self::SUCCESS;
    }
}

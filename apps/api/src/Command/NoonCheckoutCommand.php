<?php

declare(strict_types=1);

namespace Lodgik\Command;

use Doctrine\ORM\EntityManagerInterface;
use Lodgik\Entity\AutoCheckoutLog;
use Lodgik\Entity\Booking;
use Lodgik\Entity\Room;
use Lodgik\Enum\BookingStatus;
use Lodgik\Module\Booking\BookingService;
use Lodgik\Module\Housekeeping\HousekeepingService;
use Lodgik\Module\Notification\NotificationService;
use Psr\Log\LoggerInterface;
use Symfony\Component\Console\Attribute\AsCommand;
use Symfony\Component\Console\Input\InputInterface;
use Symfony\Component\Console\Input\InputOption;
use Symfony\Component\Console\Style\SymfonyStyle;

/**
 * Runs at 12:00 PM daily (see crontab.example).
 *
 * Logic:
 *   1. Find all checked-in bookings where checkout date = today AND current
 *      time is past the property's grace_period_minutes (default 30 min).
 *   2. For each overdue booking:
 *      - Update room status to 'cleaning' (or 'overdue' if grace exceeded by >1hr).
 *      - Create a housekeeping checkout-cleaning task.
 *      - Notify housekeeping staff via push.
 *      - Write an AutoCheckoutLog entry (reason: noon_overdue).
 *      - Does NOT auto-checkout the booking — front desk must confirm checkout.
 *        Use FraudAutoCheckoutCommand for full auto-checkout of cleared bookings.
 */
#[AsCommand(
    name: 'lodgik:noon-checkout',
    description: 'Noon room status update — flags overdue bookings and queues housekeeping tasks',
)]
final class NoonCheckoutCommand extends AbstractCommand
{
    public function __construct(
        EntityManagerInterface  $em,
        LoggerInterface         $logger,
        private readonly BookingService      $bookingService,
        private readonly HousekeepingService $housekeepingService,
        private readonly NotificationService $notificationService,
    ) {
        parent::__construct($em, $logger);
    }

    protected function configure(): void
    {
        $this->addOption('dry-run', null, InputOption::VALUE_NONE, 'Preview affected bookings without making changes');
        $this->addOption('property-id', null, InputOption::VALUE_OPTIONAL, 'Limit to a single property');
    }

    protected function handle(InputInterface $input, SymfonyStyle $io): int
    {
        $dryRun     = (bool) $input->getOption('dry-run');
        $propertyId = $input->getOption('property-id');
        $now        = new \DateTimeImmutable();

        $io->text("Time: {$now->format('Y-m-d H:i:s')}");
        if ($dryRun) $io->caution('DRY-RUN mode — no database changes will be made');

        // Fetch all checked-in bookings that are overdue (checkout <= now)
        $qb = $this->em->createQueryBuilder()
            ->select('b')
            ->from(Booking::class, 'b')
            ->where('b.status  = :status')
            ->andWhere('b.checkOut <= :now')
            ->setParameter('status', BookingStatus::CHECKED_IN)
            ->setParameter('now', $now);

        if ($propertyId) {
            $qb->andWhere('b.propertyId = :pid')->setParameter('pid', $propertyId);
        }

        /** @var Booking[] $bookings */
        $bookings = $qb->getQuery()->getResult();

        if (empty($bookings)) {
            $io->success('No overdue bookings found.');
            return self::SUCCESS;
        }

        $io->text(sprintf('Found <info>%d</info> overdue booking(s)', count($bookings)));
        $io->newLine();

        $processed = 0;
        $errors    = 0;

        foreach ($bookings as $booking) {
            $minutesOverdue = (int) round(($now->getTimestamp() - $booking->getCheckOut()->getTimestamp()) / 60);
            $roomStatus     = $minutesOverdue > 60 ? 'overdue' : 'cleaning';
            $roomId         = $booking->getRoomId();

            $io->text(sprintf(
                '  Booking <comment>%s</comment> | Room %s | %d min overdue → %s',
                $booking->getBookingRef(),
                $roomId ?? 'N/A',
                $minutesOverdue,
                $roomStatus,
            ));

            if ($dryRun) continue;

            try {
                // 1. Update room status
                if ($roomId) {
                    $room = $this->em->find(Room::class, $roomId);
                    if ($room) {
                        $room->setStatus($roomStatus);
                        $this->logger->info("[NoonCheckout] Room {$roomId} set to {$roomStatus}");
                    }
                }

                // 2. Create housekeeping task (idempotent — HousekeepingService won't duplicate if already queued)
                if ($roomId) {
                    $room = $this->em->find(Room::class, $roomId);
                    $roomNumber = $room?->getRoomNumber() ?? $roomId;
                    $this->housekeepingService->generateCheckoutTask(
                        $booking->getPropertyId(),
                        $roomId,
                        $roomNumber,
                        $booking->getId(),
                        $booking->getTenantId(),
                    );
                }

                // 3. Notify housekeeping staff
                $this->notificationService->create(
                    $booking->getPropertyId(),
                    'staff',
                    'all',
                    'housekeeping',
                    "🛏️ Room checkout overdue — {$minutesOverdue} min past checkout",
                    $booking->getTenantId(),
                    "Booking {$booking->getBookingRef()} is overdue. Please follow up with guest.",
                    ['booking_id' => $booking->getId(), 'room_id' => $roomId],
                );

                // 4. Write audit log
                $log = $this->bookingService->logAutoCheckout(
                    $booking,
                    AutoCheckoutLog::REASON_NOON_OVERDUE,
                    (int) round($minutesOverdue / 60),
                );

                $this->em->flush();
                $processed++;

            } catch (\Throwable $e) {
                $this->logger->error("[NoonCheckout] Error for booking {$booking->getId()}: {$e->getMessage()}");
                $io->error("  Failed for booking {$booking->getBookingRef()}: {$e->getMessage()}");
                $errors++;
            }
        }

        $io->newLine();
        $io->success(sprintf(
            'Processed: %d  |  Errors: %d  |  Skipped (dry-run): %d',
            $processed,
            $errors,
            $dryRun ? count($bookings) : 0,
        ));

        return $errors > 0 ? self::FAILURE : self::SUCCESS;
    }
}

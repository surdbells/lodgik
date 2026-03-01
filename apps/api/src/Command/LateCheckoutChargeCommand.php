<?php

declare(strict_types=1);

namespace Lodgik\Command;

use Doctrine\ORM\EntityManagerInterface;
use Lodgik\Entity\Booking;
use Lodgik\Entity\Property;
use Lodgik\Module\Folio\FolioService;
use Lodgik\Enum\BookingStatus;
use Lodgik\Module\Notification\NotificationService;
use Psr\Log\LoggerInterface;
use Symfony\Component\Console\Attribute\AsCommand;
use Symfony\Component\Console\Input\InputInterface;
use Symfony\Component\Console\Input\InputOption;
use Symfony\Component\Console\Style\SymfonyStyle;

/**
 * Runs at 12:30 PM daily, after the noon-checkout sweep.
 *
 * For every checked-in booking where:
 *   - checkout date = today (late checkout day)
 *   - current time > property grace_period_minutes past checkout time
 *   - no late-checkout folio charge has been posted yet (idempotent)
 *
 * Posts a FolioCharge of:
 *   - Type: 'late_checkout_fee'
 *   - Amount: property setting 'late_checkout_fee_kobo' (default: 0 = no charge)
 *   - Description: "Late checkout fee — {X} minutes past checkout time"
 *
 * Configuration (stored in property.settings JSON):
 *   grace_period_minutes   integer  Minutes after checkout time before fee applies (default: 30)
 *   late_checkout_fee_kobo integer  Fee in kobo (default: 0 — no charge, only notification)
 *
 * Add to crontab:
 *   30 12 * * *  ${LODGIK_CLI} lodgik:late-checkout-charge
 */
#[AsCommand(
    name: 'lodgik:late-checkout-charge',
    description: 'Post late-checkout folio charge for guests past the property grace period',
)]
final class LateCheckoutChargeCommand extends AbstractCommand
{
    public function __construct(
        EntityManagerInterface   $em,
        LoggerInterface          $logger,
        private readonly NotificationService $notificationService,
        private readonly FolioService $folioService,
    ) {
        parent::__construct($em, $logger);
    }

    protected function configure(): void
    {
        $this->addOption('dry-run',     null, InputOption::VALUE_NONE,     'Preview without posting charges');
        $this->addOption('property-id', null, InputOption::VALUE_OPTIONAL, 'Limit to one property');
    }

    protected function handle(InputInterface $input, SymfonyStyle $io): int
    {
        $dryRun     = (bool) $input->getOption('dry-run');
        $propertyId = $input->getOption('property-id');
        $now        = new \DateTimeImmutable();
        $today      = $now->format('Y-m-d');

        if ($dryRun) $io->caution('DRY-RUN — no folio charges will be posted');

        // Fetch checked-in bookings whose checkout date is today
        $qb = $this->em->createQueryBuilder()
            ->select('b')
            ->from(Booking::class, 'b')
            ->where('b.status = :status')
            ->andWhere("DATE(b.checkOut) = :today")
            ->setParameter('status', BookingStatus::CHECKED_IN)
            ->setParameter('today',  $today);

        if ($propertyId) {
            $qb->andWhere('b.propertyId = :pid')->setParameter('pid', $propertyId);
        }

        /** @var Booking[] $bookings */
        $bookings = $qb->getQuery()->getResult();

        if (empty($bookings)) {
            $io->success('No late-checkout candidates today.');
            return self::SUCCESS;
        }

        $charged = 0;
        $skipped = 0;
        $errors  = 0;

        foreach ($bookings as $booking) {
            $pid = $booking->getPropertyId();

            /** @var Property|null $property */
            $property = $this->em->find(Property::class, $pid);
            if (!$property) continue;

            $graceMins = (int) ($property->getSetting('grace_period_minutes', 30));
            $feeKobo   = (int) ($property->getSetting('late_checkout_fee_kobo', 0));

            // How many minutes past checkout time?
            $checkoutTs    = $booking->getCheckOut()->getTimestamp();
            $graceDeadline = $checkoutTs + ($graceMins * 60);
            $minutesPast   = (int) round(($now->getTimestamp() - $graceDeadline) / 60);

            if ($minutesPast <= 0) {
                // Still within grace period
                $skipped++;
                continue;
            }

            $io->text(sprintf(
                '  Booking <comment>%s</comment> | %d min past grace period | Fee: %s',
                $booking->getBookingRef(),
                $minutesPast,
                $feeKobo > 0 ? '₦' . number_format($feeKobo / 100, 2) : 'none (notification only)',
            ));

            if ($dryRun) { $skipped++; continue; }

            try {
                // Idempotency check — don't double-charge
                $existingCharge = $this->em->createQueryBuilder()
                    ->select('COUNT(fc.id)')
                    ->from(FolioCharge::class, 'fc')
                    ->where('fc.bookingId  = :bid')
                    ->andWhere('fc.chargeType = :type')
                    ->setParameter('bid',  $booking->getId())
                    ->setParameter('type', 'late_checkout_fee')
                    ->getQuery()->getSingleScalarResult();

                if ((int) $existingCharge > 0) {
                    $io->text("     ⏭ Already charged — skipping");
                    $skipped++;
                    continue;
                }

                if ($feeKobo > 0) {
                    // Resolve folio, then post the late-checkout charge
                    $folio = $this->folioService->getByBooking($booking->getId());
                    if ($folio) {
                        $this->folioService->addCharge(
                            $folio->getId(),
                            'other',
                            "Late checkout fee — {$minutesPast} min past grace period",
                            number_format($feeKobo / 100, 2, '.', ''),
                            1,
                            'SYSTEM',
                            'Auto-posted by late-checkout cron job',
                        );
                    }
                }

                // Always notify front desk regardless of fee
                $this->notificationService->create(
                    $pid,
                    'staff',
                    'all',
                    'late_checkout',
                    '⏰ Late Checkout Alert',
                    $booking->getTenantId(),
                    "Booking {$booking->getBookingRef()} is {$minutesPast} min past grace period."
                        . ($feeKobo > 0 ? " Fee of ₦" . number_format($feeKobo / 100, 2) . " posted to folio." : ''),
                    ['booking_id' => $booking->getId(), 'minutes_past' => $minutesPast, 'fee_kobo' => $feeKobo],
                );

                $charged++;

            } catch (\Throwable $e) {
                $this->logger->error("[LateCheckout] Failed for {$booking->getId()}: {$e->getMessage()}");
                $io->error("  Error: {$e->getMessage()}");
                $errors++;
            }
        }

        $io->table(
            ['Outcome', 'Count'],
            [
                ['Charges posted / notified', $charged],
                ['Skipped (in grace / already charged)', $skipped],
                ['Errors', $errors],
            ],
        );

        return $errors > 0 ? self::FAILURE : self::SUCCESS;
    }
}

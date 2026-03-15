<?php
declare(strict_types=1);
namespace Lodgik\Migrations;

use Doctrine\DBAL\Schema\Schema;
use Doctrine\Migrations\AbstractMigration;

/**
 * Fix hourly booking check_in / check_out times.
 *
 * For Short Rest and Half Day bookings that are currently checked_in,
 * the check_in and check_out columns hold the originally *booked* times
 * (whatever the staff typed in the form), not the actual arrival time.
 *
 * Correct values:
 *   check_in  = checked_in_at               (actual arrival)
 *   check_out = checked_in_at + duration_hours
 *
 * Duration per type:
 *   short_rest_1hr  → 1 hour
 *   short_rest_2hr  → 2 hours
 *   short_rest_3hr  → 3 hours
 *   short_rest_6hr  → 6 hours  (legacy)
 *   half_day        → 6 hours  (default; property setting not available in migration)
 *   full_day        → 24 hours (legacy)
 *
 * Only rows where:
 *   - booking_type IN (hourly types)
 *   - status = 'checked_in'
 *   - checked_in_at IS NOT NULL
 * are updated.
 *
 * Bookings with status checked_out are left as-is — their window is closed.
 */
final class Version20260315100001 extends AbstractMigration
{
    public function getDescription(): string
    {
        return 'Fix check_in/check_out for existing checked-in hourly bookings';
    }

    public function up(Schema $schema): void
    {
        // Update each hourly type with its correct duration
        $durations = [
            'short_rest_1hr' => 1,
            'short_rest_2hr' => 2,
            'short_rest_3hr' => 3,
            'short_rest_6hr' => 6,
            'half_day'       => 6,
            'full_day'       => 24,
        ];

        foreach ($durations as $type => $hours) {
            $this->addSql("
                UPDATE bookings
                SET
                    check_in  = checked_in_at,
                    check_out = checked_in_at + INTERVAL '{$hours} hours'
                WHERE
                    booking_type  = '{$type}'
                    AND status    = 'checked_in'
                    AND checked_in_at IS NOT NULL
            ");
        }
    }

    public function down(Schema $schema): void
    {
        // Cannot reliably reverse — the original booked times are gone.
        // This is a data-correction migration; down() is intentionally a no-op.
        $this->addSql('SELECT 1'); // no-op
    }
}

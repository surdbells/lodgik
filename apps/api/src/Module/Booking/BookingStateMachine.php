<?php

declare(strict_types=1);

namespace Lodgik\Module\Booking;

use Lodgik\Enum\BookingStatus;

/**
 * Booking status transitions:
 *   pending    → confirmed, cancelled
 *   confirmed  → checked_in, cancelled, no_show
 *   checked_in → checked_out
 *   checked_out → (terminal)
 *   cancelled  → (terminal)
 *   no_show    → (terminal)
 */
final class BookingStateMachine
{
    private const TRANSITIONS = [
        'pending'     => ['confirmed', 'cancelled'],
        'confirmed'   => ['checked_in', 'cancelled', 'no_show'],
        'checked_in'  => ['checked_out'],
        'checked_out' => [],
        'cancelled'   => [],
        'no_show'     => [],
    ];

    public function canTransition(BookingStatus $from, BookingStatus $to): bool
    {
        return in_array($to->value, self::TRANSITIONS[$from->value] ?? [], true);
    }

    /** @return BookingStatus[] */
    public function getAllowedTransitions(BookingStatus $from): array
    {
        return array_map(fn(string $s) => BookingStatus::from($s), self::TRANSITIONS[$from->value] ?? []);
    }

    public function assertTransition(BookingStatus $from, BookingStatus $to): void
    {
        if (!$this->canTransition($from, $to)) {
            $allowed = implode(', ', array_map(fn(BookingStatus $s) => $s->value, $this->getAllowedTransitions($from)));
            throw new \InvalidArgumentException(
                "Invalid booking transition: {$from->value} → {$to->value}. Allowed: {$allowed}"
            );
        }
    }
}

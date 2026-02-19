<?php

declare(strict_types=1);

namespace Lodgik\Module\Room;

use Lodgik\Enum\RoomStatus;

/**
 * State machine for room status transitions.
 *
 * Valid transitions:
 * - vacant_clean  → reserved, occupied, out_of_order, maintenance
 * - vacant_dirty  → vacant_clean, out_of_order, maintenance
 * - occupied      → vacant_dirty, out_of_order
 * - reserved      → occupied, vacant_clean (cancel reservation), out_of_order
 * - out_of_order  → vacant_dirty, maintenance
 * - maintenance   → vacant_dirty, out_of_order
 */
final class RoomStatusMachine
{
    /**
     * @var array<string, string[]>
     */
    private const TRANSITIONS = [
        'vacant_clean' => ['reserved', 'occupied', 'out_of_order', 'maintenance'],
        'vacant_dirty' => ['vacant_clean', 'out_of_order', 'maintenance'],
        'occupied' => ['vacant_dirty', 'out_of_order'],
        'reserved' => ['occupied', 'vacant_clean', 'out_of_order'],
        'out_of_order' => ['vacant_dirty', 'maintenance'],
        'maintenance' => ['vacant_dirty', 'out_of_order'],
    ];

    /**
     * Check if a transition is valid.
     */
    public function canTransition(RoomStatus $from, RoomStatus $to): bool
    {
        $allowed = self::TRANSITIONS[$from->value] ?? [];
        return in_array($to->value, $allowed, true);
    }

    /**
     * Get allowed transitions from a status.
     *
     * @return RoomStatus[]
     */
    public function getAllowedTransitions(RoomStatus $from): array
    {
        $allowed = self::TRANSITIONS[$from->value] ?? [];
        return array_map(fn(string $s) => RoomStatus::from($s), $allowed);
    }

    /**
     * Assert a transition is valid, throw if not.
     *
     * @throws \InvalidArgumentException
     */
    public function assertTransition(RoomStatus $from, RoomStatus $to): void
    {
        if (!$this->canTransition($from, $to)) {
            $allowed = implode(', ', array_map(
                fn(RoomStatus $s) => $s->value,
                $this->getAllowedTransitions($from)
            ));
            throw new \InvalidArgumentException(
                "Invalid room status transition: {$from->value} → {$to->value}. " .
                "Allowed from {$from->value}: {$allowed}"
            );
        }
    }
}

<?php

declare(strict_types=1);

namespace Lodgik\Module\Booking;

use Lodgik\Entity\RoomType;
use Lodgik\Enum\BookingType;

final class RateCalculator
{
    /**
     * Calculate booking total.
     *
     * @param int $halfDayHours   Hours for half-day bookings (from property settings, default 6)
     * @return array{rate: string, nights: int, hours: int|null, subtotal: string, discount: string, total: string}
     */
    public function calculate(
        RoomType $roomType,
        BookingType $bookingType,
        \DateTimeImmutable $checkIn,
        \DateTimeImmutable $checkOut,
        string $discountAmount = '0.00',
        int $halfDayHours = 6,
    ): array {
        if ($bookingType->isHourly()) {
            return $this->calculateHourly($roomType, $bookingType, $checkIn, $checkOut, $discountAmount, $halfDayHours);
        }

        return $this->calculateNightly($roomType, $checkIn, $checkOut, $discountAmount);
    }

    private function calculateNightly(
        RoomType $roomType,
        \DateTimeImmutable $checkIn,
        \DateTimeImmutable $checkOut,
        string $discountAmount,
    ): array {
        // Count nights: difference between calendar dates (time is irrelevant)
        $checkInDay  = new \DateTimeImmutable($checkIn->format('Y-m-d'));
        $checkOutDay = new \DateTimeImmutable($checkOut->format('Y-m-d'));
        $nights      = max(1, $checkInDay->diff($checkOutDay)->days);

        $rate     = $roomType->getBaseRate();
        $subtotal = $this->mul($rate, (string) $nights);
        $total    = $this->sub($subtotal, $discountAmount);

        return [
            'rate'     => $rate,
            'nights'   => $nights,
            'hours'    => null,
            'subtotal' => $subtotal,
            'discount' => $discountAmount,
            'total'    => $this->cmp($total, '0') >= 0 ? $total : '0.00',
        ];
    }

    private function calculateHourly(
        RoomType $roomType,
        BookingType $bookingType,
        \DateTimeImmutable $checkIn,
        \DateTimeImmutable $checkOut,
        string $discountAmount,
        int $halfDayHours,
    ): array {
        $hourlyRate = $roomType->getHourlyRate();
        if ($hourlyRate === null || (float) $hourlyRate === 0.0) {
            // Fall back: derive hourly from nightly ÷ 24
            $hourlyRate = $this->div($roomType->getBaseRate(), '24');
        }

        // Determine hours
        if ($bookingType === \Lodgik\Enum\BookingType::HALF_DAY) {
            $hours = $halfDayHours;
        } elseif ($bookingType->durationHours() !== null) {
            $hours = $bookingType->durationHours();
        } else {
            $hours = max(1, (int) ceil(($checkOut->getTimestamp() - $checkIn->getTimestamp()) / 3600));
        }

        $subtotal = $this->mul($hourlyRate, (string) $hours);
        $total    = $this->sub($subtotal, $discountAmount);

        return [
            'rate'     => $hourlyRate,
            'nights'   => 0,
            'hours'    => $hours,
            'subtotal' => $subtotal,
            'discount' => $discountAmount,
            'total'    => $this->cmp($total, '0') >= 0 ? $total : '0.00',
        ];
    }

    // ─── Pure PHP decimal math ─────────────────────────────

    private function mul(string $a, string $b): string
    {
        return number_format((float) $a * (float) $b, 2, '.', '');
    }

    private function sub(string $a, string $b): string
    {
        return number_format((float) $a - (float) $b, 2, '.', '');
    }

    private function div(string $a, string $b): string
    {
        return number_format((float) $a / max(0.001, (float) $b), 2, '.', '');
    }

    private function cmp(string $a, string $b): int
    {
        return (float) $a <=> (float) $b;
    }
}

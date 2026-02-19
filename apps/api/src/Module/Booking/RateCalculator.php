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
     * @return array{rate: string, nights: int, hours: int|null, subtotal: string, discount: string, total: string}
     */
    public function calculate(
        RoomType $roomType,
        BookingType $bookingType,
        \DateTimeImmutable $checkIn,
        \DateTimeImmutable $checkOut,
        string $discountAmount = '0.00',
    ): array {
        if ($bookingType->isHourly()) {
            return $this->calculateHourly($roomType, $bookingType, $checkIn, $checkOut, $discountAmount);
        }

        return $this->calculateNightly($roomType, $checkIn, $checkOut, $discountAmount);
    }

    private function calculateNightly(
        RoomType $roomType,
        \DateTimeImmutable $checkIn,
        \DateTimeImmutable $checkOut,
        string $discountAmount,
    ): array {
        $nights = max(1, $checkIn->diff($checkOut)->days);
        $rate = $roomType->getBaseRate();
        $subtotal = $this->mul($rate, (string) $nights);
        $total = $this->sub($subtotal, $discountAmount);

        return [
            'rate' => $rate,
            'nights' => $nights,
            'hours' => null,
            'subtotal' => $subtotal,
            'discount' => $discountAmount,
            'total' => $this->cmp($total, '0') >= 0 ? $total : '0.00',
        ];
    }

    private function calculateHourly(
        RoomType $roomType,
        BookingType $bookingType,
        \DateTimeImmutable $checkIn,
        \DateTimeImmutable $checkOut,
        string $discountAmount,
    ): array {
        $hourlyRate = $roomType->getHourlyRate();
        if ($hourlyRate === null || $hourlyRate === '0.00') {
            $hourlyRate = $this->div($roomType->getBaseRate(), '24');
        }

        $hours = $bookingType->durationHours() ?? (int) ceil(($checkOut->getTimestamp() - $checkIn->getTimestamp()) / 3600);
        $hours = max(1, $hours);

        $subtotal = $this->mul($hourlyRate, (string) $hours);
        $total = $this->sub($subtotal, $discountAmount);

        return [
            'rate' => $hourlyRate,
            'nights' => 0,
            'hours' => $hours,
            'subtotal' => $subtotal,
            'discount' => $discountAmount,
            'total' => $this->cmp($total, '0') >= 0 ? $total : '0.00',
        ];
    }

    // ─── Pure PHP decimal math (no bcmath dependency) ─────

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
        return number_format((float) $a / (float) $b, 2, '.', '');
    }

    private function cmp(string $a, string $b): int
    {
        $fa = (float) $a;
        $fb = (float) $b;
        return $fa <=> $fb;
    }
}

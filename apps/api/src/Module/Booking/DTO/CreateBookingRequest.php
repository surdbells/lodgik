<?php

declare(strict_types=1);

namespace Lodgik\Module\Booking\DTO;

use Lodgik\Enum\BookingType;

final class CreateBookingRequest
{
    public function __construct(
        public readonly string $propertyId,
        public readonly string $guestId,
        public readonly string $bookingType,
        public readonly string $checkIn,
        public readonly string $checkOut,
        public readonly ?string $roomId = null,
        public readonly int $adults = 1,
        public readonly int $children = 0,
        public readonly string $discountAmount = '0.00',
        public readonly ?string $notes = null,
        public readonly ?string $source = null,
        public readonly ?string $specialRequests = null,
        public readonly array $addons = [],
    ) {}

    public function validate(): array
    {
        $errors = [];

        if (trim($this->propertyId) === '') {
            $errors['property_id'] = 'Property ID is required';
        }
        if (trim($this->guestId) === '') {
            $errors['guest_id'] = 'Guest ID is required';
        }
        if (!in_array($this->bookingType, BookingType::values(), true)) {
            $errors['booking_type'] = 'Invalid booking type. Valid: ' . implode(', ', BookingType::values());
        }
        if (trim($this->checkIn) === '') {
            $errors['check_in'] = 'Check-in date/time is required';
        } elseif ($this->parseDate($this->checkIn) === null) {
            $errors['check_in'] = 'Invalid check-in format. Use YYYY-MM-DD or YYYY-MM-DD HH:MM';
        }
        if (trim($this->checkOut) === '') {
            $errors['check_out'] = 'Check-out date/time is required';
        } elseif ($this->parseDate($this->checkOut) === null) {
            $errors['check_out'] = 'Invalid check-out format. Use YYYY-MM-DD or YYYY-MM-DD HH:MM';
        }
        if (empty($errors['check_in']) && empty($errors['check_out'])) {
            $ci = $this->parseDate($this->checkIn);
            $co = $this->parseDate($this->checkOut);
            if ($ci && $co && $co <= $ci) {
                $errors['check_out'] = 'Check-out must be after check-in';
            }
        }
        if ($this->adults < 1) {
            $errors['adults'] = 'At least 1 adult is required';
        }
        if (!is_numeric($this->discountAmount) || (float) $this->discountAmount < 0) {
            $errors['discount_amount'] = 'Discount must be a positive number';
        }
        foreach ($this->addons as $i => $addon) {
            if (empty($addon['name'])) {
                $errors["addons.{$i}.name"] = 'Addon name is required';
            }
            if (!isset($addon['amount']) || !is_numeric($addon['amount']) || (float) $addon['amount'] <= 0) {
                $errors["addons.{$i}.amount"] = 'Addon amount must be a positive number';
            }
        }

        return $errors;
    }

    public function parseDate(string $value): ?\DateTimeImmutable
    {
        $v = trim($value);
        $v = preg_replace('/T/', ' ', $v);                   // ISO T → space
        $v = preg_replace('/\.\d+Z?$/', '', $v);           // strip ms
        $v = preg_replace('/[+-]\d{2}:\d{2}$/', '', $v);  // strip tz
        $v = rtrim($v, 'Z');
        return \DateTimeImmutable::createFromFormat('Y-m-d H:i:s', $v)
            ?: \DateTimeImmutable::createFromFormat('Y-m-d H:i', $v)
            ?: \DateTimeImmutable::createFromFormat('Y-m-d', $v)
            ?: null;
    }

    public static function fromArray(array $data): self
    {
        return new self(
            propertyId: $data['property_id'] ?? '',
            guestId: $data['guest_id'] ?? '',
            bookingType: $data['booking_type'] ?? '',
            checkIn: $data['check_in'] ?? '',
            checkOut: $data['check_out'] ?? '',
            roomId: $data['room_id'] ?? null,
            adults: (int) ($data['adults'] ?? 1),
            children: (int) ($data['children'] ?? 0),
            discountAmount: (string) ($data['discount_amount'] ?? '0.00'),
            notes: $data['notes'] ?? null,
            source: $data['source'] ?? null,
            specialRequests: $data['special_requests'] ?? null,
            addons: $data['addons'] ?? [],
        );
    }
}

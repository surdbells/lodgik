<?php

declare(strict_types=1);

namespace Lodgik\Repository;

use Lodgik\Entity\BookingAddon;

/** @extends BaseRepository<BookingAddon> */
final class BookingAddonRepository extends BaseRepository
{
    protected function getEntityClass(): string
    {
        return BookingAddon::class;
    }

    /** @return BookingAddon[] */
    public function findByBooking(string $bookingId): array
    {
        return $this->findBy(['bookingId' => $bookingId]);
    }
}

<?php

declare(strict_types=1);

namespace Lodgik\Module\Guest;

use Doctrine\ORM\EntityManagerInterface;
use Lodgik\Entity\Guest;
use Lodgik\Entity\GuestDocument;
use Lodgik\Module\Guest\DTO\CreateGuestRequest;
use Lodgik\Module\Guest\DTO\UpdateGuestRequest;
use Lodgik\Repository\GuestDocumentRepository;
use Lodgik\Repository\GuestRepository;
use Psr\Log\LoggerInterface;

final class GuestService
{
    public function __construct(
        private readonly EntityManagerInterface $em,
        private readonly GuestRepository $guestRepo,
        private readonly GuestDocumentRepository $docRepo,
        private readonly LoggerInterface $logger,
    ) {}

    // ═══ CRUD ══════════════════════════════════════════════════

    /** @return array{items: Guest[], total: int} */
    public function list(
        ?string $search = null,
        ?string $vipStatus = null,
        ?string $nationality = null,
        int $page = 1,
        int $limit = 20,
    ): array {
        return $this->guestRepo->listGuests($search, $vipStatus, $nationality, $page, $limit);
    }

    public function getById(string $id): ?Guest
    {
        $guest = $this->guestRepo->find($id);
        if ($guest !== null && $guest->isDeleted()) {
            return null;
        }
        return $guest;
    }

    public function create(CreateGuestRequest $dto, string $tenantId): Guest
    {
        $guest = new Guest($dto->firstName, $dto->lastName, $tenantId);
        $guest->setEmail($dto->email);
        $guest->setPhone($dto->phone);
        $guest->setNationality($dto->nationality);
        $guest->setIdType($dto->idType);
        $guest->setIdNumber($dto->idNumber);
        $guest->setGender($dto->gender);
        $guest->setAddress($dto->address);
        $guest->setCity($dto->city);
        $guest->setState($dto->state);
        $guest->setCountry($dto->country);
        $guest->setVipStatus($dto->vipStatus);
        $guest->setNotes($dto->notes);
        $guest->setCompanyName($dto->companyName);
        $guest->setPreferences($dto->preferences);

        if ($dto->dateOfBirth !== null) {
            $guest->setDateOfBirth(\DateTimeImmutable::createFromFormat('Y-m-d', $dto->dateOfBirth) ?: null);
        }

        $this->guestRepo->save($guest);
        $this->logger->info("Guest created: {$guest->getFullName()}");
        return $guest;
    }

    public function update(string $id, UpdateGuestRequest $dto): Guest
    {
        $guest = $this->guestRepo->findOrFail($id);

        if ($dto->firstName !== null) $guest->setFirstName($dto->firstName);
        if ($dto->lastName !== null) $guest->setLastName($dto->lastName);
        if ($dto->email !== null) $guest->setEmail($dto->email);
        if ($dto->phone !== null) $guest->setPhone($dto->phone);
        if ($dto->nationality !== null) $guest->setNationality($dto->nationality);
        if ($dto->idType !== null) $guest->setIdType($dto->idType);
        if ($dto->idNumber !== null) $guest->setIdNumber($dto->idNumber);
        if ($dto->gender !== null) $guest->setGender($dto->gender);
        if ($dto->address !== null) $guest->setAddress($dto->address);
        if ($dto->city !== null) $guest->setCity($dto->city);
        if ($dto->state !== null) $guest->setState($dto->state);
        if ($dto->country !== null) $guest->setCountry($dto->country);
        if ($dto->vipStatus !== null) $guest->setVipStatus($dto->vipStatus);
        if ($dto->notes !== null) $guest->setNotes($dto->notes);
        if ($dto->companyName !== null) $guest->setCompanyName($dto->companyName);
        if ($dto->preferences !== null) $guest->setPreferences($dto->preferences);

        if ($dto->dateOfBirth !== null) {
            if ($dto->dateOfBirth === '') {
                $guest->setDateOfBirth(null);
            } else {
                $guest->setDateOfBirth(\DateTimeImmutable::createFromFormat('Y-m-d', $dto->dateOfBirth) ?: null);
            }
        }

        $this->guestRepo->flush();
        return $guest;
    }

    public function delete(string $id): void
    {
        $guest = $this->guestRepo->findOrFail($id);
        $guest->softDelete();
        $this->guestRepo->flush();
    }

    // ═══ Search ════════════════════════════════════════════════

    /** @return Guest[] */
    public function search(string $query, int $limit = 10): array
    {
        if (trim($query) === '') {
            return [];
        }
        return $this->guestRepo->search($query, $limit);
    }

    /** @return string[] */
    public function getNationalities(): array
    {
        return $this->guestRepo->getDistinctNationalities();
    }

    // ═══ Guest Merge ═══════════════════════════════════════════

    /**
     * Merge duplicate guest records. Keeps $primaryId, merges stats from $duplicateId, then soft-deletes duplicate.
     */
    public function merge(string $primaryId, string $duplicateId): Guest
    {
        if ($primaryId === $duplicateId) {
            throw new \InvalidArgumentException('Cannot merge a guest with itself');
        }

        $primary = $this->guestRepo->findOrFail($primaryId);
        $duplicate = $this->guestRepo->findOrFail($duplicateId);

        // Merge stats
        $primary->setTotalStays($primary->getTotalStays() + $duplicate->getTotalStays());
        $primary->addSpent($duplicate->getTotalSpent());

        // Keep later visit date
        if ($duplicate->getLastVisitAt() !== null) {
            if ($primary->getLastVisitAt() === null || $duplicate->getLastVisitAt() > $primary->getLastVisitAt()) {
                $primary->setLastVisitAt($duplicate->getLastVisitAt());
            }
        }

        // Fill empty fields from duplicate
        if ($primary->getEmail() === null && $duplicate->getEmail() !== null) {
            $primary->setEmail($duplicate->getEmail());
        }
        if ($primary->getPhone() === null && $duplicate->getPhone() !== null) {
            $primary->setPhone($duplicate->getPhone());
        }
        if ($primary->getIdNumber() === null && $duplicate->getIdNumber() !== null) {
            $primary->setIdType($duplicate->getIdType());
            $primary->setIdNumber($duplicate->getIdNumber());
        }
        if ($primary->getAddress() === null && $duplicate->getAddress() !== null) {
            $primary->setAddress($duplicate->getAddress());
            $primary->setCity($duplicate->getCity());
            $primary->setState($duplicate->getState());
        }
        if ($primary->getCompanyName() === null && $duplicate->getCompanyName() !== null) {
            $primary->setCompanyName($duplicate->getCompanyName());
        }

        // Upgrade VIP if duplicate is higher
        $vipOrder = ['regular' => 0, 'silver' => 1, 'gold' => 2, 'platinum' => 3, 'vvip' => 4];
        if (($vipOrder[$duplicate->getVipStatus()] ?? 0) > ($vipOrder[$primary->getVipStatus()] ?? 0)) {
            $primary->setVipStatus($duplicate->getVipStatus());
        }

        // Soft-delete duplicate
        $duplicate->softDelete();

        $this->em->flush();
        $this->logger->info("Merged guest {$duplicate->getFullName()} into {$primary->getFullName()}");

        return $primary;
    }

    // ═══ Documents ═════════════════════════════════════════════

    /** @return GuestDocument[] */
    public function getDocuments(string $guestId): array
    {
        return $this->docRepo->findByGuest($guestId);
    }

    // ═══ Guest Intelligence (Lifetime Analytics) ═══════════════

    /**
     * Lifetime analytics for a single guest across all their stays.
     * Returns booking history, spend totals, preferences, loyalty info.
     */
    public function getIntelligence(string $guestId): array
    {
        $guest = $this->getById($guestId);
        if (!$guest) throw new \RuntimeException('Guest not found', 404);

        $conn = $this->em->getConnection();

        // ── Booking history ───────────────────────────────────────
        $bookings = $conn->fetchAllAssociative(
            "SELECT b.id, b.booking_type, b.status, b.check_in, b.check_out,
                    b.total_amount, b.source, r.room_number, rt.name AS room_type_name,
                    b.created_at
             FROM bookings b
             LEFT JOIN rooms r ON r.id = b.room_id
             LEFT JOIN room_types rt ON rt.id = r.room_type_id
             WHERE b.guest_id = :gid AND b.status NOT IN ('cancelled')
             ORDER BY b.check_in DESC
             LIMIT 20",
            ['gid' => $guestId]
        );

        // ── Spend stats ───────────────────────────────────────────
        $spendRow = $conn->fetchAssociative(
            "SELECT COUNT(DISTINCT b.id)                              AS total_stays,
                    COALESCE(SUM(fc.amount), 0)                       AS total_charges,
                    COALESCE(SUM(fp.amount), 0)                       AS total_paid,
                    MIN(b.check_in)                                   AS first_stay,
                    MAX(b.check_in)                                   AS last_stay
             FROM bookings b
             LEFT JOIN folios f  ON f.booking_id = b.id
             LEFT JOIN folio_charges fc ON fc.folio_id = f.id AND fc.is_void = FALSE
             LEFT JOIN folio_payments fp ON fp.folio_id = f.id
             WHERE b.guest_id = :gid AND b.status NOT IN ('cancelled')",
            ['gid' => $guestId]
        );

        // ── Favourite room type ───────────────────────────────────
        $favRoomRow = $conn->fetchAssociative(
            "SELECT rt.name, COUNT(*) AS cnt
             FROM bookings b
             JOIN rooms r ON r.id = b.room_id
             JOIN room_types rt ON rt.id = r.room_type_id
             WHERE b.guest_id = :gid AND b.status NOT IN ('cancelled')
             GROUP BY rt.name ORDER BY cnt DESC LIMIT 1",
            ['gid' => $guestId]
        );

        // ── Preferred booking source ──────────────────────────────
        $favSourceRow = $conn->fetchAssociative(
            "SELECT source, COUNT(*) AS cnt
             FROM bookings
             WHERE guest_id = :gid AND status NOT IN ('cancelled') AND source IS NOT NULL
             GROUP BY source ORDER BY cnt DESC LIMIT 1",
            ['gid' => $guestId]
        );

        // ── Upcoming bookings ─────────────────────────────────────
        $upcoming = $conn->fetchAllAssociative(
            "SELECT b.id, b.status, b.check_in, b.check_out, b.total_amount,
                    r.room_number, rt.name AS room_type_name
             FROM bookings b
             LEFT JOIN rooms r ON r.id = b.room_id
             LEFT JOIN room_types rt ON rt.id = r.room_type_id
             WHERE b.guest_id = :gid AND b.check_in >= CURRENT_DATE
               AND b.status IN ('confirmed', 'checked_in')
             ORDER BY b.check_in ASC LIMIT 5",
            ['gid' => $guestId]
        );

        // ── Loyalty points ────────────────────────────────────────
        $loyaltyRow = $conn->fetchAssociative(
            "SELECT COALESCE(SUM(lp.points_earned), 0) - COALESCE(SUM(lp.points_redeemed), 0) AS balance,
                    COALESCE(SUM(lp.points_earned), 0) AS total_earned
             FROM loyalty_points lp WHERE lp.guest_id = :gid",
            ['gid' => $guestId]
        ) ?: ['balance' => 0, 'total_earned' => 0];

        $totalStays   = (int)   ($spendRow['total_stays']   ?? 0);
        $totalCharges = (float) ($spendRow['total_charges'] ?? 0);
        $totalPaid    = (float) ($spendRow['total_paid']    ?? 0);
        $avgSpend     = $totalStays > 0 ? round($totalCharges / $totalStays, 2) : 0;

        return [
            'guest'               => $guest->toArray(),
            'total_stays'         => $totalStays,
            'total_charges_ngn'   => round($totalCharges, 2),
            'total_paid_ngn'      => round($totalPaid, 2),
            'outstanding_ngn'     => round(max(0, $totalCharges - $totalPaid), 2),
            'avg_spend_per_stay'  => $avgSpend,
            'first_stay_date'     => $spendRow['first_stay'] ?? null,
            'last_stay_date'      => $spendRow['last_stay']  ?? null,
            'favourite_room_type' => $favRoomRow ? $favRoomRow['name'] : null,
            'preferred_source'    => $favSourceRow ? $favSourceRow['source'] : null,
            'loyalty_balance'     => (int) ($loyaltyRow['balance']      ?? 0),
            'loyalty_earned'      => (int) ($loyaltyRow['total_earned'] ?? 0),
            'upcoming_bookings'   => $upcoming,
            'recent_bookings'     => $bookings,
        ];
    }
}

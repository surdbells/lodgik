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
}

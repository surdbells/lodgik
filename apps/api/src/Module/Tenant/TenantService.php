<?php

declare(strict_types=1);

namespace Lodgik\Module\Tenant;

use Doctrine\ORM\EntityManagerInterface;
use Lodgik\Entity\Property;
use Lodgik\Entity\PropertyBankAccount;
use Lodgik\Entity\Tenant;
use Lodgik\Module\Tenant\DTO\CreatePropertyRequest;
use Lodgik\Module\Tenant\DTO\SaveBankAccountRequest;
use Lodgik\Module\Tenant\DTO\UpdatePropertyRequest;
use Lodgik\Module\Tenant\DTO\UpdateTenantRequest;
use Lodgik\Repository\PropertyRepository;
use Lodgik\Repository\TenantRepository;

final class TenantService
{
    public function __construct(
        private readonly EntityManagerInterface $em,
        private readonly TenantRepository $tenantRepo,
        private readonly PropertyRepository $propertyRepo,
    ) {}

    // ─── Tenant Settings ───────────────────────────────────────

    public function getTenant(string $tenantId): ?Tenant
    {
        return $this->tenantRepo->find($tenantId);
    }

    public function updateTenant(string $tenantId, UpdateTenantRequest $dto): Tenant
    {
        $tenant = $this->tenantRepo->find($tenantId);
        if ($tenant === null) {
            throw new \RuntimeException('Tenant not found');
        }

        if ($dto->name !== null) $tenant->setName($dto->name);
        if ($dto->email !== null) $tenant->setEmail($dto->email);
        if ($dto->phone !== null) $tenant->setPhone($dto->phone);
        if ($dto->primaryColor !== null) $tenant->setPrimaryColor($dto->primaryColor);
        if ($dto->secondaryColor !== null) $tenant->setSecondaryColor($dto->secondaryColor);
        if ($dto->logoUrl !== null) $tenant->setLogoUrl($dto->logoUrl);
        if ($dto->locale !== null) $tenant->setLocale($dto->locale);
        if ($dto->timezone !== null) $tenant->setTimezone($dto->timezone);
        if ($dto->currency !== null) $tenant->setCurrency($dto->currency);

        $this->em->flush();

        return $tenant;
    }

    // ─── Properties ────────────────────────────────────────────

    /**
     * @return Property[]
     */
    public function listProperties(): array
    {
        return $this->propertyRepo->findActive();
    }


    /** Persist settings changes on an already-loaded property entity. */
    public function flushProperty(Property $property): void
    {
        $this->em->flush();
    }
    public function getProperty(string $id): ?Property
    {
        return $this->propertyRepo->find($id);
    }

    public function createProperty(CreatePropertyRequest $dto, string $tenantId): Property
    {
        // Check property limit
        $tenant = $this->tenantRepo->find($tenantId);
        if ($tenant === null) {
            throw new \RuntimeException('Tenant not found');
        }

        $currentCount = $this->propertyRepo->countActive();
        if ($currentCount >= $tenant->getMaxProperties()) {
            throw new \RuntimeException(
                "Property limit reached ({$tenant->getMaxProperties()}). Please upgrade your plan."
            );
        }

        $property = new Property($dto->name, $tenantId);

        if ($dto->email !== null) $property->setEmail($dto->email);
        if ($dto->phone !== null) $property->setPhone($dto->phone);
        if ($dto->address !== null) $property->setAddress($dto->address);
        if ($dto->city !== null) $property->setCity($dto->city);
        if ($dto->state !== null) $property->setState($dto->state);
        if ($dto->country !== null) $property->setCountry($dto->country);
        if ($dto->starRating !== null) $property->setStarRating($dto->starRating);
        if ($dto->checkInTime !== null) $property->setCheckInTime($dto->checkInTime);
        if ($dto->checkOutTime !== null) $property->setCheckOutTime($dto->checkOutTime);
        if ($dto->timezone !== null) $property->setTimezone($dto->timezone);
        if ($dto->currency !== null) $property->setCurrency($dto->currency);

        // Generate slug
        $slug = strtolower(trim(preg_replace('/[^a-z0-9]+/', '-', strtolower($dto->name)), '-'));
        $property->setSlug($slug);

        $this->em->persist($property);
        $this->em->flush();

        return $property;
    }

    public function updateProperty(string $id, UpdatePropertyRequest $dto): Property
    {
        $property = $this->propertyRepo->find($id);
        if ($property === null) {
            throw new \RuntimeException('Property not found');
        }

        if ($dto->name !== null) $property->setName($dto->name);
        if ($dto->email !== null) $property->setEmail($dto->email);
        if ($dto->phone !== null) $property->setPhone($dto->phone);
        if ($dto->address !== null) $property->setAddress($dto->address);
        if ($dto->city !== null) $property->setCity($dto->city);
        if ($dto->state !== null) $property->setState($dto->state);
        if ($dto->country !== null) $property->setCountry($dto->country);
        if ($dto->starRating !== null) $property->setStarRating($dto->starRating);
        if ($dto->checkInTime !== null) $property->setCheckInTime($dto->checkInTime);
        if ($dto->checkOutTime !== null) $property->setCheckOutTime($dto->checkOutTime);
        if ($dto->timezone !== null) $property->setTimezone($dto->timezone);
        if ($dto->currency !== null) $property->setCurrency($dto->currency);
        if ($dto->logoUrl !== null) $property->setLogoUrl($dto->logoUrl);
        if ($dto->coverImageUrl !== null) $property->setCoverImageUrl($dto->coverImageUrl);
        if ($dto->isActive !== null) $property->setIsActive($dto->isActive);

        $this->em->flush();

        return $property;
    }

    public function deleteProperty(string $id): void
    {
        $property = $this->propertyRepo->find($id);
        if ($property === null) {
            throw new \RuntimeException('Property not found');
        }

        $property->softDelete();
        $this->em->flush();
    }

    // ─── Bank Accounts ─────────────────────────────────────────

    /**
     * @return PropertyBankAccount[]
     */
    public function listBankAccounts(string $propertyId): array
    {
        return $this->em->getRepository(PropertyBankAccount::class)
            ->findBy(['propertyId' => $propertyId, 'isActive' => true], ['isPrimary' => 'DESC']);
    }

    public function saveBankAccount(
        string $propertyId,
        SaveBankAccountRequest $dto,
        string $tenantId,
        ?string $accountId = null,
    ): PropertyBankAccount {
        // Verify property exists
        $property = $this->propertyRepo->find($propertyId);
        if ($property === null) {
            throw new \RuntimeException('Property not found');
        }

        if ($accountId !== null) {
            // Update existing
            $account = $this->em->find(PropertyBankAccount::class, $accountId);
            if ($account === null) {
                throw new \RuntimeException('Bank account not found');
            }
            $account->setBankName($dto->bankName);
            $account->setAccountNumber($dto->accountNumber);
            $account->setAccountName($dto->accountName);
            $account->setBankCode($dto->bankCode);
        } else {
            // Create new
            $account = new PropertyBankAccount(
                propertyId: $propertyId,
                bankName: $dto->bankName,
                accountNumber: $dto->accountNumber,
                accountName: $dto->accountName,
                tenantId: $tenantId,
            );
            $account->setBankCode($dto->bankCode);
            $this->em->persist($account);
        }

        // Handle primary flag
        if ($dto->isPrimary) {
            $this->clearPrimaryFlags($propertyId);
            $account->setIsPrimary(true);
        }

        $this->em->flush();

        return $account;
    }

    public function deleteBankAccount(string $accountId): void
    {
        $account = $this->em->find(PropertyBankAccount::class, $accountId);
        if ($account === null) {
            throw new \RuntimeException('Bank account not found');
        }

        $account->setIsActive(false);
        $this->em->flush();
    }

    public function setPrimaryBankAccount(string $propertyId, string $accountId): void
    {
        $account = $this->em->find(PropertyBankAccount::class, $accountId);
        if ($account === null || $account->getPropertyId() !== $propertyId) {
            throw new \RuntimeException('Bank account not found');
        }

        $this->clearPrimaryFlags($propertyId);
        $account->setIsPrimary(true);
        $this->em->flush();
    }

    private function clearPrimaryFlags(string $propertyId): void
    {
        $this->em->createQueryBuilder()
            ->update(PropertyBankAccount::class, 'ba')
            ->set('ba.isPrimary', ':false')
            ->where('ba.propertyId = :propertyId')
            ->setParameter('false', false)
            ->setParameter('propertyId', $propertyId)
            ->getQuery()
            ->execute();
    }
}

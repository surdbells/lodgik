<?php
declare(strict_types=1);

namespace Lodgik\Repository;

use Doctrine\ORM\EntityManagerInterface;
use Lodgik\Entity\PropertyBankAccount;

final class PropertyBankAccountRepository extends BaseRepository
{
    public function __construct(EntityManagerInterface $em)
    {
        parent::__construct($em, PropertyBankAccount::class);
    }

    /** @return PropertyBankAccount[] */
    public function findByProperty(string $propertyId): array
    {
        return $this->em->getRepository(PropertyBankAccount::class)
            ->findBy(['propertyId' => $propertyId], ['isPrimary' => 'DESC']);
    }

    /** @return PropertyBankAccount[] */
    public function findActiveByProperty(string $propertyId): array
    {
        return $this->em->getRepository(PropertyBankAccount::class)
            ->findBy(['propertyId' => $propertyId, 'isActive' => true], ['isPrimary' => 'DESC']);
    }

    public function findPrimary(string $propertyId): ?PropertyBankAccount
    {
        return $this->em->getRepository(PropertyBankAccount::class)
            ->findOneBy(['propertyId' => $propertyId, 'isPrimary' => true, 'isActive' => true]);
    }
}

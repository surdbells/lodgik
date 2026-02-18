<?php

declare(strict_types=1);

namespace Lodgik\Repository;

use Lodgik\Entity\User;

/**
 * @extends BaseRepository<User>
 */
final class UserRepository extends BaseRepository
{
    protected function getEntityClass(): string
    {
        return User::class;
    }

    public function findByEmail(string $email): ?User
    {
        return $this->findOneBy(['email' => strtolower(trim($email))]);
    }

    public function findByInvitationToken(string $token): ?User
    {
        return $this->findOneBy(['invitationToken' => $token]);
    }

    public function findByPasswordResetToken(string $token): ?User
    {
        return $this->findOneBy(['passwordResetToken' => $token]);
    }

    /**
     * Find all active users for a property.
     *
     * @return User[]
     */
    public function findByProperty(string $propertyId): array
    {
        return $this->findBy([
            'propertyId' => $propertyId,
            'isActive' => true,
        ]);
    }

    /**
     * Count active staff (for limit enforcement).
     */
    public function countActiveStaff(): int
    {
        return $this->count(['isActive' => true]);
    }
}

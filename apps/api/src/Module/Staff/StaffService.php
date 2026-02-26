<?php

declare(strict_types=1);

namespace Lodgik\Module\Staff;

use Doctrine\ORM\EntityManagerInterface;
use Lodgik\Entity\Tenant;
use Lodgik\Entity\User;
use Lodgik\Enum\UserRole;
use Lodgik\Module\Staff\DTO\InviteStaffRequest;
use Lodgik\Module\Staff\DTO\UpdateStaffRequest;
use Lodgik\Repository\TenantRepository;
use Lodgik\Repository\UserRepository;
use Lodgik\Service\AuditService;
use Lodgik\Service\ZeptoMailService;
use Psr\Log\LoggerInterface;

final class StaffService
{
    public function __construct(
        private readonly EntityManagerInterface $em,
        private readonly UserRepository $userRepo,
        private readonly TenantRepository $tenantRepo,
        private readonly ZeptoMailService $mail,
        private readonly AuditService $audit,
        private readonly LoggerInterface $logger,
        private readonly string $appUrl,
    ) {}

    /**
     * List all staff members for the current tenant.
     *
     * @return array{items: User[], total: int}
     */
    public function list(
        ?string $propertyId = null,
        ?string $search = null,
        ?string $role = null,
        ?bool $activeOnly = null,
        int $page = 1,
        int $limit = 20,
    ): array {
        $qb = $this->em->createQueryBuilder()
            ->select('u')
            ->from(User::class, 'u')
            ->orderBy('u.firstName', 'ASC')
            ->addOrderBy('u.lastName', 'ASC');

        if ($propertyId !== null) {
            $qb->andWhere('u.propertyId = :propertyId')
                ->setParameter('propertyId', $propertyId);
        }

        if ($search !== null && trim($search) !== '') {
            $qb->andWhere('(LOWER(u.firstName) LIKE :search OR LOWER(u.lastName) LIKE :search OR LOWER(u.email) LIKE :search)')
                ->setParameter('search', '%' . strtolower(trim($search)) . '%');
        }

        if ($role !== null) {
            $qb->andWhere('u.role = :role')
                ->setParameter('role', $role);
        }

        if ($activeOnly !== null) {
            $qb->andWhere('u.isActive = :active')
                ->setParameter('active', $activeOnly);
        }

        // Count total
        $countQb = clone $qb;
        $countQb->select('COUNT(u.id)')
            ->resetDQLPart('orderBy');
        $total = (int) $countQb->getQuery()->getSingleScalarResult();

        // Paginate
        $offset = ($page - 1) * $limit;
        $qb->setFirstResult($offset)->setMaxResults($limit);

        $items = $qb->getQuery()->getResult();

        return ['items' => $items, 'total' => $total];
    }

    /**
     * Get a single staff member by ID.
     */
    public function getById(string $id): ?User
    {
        return $this->userRepo->find($id);
    }

    /**
     * Invite a new staff member.
     */
    public function invite(
        InviteStaffRequest $dto,
        string $tenantId,
        string $inviterUserId,
        string $inviterName,
    ): User {
        // Check email uniqueness within tenant
        $existing = $this->userRepo->findByEmail($dto->email);
        if ($existing !== null) {
            throw new \RuntimeException('A staff member with this email already exists.');
        }

        // Check staff limit
        $tenant = $this->tenantRepo->find($tenantId);
        if ($tenant === null) {
            throw new \RuntimeException('Tenant not found');
        }

        $currentCount = $this->userRepo->countActiveStaff();
        if ($currentCount >= $tenant->getMaxStaff()) {
            throw new \RuntimeException(
                "Staff limit reached ({$tenant->getMaxStaff()}). Please upgrade your plan to add more staff."
            );
        }

        // Create user with temporary password hash (will be set on invite acceptance)
        $tempHash = password_hash(bin2hex(random_bytes(16)), PASSWORD_ARGON2ID);
        $role = UserRole::from($dto->role);

        $user = new User(
            firstName: $dto->firstName,
            lastName: $dto->lastName,
            email: $dto->email,
            passwordHash: $tempHash,
            role: $role,
            tenantId: $tenantId,
        );

        $user->setPhone($dto->phone);
        $user->setPropertyId($dto->propertyId);
        $user->setIsActive(false); // Inactive until invitation accepted

        // Generate invitation token
        $inviteToken = bin2hex(random_bytes(32));
        $user->setInvitationToken($inviteToken);

        $this->em->persist($user);
        $this->em->flush();

        // Audit
        $this->audit->logDeferred(
            action: 'invite_staff',
            entityType: 'User',
            entityId: $user->getId(),
            tenantId: $tenantId,
            userId: $inviterUserId,
            description: "Invited {$user->getFullName()} ({$role->label()}) by {$inviterName}",
        );
        $this->em->flush();

        // Send invitation email
        try {
            $this->mail->sendStaffInvitation(
                toEmail: $user->getEmail(),
                toName: $user->getFirstName(),
                inviterName: $inviterName,
                tenantName: $tenant->getName(),
                role: $role->label(),
                inviteToken: $inviteToken,
                appUrl: $this->appUrl,
            );
        } catch (\Throwable $e) {
            $this->logger->warning('Failed to send invitation email', [
                'user_id' => $user->getId(),
                'error' => $e->getMessage(),
            ]);
        }

        return $user;
    }

    /**
     * Update a staff member.
     */
    public function update(string $userId, UpdateStaffRequest $dto, string $actorId): User
    {
        $user = $this->userRepo->find($userId);
        if ($user === null) {
            throw new \RuntimeException('Staff member not found');
        }

        // Prevent self-demotion from admin
        if ($userId === $actorId && $dto->role !== null) {
            $currentRole = $user->getRole();
            $newRole = UserRole::from($dto->role);
            if ($currentRole === UserRole::PROPERTY_ADMIN && $newRole !== UserRole::PROPERTY_ADMIN) {
                throw new \RuntimeException('You cannot change your own admin role');
            }
        }

        // Prevent self-deactivation
        if ($userId === $actorId && $dto->isActive === false) {
            throw new \RuntimeException('You cannot deactivate your own account');
        }

        if ($dto->firstName !== null) {
            $user->setFirstName($dto->firstName);
        }
        if ($dto->lastName !== null) {
            $user->setLastName($dto->lastName);
        }
        if ($dto->role !== null) {
            $user->setRole(UserRole::from($dto->role));
        }
        if ($dto->phone !== null) {
            $user->setPhone($dto->phone);
        }
        if ($dto->propertyId !== null) {
            $user->setPropertyId($dto->propertyId);
        }
        if ($dto->isActive !== null) {
            $user->setIsActive($dto->isActive);
        }
        if ($dto->password !== null && $dto->password !== '') {
            $user->setPasswordHash(password_hash($dto->password, PASSWORD_ARGON2ID));
        }
        if ($dto->email !== null && $dto->email !== '') {
            // Check email uniqueness
            $existing = $this->userRepo->findByEmail($dto->email);
            if ($existing !== null && $existing->getId() !== $userId) {
                throw new \RuntimeException('Email already in use by another staff member');
            }
            $user->setEmail($dto->email);
        }

        $this->em->flush();

        return $user;
    }

    /**
     * Soft-delete a staff member.
     */
    public function delete(string $userId, string $actorId, string $tenantId): void
    {
        if ($userId === $actorId) {
            throw new \RuntimeException('You cannot delete your own account');
        }

        $user = $this->userRepo->find($userId);
        if ($user === null) {
            throw new \RuntimeException('Staff member not found');
        }

        $user->softDelete();
        $this->em->flush();

        $this->audit->logDeferred(
            action: 'delete_staff',
            entityType: 'User',
            entityId: $userId,
            tenantId: $tenantId,
            userId: $actorId,
            description: "Deleted staff {$user->getFullName()}",
        );
        $this->em->flush();
    }

    /**
     * Resend invitation email.
     */
    public function resendInvitation(string $userId, string $tenantId, string $inviterName): void
    {
        $user = $this->userRepo->find($userId);
        if ($user === null) {
            throw new \RuntimeException('Staff member not found');
        }

        if ($user->getInvitationToken() === null) {
            throw new \RuntimeException('This staff member has already accepted their invitation');
        }

        $tenant = $this->tenantRepo->find($tenantId);
        if ($tenant === null) {
            throw new \RuntimeException('Tenant not found');
        }

        // Generate new token
        $inviteToken = bin2hex(random_bytes(32));
        $user->setInvitationToken($inviteToken);
        $this->em->flush();

        try {
            $this->mail->sendStaffInvitation(
                toEmail: $user->getEmail(),
                toName: $user->getFirstName(),
                inviterName: $inviterName,
                tenantName: $tenant->getName(),
                role: $user->getRole()->label(),
                inviteToken: $inviteToken,
                appUrl: $this->appUrl,
            );
        } catch (\Throwable $e) {
            $this->logger->warning('Failed to resend invitation email', [
                'user_id' => $user->getId(),
                'error' => $e->getMessage(),
            ]);
        }
    }

    /**
     * Create a staff member directly (active, with password — no invitation flow).
     */
    public function createDirect(
        string $firstName,
        string $lastName,
        string $email,
        string $password,
        string $roleStr,
        string $tenantId,
        string $propertyId,
        string $actorId,
    ): User {
        $existing = $this->userRepo->findByEmail($email);
        if ($existing !== null) {
            throw new \RuntimeException('A staff member with this email already exists.');
        }

        $tenant = $this->tenantRepo->find($tenantId);
        if ($tenant === null) throw new \RuntimeException('Tenant not found');

        $currentCount = $this->userRepo->countActiveStaff();
        if ($currentCount >= $tenant->getMaxStaff()) {
            throw new \RuntimeException("Staff limit reached ({$tenant->getMaxStaff()}). Upgrade your plan to add more.");
        }

        $role = UserRole::from($roleStr);
        $user = new User(
            firstName: $firstName,
            lastName: $lastName,
            email: $email,
            passwordHash: password_hash($password, PASSWORD_ARGON2ID),
            role: $role,
            tenantId: $tenantId,
        );
        $user->setPropertyId($propertyId);
        $user->setIsActive(true);

        $this->em->persist($user);
        $this->em->flush();

        $this->audit->logDeferred(
            action: 'create_staff',
            entityType: 'User',
            entityId: $user->getId(),
            tenantId: $tenantId,
            userId: $actorId,
            description: "Created staff {$user->getFullName()} ({$role->label()})",
        );
        $this->em->flush();

        return $user;
    }
}

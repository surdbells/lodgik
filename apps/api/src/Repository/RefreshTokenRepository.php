<?php

declare(strict_types=1);

namespace Lodgik\Repository;

use Lodgik\Entity\RefreshToken;

/**
 * @extends BaseRepository<RefreshToken>
 */
final class RefreshTokenRepository extends BaseRepository
{
    protected function getEntityClass(): string
    {
        return RefreshToken::class;
    }

    public function findByTokenHash(string $hash): ?RefreshToken
    {
        return $this->findOneBy(['tokenHash' => $hash]);
    }

    /**
     * Find a valid (not expired, not revoked) token by hash.
     */
    public function findValidByHash(string $hash): ?RefreshToken
    {
        $token = $this->findByTokenHash($hash);

        if ($token === null || !$token->isValid()) {
            return null;
        }

        return $token;
    }

    /**
     * Revoke all refresh tokens for a user (logout everywhere).
     */
    public function revokeAllForUser(string $userId): int
    {
        $qb = $this->em->createQueryBuilder();

        return $qb->update(RefreshToken::class, 'rt')
            ->set('rt.revokedAt', ':now')
            ->where('rt.userId = :userId')
            ->andWhere('rt.revokedAt IS NULL')
            ->setParameter('userId', $userId)
            ->setParameter('now', new \DateTimeImmutable())
            ->getQuery()
            ->execute();
    }

    /**
     * Delete expired tokens (cleanup cron job).
     */
    public function deleteExpired(): int
    {
        $qb = $this->em->createQueryBuilder();

        return $qb->delete(RefreshToken::class, 'rt')
            ->where('rt.expiresAt < :now')
            ->setParameter('now', new \DateTimeImmutable())
            ->getQuery()
            ->execute();
    }
}

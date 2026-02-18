<?php

declare(strict_types=1);

namespace Lodgik\Repository;

use Lodgik\Entity\SubscriptionPlan;

/**
 * @extends BaseRepository<SubscriptionPlan>
 */
final class SubscriptionPlanRepository extends BaseRepository
{
    protected function getEntityClass(): string
    {
        return SubscriptionPlan::class;
    }

    public function findByTier(string $tier): ?SubscriptionPlan
    {
        return $this->findOneBy(['tier' => $tier]);
    }

    /**
     * @return SubscriptionPlan[]
     */
    public function findPublicActive(): array
    {
        return $this->findBy(
            ['isPublic' => true, 'isActive' => true],
            ['sortOrder' => 'ASC']
        );
    }

    /**
     * @return SubscriptionPlan[]
     */
    public function findAll(): array
    {
        return $this->em->getRepository(SubscriptionPlan::class)
            ->findBy([], ['sortOrder' => 'ASC']);
    }
}

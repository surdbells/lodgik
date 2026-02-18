<?php

declare(strict_types=1);

namespace Lodgik\Repository;

use Doctrine\ORM\EntityManagerInterface;
use Doctrine\ORM\EntityRepository;
use Doctrine\ORM\QueryBuilder;
use Lodgik\Entity\Contract\TenantAware;

/**
 * Base repository with common CRUD operations.
 *
 * Tenant filtering is handled automatically by Doctrine's TenantFilter.
 * No need to add WHERE tenant_id = ? manually — the filter does it.
 *
 * @template T of object
 */
abstract class BaseRepository
{
    protected EntityRepository $repository;

    public function __construct(
        protected readonly EntityManagerInterface $em,
    ) {
        $this->repository = $em->getRepository($this->getEntityClass());
    }

    /**
     * Return the fully qualified entity class name.
     *
     * @return class-string<T>
     */
    abstract protected function getEntityClass(): string;

    /**
     * Find entity by ID.
     *
     * @return T|null
     */
    public function find(string $id): ?object
    {
        return $this->repository->find($id);
    }

    /**
     * Find entity by ID or throw.
     *
     * @return T
     * @throws \RuntimeException
     */
    public function findOrFail(string $id): object
    {
        $entity = $this->find($id);

        if ($entity === null) {
            $shortName = (new \ReflectionClass($this->getEntityClass()))->getShortName();
            throw new \RuntimeException("{$shortName} not found");
        }

        return $entity;
    }

    /**
     * Find all entities.
     *
     * @return T[]
     */
    public function findAll(): array
    {
        return $this->repository->findAll();
    }

    /**
     * Find entities by criteria.
     *
     * @return T[]
     */
    public function findBy(array $criteria, ?array $orderBy = null, ?int $limit = null, ?int $offset = null): array
    {
        return $this->repository->findBy($criteria, $orderBy, $limit, $offset);
    }

    /**
     * Find single entity by criteria.
     *
     * @return T|null
     */
    public function findOneBy(array $criteria): ?object
    {
        return $this->repository->findOneBy($criteria);
    }

    /**
     * Count entities matching criteria.
     */
    public function count(array $criteria = []): int
    {
        return $this->repository->count($criteria);
    }

    /**
     * Persist and flush entity.
     */
    public function save(object $entity): void
    {
        $this->em->persist($entity);
        $this->em->flush();
    }

    /**
     * Persist entity without flushing (batch operations).
     */
    public function persist(object $entity): void
    {
        $this->em->persist($entity);
    }

    /**
     * Flush all pending changes.
     */
    public function flush(): void
    {
        $this->em->flush();
    }

    /**
     * Remove entity.
     */
    public function remove(object $entity): void
    {
        $this->em->remove($entity);
        $this->em->flush();
    }

    /**
     * Create a new QueryBuilder for this entity.
     */
    protected function createQueryBuilder(string $alias = 'e'): QueryBuilder
    {
        return $this->repository->createQueryBuilder($alias);
    }

    /**
     * Paginated query helper.
     *
     * @return array{items: array, total: int}
     */
    protected function paginate(QueryBuilder $qb, int $page, int $limit, string $alias = 'e'): array
    {
        // Get total count
        $countQb = clone $qb;
        $total = (int) $countQb
            ->select("COUNT({$alias}.id)")
            ->resetDQLPart('orderBy')
            ->getQuery()
            ->getSingleScalarResult();

        // Get paginated results
        $items = $qb
            ->setFirstResult(($page - 1) * $limit)
            ->setMaxResults($limit)
            ->getQuery()
            ->getResult();

        return [
            'items' => $items,
            'total' => $total,
        ];
    }
}

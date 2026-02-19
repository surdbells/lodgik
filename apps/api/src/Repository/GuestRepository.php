<?php

declare(strict_types=1);

namespace Lodgik\Repository;

use Lodgik\Entity\Guest;

/**
 * @extends BaseRepository<Guest>
 */
final class GuestRepository extends BaseRepository
{
    protected function getEntityClass(): string
    {
        return Guest::class;
    }

    /**
     * @return array{items: Guest[], total: int}
     */
    public function listGuests(
        ?string $search = null,
        ?string $vipStatus = null,
        ?string $nationality = null,
        int $page = 1,
        int $limit = 20,
    ): array {
        $qb = $this->createQueryBuilder('g')
            ->where('g.deletedAt IS NULL')
            ->orderBy('g.lastName', 'ASC')
            ->addOrderBy('g.firstName', 'ASC');

        if ($search !== null && trim($search) !== '') {
            $s = '%' . strtolower(trim($search)) . '%';
            $qb->andWhere(
                '(LOWER(g.firstName) LIKE :s OR LOWER(g.lastName) LIKE :s ' .
                'OR LOWER(g.email) LIKE :s OR g.phone LIKE :s OR LOWER(g.idNumber) LIKE :s ' .
                'OR LOWER(g.companyName) LIKE :s)'
            )->setParameter('s', $s);
        }

        if ($vipStatus !== null) {
            $qb->andWhere('g.vipStatus = :vip')->setParameter('vip', $vipStatus);
        }

        if ($nationality !== null) {
            $qb->andWhere('g.nationality = :nat')->setParameter('nat', $nationality);
        }

        return $this->paginate($qb, $page, $limit, 'g');
    }

    /**
     * Quick search for autocomplete (name, phone, email).
     *
     * @return Guest[]
     */
    public function search(string $query, int $limit = 10): array
    {
        $s = '%' . strtolower(trim($query)) . '%';

        return $this->createQueryBuilder('g')
            ->where('g.deletedAt IS NULL')
            ->andWhere(
                '(LOWER(g.firstName) LIKE :s OR LOWER(g.lastName) LIKE :s ' .
                'OR LOWER(g.email) LIKE :s OR g.phone LIKE :s)'
            )
            ->setParameter('s', $s)
            ->orderBy('g.totalStays', 'DESC')
            ->setMaxResults($limit)
            ->getQuery()
            ->getResult();
    }

    public function findByEmail(string $email): ?Guest
    {
        return $this->findOneBy(['email' => strtolower(trim($email))]);
    }

    public function findByPhone(string $phone): ?Guest
    {
        return $this->findOneBy(['phone' => $phone]);
    }

    public function findByIdNumber(string $idNumber): ?Guest
    {
        return $this->findOneBy(['idNumber' => $idNumber]);
    }

    /**
     * Get distinct nationalities for filter dropdown.
     *
     * @return string[]
     */
    public function getDistinctNationalities(): array
    {
        return $this->createQueryBuilder('g')
            ->select('DISTINCT g.nationality')
            ->where('g.nationality IS NOT NULL')
            ->andWhere('g.deletedAt IS NULL')
            ->orderBy('g.nationality', 'ASC')
            ->getQuery()
            ->getSingleColumnResult();
    }
}

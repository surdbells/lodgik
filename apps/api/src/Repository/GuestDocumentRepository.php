<?php

declare(strict_types=1);

namespace Lodgik\Repository;

use Lodgik\Entity\GuestDocument;

/**
 * @extends BaseRepository<GuestDocument>
 */
final class GuestDocumentRepository extends BaseRepository
{
    protected function getEntityClass(): string
    {
        return GuestDocument::class;
    }

    /**
     * @return GuestDocument[]
     */
    public function findByGuest(string $guestId): array
    {
        return $this->findBy(['guestId' => $guestId], ['uploadedAt' => 'DESC']);
    }
}

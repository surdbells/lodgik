<?php

declare(strict_types=1);

namespace Lodgik\Doctrine\Filter;

use Doctrine\ORM\Mapping\ClassMetadata;
use Doctrine\ORM\Query\Filter\SQLFilter;

/**
 * Automatically adds `WHERE deleted_at IS NULL` to queries on entities
 * that have a `deleted_at` column.
 *
 * Enable:  $em->getFilters()->enable('soft_delete');
 * Disable: $em->getFilters()->disable('soft_delete');
 */
final class SoftDeleteFilter extends SQLFilter
{
    public function addFilterConstraint(ClassMetadata $targetEntity, string $targetTableAlias): string
    {
        // Check if entity has a deleted_at field
        if (!$targetEntity->hasField('deletedAt')) {
            return '';
        }

        $columnName = $targetEntity->getColumnName('deletedAt');

        return sprintf('%s.%s IS NULL', $targetTableAlias, $columnName);
    }
}

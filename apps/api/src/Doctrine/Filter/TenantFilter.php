<?php

declare(strict_types=1);

namespace Lodgik\Doctrine\Filter;

use Doctrine\ORM\Mapping\ClassMetadata;
use Doctrine\ORM\Query\Filter\SQLFilter;
use Lodgik\Entity\Contract\TenantAware;

/**
 * Automatically adds `WHERE tenant_id = :tenantId` to every query
 * on entities that implement TenantAware.
 *
 * Enable:  $em->getFilters()->enable('tenant')->setParameter('tenantId', $id);
 * Disable: $em->getFilters()->disable('tenant');
 */
final class TenantFilter extends SQLFilter
{
    public function addFilterConstraint(ClassMetadata $targetEntity, string $targetTableAlias): string
    {
        // Only apply to entities that implement TenantAware
        if (!$targetEntity->getReflectionClass()->implementsInterface(TenantAware::class)) {
            return '';
        }

        // Check if the entity actually has a tenant_id column
        if (!$targetEntity->hasField('tenantId') && !$targetEntity->hasAssociation('tenantId')) {
            // Also check for the column name directly
            $columnNames = array_map(
                fn($field) => $targetEntity->getColumnName($field),
                $targetEntity->getFieldNames()
            );

            if (!in_array('tenant_id', $columnNames, true)) {
                return '';
            }
        }

        return sprintf(
            '%s.tenant_id = %s',
            $targetTableAlias,
            $this->getParameter('tenantId')
        );
    }
}

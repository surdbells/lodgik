<?php

declare(strict_types=1);

namespace Lodgik\Helper;

use Psr\Http\Message\ServerRequestInterface as Request;

final class PaginationHelper
{
    public const DEFAULT_PAGE = 1;
    public const DEFAULT_LIMIT = 25;
    public const MAX_LIMIT = 100;

    /**
     * Extract pagination parameters from request query string.
     *
     * @return array{page: int, limit: int, offset: int}
     */
    public static function fromRequest(Request $request): array
    {
        $params = $request->getQueryParams();

        $page = max(1, (int) ($params['page'] ?? self::DEFAULT_PAGE));
        $limit = min(self::MAX_LIMIT, max(1, (int) ($params['limit'] ?? self::DEFAULT_LIMIT)));
        $offset = ($page - 1) * $limit;

        return [
            'page' => $page,
            'limit' => $limit,
            'offset' => $offset,
        ];
    }

    /**
     * Extract sort parameters from request.
     *
     * @param array<string> $allowedFields Fields that can be sorted on
     * @return array{field: string, direction: string}
     */
    public static function sortFromRequest(Request $request, array $allowedFields, string $defaultField = 'created_at', string $defaultDirection = 'DESC'): array
    {
        $params = $request->getQueryParams();

        $field = $params['sort_by'] ?? $defaultField;
        $direction = strtoupper($params['sort_dir'] ?? $defaultDirection);

        if (!in_array($field, $allowedFields, true)) {
            $field = $defaultField;
        }

        if (!in_array($direction, ['ASC', 'DESC'], true)) {
            $direction = $defaultDirection;
        }

        return [
            'field' => $field,
            'direction' => $direction,
        ];
    }

    /**
     * Extract filter parameters from request, only keeping allowed keys.
     *
     * @param array<string> $allowedFilters
     * @return array<string, string>
     */
    public static function filtersFromRequest(Request $request, array $allowedFilters): array
    {
        $params = $request->getQueryParams();
        $filters = [];

        foreach ($allowedFilters as $key) {
            if (isset($params[$key]) && $params[$key] !== '') {
                $filters[$key] = $params[$key];
            }
        }

        return $filters;
    }

    /**
     * Extract search query from request.
     */
    public static function searchFromRequest(Request $request, string $paramName = 'q'): ?string
    {
        $params = $request->getQueryParams();
        $search = $params[$paramName] ?? null;

        if ($search !== null) {
            $search = trim($search);
            return $search !== '' ? $search : null;
        }

        return null;
    }
}

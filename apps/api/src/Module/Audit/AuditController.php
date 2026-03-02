<?php

declare(strict_types=1);

namespace Lodgik\Module\Audit;

use Doctrine\ORM\EntityManagerInterface;
use Lodgik\Entity\AuditLog;
use Lodgik\Helper\ResponseHelper;
use Psr\Http\Message\ResponseInterface as Response;
use Psr\Http\Message\ServerRequestInterface as Request;

final class AuditController
{
    public function __construct(
        private readonly EntityManagerInterface $em,
        private readonly ResponseHelper $response,
    ) {}

    /**
     * GET /api/admin/audit-logs — Platform-wide audit (super admin)
     * Filters: tenant_id, action, entity_type, user_id, date_from, date_to, search, page, limit
     * Export: format=csv
     */
    public function adminList(Request $request, Response $response): Response
    {
        $params = $request->getQueryParams();
        $format = $params['format'] ?? 'json';

        $qb = $this->em->createQueryBuilder()
            ->select('a')
            ->from(AuditLog::class, 'a')
            ->orderBy('a.createdAt', 'DESC');

        $this->applyFilters($qb, $params);

        if ($format === 'csv') {
            return $this->exportCsv($qb, $response);
        }

        // Count
        $countQb = clone $qb;
        $countQb->select('COUNT(a.id)')->resetDQLPart('orderBy');
        $total = (int) $countQb->getQuery()->getSingleScalarResult();

        // Paginate
        $page = max(1, (int) ($params['page'] ?? 1));
        $limit = min(100, max(10, (int) ($params['limit'] ?? 50)));
        $qb->setFirstResult(($page - 1) * $limit)->setMaxResults($limit);

        $logs = $qb->getQuery()->getResult();

        return $this->response->success($response, [
            'items' => array_map([$this, 'serialize'], $logs),
            'meta' => ['total' => $total, 'page' => $page, 'limit' => $limit, 'pages' => (int) ceil($total / $limit)],
        ]);
    }

    /**
     * GET /api/admin/audit-logs/stats — Summary stats for admin
     */
    public function adminStats(Request $request, Response $response): Response
    {
        $conn = $this->em->getConnection();

        $today = (new \DateTimeImmutable())->format('Y-m-d');
        $week  = (new \DateTimeImmutable('-7 days'))->format('Y-m-d');

        $todayCount = (int) $conn->fetchOne("SELECT COUNT(*) FROM audit_logs WHERE created_at >= ?", [$today . ' 00:00:00']);
        $weekCount  = (int) $conn->fetchOne("SELECT COUNT(*) FROM audit_logs WHERE created_at >= ?", [$week . ' 00:00:00']);
        $totalCount = (int) $conn->fetchOne("SELECT COUNT(*) FROM audit_logs");

        // Top actions this week
        $topActions = $conn->fetchAllAssociative(
            "SELECT action, COUNT(*) as count FROM audit_logs WHERE created_at >= ? GROUP BY action ORDER BY count DESC LIMIT 10",
            [$week . ' 00:00:00']
        );

        // Top tenants this week — Tenant column is 'name' not 'business_name'
        $topTenants = $conn->fetchAllAssociative(
            "SELECT a.tenant_id, t.name as tenant_name, COUNT(*) as count
             FROM audit_logs a LEFT JOIN tenants t ON t.id = a.tenant_id
             WHERE a.created_at >= ? AND a.tenant_id IS NOT NULL
             GROUP BY a.tenant_id, t.name ORDER BY count DESC LIMIT 10",
            [$week . ' 00:00:00']
        );

        return $this->response->success($response, [
            'today'       => $todayCount,
            'this_week'   => $weekCount,
            'total'       => $totalCount,
            'top_actions' => $topActions,
            'top_tenants' => $topTenants,
        ]);
    }

    /**
     * GET /api/admin/audit-logs/filters — Distinct values for filter dropdowns
     * Returns: actions[], entity_types[], tenants[]
     */
    public function adminFilters(Request $request, Response $response): Response
    {
        $conn = $this->em->getConnection();

        $actions = $conn->fetchFirstColumn(
            "SELECT DISTINCT action FROM audit_logs ORDER BY action"
        );

        $entityTypes = $conn->fetchFirstColumn(
            "SELECT DISTINCT entity_type FROM audit_logs ORDER BY entity_type"
        );

        $tenants = $conn->fetchAllAssociative(
            "SELECT DISTINCT a.tenant_id, t.name as tenant_name
             FROM audit_logs a
             LEFT JOIN tenants t ON t.id = a.tenant_id
             WHERE a.tenant_id IS NOT NULL
             ORDER BY t.name"
        );

        return $this->response->success($response, [
            'actions'      => array_values(array_filter($actions)),
            'entity_types' => array_values(array_filter($entityTypes)),
            'tenants'      => array_values(array_filter($tenants, fn($t) => $t['tenant_id'] !== null)),
        ]);
    }

    /**
     * GET /api/audit-logs — Tenant-scoped audit (hotel users)
     * Filters: action, entity_type, user_id, date_from, date_to, search, page, limit
     */
    public function tenantList(Request $request, Response $response): Response
    {
        $params = $request->getQueryParams();
        $tenantId = $request->getAttribute('auth.tenant_id');
        $format = $params['format'] ?? 'json';

        $qb = $this->em->createQueryBuilder()
            ->select('a')
            ->from(AuditLog::class, 'a')
            ->where('a.tenantId = :tid')
            ->setParameter('tid', $tenantId)
            ->orderBy('a.createdAt', 'DESC');

        $this->applyFilters($qb, $params, false);

        if ($format === 'csv') {
            return $this->exportCsv($qb, $response);
        }

        $countQb = clone $qb;
        $countQb->select('COUNT(a.id)')->resetDQLPart('orderBy');
        $total = (int) $countQb->getQuery()->getSingleScalarResult();

        $page = max(1, (int) ($params['page'] ?? 1));
        $limit = min(100, max(10, (int) ($params['limit'] ?? 50)));
        $qb->setFirstResult(($page - 1) * $limit)->setMaxResults($limit);

        $logs = $qb->getQuery()->getResult();

        return $this->response->success($response, [
            'items' => array_map([$this, 'serialize'], $logs),
            'meta' => ['total' => $total, 'page' => $page, 'limit' => $limit, 'pages' => (int) ceil($total / $limit)],
        ]);
    }

    /**
     * GET /api/audit-logs/stats — Tenant-scoped stats
     */
    public function tenantStats(Request $request, Response $response): Response
    {
        $tenantId = $request->getAttribute('auth.tenant_id');
        $conn = $this->em->getConnection();

        $week = (new \DateTimeImmutable('-7 days'))->format('Y-m-d');
        $today = (new \DateTimeImmutable())->format('Y-m-d');

        $todayCount = (int) $conn->fetchOne("SELECT COUNT(*) FROM audit_logs WHERE tenant_id = ? AND created_at >= ?", [$tenantId, $today . ' 00:00:00']);
        $weekCount = (int) $conn->fetchOne("SELECT COUNT(*) FROM audit_logs WHERE tenant_id = ? AND created_at >= ?", [$tenantId, $week . ' 00:00:00']);

        $topActions = $conn->fetchAllAssociative(
            "SELECT action, COUNT(*) as count FROM audit_logs WHERE tenant_id = ? AND created_at >= ? GROUP BY action ORDER BY count DESC LIMIT 10",
            [$tenantId, $week . ' 00:00:00']
        );

        $topUsers = $conn->fetchAllAssociative(
            "SELECT a.user_id, a.user_name, COUNT(*) as count
             FROM audit_logs a
             WHERE a.tenant_id = ? AND a.created_at >= ? AND a.user_id IS NOT NULL
             GROUP BY a.user_id, a.user_name ORDER BY count DESC LIMIT 10",
            [$tenantId, $week . ' 00:00:00']
        );

        return $this->response->success($response, [
            'today' => $todayCount,
            'this_week' => $weekCount,
            'top_actions' => $topActions,
            'top_users' => $topUsers,
        ]);
    }

    // ─── Private ──────────────────────────────────────────────

    private function applyFilters(\Doctrine\ORM\QueryBuilder $qb, array $params, bool $isAdmin = true): void
    {
        if ($isAdmin && !empty($params['tenant_id'])) {
            $qb->andWhere('a.tenantId = :filter_tid')->setParameter('filter_tid', $params['tenant_id']);
        }
        if (!empty($params['action'])) {
            $qb->andWhere('a.action = :action')->setParameter('action', $params['action']);
        }
        if (!empty($params['entity_type'])) {
            $qb->andWhere('a.entityType = :etype')->setParameter('etype', $params['entity_type']);
        }
        if (!empty($params['user_id'])) {
            $qb->andWhere('a.userId = :uid')->setParameter('uid', $params['user_id']);
        }
        if (!empty($params['date_from'])) {
            $qb->andWhere('a.createdAt >= :from')->setParameter('from', $params['date_from'] . ' 00:00:00');
        }
        if (!empty($params['date_to'])) {
            $qb->andWhere('a.createdAt <= :to')->setParameter('to', $params['date_to'] . ' 23:59:59');
        }
        if (!empty($params['search'])) {
            $qb->andWhere('(LOWER(a.description) LIKE :search OR LOWER(a.userName) LIKE :search OR LOWER(a.entityId) LIKE :search)')
               ->setParameter('search', '%' . strtolower($params['search']) . '%');
        }
    }

    private function exportCsv(\Doctrine\ORM\QueryBuilder $qb, Response $response): Response
    {
        $qb->setMaxResults(5000); // Safety limit
        $logs = $qb->getQuery()->getResult();

        $csv = "Timestamp,Action,Entity Type,Entity ID,User,Description,IP Address\n";
        foreach ($logs as $log) {
            $csv .= sprintf(
                "%s,%s,%s,%s,\"%s\",\"%s\",%s\n",
                $log->getCreatedAt()->format('Y-m-d H:i:s'),
                $log->getAction(),
                $log->getEntityType(),
                $log->getEntityId() ?? '',
                str_replace('"', '""', $log->getUserName() ?? ''),
                str_replace('"', '""', $log->getDescription() ?? ''),
                $log->getIpAddress() ?? '',
            );
        }

        $response->getBody()->write($csv);
        return $response
            ->withHeader('Content-Type', 'text/csv')
            ->withHeader('Content-Disposition', 'attachment; filename="audit-log-' . date('Y-m-d') . '.csv"');
    }

    private function serialize(AuditLog $log): array
    {
        return [
            'id' => $log->getId(),
            'tenant_id' => $log->getTenantId(),
            'user_id' => $log->getUserId(),
            'user_name' => $log->getUserName(),
            'action' => $log->getAction(),
            'entity_type' => $log->getEntityType(),
            'entity_id' => $log->getEntityId(),
            'description' => $log->getDescription(),
            'old_values' => $log->getOldValues(),
            'new_values' => $log->getNewValues(),
            'ip_address' => $log->getIpAddress(),
            'user_agent' => $log->getUserAgent(),
            'created_at' => $log->getCreatedAt()->format('c'),
        ];
    }
}

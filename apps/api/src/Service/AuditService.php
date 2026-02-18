<?php

declare(strict_types=1);

namespace Lodgik\Service;

use Doctrine\ORM\EntityManagerInterface;
use Lodgik\Entity\AuditLog;
use Psr\Http\Message\ServerRequestInterface as Request;

final class AuditService
{
    public function __construct(
        private readonly EntityManagerInterface $em,
    ) {}

    /**
     * Log an action.
     *
     * @param string $action      e.g. 'create', 'update', 'delete', 'login', 'checkout'
     * @param string $entityType  e.g. 'Booking', 'User', 'FolioPayment'
     * @param string|null $entityId
     * @param Request|null $request  HTTP request (extracts user, IP, etc.)
     * @param string|null $description
     * @param array|null $oldValues
     * @param array|null $newValues
     */
    public function log(
        string $action,
        string $entityType,
        ?string $entityId = null,
        ?Request $request = null,
        ?string $description = null,
        ?array $oldValues = null,
        ?array $newValues = null,
    ): AuditLog {
        $tenantId = null;
        $userId = null;
        $userName = null;
        $ipAddress = null;
        $userAgent = null;
        $requestId = null;

        if ($request !== null) {
            $tenantId = $request->getAttribute('auth.tenant_id');
            $userId = $request->getAttribute('auth.user_id');
            $userName = $request->getAttribute('auth.user_name');
            $requestId = $request->getAttribute('request_id');

            $serverParams = $request->getServerParams();
            $ipAddress = $serverParams['REMOTE_ADDR']
                ?? $request->getHeaderLine('X-Forwarded-For')
                ?: null;
            $userAgent = $request->getHeaderLine('User-Agent') ?: null;
        }

        $log = new AuditLog(
            action: $action,
            entityType: $entityType,
            entityId: $entityId,
            tenantId: $tenantId,
            userId: $userId,
            userName: $userName,
        );

        $log->setDescription($description)
            ->setOldValues($oldValues)
            ->setNewValues($newValues)
            ->setIpAddress($ipAddress)
            ->setUserAgent($userAgent)
            ->setRequestId($requestId);

        $this->em->persist($log);
        $this->em->flush();

        return $log;
    }

    /**
     * Log without flushing (batch operations).
     */
    public function logDeferred(
        string $action,
        string $entityType,
        ?string $entityId = null,
        ?string $tenantId = null,
        ?string $userId = null,
        ?string $description = null,
    ): AuditLog {
        $log = new AuditLog(
            action: $action,
            entityType: $entityType,
            entityId: $entityId,
            tenantId: $tenantId,
            userId: $userId,
        );

        $log->setDescription($description);

        $this->em->persist($log);

        return $log;
    }
}

<?php

declare(strict_types=1);

namespace Lodgik\Module\Housekeeping;

use Doctrine\ORM\EntityManagerInterface;
use Lodgik\Entity\HousekeepingTask;
use Lodgik\Entity\LostAndFound;
use Lodgik\Enum\HousekeepingTaskStatus;
use Psr\Log\LoggerInterface;

final class HousekeepingService
{
    public function __construct(private readonly EntityManagerInterface $em, private readonly LoggerInterface $logger) {}

    // ─── Tasks ──────────────────────────────────────────────────

    public function createTask(string $propertyId, string $roomId, string $roomNumber, string $taskType, string $tenantId, array $extra = []): HousekeepingTask
    {
        $t = new HousekeepingTask($propertyId, $roomId, $roomNumber, $taskType, $tenantId);
        if (isset($extra['priority'])) $t->setPriority($extra['priority']);
        if (isset($extra['booking_id'])) $t->setBookingId($extra['booking_id']);
        if (isset($extra['notes'])) $t->setNotes($extra['notes']);
        if (isset($extra['estimated_minutes'])) $t->setEstimatedMinutes($extra['estimated_minutes']);
        if (isset($extra['due_at'])) $t->setDueAt(new \DateTimeImmutable($extra['due_at']));
        if (isset($extra['checklist'])) $t->setChecklist($extra['checklist']);
        $this->em->persist($t);
        $this->em->flush();
        return $t;
    }

    /** Auto-generate checkout cleaning task */
    public function generateCheckoutTask(string $propertyId, string $roomId, string $roomNumber, string $bookingId, string $tenantId): HousekeepingTask
    {
        $checklist = [
            ['item' => 'Strip bed linen', 'checked' => false],
            ['item' => 'Clean bathroom', 'checked' => false],
            ['item' => 'Vacuum/mop floor', 'checked' => false],
            ['item' => 'Dust surfaces', 'checked' => false],
            ['item' => 'Restock amenities', 'checked' => false],
            ['item' => 'Check minibar', 'checked' => false],
            ['item' => 'Empty bins', 'checked' => false],
            ['item' => 'Check for lost items', 'checked' => false],
        ];
        $t = $this->createTask($propertyId, $roomId, $roomNumber, 'checkout_clean', $tenantId, [
            'booking_id' => $bookingId, 'priority' => 2, 'checklist' => $checklist,
            'estimated_minutes' => 45, 'notes' => 'Auto-generated on checkout',
        ]);
        $this->logger->info("Housekeeping task auto-generated: room={$roomNumber}, booking={$bookingId}");
        return $t;
    }

    public function assignTask(string $taskId, string $userId, string $userName): HousekeepingTask
    {
        $t = $this->em->find(HousekeepingTask::class, $taskId) ?? throw new \RuntimeException('Task not found');
        $t->assign($userId, $userName);
        $this->em->flush();
        return $t;
    }

    public function startTask(string $taskId): HousekeepingTask
    {
        $t = $this->em->find(HousekeepingTask::class, $taskId) ?? throw new \RuntimeException('Task not found');
        $t->start();
        $this->em->flush();
        return $t;
    }

    public function completeTask(string $taskId, ?array $checklist = null, ?string $photoAfter = null): HousekeepingTask
    {
        $t = $this->em->find(HousekeepingTask::class, $taskId) ?? throw new \RuntimeException('Task not found');
        if ($checklist) $t->setChecklist($checklist);
        if ($photoAfter) $t->setPhotoAfter($photoAfter);
        $t->complete();
        $this->em->flush();
        return $t;
    }

    public function inspectTask(string $taskId, string $inspectorId, bool $passed, ?string $notes = null): HousekeepingTask
    {
        $t = $this->em->find(HousekeepingTask::class, $taskId) ?? throw new \RuntimeException('Task not found');
        $t->inspect($inspectorId, $passed, $notes);
        // If inspection passed, update room status to vacant_clean
        if ($passed) {
            $this->logger->info("Inspection passed: room task {$taskId}, room ready");
        }
        $this->em->flush();
        return $t;
    }

    public function updateTaskPhotos(string $taskId, ?string $before = null, ?string $after = null): HousekeepingTask
    {
        $t = $this->em->find(HousekeepingTask::class, $taskId) ?? throw new \RuntimeException('Task not found');
        if ($before !== null) $t->setPhotoBefore($before);
        if ($after !== null) $t->setPhotoAfter($after);
        $this->em->flush();
        return $t;
    }

    /** @return HousekeepingTask[] */
    public function listTasks(string $propertyId, ?string $status = null, ?string $assignedTo = null): array
    {
        $qb = $this->em->createQueryBuilder()->select('t')->from(HousekeepingTask::class, 't')
            ->where('t.propertyId = :pid')->setParameter('pid', $propertyId)
            ->orderBy('t.priority', 'ASC')->addOrderBy('t.createdAt', 'DESC');
        if ($status) $qb->andWhere('t.status = :s')->setParameter('s', $status);
        if ($assignedTo) $qb->andWhere('t.assignedTo = :u')->setParameter('u', $assignedTo);
        return $qb->getQuery()->getResult();
    }

    public function getTodayStats(string $propertyId): array
    {
        $today = new \DateTimeImmutable('today');
        $tomorrow = $today->modify('+1 day');
        $tasks = $this->em->createQueryBuilder()->select('t')->from(HousekeepingTask::class, 't')
            ->where('t.propertyId = :pid')->andWhere('t.createdAt BETWEEN :s AND :e')
            ->setParameter('pid', $propertyId)->setParameter('s', $today)->setParameter('e', $tomorrow)
            ->getQuery()->getResult();

        $total = count($tasks);
        $completed = count(array_filter($tasks, fn($t) => in_array($t->getStatus(), [HousekeepingTaskStatus::COMPLETED, HousekeepingTaskStatus::INSPECTED])));
        $pending = count(array_filter($tasks, fn($t) => $t->getStatus() === HousekeepingTaskStatus::PENDING));
        $inProgress = count(array_filter($tasks, fn($t) => $t->getStatus() === HousekeepingTaskStatus::IN_PROGRESS));

        return ['total' => $total, 'completed' => $completed, 'pending' => $pending, 'in_progress' => $inProgress];
    }

    // ─── Lost & Found ───────────────────────────────────────────

    public function reportLostItem(string $propertyId, string $description, string $foundLocation, string $foundBy, string $tenantId, array $extra = []): LostAndFound
    {
        $lf = new LostAndFound($propertyId, $description, $foundLocation, $foundBy, $tenantId);
        if (isset($extra['room_id'])) $lf->setRoomId($extra['room_id']);
        if (isset($extra['photo_url'])) $lf->setPhotoUrl($extra['photo_url']);
        if (isset($extra['notes'])) $lf->setNotes($extra['notes']);
        $this->em->persist($lf);
        $this->em->flush();
        return $lf;
    }

    public function claimItem(string $id, string $claimedBy): LostAndFound
    {
        $lf = $this->em->find(LostAndFound::class, $id) ?? throw new \RuntimeException('Not found');
        $lf->claim($claimedBy);
        $this->em->flush();
        return $lf;
    }

    /** @return LostAndFound[] */
    public function listLostAndFound(string $propertyId, ?string $status = null): array
    {
        $qb = $this->em->createQueryBuilder()->select('l')->from(LostAndFound::class, 'l')
            ->where('l.propertyId = :pid')->setParameter('pid', $propertyId)
            ->orderBy('l.createdAt', 'DESC');
        if ($status) $qb->andWhere('l.status = :s')->setParameter('s', $status);
        return $qb->getQuery()->getResult();
    }
}

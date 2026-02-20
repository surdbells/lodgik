<?php

declare(strict_types=1);

namespace Lodgik\Module\Security;

use Doctrine\ORM\EntityManagerInterface;
use Lodgik\Entity\VisitorAccessCode;
use Lodgik\Entity\GatePass;
use Lodgik\Entity\GuestMovement;
use Psr\Log\LoggerInterface;

final class SecurityService
{
    public function __construct(private readonly EntityManagerInterface $em, private readonly LoggerInterface $logger) {}

    // ─── Visitor Access Codes ───────────────────────────────

    public function createVisitorCode(string $bookingId, string $propertyId, string $guestId, string $visitorName, string $validFrom, string $validUntil, string $tenantId, array $extra = []): VisitorAccessCode
    {
        $code = new VisitorAccessCode($bookingId, $propertyId, $guestId, $visitorName, new \DateTimeImmutable($validFrom), new \DateTimeImmutable($validUntil), $tenantId);
        if (!empty($extra['visitor_phone'])) $code->setVisitorPhone($extra['visitor_phone']);
        if (!empty($extra['purpose'])) $code->setPurpose($extra['purpose']);
        if (!empty($extra['room_number'])) $code->setRoomNumber($extra['room_number']);
        $this->em->persist($code);
        $this->em->flush();

        // Auto-create gate pass for visitor
        $gp = new GatePass($propertyId, $bookingId, 'visitor_entry', $visitorName, $extra['guest_name'] ?? 'Guest', $tenantId);
        $gp->setPersonPhone($extra['visitor_phone'] ?? null);
        $gp->setRoomNumber($extra['room_number'] ?? null);
        $gp->setVisitorCodeId($code->getId());
        $gp->setPurpose($extra['purpose'] ?? null);
        $gp->setExpectedAt(new \DateTimeImmutable($validFrom));
        $gp->approve('system');
        $this->em->persist($gp);
        $this->em->flush();

        return $code;
    }

    public function revokeVisitorCode(string $codeId): VisitorAccessCode
    {
        $code = $this->em->find(VisitorAccessCode::class, $codeId) ?? throw new \RuntimeException('Visitor code not found');
        $code->revoke();
        $this->em->flush();
        return $code;
    }

    public function listVisitorCodes(string $bookingId): array
    {
        return $this->em->getRepository(VisitorAccessCode::class)->findBy(['bookingId' => $bookingId], ['createdAt' => 'DESC']);
    }

    public function validateVisitorCode(string $code, string $propertyId): ?VisitorAccessCode
    {
        $vc = $this->em->getRepository(VisitorAccessCode::class)->findOneBy(['code' => $code, 'propertyId' => $propertyId]);
        return ($vc && $vc->isValid()) ? $vc : null;
    }

    // ─── Gate Passes ────────────────────────────────────────

    public function createGatePass(string $propertyId, string $bookingId, string $passType, string $personName, string $guestName, string $tenantId, array $extra = []): GatePass
    {
        $gp = new GatePass($propertyId, $bookingId, $passType, $personName, $guestName, $tenantId);
        if (!empty($extra['person_phone'])) $gp->setPersonPhone($extra['person_phone']);
        if (!empty($extra['room_number'])) $gp->setRoomNumber($extra['room_number']);
        if (!empty($extra['purpose'])) $gp->setPurpose($extra['purpose']);
        if (!empty($extra['expected_at'])) $gp->setExpectedAt(new \DateTimeImmutable($extra['expected_at']));
        $this->em->persist($gp);
        $this->em->flush();
        return $gp;
    }

    public function approveGatePass(string $id, string $userId): GatePass
    {
        $gp = $this->em->find(GatePass::class, $id) ?? throw new \RuntimeException('Gate pass not found');
        $gp->approve($userId);
        $this->em->flush();
        return $gp;
    }

    public function denyGatePass(string $id, string $userId, ?string $notes = null): GatePass
    {
        $gp = $this->em->find(GatePass::class, $id) ?? throw new \RuntimeException('Gate pass not found');
        $gp->deny($userId, $notes);
        $this->em->flush();
        return $gp;
    }

    public function gatePassCheckIn(string $id): GatePass
    {
        $gp = $this->em->find(GatePass::class, $id) ?? throw new \RuntimeException('Gate pass not found');
        $gp->checkIn();
        $this->em->flush();
        return $gp;
    }

    public function gatePassCheckOut(string $id): GatePass
    {
        $gp = $this->em->find(GatePass::class, $id) ?? throw new \RuntimeException('Gate pass not found');
        $gp->checkOut();
        $this->em->flush();
        return $gp;
    }

    public function listGatePasses(string $propertyId, ?string $status = null): array
    {
        $criteria = ['propertyId' => $propertyId];
        if ($status) $criteria['status'] = $status;
        return $this->em->getRepository(GatePass::class)->findBy($criteria, ['createdAt' => 'DESC']);
    }

    public function listGatePassesByBooking(string $bookingId): array
    {
        return $this->em->getRepository(GatePass::class)->findBy(['bookingId' => $bookingId], ['createdAt' => 'DESC']);
    }

    // ─── Guest Movements (Step-in/Step-out) ─────────────────

    public function recordMovement(string $propertyId, string $bookingId, string $guestId, string $guestName, string $direction, string $tenantId, array $extra = []): GuestMovement
    {
        $m = new GuestMovement($propertyId, $bookingId, $guestId, $guestName, $direction, $tenantId);
        if (!empty($extra['room_number'])) $m->setRoomNumber($extra['room_number']);
        if (!empty($extra['recorded_by'])) $m->setRecordedBy($extra['recorded_by']);
        if (!empty($extra['notes'])) $m->setNotes($extra['notes']);
        if (!empty($extra['location'])) $m->setLocation($extra['location']);
        $this->em->persist($m);
        $this->em->flush();
        return $m;
    }

    public function getMovements(string $propertyId, ?string $bookingId = null, int $limit = 50): array
    {
        $criteria = ['propertyId' => $propertyId];
        if ($bookingId) $criteria['bookingId'] = $bookingId;
        return $this->em->getRepository(GuestMovement::class)->findBy($criteria, ['createdAt' => 'DESC'], $limit);
    }

    /** Get current on-premise guests (last movement was step_in) */
    public function getOnPremise(string $propertyId): array
    {
        // Get the latest movement per guest
        $dql = "SELECT m FROM Lodgik\Entity\GuestMovement m WHERE m.propertyId = :pid AND m.id IN (SELECT MAX(m2.id) FROM Lodgik\Entity\GuestMovement m2 WHERE m2.propertyId = :pid2 GROUP BY m2.guestId) AND m.direction = 'step_in' ORDER BY m.createdAt DESC";
        return $this->em->createQuery($dql)->setParameter('pid', $propertyId)->setParameter('pid2', $propertyId)->getResult();
    }
}

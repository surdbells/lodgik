<?php

declare(strict_types=1);

namespace Lodgik\Module\RoomControl;

use Doctrine\ORM\EntityManagerInterface;
use Lodgik\Entity\RoomControlRequest;
use Psr\Log\LoggerInterface;

final class RoomControlService
{
    public function __construct(private readonly EntityManagerInterface $em, private readonly LoggerInterface $logger) {}

    public function toggleDnd(string $propertyId, string $bookingId, string $guestId, string $roomId, string $roomNumber, bool $active, string $tenantId): RoomControlRequest
    {
        // Check for existing active DND
        $existing = $this->em->getRepository(RoomControlRequest::class)->findOneBy(['bookingId' => $bookingId, 'requestType' => 'dnd', 'isActive' => true]);
        if ($existing && !$active) { $existing->cancel(); $this->em->flush(); return $existing; }
        if ($existing && $active) return $existing; // Already active

        $r = new RoomControlRequest($propertyId, $bookingId, $guestId, $roomId, $roomNumber, 'dnd', $tenantId);
        $this->em->persist($r);
        $this->em->flush();
        return $r;
    }

    public function toggleMakeUpRoom(string $propertyId, string $bookingId, string $guestId, string $roomId, string $roomNumber, bool $active, string $tenantId): RoomControlRequest
    {
        $existing = $this->em->getRepository(RoomControlRequest::class)->findOneBy(['bookingId' => $bookingId, 'requestType' => 'make_up_room', 'isActive' => true]);
        if ($existing && !$active) { $existing->cancel(); $this->em->flush(); return $existing; }
        if ($existing && $active) return $existing;

        $r = new RoomControlRequest($propertyId, $bookingId, $guestId, $roomId, $roomNumber, 'make_up_room', $tenantId);
        $this->em->persist($r);
        $this->em->flush();
        return $r;
    }

    public function reportMaintenance(string $propertyId, string $bookingId, string $guestId, string $roomId, string $roomNumber, string $description, string $tenantId, ?string $photoUrl = null): RoomControlRequest
    {
        $r = new RoomControlRequest($propertyId, $bookingId, $guestId, $roomId, $roomNumber, 'maintenance', $tenantId);
        $r->setDescription($description);
        if ($photoUrl) $r->setPhotoUrl($photoUrl);
        $this->em->persist($r);
        $this->em->flush();
        return $r;
    }

    public function assignMaintenance(string $id, string $userId, string $name): RoomControlRequest
    {
        $r = $this->em->find(RoomControlRequest::class, $id) ?? throw new \RuntimeException('Request not found');
        $r->assign($userId, $name);
        $this->em->flush();
        return $r;
    }

    public function resolveMaintenance(string $id, ?string $staffNotes = null): RoomControlRequest
    {
        $r = $this->em->find(RoomControlRequest::class, $id) ?? throw new \RuntimeException('Request not found');
        $r->resolve($staffNotes);
        $this->em->flush();
        return $r;
    }

    public function getRoomStatus(string $bookingId): array
    {
        $all = $this->em->getRepository(RoomControlRequest::class)->findBy(['bookingId' => $bookingId, 'isActive' => true]);
        $result = ['dnd' => false, 'make_up_room' => false, 'maintenance' => []];
        foreach ($all as $r) {
            if ($r->getRequestType() === 'dnd') $result['dnd'] = true;
            elseif ($r->getRequestType() === 'make_up_room') $result['make_up_room'] = true;
            elseif ($r->getRequestType() === 'maintenance') $result['maintenance'][] = $r->toArray();
        }
        return $result;
    }

    public function listRequests(string $propertyId, ?string $type = null, ?string $status = null): array
    {
        $criteria = ['propertyId' => $propertyId];
        if ($type) $criteria['requestType'] = $type;
        if ($status) $criteria['status'] = $status;
        return $this->em->getRepository(RoomControlRequest::class)->findBy($criteria, ['createdAt' => 'DESC']);
    }
}

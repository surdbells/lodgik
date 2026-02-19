<?php

declare(strict_types=1);

namespace Lodgik\Module\ServiceRequest;

use Doctrine\ORM\EntityManagerInterface;
use Lodgik\Entity\ServiceRequest;
use Lodgik\Enum\ServiceRequestCategory;
use Lodgik\Enum\ServiceRequestStatus;
use Lodgik\Repository\ServiceRequestRepository;
use Psr\Log\LoggerInterface;

final class ServiceRequestService
{
    public function __construct(
        private readonly EntityManagerInterface $em,
        private readonly ServiceRequestRepository $repo,
        private readonly LoggerInterface $logger,
    ) {}

    public function create(string $propertyId, string $bookingId, string $guestId, string $category, string $title, string $tenantId, ?string $description = null, ?string $roomId = null, int $priority = 2, ?string $photoUrl = null): ServiceRequest
    {
        $cat = ServiceRequestCategory::tryFrom($category);
        if (!$cat) throw new \RuntimeException("Invalid category: {$category}");

        $sr = new ServiceRequest($propertyId, $bookingId, $guestId, $cat, $title, $tenantId);
        $sr->setDescription($description);
        $sr->setRoomId($roomId);
        $sr->setPriority($priority);
        $sr->setPhotoUrl($photoUrl);

        $this->em->persist($sr);
        $this->em->flush();
        $this->logger->info("Service request created: {$sr->getId()}, cat={$category}");
        return $sr;
    }

    public function getById(string $id): ?ServiceRequest { return $this->repo->find($id); }

    /** @return ServiceRequest[] */
    public function listByProperty(string $propertyId, ?string $status = null): array
    {
        return $this->repo->findByProperty($propertyId, $status);
    }

    /** @return ServiceRequest[] */
    public function listByBooking(string $bookingId): array
    {
        return $this->repo->findByBooking($bookingId);
    }

    /** @return ServiceRequest[] Active (non-completed/cancelled) */
    public function listActive(string $propertyId): array
    {
        return $this->repo->findActive($propertyId);
    }

    public function summarize(string $propertyId): array
    {
        return $this->repo->summarize($propertyId);
    }

    public function acknowledge(string $id, ?string $staffId = null): ServiceRequest
    {
        $sr = $this->findOrFail($id);
        $sr->acknowledge($staffId);
        $this->em->flush();
        return $sr;
    }

    public function startProgress(string $id, ?string $staffId = null): ServiceRequest
    {
        $sr = $this->findOrFail($id);
        $sr->startProgress($staffId);
        $this->em->flush();
        return $sr;
    }

    public function complete(string $id, ?string $notes = null): ServiceRequest
    {
        $sr = $this->findOrFail($id);
        $sr->complete($notes);
        $this->em->flush();
        return $sr;
    }

    public function cancel(string $id): ServiceRequest
    {
        $sr = $this->findOrFail($id);
        $sr->cancel();
        $this->em->flush();
        return $sr;
    }

    public function assign(string $id, string $staffId): ServiceRequest
    {
        $sr = $this->findOrFail($id);
        $sr->setAssignedTo($staffId);
        $this->em->flush();
        return $sr;
    }

    public function rate(string $id, int $rating, ?string $feedback = null): ServiceRequest
    {
        $sr = $this->findOrFail($id);
        if ($sr->getStatus() !== ServiceRequestStatus::COMPLETED) throw new \RuntimeException('Can only rate completed requests');
        $sr->rate($rating, $feedback);
        $this->em->flush();
        return $sr;
    }

    private function findOrFail(string $id): ServiceRequest
    {
        $sr = $this->repo->find($id);
        if (!$sr) throw new \RuntimeException('Service request not found');
        return $sr;
    }
}

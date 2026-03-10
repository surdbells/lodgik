<?php

declare(strict_types=1);

namespace Lodgik\Module\ServiceRequest;

use Doctrine\ORM\EntityManagerInterface;
use Lodgik\Entity\Guest;
use Lodgik\Entity\Room;
use Lodgik\Entity\ServiceRequest;
use Lodgik\Enum\ServiceRequestCategory;
use Lodgik\Enum\ServiceRequestStatus;
use Lodgik\Module\Notification\NotificationService;
use Lodgik\Repository\ServiceRequestRepository;
use Psr\Log\LoggerInterface;

final class ServiceRequestService
{
    public function __construct(
        private readonly EntityManagerInterface $em,
        private readonly ServiceRequestRepository $repo,
        private readonly LoggerInterface $logger,
        private readonly ?NotificationService $notifService = null,
        private readonly ?\Lodgik\Module\Booking\BookingService $bookingService = null,
    ) {}

    public function create(
        string  $propertyId,
        string  $bookingId,
        string  $guestId,
        string  $category,
        string  $title,
        string  $tenantId,
        ?string $description = null,
        ?string $roomId      = null,
        int     $priority    = 2,
        ?string $photoUrl    = null,
        ?array  $metadata    = null,
    ): ServiceRequest {
        $cat = ServiceRequestCategory::tryFrom($category);
        if (!$cat) throw new \RuntimeException("Invalid category: {$category}");

        $sr = new ServiceRequest($propertyId, $bookingId, $guestId, $cat, $title, $tenantId);
        $sr->setDescription($description);
        $sr->setRoomId($roomId);
        $sr->setPriority($priority);
        $sr->setPhotoUrl($photoUrl);
        if ($metadata !== null) $sr->setMetadata($metadata);

        $this->em->persist($sr);
        $this->em->flush();
        $this->logger->info("Service request created: {$sr->getId()}, cat={$category}");

        // Resolve room number + guest name for notification
        $roomNumber = $roomId ? ($this->em->find(Room::class, $roomId)?->getRoomNumber() ?? 'N/A') : 'N/A';
        $guestName  = $this->em->find(Guest::class, $guestId)?->getFullName() ?? 'Guest';

        $this->notifService?->notifyServiceRequest($propertyId, $title, $guestName, $roomNumber, $tenantId);

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

    public function complete(string $id, ?string $notes = null, ?string $staffId = null): ServiceRequest
    {
        $sr = $this->findOrFail($id);
        $sr->complete($notes);
        $this->em->flush();

        // ── Stay extension: apply checkout extension on booking + folio ──
        if ($sr->getCategory() === ServiceRequestCategory::STAY_EXTENSION && $this->bookingService !== null) {
            $meta = $sr->getMetadata();
            if (!empty($meta['requested_checkout'])) {
                try {
                    $this->bookingService->extendCheckout(
                        $sr->getBookingId(),
                        $meta['requested_checkout'],
                        $staffId,
                        'Approved via service request',
                    );
                    $this->logger->info("[ServiceRequest] Stay extension applied for booking={$sr->getBookingId()}");
                } catch (\Throwable $e) {
                    $this->logger->error("[ServiceRequest] Failed to apply stay extension: {$e->getMessage()}");
                    // Don't fail the complete() — SR is already marked complete
                }
            }
        }

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

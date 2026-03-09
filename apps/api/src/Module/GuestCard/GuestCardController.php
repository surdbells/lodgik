<?php
declare(strict_types=1);

namespace Lodgik\Module\GuestCard;

use Lodgik\Entity\CardScanPoint;
use Lodgik\Entity\GuestCard;
use Lodgik\Entity\GuestCardEvent;
use Lodgik\Helper\PaginationHelper;
use Lodgik\Helper\ResponseHelper;
use Lodgik\Repository\CardScanPointRepository;
use Lodgik\Repository\GuestCardEventRepository;
use Lodgik\Repository\GuestCardRepository;
use Psr\Http\Message\ResponseInterface as Response;
use Psr\Http\Message\ServerRequestInterface as Request;

final class GuestCardController
{
    public function __construct(
        private readonly GuestCardService         $cardService,
        private readonly GuestCardRepository      $cardRepo,
        private readonly GuestCardEventRepository $eventRepo,
        private readonly CardScanPointRepository  $scanPointRepo,
        private readonly ResponseHelper           $response,
    ) {}

    // ══════════════════════════════════════════════════════════════
    // PHASE A — Card Management
    // ══════════════════════════════════════════════════════════════

    /** GET /api/cards */
    public function listCards(Request $request, Response $response): Response
    {
        try {
            $filters    = PaginationHelper::filtersFromRequest($request, ['property_id', 'status']);
            $pagination = PaginationHelper::fromRequest($request);

            $propertyId = $filters['property_id'] ?? null;
            if (!$propertyId) return $this->response->error($response, 'property_id is required', 400);

            $result = $this->cardRepo->findByProperty(
                $propertyId,
                $filters['status'] ?? null,
                $pagination['page'],
                $pagination['limit'],
            );

            $items = array_map(fn(GuestCard $c) => $this->serializeCard($c), $result['items']);
            return $this->response->paginated($response, $items, $result['total'], $pagination['page'], $pagination['limit']);
        } catch (\Throwable $e) {
            return $this->response->error($response, $e->getMessage(), 500);
        }
    }

    /** GET /api/cards/{id} */
    public function showCard(Request $request, Response $response, array $args): Response
    {
        try {
            $card   = $this->cardRepo->findOrFail($args['id']);
            $events = $this->eventRepo->findByCard($card->getId(), 30);
            $data   = $this->serializeCard($card);
            $data['recent_events'] = array_map(fn(GuestCardEvent $e) => $e->toArray(), $events);
            return $this->response->success($response, $data);
        } catch (\Throwable $e) {
            return $this->response->notFound($response, $e->getMessage());
        }
    }

    /** POST /api/cards/issue — Issue a card to a booking */
    public function issueCard(Request $request, Response $response): Response
    {
        try {
            $body      = (array) ($request->getParsedBody() ?? []);
            $tenantId  = $request->getAttribute('auth.tenant_id');
            $userId    = $request->getAttribute('auth.user_id');

            $bookingId = $body['booking_id'] ?? null;
            if (!$bookingId) return $this->response->error($response, 'booking_id is required', 400);

            $card = $this->cardService->issueCard(
                $bookingId,
                $body['card_uid'] ?? null,
                $userId,
                $tenantId,
            );
            return $this->response->created($response, $this->serializeCard($card), 'Card issued successfully');
        } catch (\Throwable $e) {
            return $this->response->error($response, $e->getMessage(), 422);
        }
    }

    /**
     * POST /api/cards/security-issue
     *
     * Security gate issues a card to a guest arriving by vehicle or on foot.
     * No booking required at this point — card enters PENDING_CHECKIN pool.
     *
     * Body:
     *   property_id  string  required
     *   card_uid     string  required  (auto-typed by USB RFID reader)
     *   plate_number string  optional  (vehicle plate)
     */
    public function securityIssueCard(Request $request, Response $response): Response
    {
        try {
            $body       = (array) ($request->getParsedBody() ?? []);
            $tenantId   = $request->getAttribute('auth.tenant_id');
            $userId     = $request->getAttribute('auth.user_id');
            $propertyId = $body['property_id'] ?? $request->getAttribute('auth.property_id') ?? null;
            $cardUid    = trim($body['card_uid'] ?? '');

            if (!$propertyId) return $this->response->error($response, 'property_id is required', 400);
            if (!$cardUid)    return $this->response->error($response, 'card_uid is required', 400);

            $card = $this->cardService->securityIssueCard(
                propertyId:  $propertyId,
                cardUid:     $cardUid,
                issuedBy:    $userId,
                tenantId:    $tenantId,
                plateNumber: $body['plate_number'] ?? null,
            );

            return $this->response->created(
                $response,
                $this->serializeCard($card),
                'Card issued at gate — awaiting check-in',
            );
        } catch (\DomainException $e) {
            return $this->response->error($response, $e->getMessage(), 422);
        } catch (\Throwable $e) {
            return $this->response->error($response, $e->getMessage(), 500);
        }
    }

    /**
     * POST /api/cards/{id}/attach-booking
     *
     * Reception attaches a PENDING_CHECKIN card to a booking.
     * Transitions the card from PENDING_CHECKIN → ACTIVE.
     *
     * Body:
     *   booking_id  string  required
     */
    public function attachCardToBooking(Request $request, Response $response, array $args): Response
    {
        try {
            $body      = (array) ($request->getParsedBody() ?? []);
            $tenantId  = $request->getAttribute('auth.tenant_id');
            $userId    = $request->getAttribute('auth.user_id');
            $bookingId = $body['booking_id'] ?? null;

            if (!$bookingId) return $this->response->error($response, 'booking_id is required', 400);

            $card = $this->cardService->attachCardToBooking(
                cardId:    $args['id'],
                bookingId: $bookingId,
                userId:    $userId,
                tenantId:  $tenantId,
            );

            return $this->response->success($response, $this->serializeCard($card), 'Card attached to booking successfully');
        } catch (\DomainException $e) {
            return $this->response->error($response, $e->getMessage(), 422);
        } catch (\RuntimeException $e) {
            return $this->response->notFound($response, $e->getMessage());
        } catch (\Throwable $e) {
            return $this->response->error($response, $e->getMessage(), 500);
        }
    }

    /**
     * GET /api/cards/pending?property_id=
     *
     * List all PENDING_CHECKIN cards — reception uses this to pick a card
     * for a guest checking in (when card enforcement is enabled).
     */
    public function listPendingCards(Request $request, Response $response): Response
    {
        try {
            $propertyId = $request->getQueryParams()['property_id'] ?? null;
            $tenantId   = $request->getAttribute('auth.tenant_id');

            if (!$propertyId) return $this->response->error($response, 'property_id is required', 400);

            $cards = $this->cardService->listPendingCards($propertyId, $tenantId);
            return $this->response->success($response, [
                'items' => array_map(fn(GuestCard $c) => $this->serializeCard($c), $cards),
                'total' => count($cards),
            ]);
        } catch (\Throwable $e) {
            return $this->response->error($response, $e->getMessage(), 500);
        }
    }

    /** POST /api/cards/scan — Universal scan endpoint */
    public function scan(Request $request, Response $response): Response
    {
        try {
            $body     = (array) ($request->getParsedBody() ?? []);
            $tenantId = $request->getAttribute('auth.tenant_id');
            $userId   = $request->getAttribute('auth.user_id');

            $cardUid = trim($body['card_uid'] ?? '');
            $context = trim($body['context']  ?? '');

            if (!$cardUid) return $this->response->error($response, 'card_uid is required', 400);
            if (!$context) return $this->response->error($response, 'context is required', 400);

            $result = $this->cardService->scan(
                cardUid:      $cardUid,
                context:      $context,
                tenantId:     $tenantId,
                scanPointId:  $body['scan_point_id']  ?? null,
                scanDeviceId: $body['scan_device_id'] ?? null,
                chargeAmount: isset($body['charge_amount']) ? (string) $body['charge_amount'] : null,
                chargeDesc:   $body['charge_description'] ?? null,
                scannedBy:    $userId,
            );

            $httpStatus = $result['allowed'] ? 200 : 403;
            return $this->response->success($response->withStatus($httpStatus), $result);
        } catch (\Throwable $e) {
            return $this->response->error($response, $e->getMessage(), 500);
        }
    }

    /** GET /api/cards/lookup/{cardUid} — Look up by UID directly (QR scan URL) */
    public function lookup(Request $request, Response $response, array $args): Response
    {
        try {
            $tenantId = $request->getAttribute('auth.tenant_id');
            $userId   = $request->getAttribute('auth.user_id');
            $cardUid  = $args['cardUid'] ?? '';

            if (!$cardUid) return $this->response->error($response, 'card_uid is required', 400);

            $result = $this->cardService->scan(
                cardUid:   $cardUid,
                context:   'reception_lookup',
                tenantId:  $tenantId,
                scannedBy: $userId,
            );
            return $this->response->success($response, $result);
        } catch (\Throwable $e) {
            return $this->response->error($response, $e->getMessage(), 500);
        }
    }

    /** POST /api/cards/{id}/report-lost */
    public function reportLost(Request $request, Response $response, array $args): Response
    {
        try {
            $body     = (array) ($request->getParsedBody() ?? []);
            $tenantId = $request->getAttribute('auth.tenant_id');
            $userId   = $request->getAttribute('auth.user_id');

            $result = $this->cardService->reportLost(
                $args['id'],
                $tenantId,
                $body['replace_with_uid'] ?? null,
                $body['notes']           ?? null,
                $userId,
            );
            return $this->response->success($response, $result, 'Card reported as lost');
        } catch (\Throwable $e) {
            return $this->response->error($response, $e->getMessage(), 422);
        }
    }

    /** POST /api/cards/{id}/deactivate */
    public function deactivate(Request $request, Response $response, array $args): Response
    {
        try {
            $body     = (array) ($request->getParsedBody() ?? []);
            $tenantId = $request->getAttribute('auth.tenant_id');
            $userId   = $request->getAttribute('auth.user_id');

            $card = $this->cardService->deactivate(
                $args['id'],
                $tenantId,
                $body['reason'] ?? 'manual',
                $userId,
            );
            return $this->response->success($response, $this->serializeCard($card), 'Card deactivated');
        } catch (\Throwable $e) {
            return $this->response->error($response, $e->getMessage(), 422);
        }
    }

    /**
     * POST /api/cards/{id}/revoke
     *
     * Security-only card revocation. Distinct from management deactivation:
     * - Creates an audit event of type REVOKED (not DEACTIVATED)
     * - Only accessible to security, manager, property_admin roles
     * - The card's booking association is cleared
     * - Reception staff CANNOT revoke cards — only security + management
     *
     * Body: { reason: string (required) }
     */
    public function revoke(Request $request, Response $response, array $args): Response
    {
        try {
            $body     = (array) ($request->getParsedBody() ?? []);
            $tenantId = $request->getAttribute('auth.tenant_id');
            $userId   = $request->getAttribute('auth.user_id');
            $reason   = trim($body['reason'] ?? '');

            if ($reason === '') {
                return $this->response->validationError($response, ['reason' => 'Reason is required for card revocation.']);
            }

            $card = $this->cardService->revoke($args['id'], $tenantId, $reason, $userId);
            return $this->response->success($response, $this->serializeCard($card), 'Card revoked');
        } catch (\RuntimeException $e) {
            return $this->response->error($response, $e->getMessage(), 422);
        }
    }

    /**
     * POST /api/cards/{id}/reactivate
     *
     * Security-only reactivation for guests who changed their mind at the exit gate.
     * Restores the card's ACTIVE state and re-links it to the booking.
     *
     * Body: { booking_id: string (required), guest_id: string (required) }
     */
    public function reactivate(Request $request, Response $response, array $args): Response
    {
        try {
            $body      = (array) ($request->getParsedBody() ?? []);
            $tenantId  = $request->getAttribute('auth.tenant_id');
            $userId    = $request->getAttribute('auth.user_id');
            $bookingId = trim($body['booking_id'] ?? '');
            $guestId   = trim($body['guest_id']   ?? '');

            if ($bookingId === '') {
                return $this->response->validationError($response, ['booking_id' => 'booking_id is required']);
            }
            if ($guestId === '') {
                return $this->response->validationError($response, ['guest_id' => 'guest_id is required']);
            }

            $card = $this->cardService->reactivate($args['id'], $tenantId, $bookingId, $guestId, $userId);
            return $this->response->success($response, $this->serializeCard($card), 'Card reactivated — guest may re-enter');
        } catch (\RuntimeException $e) {
            return $this->response->error($response, $e->getMessage(), 422);
        }
    }

    // ══════════════════════════════════════════════════════════════
    // PHASE B — Inventory Management
    // ══════════════════════════════════════════════════════════════

    /** POST /api/card-inventory/register — Register one card */
    public function registerCard(Request $request, Response $response): Response
    {
        try {
            $body      = (array) ($request->getParsedBody() ?? []);
            $tenantId  = $request->getAttribute('auth.tenant_id');

            $propertyId = $body['property_id'] ?? null;
            $cardUid    = trim($body['card_uid']    ?? '');
            $cardNumber = trim($body['card_number'] ?? '');

            if (!$propertyId) return $this->response->error($response, 'property_id is required', 400);
            if (!$cardUid)    return $this->response->error($response, 'card_uid is required', 400);
            if (!$cardNumber) return $this->response->error($response, 'card_number is required', 400);

            $card = $this->cardService->registerCard($propertyId, $cardUid, $cardNumber, $tenantId);
            return $this->response->created($response, $this->serializeCard($card), 'Card registered in inventory');
        } catch (\Throwable $e) {
            return $this->response->error($response, $e->getMessage(), 422);
        }
    }

    /** POST /api/card-inventory/register-bulk */
    public function registerBulk(Request $request, Response $response): Response
    {
        try {
            $body       = (array) ($request->getParsedBody() ?? []);
            $tenantId   = $request->getAttribute('auth.tenant_id');
            $propertyId = $body['property_id'] ?? null;
            $cards      = $body['cards']       ?? [];

            if (!$propertyId)       return $this->response->error($response, 'property_id is required', 400);
            if (empty($cards))      return $this->response->error($response, 'cards array is required', 400);
            if (count($cards) > 500) return $this->response->error($response, 'Maximum 500 cards per bulk request', 400);

            $result = $this->cardService->registerCardsBulk($propertyId, $cards, $tenantId);

            return $this->response->success($response, [
                'registered_count' => count($result['registered']),
                'skipped_count'    => count($result['skipped']),
                'skipped'          => $result['skipped'],
                'registered'       => array_map(fn(GuestCard $c) => $this->serializeCard($c), $result['registered']),
            ], 'Bulk registration complete');
        } catch (\Throwable $e) {
            return $this->response->error($response, $e->getMessage(), 422);
        }
    }

    /** GET /api/card-inventory/report */
    public function inventoryReport(Request $request, Response $response): Response
    {
        try {
            $filters    = PaginationHelper::filtersFromRequest($request, ['property_id']);
            $propertyId = $filters['property_id'] ?? null;
            if (!$propertyId) return $this->response->error($response, 'property_id is required', 400);

            $report = $this->cardService->getInventoryReport($propertyId);
            return $this->response->success($response, $report);
        } catch (\Throwable $e) {
            return $this->response->error($response, $e->getMessage(), 500);
        }
    }

    // ══════════════════════════════════════════════════════════════
    // PHASE C — Event Log
    // ══════════════════════════════════════════════════════════════

    /** GET /api/card-events */
    public function listEvents(Request $request, Response $response): Response
    {
        try {
            $filters    = PaginationHelper::filtersFromRequest($request, [
                'property_id', 'event_type', 'date_from', 'date_to', 'guest_id', 'scan_point_type',
            ]);
            $pagination = PaginationHelper::fromRequest($request);

            $propertyId = $filters['property_id'] ?? null;
            if (!$propertyId) return $this->response->error($response, 'property_id is required', 400);

            $result = $this->eventRepo->findByPropertyFiltered(
                $propertyId,
                $filters['event_type']       ?? null,
                $filters['date_from']        ?? null,
                $filters['date_to']          ?? null,
                $filters['guest_id']         ?? null,
                $filters['scan_point_type']  ?? null,
                $pagination['page'],
                $pagination['limit'],
            );

            $items = array_map(fn(GuestCardEvent $e) => $e->toArray(), $result['items']);
            return $this->response->paginated($response, $items, $result['total'], $pagination['page'], $pagination['limit']);
        } catch (\Throwable $e) {
            return $this->response->error($response, $e->getMessage(), 500);
        }
    }

    /** GET /api/card-events/live?property_id= */
    public function liveEvents(Request $request, Response $response): Response
    {
        try {
            $filters    = PaginationHelper::filtersFromRequest($request, ['property_id']);
            $propertyId = $filters['property_id'] ?? null;
            if (!$propertyId) return $this->response->error($response, 'property_id is required', 400);

            $events = $this->eventRepo->findRecent($propertyId, 50);
            return $this->response->success($response, [
                'events'    => array_map(fn(GuestCardEvent $e) => $e->toArray(), $events),
                'refreshed_at' => (new \DateTimeImmutable())->format('c'),
            ]);
        } catch (\Throwable $e) {
            return $this->response->error($response, $e->getMessage(), 500);
        }
    }

    /** GET /api/card-events/booking/{bookingId} */
    public function eventsByBooking(Request $request, Response $response, array $args): Response
    {
        try {
            $events = $this->eventRepo->findByBooking($args['bookingId']);
            return $this->response->success($response, [
                'events' => array_map(fn(GuestCardEvent $e) => $e->toArray(), $events),
                'total'  => count($events),
            ]);
        } catch (\Throwable $e) {
            return $this->response->error($response, $e->getMessage(), 500);
        }
    }

    /** GET /api/card-events/guest/{guestId} — Full movement timeline for a guest */
    public function guestMovementTimeline(Request $request, Response $response, array $args): Response
    {
        try {
            $events = $this->eventRepo->findByGuest($args['guestId'], 200);
            return $this->response->success($response, [
                'guest_id' => $args['guestId'],
                'events'   => array_map(fn(GuestCardEvent $e) => $e->toArray(), $events),
                'total'    => count($events),
            ]);
        } catch (\Throwable $e) {
            return $this->response->error($response, $e->getMessage(), 500);
        }
    }

    // ══════════════════════════════════════════════════════════════
    // PHASE D — Scan Points
    // ══════════════════════════════════════════════════════════════

    /** GET /api/scan-points */
    public function listScanPoints(Request $request, Response $response): Response
    {
        try {
            $filters    = PaginationHelper::filtersFromRequest($request, ['property_id']);
            $propertyId = $filters['property_id'] ?? null;
            if (!$propertyId) return $this->response->error($response, 'property_id is required', 400);

            $points = $this->scanPointRepo->findByProperty($propertyId);
            return $this->response->success($response, [
                'items' => array_map(fn(CardScanPoint $sp) => $this->serializeScanPoint($sp), $points),
                'total' => count($points),
            ]);
        } catch (\Throwable $e) {
            return $this->response->error($response, $e->getMessage(), 500);
        }
    }

    /** POST /api/scan-points */
    public function createScanPoint(Request $request, Response $response): Response
    {
        try {
            $body       = (array) ($request->getParsedBody() ?? []);
            $tenantId   = $request->getAttribute('auth.tenant_id');

            $propertyId = $body['property_id']     ?? null;
            $name       = trim($body['name']       ?? '');
            $type       = trim($body['scan_point_type'] ?? '');

            if (!$propertyId) return $this->response->error($response, 'property_id is required', 400);
            if (!$name)       return $this->response->error($response, 'name is required', 400);
            if (!$type)       return $this->response->error($response, 'scan_point_type is required', 400);

            $sp = $this->cardService->createScanPoint($propertyId, $name, $type, $tenantId, $body['location_desc'] ?? null);
            return $this->response->created($response, $this->serializeScanPoint($sp), 'Scan point created');
        } catch (\ValueError $e) {
            return $this->response->error($response, 'Invalid scan_point_type. Valid: reception, security, facility, pos, entry_gate, exit_gate', 400);
        } catch (\Throwable $e) {
            return $this->response->error($response, $e->getMessage(), 422);
        }
    }

    /** PUT /api/scan-points/{id} */
    public function updateScanPoint(Request $request, Response $response, array $args): Response
    {
        try {
            $body = (array) ($request->getParsedBody() ?? []);
            $sp   = $this->cardService->updateScanPoint($args['id'], $body);
            return $this->response->success($response, $this->serializeScanPoint($sp), 'Scan point updated');
        } catch (\Throwable $e) {
            return $this->response->error($response, $e->getMessage(), 422);
        }
    }

    /** POST /api/scan-points/{id}/regenerate-key */
    public function regenerateKey(Request $request, Response $response, array $args): Response
    {
        try {
            $sp = $this->cardService->regenerateScanPointKey($args['id']);
            return $this->response->success($response, $this->serializeScanPoint($sp), 'Device key regenerated');
        } catch (\Throwable $e) {
            return $this->response->error($response, $e->getMessage(), 422);
        }
    }

    /** DELETE /api/scan-points/{id} */
    public function deleteScanPoint(Request $request, Response $response, array $args): Response
    {
        try {
            $this->cardService->deleteScanPoint($args['id']);
            return $this->response->noContent($response);
        } catch (\Throwable $e) {
            return $this->response->error($response, $e->getMessage(), 422);
        }
    }

    // ══════════════════════════════════════════════════════════════
    // Serializers
    // ══════════════════════════════════════════════════════════════

    /**
     * POST /api/cards/gate-issue
     * Security issues a card by card_id (from search results), capturing guest name + phone.
     */
    public function gateIssueCard(Request $request, Response $response): Response
    {
        try {
            $body       = (array) ($request->getParsedBody() ?? []);
            $tenantId   = $request->getAttribute('auth.tenant_id');
            $userId     = $request->getAttribute('auth.user_id');
            $propertyId = $body['property_id'] ?? $request->getAttribute('auth.property_id') ?? null;
            $cardId     = trim($body['card_id'] ?? '');

            if (!$propertyId)  return $this->response->error($response, 'property_id is required', 400);
            if (!$cardId)      return $this->response->error($response, 'card_id is required', 400);

            $card = $this->cardService->gateIssueCardById(
                cardId:      $cardId,
                propertyId:  $propertyId,
                issuedBy:    $userId,
                tenantId:    $tenantId,
                guestName:   $body['guest_name']   ?? null,
                phone:       $body['phone']         ?? null,
                plateNumber: $body['plate_number']  ?? null,
                bookingRef:  $body['booking_ref']   ?? null,
                notes:       $body['notes']         ?? null,
            );

            return $this->response->created($response, $this->serializeCard($card), 'Card issued at gate — pending pool');
        } catch (\DomainException $e) {
            return $this->response->error($response, $e->getMessage(), 422);
        } catch (\Throwable $e) {
            return $this->response->error($response, $e->getMessage(), 500);
        }
    }

    /**
     * POST /api/cards/security-exit
     * Security confirms guest has left the premises. Revokes card, logs event, triggers discrepancy check.
     */
    public function securityExit(Request $request, Response $response): Response
    {
        try {
            $body       = (array) ($request->getParsedBody() ?? []);
            $tenantId   = $request->getAttribute('auth.tenant_id');
            $userId     = $request->getAttribute('auth.user_id');
            $propertyId = $body['property_id'] ?? $request->getAttribute('auth.property_id') ?? null;
            $cardId     = trim($body['card_id'] ?? '');

            if (!$propertyId) return $this->response->error($response, 'property_id is required', 400);
            if (!$cardId)     return $this->response->error($response, 'card_id is required', 400);

            $card = $this->cardService->securityProcessExit($cardId, $propertyId, $tenantId, $userId);
            return $this->response->success($response, $this->serializeCard($card), 'Exit processed — card revoked');
        } catch (\DomainException $e) {
            return $this->response->error($response, $e->getMessage(), 422);
        } catch (\Throwable $e) {
            return $this->response->error($response, $e->getMessage(), 500);
        }
    }

    /**
     * GET /api/cards/lookup?q={query}&property_id={id}
     * Look up a card by card_number or card_uid.
     */
    public function lookupByQuery(Request $request, Response $response): Response
    {
        $params     = $request->getQueryParams();
        $propertyId = $params['property_id'] ?? $request->getAttribute('auth.property_id') ?? null;
        $q          = trim($params['q'] ?? '');

        if (!$propertyId || !$q) return $this->response->error($response, 'property_id and q are required', 400);

        $card = $this->cardService->lookupByQuery($propertyId, $q);
        if (!$card) return $this->response->notFound($response, 'Card not found');
        return $this->response->success($response, $card);
    }

    /**
     * GET /api/security/checkout-discrepancies
     */
    public function checkoutDiscrepancies(Request $request, Response $response): Response
    {
        $params     = $request->getQueryParams();
        $propertyId = $params['property_id'] ?? $request->getAttribute('auth.property_id') ?? null;
        if (!$propertyId) return $this->response->error($response, 'property_id is required', 400);

        $data = $this->cardService->getDiscrepancies(
            $propertyId,
            $params['type'] ?? null,
            (int) ($params['page'] ?? 1),
        );
        return $this->response->success($response, $data);
    }

    private function serializeCard(GuestCard $card): array
    {
        return [
            'id'                        => $card->getId(),
            'card_uid'                  => $card->getCardUid(),
            'card_number'               => $card->getCardNumber(),
            'status'                    => $card->getStatus()->value,
            'status_label'              => $card->getStatus()->label(),
            'status_color'              => $card->getStatus()->color(),
            'booking_id'                => $card->getBookingId(),
            'guest_id'                  => $card->getGuestId(),
            'issued_by'                 => $card->getIssuedBy(),
            'issued_at'                 => $card->getIssuedAt()?->format('c'),
            'deactivated_at'            => $card->getDeactivatedAt()?->format('c'),
            'replaced_by'               => $card->getReplacedBy(),
            'notes'                     => $card->getNotes(),
            // Security-gate issuance
            'plate_number'              => $card->getPlateNumber(),
            'gate_guest_name'           => $card->getGateGuestName(),
            'gate_phone'                => $card->getGatePhone(),
            'guest_name'                => $card->getGateGuestName(), // alias for frontend convenience
            'issued_by_security'        => $card->isIssuedBySecurity(),
            'security_issued_at'        => $card->getSecurityIssuedAt()?->format('c'),
            'security_exit_at'          => $card->getSecurityExitAt()?->format('c'),
            'receptionist_checkout_at'  => $card->getReceptionistCheckoutAt()?->format('c'),
            'created_at'                => $card->getCreatedAt()->format('c'),
        ];
    }

    private function serializeScanPoint(CardScanPoint $sp): array
    {
        return [
            'id'              => $sp->getId(),
            'name'            => $sp->getName(),
            'scan_point_type' => $sp->getScanPointType()->value,
            'type_label'      => $sp->getScanPointType()->label(),
            'location_desc'   => $sp->getLocationDesc(),
            'is_active'       => $sp->isActive(),
            'device_key'      => $sp->getDeviceKey(),
            'property_id'     => $sp->getPropertyId(),
        ];
    }
}

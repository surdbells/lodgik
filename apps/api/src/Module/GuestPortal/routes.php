<?php
declare(strict_types=1);

use Lodgik\Module\GuestPortal\GuestPortalController;
use Lodgik\Middleware\GuestMiddleware;
use Slim\App;
use Slim\Routing\RouteCollectorProxy;

return function (App $app): void {
    $app->group('/api/guest', function (RouteCollectorProxy $g) {

        // ── Booking & Folio ──────────────────────────────────────
        $g->get('/booking',                            [GuestPortalController::class, 'booking']);
        $g->get('/folio',                              [GuestPortalController::class, 'folio']);

        // ── Service Requests ─────────────────────────────────────
        $g->get('/service-requests',                   [GuestPortalController::class, 'listServiceRequests']);
        $g->post('/service-requests',                  [GuestPortalController::class, 'createServiceRequest']);

        // ── Chat ─────────────────────────────────────────────────
        $g->get('/chat/messages',                      [GuestPortalController::class, 'chatMessages']);
        $g->post('/chat/send',                         [GuestPortalController::class, 'chatSend']);
        $g->post('/chat/read',                         [GuestPortalController::class, 'chatMarkRead']);
        $g->get('/chat/unread',                        [GuestPortalController::class, 'chatUnreadCount']);

        // ── Visitor Codes ────────────────────────────────────────
        $g->get('/visitor-codes',                      [GuestPortalController::class, 'listVisitorCodes']);
        $g->post('/visitor-codes',                     [GuestPortalController::class, 'createVisitorCode']);
        $g->delete('/visitor-codes/{id}',              [GuestPortalController::class, 'revokeVisitorCode']);

        // ── Stay Extension ───────────────────────────────────────
        $g->post('/stay-extension',                    [GuestPortalController::class, 'requestStayExtension']);

        // ── Room Controls ────────────────────────────────────────
        $g->get('/room-controls/status',               [GuestPortalController::class, 'getRoomControlStatus']);
        $g->post('/room-controls/dnd',                 [GuestPortalController::class, 'toggleDnd']);
        $g->post('/room-controls/make-up',             [GuestPortalController::class, 'toggleMakeUp']);
        $g->post('/room-controls/maintenance',         [GuestPortalController::class, 'reportMaintenance']);

        // ── Lost & Found ─────────────────────────────────────────
        $g->get('/lost-and-found',                     [GuestPortalController::class, 'listLostReports']);
        $g->post('/lost-and-found',                    [GuestPortalController::class, 'reportLostItem']);

        // ── Hotel Info (WiFi + Amenities + Vouchers) ─────────────
        $g->get('/hotel-info',                         [GuestPortalController::class, 'hotelInfo']);

        // ── Spa ───────────────────────────────────────────────────
        $g->get('/spa/services',                       [GuestPortalController::class, 'listSpaServices']);
        $g->get('/spa/bookings',                       [GuestPortalController::class, 'listSpaBookings']);
        $g->post('/spa/book',                          [GuestPortalController::class, 'bookSpa']);
        $g->delete('/spa/bookings/{id}',               [GuestPortalController::class, 'cancelSpaBooking']);

        // ── Gym ───────────────────────────────────────────────────
        $g->get('/gym/plans',                          [GuestPortalController::class, 'listGymPlans']);
        $g->get('/gym/classes',                        [GuestPortalController::class, 'listGymClasses']);
        $g->post('/gym/classes/{id}/book',             [GuestPortalController::class, 'bookGymClass']);
        $g->get('/gym/class-bookings',                 [GuestPortalController::class, 'listGymClassBookings']);
        $g->delete('/gym/class-bookings/{id}',         [GuestPortalController::class, 'cancelGymClassBooking']);

        // ── Restaurant / Room Service ──────────────────────────────────
        $g->get('/menu',                               [GuestPortalController::class, 'restaurantMenu']);
        $g->get('/room-service/orders',                [GuestPortalController::class, 'listMyOrders']);
        $g->post('/room-service/orders',               [GuestPortalController::class, 'placeRoomServiceOrder']);

        // ── Guest Preferences ─────────────────────────────────────
        $g->get('/preferences',                        [GuestPortalController::class, 'getPreferences']);
        $g->put('/preferences',                        [GuestPortalController::class, 'updatePreferences']);

    })->add(GuestMiddleware::class);
};

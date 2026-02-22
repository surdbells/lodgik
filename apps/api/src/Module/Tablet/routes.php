<?php
declare(strict_types=1);
use Slim\App;

/**
 * Tablet Module
 * 
 * The tablet app (in-room guest tablet) uses endpoints from:
 * - GuestAuth module (/api/guest-auth/*) for guest authentication
 * - ServiceRequest module (/api/service-requests/*) for room service
 * - RoomControl module (/api/room-control/*) for AC/lighting/DND
 * - Chat module (/api/chat/*) for guest-staff messaging
 * - GuestServices module (/api/guest-services/*) for amenity vouchers, waitlist
 * 
 * No tablet-specific routes are needed as all functionality is provided
 * by existing modules with guest authentication.
 */
return function (App $app): void {
    // Tablet uses GuestAuth, ServiceRequest, RoomControl, Chat, GuestServices routes
};

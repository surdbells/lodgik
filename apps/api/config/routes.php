<?php

declare(strict_types=1);

use Slim\App;

return function (App $app): void {
    // ─── Health Check ─────────────────────────────────────────
    (require __DIR__ . '/../src/Module/Health/routes.php')($app);

    // ─── Phase 0: SaaS Platform ───────────────────────────────
    (require __DIR__ . '/../src/Module/Auth/routes.php')($app);
    (require __DIR__ . '/../src/Module/Staff/routes.php')($app);
    (require __DIR__ . '/../src/Module/Tenant/routes.php')($app);
    (require __DIR__ . '/../src/Module/Admin/routes.php')($app);
    (require __DIR__ . '/../src/Module/Feature/routes.php')($app);
    (require __DIR__ . '/../src/Module/Onboarding/routes.php')($app);
    (require __DIR__ . '/../src/Module/AppDistribution/routes.php')($app);
    (require __DIR__ . '/../src/Module/Subscription/routes.php')($app);
    (require __DIR__ . '/../src/Module/Usage/routes.php')($app);

    // ─── Phase 1: Core PMS ────────────────────────────────────
    (require __DIR__ . '/../src/Module/Room/routes.php')($app);
    (require __DIR__ . '/../src/Module/Guest/routes.php')($app);
    (require __DIR__ . '/../src/Module/Booking/routes.php')($app);
    (require __DIR__ . '/../src/Module/Dashboard/routes.php')($app);

    // ─── Reports ──────────────────────────────────────────────
    (require __DIR__ . '/../src/Module/Report/routes.php')($app);

    // ─── Phase 2: Finance ─────────────────────────────────────
    (require __DIR__ . '/../src/Module/Folio/routes.php')($app);
    (require __DIR__ . '/../src/Module/Invoice/routes.php')($app);

    // ─── Phase 3: HR & Payroll ────────────────────────────────
    (require __DIR__ . '/../src/Module/Employee/routes.php')($app);
    (require __DIR__ . '/../src/Module/Attendance/routes.php')($app);
    (require __DIR__ . '/../src/Module/Leave/routes.php')($app);
    (require __DIR__ . '/../src/Module/Payroll/routes.php')($app);

    // ─── Phase 4: Guest Experience ────────────────────────────
    (require __DIR__ . '/../src/Module/GuestAuth/routes.php')($app);
    (require __DIR__ . '/../src/Module/ServiceRequest/routes.php')($app);
    (require __DIR__ . '/../src/Module/Chat/routes.php')($app);
    (require __DIR__ . '/../src/Module/Notification/routes.php')($app);

    // ─── Phase 5: Gym ─────────────────────────────────────────
    (require __DIR__ . '/../src/Module/Gym/routes.php')($app);

    // ─── Phase 6: Operations & F&B ────────────────────────────
    (require __DIR__ . '/../src/Module/Housekeeping/routes.php')($app);
    (require __DIR__ . '/../src/Module/Pos/routes.php')($app);
    // Note: Bar & Kitchen operations handled via POS module
    // (sendToKitchen, kitchenQueue, markItemPreparing, markItemReady)

    // ─── Phase 7: Smart Guest Services ────────────────────────
    (require __DIR__ . '/../src/Module/Security/routes.php')($app);
    (require __DIR__ . '/../src/Module/RoomControl/routes.php')($app);
    (require __DIR__ . '/../src/Module/GuestServices/routes.php')($app);
    (require __DIR__ . '/../src/Module/Tablet/routes.php')($app);

    // ─── Phase 8A: Finance & Compliance ───────────────────────
    (require __DIR__ . '/../src/Module/Finance/routes.php')($app);

    // ─── Phase 8B: Asset Management ───────────────────────────
    (require __DIR__ . '/../src/Module/Asset/routes.php')($app);

    // ─── Phase 8C: WhatsApp (Termii) ──────────────────────────
    (require __DIR__ . '/../src/Module/WhatsApp/routes.php')($app);

    // ─── Phase 8D: Loyalty/CRM + Analytics ────────────────────
    (require __DIR__ . '/../src/Module/Loyalty/routes.php')($app);
    (require __DIR__ . '/../src/Module/Analytics/routes.php')($app);

    // ─── Phase 8E: Spa/Pool, OTA, IoT ─────────────────────────
    (require __DIR__ . '/../src/Module/Spa/routes.php')($app);
    (require __DIR__ . '/../src/Module/Ota/routes.php')($app);
    (require __DIR__ . '/../src/Module/IoT/routes.php')($app);

    // ─── Phase 9: Merchant Module ─────────────────────────────
    (require __DIR__ . '/../src/Module/Merchant/routes.php')($app);

    // ─── Platform Settings ────────────────────────────────────
    (require __DIR__ . '/../src/Module/Settings/routes.php')($app);

    // ─── Audit Logs ──────────────────────────────────────────
    (require __DIR__ . '/../src/Module/Audit/routes.php')($app);

    // ─── Phase A: Stock & Inventory ──────────────────────────
    (require __DIR__ . '/../src/Module/Inventory/routes.php')($app);
    (require __DIR__ . '/../src/Module/Procurement/routes.php')($app);

    // System job management (super_admin only)
    (require __DIR__ . '/../src/Module/System/routes.php')($app);

    // ─── Generic File Upload ──────────────────────────────────
    (require __DIR__ . '/../src/Module/Upload/routes.php')($app);
};

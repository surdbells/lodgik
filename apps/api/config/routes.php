<?php

declare(strict_types=1);

use Slim\App;

return function (App $app): void {
    // ─── Health Check (always available) ───────────────────────
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
    // (require __DIR__ . '/../src/Module/Onboarding/routes.php')($app);
    // (require __DIR__ . '/../src/Module/AppDistribution/routes.php')($app);

    // ─── Phase 1: Core PMS ────────────────────────────────────
    (require __DIR__ . '/../src/Module/Room/routes.php')($app);
    (require __DIR__ . '/../src/Module/Guest/routes.php')($app);
    (require __DIR__ . '/../src/Module/Booking/routes.php')($app);
    (require __DIR__ . '/../src/Module/Dashboard/routes.php')($app);

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
    (require __DIR__ . '/../src/Module/Gym/routes.php')($app);
    (require __DIR__ . '/../src/Module/Housekeeping/routes.php')($app);
    (require __DIR__ . '/../src/Module/Pos/routes.php')($app);
    // (require __DIR__ . '/../src/Module/Tablet/routes.php')($app);

    // ─── Phase 5: Gym ─────────────────────────────────────────
    // (require __DIR__ . '/../src/Module/Gym/routes.php')($app);

    // ─── Phase 6: Operations & F&B ────────────────────────────
    // (require __DIR__ . '/../src/Module/Housekeeping/routes.php')($app);
    // (require __DIR__ . '/../src/Module/Bar/routes.php')($app);
    // (require __DIR__ . '/../src/Module/Kitchen/routes.php')($app);
};

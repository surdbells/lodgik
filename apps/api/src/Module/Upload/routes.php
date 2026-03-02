<?php

declare(strict_types=1);

use Lodgik\Middleware\AuthMiddleware;
use Lodgik\Middleware\RoleMiddleware;
use Lodgik\Module\Upload\UploadController;
use Slim\App;

return function (App $app): void {
    /**
     * POST /api/upload
     * Small file upload via base64 JSON body (images, PDFs — max 10 MB).
     * Any authenticated user may call this endpoint.
     * Contexts: kyc | document | avatar | resource | other
     */
    $app->post('/api/upload', [UploadController::class, 'upload'])
        ->add(AuthMiddleware::class);

    /**
     * POST /api/admin/upload/binary
     * Large app binary upload via multipart/form-data (APK, IPA, EXE, DMG… — max 500 MB).
     * Admin role only.
     * Contexts: binary | resource | other
     */
    $app->post('/api/admin/upload/binary', [UploadController::class, 'uploadBinary'])
        ->add(fn($req, $h) => (new RoleMiddleware(['admin', 'super_admin']))->process($req, $h))
        ->add(AuthMiddleware::class);
};

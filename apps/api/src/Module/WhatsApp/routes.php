<?php
declare(strict_types=1);
use Lodgik\Module\WhatsApp\WhatsAppController;
use Lodgik\Middleware\{RoleMiddleware, AuthMiddleware, TenantMiddleware};
use Slim\App;
use Slim\Routing\RouteCollectorProxy;

return function (App $app): void {
    // WhatsApp templates + sending (manager, admin, front desk, concierge)
    $app->group('/api/whatsapp', function (RouteCollectorProxy $g) {
        $g->get('/templates', [WhatsAppController::class, 'listTemplates']);
        $g->post('/templates', [WhatsAppController::class, 'createTemplate']);
        $g->put('/templates/{id}', [WhatsAppController::class, 'updateTemplate']);
        $g->post('/send', [WhatsAppController::class, 'sendMessage']);
        $g->post('/otp/send', [WhatsAppController::class, 'sendOtp']);
        $g->post('/otp/verify', [WhatsAppController::class, 'verifyOtp']);
        $g->get('/messages', [WhatsAppController::class, 'listMessages']);
        $g->get('/stats', [WhatsAppController::class, 'messageStats']);
        $g->get('/balance', [WhatsAppController::class, 'getBalance']);
    })->add(new RoleMiddleware(['property_admin', 'manager', 'front_desk', 'concierge']))
      ->add(TenantMiddleware::class)->add(AuthMiddleware::class);

    // Webhook — no auth (called by Termii)
    $app->post('/webhooks/whatsapp', [WhatsAppController::class, 'webhook']);
};

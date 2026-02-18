<?php

declare(strict_types=1);

namespace Lodgik\Module\Subscription;

use Lodgik\Helper\ResponseHelper;
use Lodgik\Service\PaystackService;
use Psr\Http\Message\ResponseInterface as Response;
use Psr\Http\Message\ServerRequestInterface as Request;

final class SubscriptionController
{
    public function __construct(
        private readonly SubscriptionService $subscriptionService,
        private readonly PaystackService $paystack,
        private readonly ResponseHelper $response,
    ) {}

    /**
     * GET /api/subscriptions/current
     */
    public function current(Request $request, Response $response): Response
    {
        $tenantId = $request->getAttribute('auth.tenant_id');
        $details = $this->subscriptionService->getCurrentDetails($tenantId);
        return $this->response->success($response, $details);
    }

    /**
     * POST /api/subscriptions/initialize
     * Body: { plan_id, billing_cycle: "monthly"|"annual", callback_url? }
     */
    public function initialize(Request $request, Response $response): Response
    {
        $tenantId = $request->getAttribute('auth.tenant_id');
        $body = (array) ($request->getParsedBody() ?? []);

        $planId = $body['plan_id'] ?? null;
        $billingCycle = $body['billing_cycle'] ?? 'monthly';
        $callbackUrl = $body['callback_url'] ?? null;

        if (empty($planId)) {
            return $this->response->validationError($response, ['plan_id' => 'Required']);
        }
        if (!in_array($billingCycle, ['monthly', 'annual'], true)) {
            return $this->response->validationError($response, ['billing_cycle' => 'Must be monthly or annual']);
        }

        // Get tenant email from the JWT user or body
        $email = $body['email'] ?? null;
        if (empty($email)) {
            return $this->response->validationError($response, ['email' => 'Required for payment']);
        }

        try {
            $result = $this->subscriptionService->initializeCheckout($tenantId, $planId, $billingCycle, $email, $callbackUrl);
        } catch (\RuntimeException $e) {
            return $this->response->error($response, $e->getMessage(), 400);
        }

        return $this->response->success($response, $result, 'Checkout initialized');
    }

    /**
     * POST /api/subscriptions/verify
     * Body: { reference }
     */
    public function verify(Request $request, Response $response): Response
    {
        $tenantId = $request->getAttribute('auth.tenant_id');
        $body = (array) ($request->getParsedBody() ?? []);
        $reference = $body['reference'] ?? null;

        if (empty($reference)) {
            return $this->response->validationError($response, ['reference' => 'Required']);
        }

        try {
            $result = $this->subscriptionService->verifyPayment($reference, $tenantId);
        } catch (\RuntimeException $e) {
            return $this->response->error($response, $e->getMessage(), 400);
        }

        return $this->response->success($response, $result, 'Subscription activated');
    }

    /**
     * POST /api/subscriptions/webhook (public — Paystack calls this)
     */
    public function webhook(Request $request, Response $response): Response
    {
        $rawBody = (string) $request->getBody();
        $signature = $request->getHeaderLine('x-paystack-signature');

        // Verify signature
        if (!empty($signature) && $this->paystack->isConfigured()) {
            if (!$this->paystack->verifyWebhookSignature($rawBody, $signature)) {
                return $this->response->error($response, 'Invalid signature', 401);
            }
        }

        $payload = json_decode($rawBody, true);
        if ($payload === null) {
            return $this->response->error($response, 'Invalid payload', 400);
        }

        $event = $payload['event'] ?? '';
        $data = $payload['data'] ?? [];

        try {
            $result = $this->subscriptionService->processWebhook($event, $data);
        } catch (\Throwable $e) {
            // Log error but always return 200 to Paystack
            return $this->response->success($response, ['error' => $e->getMessage()]);
        }

        return $this->response->success($response, $result);
    }

    /**
     * POST /api/subscriptions/upgrade
     * Body: { plan_id, billing_cycle, email }
     */
    public function upgrade(Request $request, Response $response): Response
    {
        $tenantId = $request->getAttribute('auth.tenant_id');
        $body = (array) ($request->getParsedBody() ?? []);

        $planId = $body['plan_id'] ?? null;
        $billingCycle = $body['billing_cycle'] ?? 'monthly';
        $email = $body['email'] ?? null;

        if (empty($planId)) {
            return $this->response->validationError($response, ['plan_id' => 'Required']);
        }

        try {
            $result = $this->subscriptionService->upgrade($tenantId, $planId, $billingCycle, $email ?? '');
        } catch (\RuntimeException $e) {
            return $this->response->error($response, $e->getMessage(), 400);
        }

        return $this->response->success($response, $result, 'Upgrade processed');
    }

    /**
     * POST /api/subscriptions/cancel
     */
    public function cancel(Request $request, Response $response): Response
    {
        $tenantId = $request->getAttribute('auth.tenant_id');

        try {
            $result = $this->subscriptionService->cancel($tenantId);
        } catch (\RuntimeException $e) {
            return $this->response->error($response, $e->getMessage(), 400);
        }

        return $this->response->success($response, $result, $result['message'] ?? 'Cancelled');
    }

    /**
     * GET /api/subscriptions/invoices
     */
    public function invoices(Request $request, Response $response): Response
    {
        $tenantId = $request->getAttribute('auth.tenant_id');
        $invoices = $this->subscriptionService->getInvoices($tenantId);

        $items = array_map(fn($i) => [
            'id' => $i->getId(),
            'invoice_number' => $i->getInvoiceNumber(),
            'amount' => $i->getAmount(),
            'currency' => $i->getCurrency(),
            'status' => $i->getStatus(),
            'billing_cycle' => $i->getBillingCycle(),
            'period_start' => $i->getPeriodStart()->format('c'),
            'period_end' => $i->getPeriodEnd()->format('c'),
            'paid_at' => $i->getPaidAt()?->format('c'),
            'paystack_reference' => $i->getPaystackReference(),
            'created_at' => $i->getCreatedAt()?->format('c'),
        ], $invoices);

        return $this->response->success($response, $items);
    }
}

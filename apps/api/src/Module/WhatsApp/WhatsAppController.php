<?php
declare(strict_types=1);
namespace Lodgik\Module\WhatsApp;

use Psr\Http\Message\ResponseInterface as Response;
use Psr\Http\Message\ServerRequestInterface as Request;

final class WhatsAppController
{
    public function __construct(private readonly WhatsAppService $svc) {}

    private function json(Response $r, mixed $d, int $s = 200): Response
    {
        $r->getBody()->write(json_encode($d));
        return $r->withHeader('Content-Type', 'application/json')->withStatus($s);
    }

    private function body(Request $req): array { return (array)$req->getParsedBody(); }

    // Templates
    public function listTemplates(Request $req, Response $res): Response
    {
        $p = $req->getQueryParams();
        return $this->json($res, ['success' => true, 'data' => $this->svc->listTemplates($req->getAttribute('auth.tenant_id'), $p['type'] ?? null)]);
    }

    public function createTemplate(Request $req, Response $res): Response
    {
        $d = $this->body($req);
        $t = $this->svc->createTemplate($d['name'], $d['message_type'], $d['body'], $d['param_names'] ?? [], $req->getAttribute('auth.tenant_id'), $d['language'] ?? 'en');
        return $this->json($res, ['success' => true, 'data' => $t->toArray()], 201);
    }

    public function updateTemplate(Request $req, Response $res, array $args): Response
    {
        return $this->json($res, ['success' => true, 'data' => $this->svc->updateTemplate($args['id'], $this->body($req))->toArray()]);
    }

    // Sending
    public function sendMessage(Request $req, Response $res): Response
    {
        $d = $this->body($req);
        if (!empty($d['template_type'])) {
            $msg = $this->svc->sendFromTemplate($d['property_id'], $req->getAttribute('auth.tenant_id'), $d['template_type'], $d['phone'], $d['params'] ?? [], $d['recipient_name'] ?? null, $d['booking_id'] ?? null, $d['guest_id'] ?? null);
        } else {
            $msg = $this->svc->sendCustom($d['property_id'], $req->getAttribute('auth.tenant_id'), $d['phone'], $d['message'], $d['recipient_name'] ?? null);
        }
        return $this->json($res, ['success' => true, 'data' => $msg->toArray()], 201);
    }

    // OTP
    public function sendOtp(Request $req, Response $res): Response
    {
        $d = $this->body($req);
        $result = $this->svc->sendOtp($d['property_id'], $req->getAttribute('auth.tenant_id'), $d['phone'], $d['recipient_name'] ?? null);
        return $this->json($res, $result, $result['success'] ? 200 : 400);
    }

    public function verifyOtp(Request $req, Response $res): Response
    {
        $d = $this->body($req);
        $result = $this->svc->verifyOtp($d['pin_id'], $d['pin']);
        return $this->json($res, $result, $result['success'] ? 200 : 400);
    }

    // Webhook (Termii delivery reports)
    public function webhook(Request $req, Response $res): Response
    {
        $this->svc->handleWebhook($this->body($req));
        return $this->json($res, ['success' => true]);
    }

    // History + Stats
    public function listMessages(Request $req, Response $res): Response
    {
        $p = $req->getQueryParams();
        return $this->json($res, ['success' => true, 'data' => $this->svc->listMessages($p['property_id'] ?? '', $p['phone'] ?? null, $p['type'] ?? null)]);
    }

    public function messageStats(Request $req, Response $res): Response
    {
        return $this->json($res, ['success' => true, 'data' => $this->svc->getMessageStats($req->getQueryParams()['property_id'] ?? '')]);
    }

    public function getBalance(Request $req, Response $res): Response
    {
        return $this->json($res, ['success' => true, 'data' => $this->svc->getBalance()]);
    }
}

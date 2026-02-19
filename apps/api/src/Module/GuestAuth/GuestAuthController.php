<?php

declare(strict_types=1);

namespace Lodgik\Module\GuestAuth;

use Psr\Http\Message\ResponseInterface as Response;
use Psr\Http\Message\ServerRequestInterface as Request;
use Lodgik\Util\JsonResponse;

final class GuestAuthController
{
    public function __construct(private readonly GuestAuthService $service) {}

    /** POST /guest-auth/otp/send — Send OTP to guest phone */
    public function sendOtp(Request $req, Response $res): Response
    {
        $d = (array) $req->getParsedBody();
        if (empty($d['phone'])) return JsonResponse::error($res, 'phone required', 422);
        $tenantId = $d['tenant_id'] ?? $req->getAttribute('auth.tenant_id') ?? '';
        if (empty($tenantId)) return JsonResponse::error($res, 'tenant_id required', 422);
        try {
            return JsonResponse::ok($res, $this->service->sendOtp($d['phone'], $tenantId));
        } catch (\RuntimeException $e) { return JsonResponse::error($res, $e->getMessage(), 422); }
    }

    /** POST /guest-auth/otp/verify — Verify OTP and create session */
    public function verifyOtp(Request $req, Response $res): Response
    {
        $d = (array) $req->getParsedBody();
        foreach (['phone', 'otp'] as $f) { if (empty($d[$f])) return JsonResponse::error($res, "$f required", 422); }
        $tenantId = $d['tenant_id'] ?? $req->getAttribute('auth.tenant_id') ?? '';
        try {
            return JsonResponse::ok($res, $this->service->verifyOtp($d['phone'], $d['otp'], $tenantId), 'Login successful');
        } catch (\RuntimeException $e) { return JsonResponse::error($res, $e->getMessage(), 401); }
    }

    /** POST /guest-auth/access-code — Login via 6-digit access code */
    public function loginAccessCode(Request $req, Response $res): Response
    {
        $d = (array) $req->getParsedBody();
        if (empty($d['code'])) return JsonResponse::error($res, 'code required', 422);
        $tenantId = $d['tenant_id'] ?? $req->getAttribute('auth.tenant_id') ?? '';
        try {
            return JsonResponse::ok($res, $this->service->loginWithAccessCode($d['code'], $tenantId), 'Login successful');
        } catch (\RuntimeException $e) { return JsonResponse::error($res, $e->getMessage(), 401); }
    }

    /** POST /guest-auth/tablet — Tablet device authentication */
    public function tabletAuth(Request $req, Response $res): Response
    {
        $d = (array) $req->getParsedBody();
        if (empty($d['device_token'])) return JsonResponse::error($res, 'device_token required', 422);
        try {
            return JsonResponse::ok($res, $this->service->authenticateTablet($d['device_token']));
        } catch (\RuntimeException $e) { return JsonResponse::error($res, $e->getMessage(), 401); }
    }

    /** POST /guest-auth/logout */
    public function logout(Request $req, Response $res): Response
    {
        $token = str_replace('Bearer ', '', $req->getHeaderLine('Authorization'));
        $this->service->logout($token);
        return JsonResponse::ok($res, null, 'Logged out');
    }

    /** GET /guest-auth/session — Validate current session */
    public function validateSession(Request $req, Response $res): Response
    {
        $token = str_replace('Bearer ', '', $req->getHeaderLine('Authorization'));
        $session = $this->service->validateSession($token);
        if (!$session) return JsonResponse::error($res, 'Invalid session', 401);
        return JsonResponse::ok($res, $session->toArray());
    }

    // ─── Tablet Management (staff endpoints) ────────────────────

    /** GET /tablets — List tablets for property */
    public function listTablets(Request $req, Response $res): Response
    {
        $pid = $req->getQueryParams()['property_id'] ?? '';
        if (empty($pid)) return JsonResponse::error($res, 'property_id required', 422);
        return JsonResponse::ok($res, array_map(fn($t) => array_merge($t->toArray(), ['device_token' => $t->getDeviceToken()]), $this->service->listTablets($pid)));
    }

    /** POST /tablets — Register new tablet */
    public function registerTablet(Request $req, Response $res): Response
    {
        $d = (array) $req->getParsedBody();
        foreach (['property_id', 'room_id', 'name'] as $f) { if (empty($d[$f])) return JsonResponse::error($res, "$f required", 422); }
        $tablet = $this->service->registerTablet($d['property_id'], $d['room_id'], $d['name'], $req->getAttribute('auth.tenant_id'));
        return JsonResponse::ok($res, array_merge($tablet->toArray(), ['device_token' => $tablet->getDeviceToken()]), 'Tablet registered');
    }
}

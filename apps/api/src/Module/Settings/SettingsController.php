<?php

declare(strict_types=1);

namespace Lodgik\Module\Settings;

use Lodgik\Helper\JsonResponse;
use Lodgik\Service\ZeptoMailService;
use Psr\Http\Message\ResponseInterface as Response;
use Psr\Http\Message\ServerRequestInterface as Request;

final class SettingsController
{
    public function __construct(
        private readonly SettingsService $settings,
        private readonly ZeptoMailService $mailer,
    ) {}

    public function index(Request $req, Response $res): Response
    {
        return JsonResponse::ok($res, $this->settings->getAll());
    }

    public function update(Request $req, Response $res): Response
    {
        $body = (array) ($req->getParsedBody() ?? []);

        $saved = [];
        foreach ($body as $section => $data) {
            if (!is_array($data)) continue;
            try {
                $this->settings->saveSection($section, $data);
                $saved[] = $section;
            } catch (\RuntimeException $e) {
                return JsonResponse::error($res, $e->getMessage(), 422);
            }
        }

        return JsonResponse::ok($res, [
            'saved' => $saved,
            'settings' => $this->settings->getAll(),
        ], 'Settings saved successfully');
    }

    public function testEmail(Request $req, Response $res): Response
    {
        $body = (array) ($req->getParsedBody() ?? []);
        $toEmail = $body['email'] ?? null;

        // If no email provided, try admin's email from token
        if (!$toEmail) {
            $toEmail = 'admin@lodgik.co'; // fallback
        }

        // Get current settings for ZeptoMail
        $apiKey = $this->settings->getRaw('zeptomail.api_key');
        $fromEmail = $this->settings->getRaw('zeptomail.from_email') ?? 'noreply@lodgik.co';
        $fromName = $this->settings->getRaw('zeptomail.from_name') ?? 'Lodgik';

        if (!$apiKey) {
            return JsonResponse::error($res, 'ZeptoMail API key is not configured. Please save the API key first.', 422);
        }

        try {
            $result = $this->mailer->send(
                $toEmail,
                'Admin',
                'Lodgik Test Email',
                '<h2>Test Email from Lodgik</h2><p>If you received this, your ZeptoMail configuration is working correctly.</p><p>Sent at: ' . date('Y-m-d H:i:s') . '</p>',
            );

            if ($result) {
                return JsonResponse::ok($res, ['sent_to' => $toEmail], "Test email sent to $toEmail");
            } else {
                return JsonResponse::error($res, 'Email send returned false. Check ZeptoMail API key and from_email domain.', 500);
            }
        } catch (\Throwable $e) {
            return JsonResponse::error($res, 'Failed to send test email: ' . $e->getMessage(), 500);
        }
    }

    public function testSms(Request $req, Response $res): Response
    {
        $body = (array) ($req->getParsedBody() ?? []);
        $toPhone = $body['phone'] ?? null;

        if (!$toPhone) {
            return JsonResponse::error($res, 'Phone number is required', 422);
        }

        $apiKey = $this->settings->getRaw('termii.api_key');
        if (!$apiKey) {
            return JsonResponse::error($res, 'Termii API key is not configured. Please save the API key first.', 422);
        }

        $senderId = $this->settings->getRaw('termii.sender_id') ?? 'Lodgik';

        try {
            // Direct Termii API call for test
            $ch = curl_init('https://api.ng.termii.com/api/sms/send');
            curl_setopt_array($ch, [
                CURLOPT_POST => true,
                CURLOPT_RETURNTRANSFER => true,
                CURLOPT_HTTPHEADER => ['Content-Type: application/json'],
                CURLOPT_POSTFIELDS => json_encode([
                    'api_key' => $apiKey,
                    'to' => $toPhone,
                    'from' => $senderId,
                    'sms' => 'This is a test message from Lodgik. If you received this, your SMS configuration is working.',
                    'type' => 'plain',
                    'channel' => 'generic',
                ]),
            ]);
            $response = curl_exec($ch);
            $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
            curl_close($ch);

            $data = json_decode($response, true);
            if ($httpCode === 200 && ($data['message'] ?? '') === 'Successfully Sent') {
                return JsonResponse::ok($res, ['sent_to' => $toPhone], "Test SMS sent to $toPhone");
            } else {
                $errMsg = $data['message'] ?? $response;
                return JsonResponse::error($res, "SMS failed: $errMsg", 500);
            }
        } catch (\Throwable $e) {
            return JsonResponse::error($res, 'Failed to send test SMS: ' . $e->getMessage(), 500);
        }
    }
}

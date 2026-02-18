<?php

declare(strict_types=1);

namespace Lodgik\Service;

use Psr\Log\LoggerInterface;

final class ZeptoMailService
{
    private const API_URL = 'https://api.zeptomail.com/v1.1/email';

    public function __construct(
        private readonly string $apiKey,
        private readonly string $fromEmail,
        private readonly string $fromName,
        private readonly LoggerInterface $logger,
    ) {}

    /**
     * Send a transactional email.
     *
     * @param string $toEmail
     * @param string $toName
     * @param string $subject
     * @param string $htmlBody
     * @return bool
     */
    public function send(
        string $toEmail,
        string $toName,
        string $subject,
        string $htmlBody,
    ): bool {
        if ($this->apiKey === '') {
            $this->logger->warning('ZeptoMail API key not configured, skipping email', [
                'to' => $toEmail,
                'subject' => $subject,
            ]);
            return false;
        }

        $payload = [
            'from' => [
                'address' => $this->fromEmail,
                'name' => $this->fromName,
            ],
            'to' => [
                [
                    'email_address' => [
                        'address' => $toEmail,
                        'name' => $toName,
                    ],
                ],
            ],
            'subject' => $subject,
            'htmlbody' => $htmlBody,
        ];

        try {
            $ch = curl_init(self::API_URL);
            curl_setopt_array($ch, [
                CURLOPT_POST => true,
                CURLOPT_POSTFIELDS => json_encode($payload),
                CURLOPT_RETURNTRANSFER => true,
                CURLOPT_TIMEOUT => 15,
                CURLOPT_HTTPHEADER => [
                    'Content-Type: application/json',
                    'Authorization: Zoho-enczapikey ' . $this->apiKey,
                ],
            ]);

            $response = curl_exec($ch);
            $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
            $error = curl_error($ch);
            curl_close($ch);

            if ($error !== '') {
                $this->logger->error('ZeptoMail cURL error', [
                    'error' => $error,
                    'to' => $toEmail,
                ]);
                return false;
            }

            if ($httpCode >= 200 && $httpCode < 300) {
                $this->logger->info('Email sent successfully', [
                    'to' => $toEmail,
                    'subject' => $subject,
                ]);
                return true;
            }

            $this->logger->error('ZeptoMail API error', [
                'http_code' => $httpCode,
                'response' => $response,
                'to' => $toEmail,
            ]);
            return false;

        } catch (\Throwable $e) {
            $this->logger->error('ZeptoMail exception', [
                'message' => $e->getMessage(),
                'to' => $toEmail,
            ]);
            return false;
        }
    }

    /**
     * Send a password reset email.
     */
    public function sendPasswordReset(string $toEmail, string $toName, string $resetToken, string $appUrl): bool
    {
        $resetUrl = rtrim($appUrl, '/') . '/auth/reset-password?token=' . urlencode($resetToken) . '&email=' . urlencode($toEmail);

        $html = $this->renderTemplate('password_reset', [
            'name' => $toName,
            'reset_url' => $resetUrl,
            'valid_for' => '60 minutes',
        ]);

        return $this->send($toEmail, $toName, 'Reset Your Password — Lodgik', $html);
    }

    /**
     * Send a welcome email to new tenant admin.
     */
    public function sendWelcome(string $toEmail, string $toName, string $tenantName): bool
    {
        $html = $this->renderTemplate('welcome', [
            'name' => $toName,
            'tenant_name' => $tenantName,
        ]);

        return $this->send($toEmail, $toName, "Welcome to Lodgik — {$tenantName}", $html);
    }

    /**
     * Send a staff invitation email.
     */
    public function sendStaffInvitation(
        string $toEmail,
        string $toName,
        string $inviterName,
        string $tenantName,
        string $role,
        string $inviteToken,
        string $appUrl,
    ): bool {
        $inviteUrl = rtrim($appUrl, '/') . '/auth/accept-invite?token=' . urlencode($inviteToken);

        $html = $this->renderTemplate('staff_invitation', [
            'name' => $toName,
            'inviter_name' => $inviterName,
            'tenant_name' => $tenantName,
            'role' => $role,
            'invite_url' => $inviteUrl,
        ]);

        return $this->send($toEmail, $toName, "You're invited to join {$tenantName} on Lodgik", $html);
    }

    /**
     * Render an email template with variables.
     */
    private function renderTemplate(string $template, array $vars): string
    {
        $html = match ($template) {
            'welcome' => $this->welcomeTemplate(),
            'password_reset' => $this->passwordResetTemplate(),
            'staff_invitation' => $this->staffInvitationTemplate(),
            default => '<p>{{body}}</p>',
        };

        foreach ($vars as $key => $value) {
            $html = str_replace('{{' . $key . '}}', htmlspecialchars((string) $value, ENT_QUOTES), $html);
        }

        return $this->wrapInLayout($html);
    }

    private function wrapInLayout(string $content): string
    {
        return <<<HTML
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1">
            <style>
                body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; margin: 0; padding: 0; background: #f4f5f7; }
                .container { max-width: 580px; margin: 40px auto; background: #fff; border-radius: 8px; overflow: hidden; box-shadow: 0 1px 3px rgba(0,0,0,0.1); }
                .header { background: #1a1a2e; padding: 24px 32px; }
                .header h1 { color: #fff; margin: 0; font-size: 22px; font-weight: 600; }
                .body { padding: 32px; line-height: 1.6; color: #333; }
                .btn { display: inline-block; padding: 12px 28px; background: #e94560; color: #fff !important; text-decoration: none; border-radius: 6px; font-weight: 600; margin: 16px 0; }
                .footer { padding: 20px 32px; background: #f9fafb; text-align: center; font-size: 13px; color: #888; }
            </style>
        </head>
        <body>
            <div class="container">
                <div class="header">
                    <h1>Lodgik</h1>
                </div>
                <div class="body">
                    {$content}
                </div>
                <div class="footer">
                    <p>&copy; Lodgik — Hospitality Operating System</p>
                </div>
            </div>
        </body>
        </html>
        HTML;
    }

    private function welcomeTemplate(): string
    {
        return <<<HTML
        <h2>Welcome aboard, {{name}}! 🎉</h2>
        <p>Your account for <strong>{{tenant_name}}</strong> has been created successfully.</p>
        <p>You're now ready to start managing your hotel with Lodgik. Here's what you can do next:</p>
        <ul>
            <li>Set up your property details</li>
            <li>Add your rooms and room types</li>
            <li>Invite your staff members</li>
            <li>Configure your bank account for guest payments</li>
        </ul>
        <p>If you need any help getting started, just reach out to us on WhatsApp.</p>
        HTML;
    }

    private function passwordResetTemplate(): string
    {
        return <<<HTML
        <h2>Reset Your Password</h2>
        <p>Hi {{name}},</p>
        <p>We received a request to reset your password. Click the button below to set a new one:</p>
        <p><a href="{{reset_url}}" class="btn">Reset Password</a></p>
        <p>This link is valid for {{valid_for}}. If you didn't request this, you can safely ignore this email.</p>
        <p style="margin-top: 24px; font-size: 13px; color: #888;">If the button doesn't work, copy and paste this URL: {{reset_url}}</p>
        HTML;
    }

    private function staffInvitationTemplate(): string
    {
        return <<<HTML
        <h2>You've Been Invited!</h2>
        <p>Hi {{name}},</p>
        <p><strong>{{inviter_name}}</strong> has invited you to join <strong>{{tenant_name}}</strong> on Lodgik as a <strong>{{role}}</strong>.</p>
        <p><a href="{{invite_url}}" class="btn">Accept Invitation</a></p>
        <p>Click the button above to set up your account and get started.</p>
        <p style="margin-top: 24px; font-size: 13px; color: #888;">If you didn't expect this invitation, you can safely ignore this email.</p>
        HTML;
    }

    /**
     * Send a tenant onboarding invitation email.
     */
    public function sendTenantInvitation(
        string $toEmail,
        string $hotelName,
        string $inviteToken,
        ?string $contactName = null,
    ): bool {
        $appUrl = $_ENV['APP_URL'] ?? 'https://app.lodgik.com';
        $inviteUrl = "{$appUrl}/onboarding/register?token={$inviteToken}";

        $html = str_replace(
            ['{{name}}', '{{hotel_name}}', '{{invite_url}}'],
            [htmlspecialchars($contactName ?? 'there'), htmlspecialchars($hotelName), $inviteUrl],
            $this->tenantInvitationTemplate(),
        );

        return $this->send($toEmail, $contactName ?? $hotelName, "You're invited to manage {$hotelName} on Lodgik", $html);
    }

    private function tenantInvitationTemplate(): string
    {
        return <<<HTML
        <h2>Welcome to Lodgik!</h2>
        <p>Hi {{name}},</p>
        <p>You've been invited to set up <strong>{{hotel_name}}</strong> on the Lodgik hospitality platform.</p>
        <p>Lodgik helps Nigerian hotels manage rooms, guests, staff, and billing — all in one place.</p>
        <p><a href="{{invite_url}}" class="btn">Set Up Your Hotel</a></p>
        <p>This link is valid for 30 days. Start your free 14-day trial today!</p>
        HTML;
    }
}

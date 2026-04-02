<?php

declare(strict_types=1);

namespace Lodgik\Service;

use Psr\Log\LoggerInterface;

final class ZeptoMailService
{
    private const API_URL = 'https://api.zeptomail.com/v1.1/email';

    private ?object $settingsService = null;

    public function __construct(
        private readonly string $apiKey,
        private readonly string $fromEmail,
        private readonly string $fromName,
        private readonly LoggerInterface $logger,
    ) {}

    /** Allows SettingsService to be injected after construction (avoids circular DI) */
    public function setSettingsService(object $service): void
    {
        $this->settingsService = $service;
    }

    private function resolveApiKey(): string
    {
        if ($this->settingsService) {
            $val = $this->settingsService->getRaw('zeptomail.api_key');
            if ($val) return $val;
        }
        return $this->apiKey;
    }

    private function resolveFromEmail(): string
    {
        if ($this->settingsService) {
            $val = $this->settingsService->getRaw('zeptomail.from_email');
            if ($val) return $val;
        }
        return $this->fromEmail;
    }

    private function resolveFromName(): string
    {
        if ($this->settingsService) {
            $val = $this->settingsService->getRaw('zeptomail.from_name');
            if ($val) return $val;
        }
        return $this->fromName;
    }

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
        $apiKey = $this->resolveApiKey();
        $fromEmail = $this->resolveFromEmail();
        $fromName = $this->resolveFromName();

        if ($apiKey === '') {
            $this->logger->warning('ZeptoMail API key not configured, skipping email', [
                'to' => $toEmail,
                'subject' => $subject,
            ]);
            return false;
        }

        $payload = [
            'from' => [
                'address' => $fromEmail,
                'name' => $fromName,
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
                    'Authorization: ' . $apiKey,
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
    public function sendWelcome(string $toEmail, string $toName, string $tenantName, ?string $plainPassword = null, ?string $setPasswordToken = null): bool
    {
        $appUrl      = $_ENV['HOTEL_APP_URL'] ?? 'https://hotel.lodgik.co';
        $loginUrl    = $appUrl . '/login';
        $setPassUrl  = $setPasswordToken !== null
            ? $appUrl . '/reset-password?token=' . $setPasswordToken . '&email=' . urlencode($toEmail)
            : null;

        $html = $this->renderTemplate('welcome', [
            'name'              => $toName,
            'tenant_name'       => $tenantName,
            'email'             => $toEmail,
            'login_url'         => $loginUrl,
            'set_password_url'  => $setPassUrl ?? $loginUrl,
            'has_set_password'  => $setPassUrl !== null ? 'true' : '',
            // Legacy plain-password fields kept for backwards compatibility but empty
            'password'          => '',
            'has_password'      => '',
        ]);

        return $this->send($toEmail, $toName, "Welcome to Lodgik — {$tenantName}", $html);
    }

    /**
     * Send a 6-digit OTP for password reset.
     */
    public function sendPasswordOtp(string $toEmail, string $toName, string $otp): bool
    {
        $html = $this->renderTemplate('passwordOtp', [
            'name' => $toName,
            'otp'  => $otp,
        ]);
        return $this->send($toEmail, $toName, 'Your Lodgik password reset code', $html);
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
            'welcome'       => $this->welcomeTemplate(),
            'passwordReset' => $this->passwordResetTemplate(),
            'passwordOtp'   => $this->passwordOtpTemplate(),
            'staff_invitation' => $this->staffInvitationTemplate(),
            default => '<p>{{body}}</p>',
        };

        // Process conditionals: {{key}}...{{/key}} shown only when $vars[key] is truthy
        $html = preg_replace_callback('/\{\{(\w+)\}\}(.*?)\{\{\/\1\}\}/s', function ($m) use ($vars) {
            return !empty($vars[$m[1]]) ? $m[2] : '';
        }, $html);

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
        <h2>Welcome to Lodgik, {{name}}! 🎉</h2>
        <p>Your account for <strong>{{tenant_name}}</strong> has been created.</p>

        {{has_set_password}}
        <div style="text-align:center; margin:28px 0;">
            <a href="{{set_password_url}}"
               style="display:inline-block; background:#4A7A4A; color:#fff; font-weight:700;
                      font-size:16px; padding:14px 32px; border-radius:10px; text-decoration:none;">
                Set Your Password &amp; Get Started →
            </a>
        </div>
        <p style="font-size:13px; color:#888; text-align:center;">
            This link expires in <strong>48 hours</strong>.<br>
            Your login email is: <strong>{{email}}</strong>
        </p>
        {{/has_set_password}}

        {{has_password}}
        <p style="font-size:13px; color:#888; text-align:center;">
            Log in at: <a href="{{login_url}}" style="color:#4A7A4A;">{{login_url}}</a><br>
            Your email: <strong>{{email}}</strong>
        </p>
        {{/has_password}}

        <hr style="margin:24px 0; border:none; border-top:1px solid #eee;">
        <p style="color:#555;">Once you're in, here's what to do first:</p>
        <ol style="color:#555; line-height:2;">
            <li>Set up your property details and room types</li>
            <li>Invite your team members</li>
            <li>Configure your bank account for guest payments</li>
        </ol>
        <p style="margin-top:16px; color:#888; font-size:13px;">Need help getting started? Reach out to us any time.</p>
        HTML;
    }

    private function passwordOtpTemplate(): string
    {
        return <<<HTML
        <div style="text-align:center; padding: 32px 0;">
            <h2 style="margin-bottom:8px;">Password Reset Code</h2>
            <p style="color:#555; margin-bottom:24px;">Hi {{name}}, use the code below to reset your password.</p>
            <div style="display:inline-block; background:#f4f7f4; border:2px solid #4A7A4A; border-radius:12px; padding:16px 40px; margin-bottom:24px;">
                <span style="font-size:36px; font-weight:800; letter-spacing:12px; color:#2d5a2d; font-family:monospace;">{{otp}}</span>
            </div>
            <p style="color:#888; font-size:13px;">This code expires in <strong>10 minutes</strong>.</p>
            <p style="color:#888; font-size:13px;">If you did not request a password reset, you can safely ignore this email.</p>
        </div>
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
        $appUrl = $_ENV['APP_URL'] ?? 'https://app.lodgik.co';
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

    public function sendMerchantInvitation(
        string $toEmail,
        string $toName,
        string $businessName,
        string $inviteUrl,
    ): bool {
        $html = str_replace(
            ['{{name}}', '{{business_name}}', '{{invite_url}}'],
            [htmlspecialchars($toName), htmlspecialchars($businessName), $inviteUrl],
            $this->merchantInvitationTemplate(),
        );

        return $this->send($toEmail, $toName, "Welcome to the Lodgik Merchant Portal — {$businessName}", $html);
    }

    private function merchantInvitationTemplate(): string
    {
        return <<<HTML
        <h2>Welcome to Lodgik Merchant Portal!</h2>
        <p>Hi {{name}},</p>
        <p>Your merchant account for <strong>{{business_name}}</strong> has been created on the Lodgik platform.</p>
        <p>As a Lodgik merchant, you can refer hotels, track commissions, manage payouts, and access resources.</p>
        <p><a href="{{invite_url}}" class="btn">Set Up Your Account</a></p>
        <p>Click the link above to set your password and get started.</p>
        HTML;
    }

    // ─── Production Email Templates ─────────────────────────────

    public function sendBookingConfirmation(string $toEmail, string $toName, array $booking): bool
    {
        $html = $this->renderTemplate($this->bookingConfirmationTemplate(), [
            'guest_name' => $toName,
            'booking_ref' => $booking['booking_ref'] ?? '',
            'hotel_name' => $booking['hotel_name'] ?? 'Hotel',
            'room_type' => $booking['room_type'] ?? '',
            'check_in' => $booking['check_in'] ?? '',
            'check_out' => $booking['check_out'] ?? '',
            'total' => $booking['total'] ?? '0',
            'guests' => $booking['guests'] ?? '1',
        ]);
        return $this->send($toEmail, $toName, 'Booking Confirmation — ' . ($booking['booking_ref'] ?? ''), $this->wrapInLayout($html));
    }

    private function bookingConfirmationTemplate(): string
    {
        return <<<HTML
        <h2>Booking Confirmed ✓</h2>
        <p>Dear {{guest_name}},</p>
        <p>Your reservation has been confirmed. Here are your booking details:</p>
        <table style="width:100%;border-collapse:collapse;margin:16px 0">
            <tr><td style="padding:8px;border-bottom:1px solid #eee;color:#666">Booking Ref</td><td style="padding:8px;border-bottom:1px solid #eee;font-weight:600">{{booking_ref}}</td></tr>
            <tr><td style="padding:8px;border-bottom:1px solid #eee;color:#666">Hotel</td><td style="padding:8px;border-bottom:1px solid #eee">{{hotel_name}}</td></tr>
            <tr><td style="padding:8px;border-bottom:1px solid #eee;color:#666">Room Type</td><td style="padding:8px;border-bottom:1px solid #eee">{{room_type}}</td></tr>
            <tr><td style="padding:8px;border-bottom:1px solid #eee;color:#666">Check-in</td><td style="padding:8px;border-bottom:1px solid #eee">{{check_in}}</td></tr>
            <tr><td style="padding:8px;border-bottom:1px solid #eee;color:#666">Check-out</td><td style="padding:8px;border-bottom:1px solid #eee">{{check_out}}</td></tr>
            <tr><td style="padding:8px;border-bottom:1px solid #eee;color:#666">Guests</td><td style="padding:8px;border-bottom:1px solid #eee">{{guests}}</td></tr>
            <tr><td style="padding:8px;color:#666">Total</td><td style="padding:8px;font-weight:700;font-size:18px;color:#16a34a">₦{{total}}</td></tr>
        </table>
        <p>We look forward to welcoming you!</p>
        HTML;
    }

    public function sendPaymentReceipt(string $toEmail, string $toName, array $payment): bool
    {
        $html = $this->renderTemplate($this->paymentReceiptTemplate(), [
            'guest_name' => $toName,
            'amount' => $payment['amount'] ?? '0',
            'reference' => $payment['reference'] ?? '',
            'method' => $payment['method'] ?? 'Card',
            'date' => $payment['date'] ?? date('Y-m-d'),
            'hotel_name' => $payment['hotel_name'] ?? 'Hotel',
            'invoice_number' => $payment['invoice_number'] ?? '',
        ]);
        return $this->send($toEmail, $toName, 'Payment Receipt — ₦' . ($payment['amount'] ?? '0'), $this->wrapInLayout($html));
    }

    private function paymentReceiptTemplate(): string
    {
        return <<<HTML
        <h2>Payment Receipt</h2>
        <p>Dear {{guest_name}},</p>
        <p>We have received your payment. Thank you!</p>
        <table style="width:100%;border-collapse:collapse;margin:16px 0">
            <tr><td style="padding:8px;border-bottom:1px solid #eee;color:#666">Amount</td><td style="padding:8px;border-bottom:1px solid #eee;font-weight:700;color:#16a34a">₦{{amount}}</td></tr>
            <tr><td style="padding:8px;border-bottom:1px solid #eee;color:#666">Reference</td><td style="padding:8px;border-bottom:1px solid #eee">{{reference}}</td></tr>
            <tr><td style="padding:8px;border-bottom:1px solid #eee;color:#666">Method</td><td style="padding:8px;border-bottom:1px solid #eee">{{method}}</td></tr>
            <tr><td style="padding:8px;border-bottom:1px solid #eee;color:#666">Date</td><td style="padding:8px;border-bottom:1px solid #eee">{{date}}</td></tr>
            <tr><td style="padding:8px;color:#666">Hotel</td><td style="padding:8px">{{hotel_name}}</td></tr>
        </table>
        HTML;
    }

    public function sendSubscriptionConfirmation(string $toEmail, string $toName, array $sub): bool
    {
        $html = $this->renderTemplate($this->subscriptionConfirmationTemplate(), [
            'name' => $toName,
            'plan_name' => $sub['plan_name'] ?? '',
            'billing_cycle' => $sub['billing_cycle'] ?? 'monthly',
            'amount' => $sub['amount'] ?? '0',
            'next_billing' => $sub['next_billing'] ?? '',
        ]);
        return $this->send($toEmail, $toName, 'Subscription Activated — ' . ($sub['plan_name'] ?? ''), $this->wrapInLayout($html));
    }

    private function subscriptionConfirmationTemplate(): string
    {
        return <<<HTML
        <h2>Subscription Active ✓</h2>
        <p>Hi {{name}},</p>
        <p>Your Lodgik subscription has been activated.</p>
        <table style="width:100%;border-collapse:collapse;margin:16px 0">
            <tr><td style="padding:8px;border-bottom:1px solid #eee;color:#666">Plan</td><td style="padding:8px;border-bottom:1px solid #eee;font-weight:600">{{plan_name}}</td></tr>
            <tr><td style="padding:8px;border-bottom:1px solid #eee;color:#666">Billing</td><td style="padding:8px;border-bottom:1px solid #eee">{{billing_cycle}}</td></tr>
            <tr><td style="padding:8px;border-bottom:1px solid #eee;color:#666">Amount</td><td style="padding:8px;border-bottom:1px solid #eee">₦{{amount}}</td></tr>
            <tr><td style="padding:8px;color:#666">Next Billing</td><td style="padding:8px">{{next_billing}}</td></tr>
        </table>
        <p>Your card will be automatically charged on the next billing date.</p>
        HTML;
    }

    public function sendExpenseApproval(string $toEmail, string $toName, array $expense): bool
    {
        $status = $expense['status'] ?? 'approved';
        $html = $this->renderTemplate($this->expenseApprovalTemplate(), [
            'name' => $toName,
            'status' => ucfirst($status),
            'description' => $expense['description'] ?? '',
            'amount' => $expense['amount'] ?? '0',
            'category' => $expense['category'] ?? '',
            'reason' => $expense['reason'] ?? '',
        ]);
        return $this->send($toEmail, $toName, 'Expense ' . ucfirst($status) . ' — ₦' . ($expense['amount'] ?? '0'), $this->wrapInLayout($html));
    }

    private function expenseApprovalTemplate(): string
    {
        return <<<HTML
        <h2>Expense {{status}}</h2>
        <p>Hi {{name}},</p>
        <p>Your expense request has been <strong>{{status}}</strong>.</p>
        <table style="width:100%;border-collapse:collapse;margin:16px 0">
            <tr><td style="padding:8px;border-bottom:1px solid #eee;color:#666">Description</td><td style="padding:8px;border-bottom:1px solid #eee">{{description}}</td></tr>
            <tr><td style="padding:8px;border-bottom:1px solid #eee;color:#666">Category</td><td style="padding:8px;border-bottom:1px solid #eee">{{category}}</td></tr>
            <tr><td style="padding:8px;color:#666">Amount</td><td style="padding:8px;font-weight:600">₦{{amount}}</td></tr>
        </table>
        HTML;
    }
}

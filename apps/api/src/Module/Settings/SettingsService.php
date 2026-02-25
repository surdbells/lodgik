<?php

declare(strict_types=1);

namespace Lodgik\Module\Settings;

use Doctrine\ORM\EntityManagerInterface;
use Lodgik\Entity\PlatformSetting;

final class SettingsService
{
    /** Setting keys grouped by section */
    private const SECTIONS = [
        'zeptomail' => [
            'zeptomail.api_key' => ['secret' => true, 'env' => 'ZEPTOMAIL_API_KEY'],
            'zeptomail.from_email' => ['secret' => false, 'env' => 'ZEPTOMAIL_FROM_EMAIL'],
            'zeptomail.from_name' => ['secret' => false, 'env' => 'ZEPTOMAIL_FROM_NAME'],
        ],
        'termii' => [
            'termii.api_key' => ['secret' => true, 'env' => 'TERMII_API_KEY'],
            'termii.sender_id' => ['secret' => false, 'env' => 'TERMII_SENDER_ID'],
            'termii.default_channel' => ['secret' => false, 'env' => null],
        ],
        'paystack' => [
            'paystack.secret_key' => ['secret' => true, 'env' => 'PAYSTACK_SECRET_KEY'],
            'paystack.public_key' => ['secret' => true, 'env' => 'PAYSTACK_PUBLIC_KEY'],
            'paystack.webhook_secret' => ['secret' => true, 'env' => 'PAYSTACK_WEBHOOK_SECRET'],
        ],
        'defaults' => [
            'defaults.trial_days' => ['secret' => false, 'env' => null],
            'defaults.default_max_rooms' => ['secret' => false, 'env' => null],
            'defaults.default_max_staff' => ['secret' => false, 'env' => null],
            'defaults.default_currency' => ['secret' => false, 'env' => null],
        ],
        'feature_flags' => [
            'flag.allow_self_registration' => ['secret' => false, 'env' => null],
            'flag.require_email_verification' => ['secret' => false, 'env' => null],
            'flag.enable_whatsapp' => ['secret' => false, 'env' => null],
            'flag.enable_sms_otp' => ['secret' => false, 'env' => null],
            'flag.maintenance_mode' => ['secret' => false, 'env' => null],
            'flag.enable_app_updates' => ['secret' => false, 'env' => null],
        ],
    ];

    public function __construct(private readonly EntityManagerInterface $em) {}

    /**
     * Get a single setting value. Checks DB first, falls back to .env.
     */
    public function get(string $key, ?string $default = null): ?string
    {
        $setting = $this->em->find(PlatformSetting::class, $key);
        if ($setting && $setting->getValue() !== null && $setting->getValue() !== '') {
            return $setting->getValue();
        }

        // Fallback to .env
        $envKey = $this->getEnvKey($key);
        if ($envKey) {
            $envVal = $_ENV[$envKey] ?? null;
            if ($envVal !== null && $envVal !== '') return $envVal;
        }

        return $default;
    }

    /**
     * Set a single setting value.
     */
    public function set(string $key, ?string $value, bool $isSecret = false): void
    {
        $setting = $this->em->find(PlatformSetting::class, $key);
        if ($setting) {
            $setting->setValue($value);
            $setting->setIsSecret($isSecret);
        } else {
            $setting = new PlatformSetting($key, $value, $isSecret);
            $this->em->persist($setting);
        }
        $this->em->flush();
    }

    /**
     * Save a section (zeptomail, termii, paystack, defaults, feature_flags).
     */
    public function saveSection(string $section, array $data): void
    {
        $defs = self::SECTIONS[$section] ?? null;
        if (!$defs) {
            throw new \RuntimeException("Unknown settings section: $section");
        }

        if ($section === 'feature_flags') {
            // Feature flags are saved as flag.{key} = '1' or '0'
            foreach ($data as $flagKey => $flagValue) {
                $fullKey = "flag.$flagKey";
                if (isset($defs[$fullKey])) {
                    $this->set($fullKey, $flagValue ? '1' : '0');
                }
            }
            return;
        }

        foreach ($defs as $fullKey => $meta) {
            $shortKey = explode('.', $fullKey, 2)[1]; // e.g. 'api_key' from 'zeptomail.api_key'
            if (array_key_exists($shortKey, $data)) {
                $val = $data[$shortKey];
                // Don't overwrite with masked placeholder
                if ($meta['secret'] && $val === '••••••••') continue;
                $this->set($fullKey, $val !== '' ? $val : null, $meta['secret']);
            }
        }
    }

    /**
     * Get all settings for the admin panel. Secrets are masked.
     */
    public function getAll(): array
    {
        $result = [
            'base_url' => $_ENV['APP_URL'] ?? 'https://api.lodgik.co',
        ];

        foreach (self::SECTIONS as $section => $defs) {
            if ($section === 'feature_flags') {
                $flags = [];
                foreach ($defs as $fullKey => $meta) {
                    $shortKey = str_replace('flag.', '', $fullKey);
                    $flags[$shortKey] = $this->get($fullKey) === '1';
                }
                $result['feature_flags'] = $flags;
                continue;
            }

            $sectionData = [];
            $hasValue = false;
            foreach ($defs as $fullKey => $meta) {
                $shortKey = explode('.', $fullKey, 2)[1];
                $value = $this->get($fullKey);
                if ($meta['secret'] && $value) {
                    $hasValue = true;
                    $sectionData[$shortKey] = '••••••••'; // Mask secrets
                } else {
                    if ($value) $hasValue = true;
                    $sectionData[$shortKey] = $value ?? '';
                }
            }
            $result[$section] = $sectionData;
            $result["{$section}_configured"] = $hasValue;
        }

        return $result;
    }

    /**
     * Get a raw (unmasked) setting value for internal use by services.
     */
    public function getRaw(string $key): ?string
    {
        return $this->get($key);
    }

    private function getEnvKey(string $settingKey): ?string
    {
        foreach (self::SECTIONS as $defs) {
            if (isset($defs[$settingKey])) {
                return $defs[$settingKey]['env'] ?? null;
            }
        }
        return null;
    }
}

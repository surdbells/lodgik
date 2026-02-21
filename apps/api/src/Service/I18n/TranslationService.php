<?php
declare(strict_types=1);
namespace Lodgik\Service\I18n;

final class TranslationService
{
    private array $translations = [];
    private string $locale = 'en';
    private string $fallback = 'en';
    private string $langDir;
    private static array $supportedLocales = ['en', 'yo', 'ha', 'ig', 'fr', 'ar', 'pt', 'es'];

    public function __construct(?string $langDir = null)
    { $this->langDir = $langDir ?? dirname(__DIR__, 3) . '/resources/lang'; $this->load('en'); }

    public static function getSupportedLocales(): array { return self::$supportedLocales; }

    public function setLocale(string $locale): void
    { if (in_array($locale, self::$supportedLocales)) { $this->locale = $locale; $this->load($locale); } }

    public function getLocale(): string { return $this->locale; }

    public function t(string $key, array $params = []): string
    { $text = $this->translations[$this->locale][$key] ?? $this->translations[$this->fallback][$key] ?? $key;
      foreach ($params as $k => $v) { $text = str_replace(':' . $k, $v, $text); }
      return $text; }

    private function load(string $locale): void
    { if (isset($this->translations[$locale])) return;
      $file = $this->langDir . '/' . $locale . '.json';
      if (file_exists($file)) { $this->translations[$locale] = json_decode(file_get_contents($file), true) ?? []; }
      else { $this->translations[$locale] = []; } }
}

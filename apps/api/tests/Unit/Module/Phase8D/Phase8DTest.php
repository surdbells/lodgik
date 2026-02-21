<?php
declare(strict_types=1);
namespace Lodgik\Tests\Unit\Module\Phase8D;
use Lodgik\Entity\{LoyaltyTier, LoyaltyPoints, Promotion, GuestPreference};
use Lodgik\Service\I18n\TranslationService;
use PHPUnit\Framework\TestCase;

final class Phase8DTest extends TestCase
{
    // Loyalty Tiers
    public function testTierCreation(): void
    { $t = new LoyaltyTier('Gold', 5000, '10.00', 'ten1'); $this->assertSame('Gold', $t->getName()); $this->assertSame(5000, $t->getMinPoints()); $this->assertSame('10.00', $t->getDiscountPercentage()); }

    public function testTierBenefits(): void
    { $t = new LoyaltyTier('Platinum', 10000, '15.00', 't'); $t->setBenefits(['free_upgrade', 'late_checkout', 'welcome_fruit']); $t->setColor('#FFD700'); $arr = $t->toArray(); $this->assertCount(3, $arr['benefits']); $this->assertSame('#FFD700', $arr['color']); }

    // Loyalty Points
    public function testPointsEarn(): void
    { $p = new LoyaltyPoints('g1', 'p1', 500, 'booking', 'earn', 't'); $this->assertSame(500, $p->getPoints()); $this->assertSame('earn', $p->getTransactionType()); }

    public function testPointsRedeem(): void
    { $p = new LoyaltyPoints('g1', 'p1', 200, 'redemption', 'redeem', 't'); $p->setReferenceId('folio-123'); $p->setNotes('Room upgrade'); $p->onPrePersist(); $arr = $p->toArray(); $this->assertSame('redeem', $arr['transaction_type']); $this->assertSame('folio-123', $arr['reference_id']); }

    // Promotions
    public function testPromotionCreation(): void
    { $p = new Promotion('p1', 'SUMMER20', 'Summer Sale', 'percentage', '20.00', new \DateTimeImmutable('2026-06-01'), new \DateTimeImmutable('2026-08-31'), 't');
      $this->assertSame('SUMMER20', $p->getCode()); $this->assertTrue($p->isValid(new \DateTimeImmutable('2026-07-15'))); $this->assertFalse($p->isValid(new \DateTimeImmutable('2026-09-15'))); }

    public function testPromotionPercentageApply(): void
    { $p = new Promotion('p1', 'OFF10', 'Test', 'percentage', '10.00', new \DateTimeImmutable('2026-01-01'), new \DateTimeImmutable('2026-12-31'), 't');
      $discounted = $p->apply('1000000'); // 10000 NGN in kobo
      $this->assertSame('900000', $discounted); }

    public function testPromotionFixedApply(): void
    { $p = new Promotion('p1', 'FLAT5K', 'Test', 'fixed', '500000', new \DateTimeImmutable('2026-01-01'), new \DateTimeImmutable('2026-12-31'), 't');
      $discounted = $p->apply('1000000');
      $this->assertSame('500000', $discounted); }

    public function testPromotionUsageLimit(): void
    { $p = new Promotion('p1', 'LTD', 'Limited', 'percentage', '5.00', new \DateTimeImmutable('2026-01-01'), new \DateTimeImmutable('2026-12-31'), 't');
      $p->setUsageLimit(2); $p->recordUsage(); $p->recordUsage();
      $this->assertFalse($p->isValid()); $this->assertSame(2, $p->getUsageCount()); }

    // Guest Preferences
    public function testGuestPreferenceCreation(): void
    { $gp = new GuestPreference('g1', 't'); $gp->setRoomPreferences(['floor' => 'high', 'view' => 'pool', 'bed' => 'king']);
      $gp->setDietaryRestrictions(['halal', 'no_pork']); $gp->setSpecialOccasions([['type' => 'birthday', 'date' => '2026-03-15']]);
      $gp->setCommunicationPreference('whatsapp'); $gp->setVipStatus(true); $gp->setPreferredLanguage('yo');
      $arr = $gp->toArray(); $this->assertSame('high', $arr['room_preferences']['floor']); $this->assertTrue($arr['vip_status']); $this->assertSame('yo', $arr['preferred_language']); }

    // i18n
    public function testTranslationServiceEnglish(): void
    { $ts = new TranslationService(__DIR__ . '/../../../../resources/lang');
      $this->assertSame('en', $ts->getLocale()); $this->assertSame('Dashboard', $ts->t('dashboard')); }

    public function testTranslationServiceYoruba(): void
    { $ts = new TranslationService(__DIR__ . '/../../../../resources/lang'); $ts->setLocale('yo');
      $this->assertSame('yo', $ts->getLocale()); $this->assertSame('Pẹpẹ ìṣàkóso', $ts->t('dashboard')); }

    public function testTranslationServiceFallback(): void
    { $ts = new TranslationService(__DIR__ . '/../../../../resources/lang'); $ts->setLocale('ha');
      $this->assertSame('Allon sarrafawa', $ts->t('dashboard')); // ha has it
      $this->assertSame('You are back online', $ts->t('back_online')); } // ha doesn't have it, falls back to English

    public function testTranslationSupportedLocales(): void
    { $locales = TranslationService::getSupportedLocales(); $this->assertContains('en', $locales); $this->assertContains('yo', $locales); $this->assertContains('ar', $locales); $this->assertCount(8, $locales); }
}

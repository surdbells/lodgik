<?php
declare(strict_types=1);
namespace Lodgik\Tests\Unit\Module\Phase9;

use Lodgik\Entity\{Merchant, MerchantKyc, MerchantBankAccount, MerchantHotel, CommissionTier, Commission, CommissionPayout, MerchantResource, MerchantResourceDownload, MerchantSupportTicket, MerchantAuditLog, MerchantNotification, MerchantLead, MerchantStatement};
use Lodgik\Enum\{MerchantStatus, MerchantCategory, CommissionScope, CommissionStatus};
use Lodgik\Enum\UserRole;
use PHPUnit\Framework\TestCase;

final class Phase9Test extends TestCase
{
    // ═══ ENUM TESTS ═══════════════════════════════════════════

    public function testMerchantStatusEnum(): void
    {
        $this->assertSame('pending_approval', MerchantStatus::PENDING_APPROVAL->value);
        $this->assertSame('Pending Approval', MerchantStatus::PENDING_APPROVAL->label());
        $this->assertCount(5, MerchantStatus::cases());
        $this->assertContains('active', MerchantStatus::values());
    }

    public function testMerchantCategoryEnum(): void
    {
        $this->assertSame('sales_agent', MerchantCategory::SALES_AGENT->value);
        $this->assertSame('Channel Partner', MerchantCategory::CHANNEL_PARTNER->label());
        $this->assertCount(3, MerchantCategory::cases());
    }

    public function testCommissionScopeEnum(): void
    {
        $this->assertSame('new_subscription', CommissionScope::NEW_SUBSCRIPTION->value);
        $this->assertSame('Renewal', CommissionScope::RENEWAL->label());
        $this->assertCount(3, CommissionScope::cases());
    }

    public function testCommissionStatusEnum(): void
    {
        $this->assertSame('pending', CommissionStatus::PENDING->value);
        $this->assertSame('Payable', CommissionStatus::PAYABLE->label());
        $this->assertCount(5, CommissionStatus::cases());
        $this->assertContains('reversed', CommissionStatus::values());
    }

    public function testMerchantRolesAddedToUserRole(): void
    {
        $this->assertSame('merchant_admin', UserRole::MERCHANT_ADMIN->value);
        $this->assertSame('merchant_agent', UserRole::MERCHANT_AGENT->value);
        $this->assertSame('Merchant Admin', UserRole::MERCHANT_ADMIN->label());
        $this->assertContains(UserRole::MERCHANT_ADMIN, UserRole::merchantRoles());
        $this->assertContains(UserRole::MERCHANT_AGENT, UserRole::merchantRoles());
    }

    // ═══ MERCHANT ENTITY TESTS ════════════════════════════════

    public function testMerchantCreation(): void
    {
        $m = new Merchant();
        $this->assertNotEmpty($m->getId());
        $this->assertStringStartsWith('MRC-', $m->getMerchantId());
        $this->assertSame(6, strlen(substr($m->getMerchantId(), 4)));
        $this->assertSame(MerchantStatus::PENDING_APPROVAL, $m->getStatus());
        $this->assertSame(MerchantCategory::SALES_AGENT, $m->getCategory());
        $this->assertSame('NGN', $m->getSettlementCurrency());
        $this->assertFalse($m->isActive());
    }

    public function testMerchantSettersAndGetters(): void
    {
        $m = new Merchant();
        $m->setLegalName('Acme Corp');
        $m->setBusinessName('Acme Hotels');
        $m->setEmail('acme@test.com');
        $m->setPhone('+2341234567890');
        $m->setAddress('123 Main St');
        $m->setOperatingRegion('West Africa');
        $m->setCategory(MerchantCategory::CHANNEL_PARTNER);
        $m->setType('company');
        $m->setSettlementCurrency('USD');
        $m->setUserId('user-123');
        $m->setLogoUrl('https://example.com/logo.png');

        $this->assertSame('Acme Corp', $m->getLegalName());
        $this->assertSame('Acme Hotels', $m->getBusinessName());
        $this->assertSame('acme@test.com', $m->getEmail());
        $this->assertSame('+2341234567890', $m->getPhone());
        $this->assertSame('123 Main St', $m->getAddress());
        $this->assertSame('West Africa', $m->getOperatingRegion());
        $this->assertSame(MerchantCategory::CHANNEL_PARTNER, $m->getCategory());
        $this->assertSame('company', $m->getType());
        $this->assertSame('USD', $m->getSettlementCurrency());
        $this->assertSame('user-123', $m->getUserId());
        $this->assertSame('https://example.com/logo.png', $m->getLogoUrl());
    }

    public function testMerchantStatusTransitions(): void
    {
        $m = new Merchant();
        $this->assertFalse($m->isActive());

        $m->setStatus(MerchantStatus::KYC_IN_PROGRESS);
        $this->assertFalse($m->isActive());

        $m->setStatus(MerchantStatus::ACTIVE);
        $m->setApprovedAt(new \DateTimeImmutable());
        $this->assertTrue($m->isActive());
        $this->assertNotNull($m->getApprovedAt());

        $m->setStatus(MerchantStatus::SUSPENDED);
        $m->setSuspensionReason('Policy violation');
        $m->setSuspendedAt(new \DateTimeImmutable());
        $this->assertFalse($m->isActive());
        $this->assertSame('Policy violation', $m->getSuspensionReason());
        $this->assertNotNull($m->getSuspendedAt());

        $m->setStatus(MerchantStatus::TERMINATED);
        $m->setTerminatedAt(new \DateTimeImmutable());
        $this->assertNotNull($m->getTerminatedAt());
    }

    public function testMerchantToArray(): void
    {
        $m = new Merchant();
        $m->setLegalName('Test');
        $m->setBusinessName('Test Biz');
        $m->setEmail('t@t.com');
        $m->onPrePersist();
        $arr = $m->toArray();
        $this->assertArrayHasKey('id', $arr);
        $this->assertArrayHasKey('merchant_id', $arr);
        $this->assertArrayHasKey('legal_name', $arr);
        $this->assertArrayHasKey('status', $arr);
        $this->assertSame('pending_approval', $arr['status']);
    }

    // ═══ KYC ENTITY ═══════════════════════════════════════════

    public function testMerchantKycCreation(): void
    {
        $kyc = new MerchantKyc();
        $kyc->setMerchantId('m-1');
        $this->assertSame('not_submitted', $kyc->getStatus());
        $this->assertSame('individual', $kyc->getKycType());
        $this->assertFalse($kyc->getLivenessVerified());
        $this->assertFalse($kyc->getCompanyBankVerified());
    }

    public function testKycDocumentUploads(): void
    {
        $kyc = new MerchantKyc();
        $kyc->setMerchantId('m-1');
        $kyc->setGovernmentIdType('nin');
        $kyc->setGovernmentIdNumber('12345678901');
        $kyc->setGovernmentIdUrl('https://example.com/id.jpg');
        $kyc->setSelfieUrl('https://example.com/selfie.jpg');
        $kyc->setProofOfAddressUrl('https://example.com/poa.pdf');
        $kyc->setCacCertificateUrl('https://example.com/cac.pdf');
        $kyc->setBusinessAddressVerificationUrl('https://example.com/bav.pdf');
        $kyc->setDirectorIds(['dir-1', 'dir-2']);
        $kyc->setLivenessVerified(true);

        $this->assertSame('nin', $kyc->getGovernmentIdType());
        $this->assertSame(['dir-1', 'dir-2'], $kyc->getDirectorIds());
        $this->assertTrue($kyc->getLivenessVerified());
    }

    public function testKycReview(): void
    {
        $kyc = new MerchantKyc();
        $kyc->setMerchantId('m-1');
        $kyc->setStatus('approved');
        $kyc->setReviewedBy('admin-1');
        $kyc->setReviewedAt(new \DateTimeImmutable());
        $this->assertSame('approved', $kyc->getStatus());
        $this->assertNotNull($kyc->getReviewedAt());
    }

    public function testKycRejection(): void
    {
        $kyc = new MerchantKyc();
        $kyc->setMerchantId('m-1');
        $kyc->setStatus('rejected');
        $kyc->setRejectionReason('Document blurry');
        $this->assertSame('rejected', $kyc->getStatus());
        $this->assertSame('Document blurry', $kyc->getRejectionReason());
    }

    // ═══ BANK ACCOUNT ═════════════════════════════════════════

    public function testBankAccountCreation(): void
    {
        $b = new MerchantBankAccount();
        $b->setMerchantId('m-1');
        $b->setBankName('GTBank');
        $b->setAccountName('Acme Hotels');
        $b->setAccountNumber('0123456789');
        $this->assertSame('pending_approval', $b->getStatus());
        $this->assertSame('bank_transfer', $b->getPaymentMethod());
        $this->assertFalse($b->isApproved());
    }

    public function testBankAccountApproval(): void
    {
        $b = new MerchantBankAccount();
        $b->setMerchantId('m-1');
        $b->setBankName('GTBank');
        $b->setAccountName('Test');
        $b->setAccountNumber('123');
        $b->setStatus('approved');
        $b->setApprovedBy('admin-1');
        $b->setApprovedAt(new \DateTimeImmutable());
        $this->assertTrue($b->isApproved());
        $this->assertSame('admin-1', $b->getApprovedBy());
    }

    // ═══ MERCHANT HOTEL ═══════════════════════════════════════

    public function testMerchantHotel(): void
    {
        $h = new MerchantHotel();
        $h->setMerchantId('m-1');
        $h->setHotelName('Grand Palace');
        $h->setLocation('Lagos');
        $h->setContactPerson('John');
        $h->setRoomsCount(50);
        $h->setHotelCategory('luxury');
        $h->setBoundAt(new \DateTimeImmutable());
        $this->assertSame('pending', $h->getOnboardingStatus());
        $this->assertTrue($h->getIsPermanentBind());
        $this->assertSame(50, $h->getRoomsCount());
    }

    public function testMerchantHotelOnboardingFlow(): void
    {
        $h = new MerchantHotel();
        $h->setMerchantId('m-1');
        $h->setHotelName('Test');
        $h->setOnboardingStatus('in_progress');
        $h->setTenantId('t-1');
        $h->setPropertyId('p-1');
        $this->assertSame('in_progress', $h->getOnboardingStatus());
        $h->setOnboardingStatus('active');
        $this->assertSame('active', $h->getOnboardingStatus());
    }

    // ═══ COMMISSION TIER ══════════════════════════════════════

    public function testCommissionTierCreation(): void
    {
        $t = new CommissionTier();
        $t->setName('Standard');
        $this->assertSame('percentage', $t->getType());
        $this->assertSame('10.00', $t->getNewSubscriptionRate());
        $this->assertSame('5.00', $t->getRenewalRate());
        $this->assertSame('8.00', $t->getUpgradeRate());
        $this->assertFalse($t->isDefault());
        $this->assertTrue($t->isActive());
    }

    public function testCommissionTierRateForScope(): void
    {
        $t = new CommissionTier();
        $t->setName('Test');
        $t->setNewSubscriptionRate('10.00');
        $t->setRenewalRate('5.00');
        $t->setUpgradeRate('8.00');
        $t->setPlanOverrides(['starter' => 8, 'enterprise' => 20]);

        $this->assertSame('10.00', $t->getRateForScope('new_subscription'));
        $this->assertSame('5.00', $t->getRateForScope('renewal'));
        $this->assertSame('8.00', $t->getRateForScope('upgrade'));

        // Plan overrides
        $this->assertSame('8', $t->getRateForScope('new_subscription', 'starter'));
        $this->assertSame('20', $t->getRateForScope('new_subscription', 'enterprise'));
        $this->assertSame('10.00', $t->getRateForScope('new_subscription', 'unknown_plan'));
    }

    // ═══ COMMISSION ═══════════════════════════════════════════

    public function testCommissionCreation(): void
    {
        $c = new Commission();
        $this->assertSame(CommissionStatus::PENDING, $c->getStatus());
        $this->assertNotNull($c->getCoolingPeriodEnds());
        $this->assertFalse($c->isCoolingComplete());
    }

    public function testCommissionCalculation(): void
    {
        $c = new Commission();
        $c->setMerchantId('m-1');
        $c->setHotelId('h-1');
        $c->setTenantId('t-1');
        $c->setScope(CommissionScope::NEW_SUBSCRIPTION);
        $c->setSubscriptionAmount('100000.00');
        $c->setCommissionRate('10.00');
        $c->setCommissionAmount('10000.00');
        $c->setPlanName('Professional');
        $c->setBillingCycle('monthly');

        $this->assertSame('100000.00', $c->getSubscriptionAmount());
        $this->assertSame('10000.00', $c->getCommissionAmount());
        $this->assertSame(CommissionScope::NEW_SUBSCRIPTION, $c->getScope());
    }

    public function testCommissionLifecycle(): void
    {
        $c = new Commission();
        $c->setMerchantId('m-1');
        $c->setHotelId('h-1');
        $c->setTenantId('t-1');
        $c->setScope(CommissionScope::RENEWAL);
        $c->setSubscriptionAmount('50000.00');
        $c->setCommissionRate('5.00');
        $c->setCommissionAmount('2500.00');

        // Approve
        $c->setStatus(CommissionStatus::APPROVED);
        $c->setApprovedAt(new \DateTimeImmutable());
        $this->assertSame(CommissionStatus::APPROVED, $c->getStatus());

        // Pay
        $c->setStatus(CommissionStatus::PAID);
        $c->setPaidAt(new \DateTimeImmutable());
        $c->setPaymentReference('PAY-001');
        $this->assertSame('PAY-001', $c->getPaymentReference());
    }

    public function testCommissionReversal(): void
    {
        $c = new Commission();
        $c->setMerchantId('m-1');
        $c->setHotelId('h-1');
        $c->setTenantId('t-1');
        $c->setScope(CommissionScope::NEW_SUBSCRIPTION);
        $c->setSubscriptionAmount('20000.00');
        $c->setCommissionRate('10.00');
        $c->setCommissionAmount('2000.00');
        $c->setStatus(CommissionStatus::REVERSED);
        $c->setReversedAt(new \DateTimeImmutable());
        $c->setReversalReason('Subscription cancelled');
        $this->assertSame('Subscription cancelled', $c->getReversalReason());
        $this->assertNotNull($c->getReversedAt());
    }

    public function testCommissionCoolingPeriod(): void
    {
        $c = new Commission();
        $c->setMerchantId('m-1');
        $c->setHotelId('h-1');
        $c->setTenantId('t-1');
        $c->setScope(CommissionScope::NEW_SUBSCRIPTION);
        $c->setSubscriptionAmount('1000.00');
        $c->setCommissionRate('10.00');
        $c->setCommissionAmount('100.00');
        $this->assertFalse($c->isCoolingComplete());

        // Expired cooling
        $c->setCoolingPeriodEnds(new \DateTimeImmutable('-1 day'));
        $this->assertTrue($c->isCoolingComplete());
    }

    // ═══ COMMISSION PAYOUT ════════════════════════════════════

    public function testPayoutCreation(): void
    {
        $p = new CommissionPayout();
        $p->setMerchantId('m-1');
        $p->setPayoutPeriod('2026-01_to_2026-01');
        $p->setTotalAmount('50000.00');
        $p->setCommissionIds(['c-1', 'c-2', 'c-3']);
        $this->assertSame('pending', $p->getStatus());
        $this->assertCount(3, $p->getCommissionIds());
    }

    public function testPayoutProcessing(): void
    {
        $p = new CommissionPayout();
        $p->setMerchantId('m-1');
        $p->setPayoutPeriod('2026-02');
        $p->setTotalAmount('10000.00');
        $p->setCommissionIds(['c-1']);
        $p->setStatus('processing');
        $p->setProcessingStartedAt(new \DateTimeImmutable());
        $p->setPaymentReference('TRX-123');
        $p->setStatus('paid');
        $p->setPaidAt(new \DateTimeImmutable());
        $this->assertSame('paid', $p->getStatus());
        $this->assertSame('TRX-123', $p->getPaymentReference());
    }

    // ═══ MERCHANT RESOURCE ════════════════════════════════════

    public function testResourceCreation(): void
    {
        $r = new MerchantResource();
        $r->setTitle('Sales Deck 2026');
        $r->setFileUrl('https://files.lodgik.co/deck.pdf');
        $r->setCategory('sales_deck');
        $r->setFileType('pdf');
        $r->setVersion('v2.0');
        $r->setVisibility('both');
        $r->setFileSize(1024000);
        $this->assertSame('active', $r->getStatus());
        $this->assertSame(1024000, $r->getFileSize());
    }

    public function testResourceDownload(): void
    {
        $d = new MerchantResourceDownload();
        $d->setResourceId('r-1');
        $d->setMerchantId('m-1');
        $d->setIpAddress('192.168.1.1');
        $d->setUserAgent('Mozilla/5.0');
        $this->assertNotNull($d->getDownloadedAt());
        $this->assertSame('192.168.1.1', $d->getIpAddress());
    }

    // ═══ SUPPORT TICKET ═══════════════════════════════════════

    public function testTicketCreation(): void
    {
        $t = new MerchantSupportTicket();
        $t->setMerchantId('m-1');
        $t->setSubject('Commission missing');
        $t->setDescription('I am missing my January commission');
        $t->setPriorityTag('finance');
        $this->assertSame('open', $t->getStatus());
    }

    public function testTicketLifecycle(): void
    {
        $t = new MerchantSupportTicket();
        $t->setMerchantId('m-1');
        $t->setSubject('Test');
        $t->setDescription('Desc');
        $t->setAssignedTo('staff-1');
        $t->setStatus('in_progress');
        $t->setSlaDueAt(new \DateTimeImmutable('+24 hours'));
        $this->assertSame('in_progress', $t->getStatus());

        $t->setStatus('resolved');
        $t->setResolvedAt(new \DateTimeImmutable());
        $t->setResolutionNotes('Fixed');
        $this->assertSame('Fixed', $t->getResolutionNotes());
    }

    // ═══ AUDIT LOG ════════════════════════════════════════════

    public function testAuditLogCreation(): void
    {
        $log = new MerchantAuditLog();
        $log->setMerchantId('m-1');
        $log->setActorId('admin-1');
        $log->setActorType('admin');
        $log->setAction('merchant_approved');
        $log->setEntityType('Merchant');
        $log->setEntityId('m-1');
        $log->setOldValue(['status' => 'pending']);
        $log->setNewValue(['status' => 'active']);
        $log->setIpAddress('10.0.0.1');
        $this->assertNotNull($log->getTimestamp());
        $this->assertSame('merchant_approved', $log->getAction());
    }

    // ═══ NOTIFICATION ═════════════════════════════════════════

    public function testNotificationCreation(): void
    {
        $n = new MerchantNotification();
        $n->setMerchantId('m-1');
        $n->setType('commission_approved');
        $n->setTitle('Commission Approved');
        $n->setBody('Your ₦5000 commission has been approved.');
        $n->setData(['commission_id' => 'c-1', 'amount' => '5000']);
        $this->assertFalse($n->isRead());
        $this->assertSame('in_app', $n->getChannel());

        $n->setIsRead(true);
        $this->assertTrue($n->isRead());
    }

    // ═══ LEAD ═════════════════════════════════════════════════

    public function testLeadCreation(): void
    {
        $l = new MerchantLead();
        $l->setMerchantId('m-1');
        $l->setHotelName('Prospect Hotel');
        $l->setContactName('Jane Doe');
        $l->setContactPhone('+234801');
        $l->setContactEmail('jane@prospect.com');
        $l->setLocation('Abuja');
        $l->setRoomsEstimate(30);
        $l->setFollowUpDate(new \DateTimeImmutable('+7 days'));
        $this->assertSame('lead', $l->getStatus());
        $this->assertSame(30, $l->getRoomsEstimate());
    }

    public function testLeadConversionFunnel(): void
    {
        $l = new MerchantLead();
        $l->setMerchantId('m-1');
        $l->setHotelName('Funnel Hotel');
        $this->assertSame('lead', $l->getStatus());

        $l->setStatus('contacted');
        $l->setNotes('Called on Monday');
        $l->setStatus('demo');
        $l->setStatus('negotiation');
        $l->setStatus('converted');
        $l->setConvertedHotelId('hotel-123');
        $this->assertSame('converted', $l->getStatus());
        $this->assertSame('hotel-123', $l->getConvertedHotelId());
    }

    // ═══ STATEMENT ════════════════════════════════════════════

    public function testStatementCreation(): void
    {
        $s = new MerchantStatement();
        $s->setMerchantId('m-1');
        $s->setPeriodStart(new \DateTimeImmutable('2026-01-01'));
        $s->setPeriodEnd(new \DateTimeImmutable('2026-01-31'));
        $s->setOpeningBalance('0.00');
        $s->setTotalEarned('50000.00');
        $s->setTotalPaid('30000.00');
        $s->setClosingBalance('20000.00');
        $s->setFileUrl('https://files.lodgik.co/statement.pdf');
        $this->assertSame('50000.00', $s->getTotalEarned());
        $this->assertSame('20000.00', $s->getClosingBalance());
    }

    // ═══ TO ARRAY TESTS ═══════════════════════════════════════

    public function testMerchantKycToArray(): void
    {
        $kyc = new MerchantKyc();
        $kyc->setMerchantId('m-1');
        $kyc->onPrePersist();
        $arr = $kyc->toArray();
        $this->assertArrayHasKey('status', $arr);
        $this->assertSame('not_submitted', $arr['status']);
    }

    public function testCommissionToArray(): void
    {
        $c = new Commission();
        $c->setMerchantId('m-1');
        $c->setHotelId('h-1');
        $c->setTenantId('t-1');
        $c->setScope(CommissionScope::NEW_SUBSCRIPTION);
        $c->setSubscriptionAmount('100000.00');
        $c->setCommissionRate('10.00');
        $c->setCommissionAmount('10000.00');
        $c->onPrePersist();
        $arr = $c->toArray();
        $this->assertArrayHasKey('scope', $arr);
        $this->assertSame('new_subscription', $arr['scope']);
        $this->assertSame('pending', $arr['status']);
        $this->assertArrayHasKey('cooling_period_ends', $arr);
    }

    public function testMerchantLeadToArray(): void
    {
        $l = new MerchantLead();
        $l->setMerchantId('m-1');
        $l->setHotelName('ToArray Hotel');
        $l->onPrePersist();
        $arr = $l->toArray();
        $this->assertArrayHasKey('hotel_name', $arr);
        $this->assertArrayHasKey('status', $arr);
        $this->assertSame('lead', $arr['status']);
    }

    public function testPayoutToArray(): void
    {
        $p = new CommissionPayout();
        $p->setMerchantId('m-1');
        $p->setPayoutPeriod('2026-01');
        $p->setTotalAmount('5000.00');
        $p->setCommissionIds(['c-1']);
        $p->onPrePersist();
        $arr = $p->toArray();
        $this->assertArrayHasKey('total_amount', $arr);
        $this->assertSame('pending', $arr['status']);
    }

    public function testStatementToArray(): void
    {
        $s = new MerchantStatement();
        $s->setMerchantId('m-1');
        $s->setPeriodStart(new \DateTimeImmutable('2026-01-01'));
        $s->setPeriodEnd(new \DateTimeImmutable('2026-01-31'));
        $arr = $s->toArray();
        $this->assertArrayHasKey('period_start', $arr);
        $this->assertArrayHasKey('closing_balance', $arr);
    }
}

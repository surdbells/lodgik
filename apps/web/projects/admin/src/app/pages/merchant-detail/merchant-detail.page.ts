import { Component, inject, signal, OnInit } from '@angular/core';
import { DatePipe } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { ApiService, PageHeaderComponent, LoadingSpinnerComponent, BadgeComponent, ToastService } from '@lodgik/shared';

@Component({
  selector: 'app-merchant-detail',
  standalone: true,
  imports: [DatePipe, PageHeaderComponent, LoadingSpinnerComponent, BadgeComponent],
  template: `
    <ui-loading [loading]="loading()"></ui-loading>
    @if (!loading() && merchant()) {
      <!-- Header -->
      <div class="mb-6">
        <button (click)="goBack()" class="text-sm text-gray-500 hover:text-gray-700 flex items-center gap-1 mb-3">
          <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7"/></svg>
          Back to Merchants
        </button>
        <div class="flex items-start justify-between">
          <div>
            <h1 class="text-2xl font-bold text-gray-900">{{ merchant().business_name }}</h1>
            <p class="text-sm text-gray-500 mt-1">{{ merchant().legal_name }} · <span class="font-mono">{{ merchant().merchant_id }}</span></p>
          </div>
          <div class="flex gap-2">
            @if (merchant().status === 'pending_approval' || merchant().status === 'kyc_in_progress') {
              <button (click)="approve()" class="px-4 py-2 text-sm rounded-lg bg-green-600 text-white hover:bg-green-700">Approve</button>
            }
            @if (merchant().status === 'active') {
              <button (click)="suspend()" class="px-4 py-2 text-sm rounded-lg bg-amber-500 text-white hover:bg-amber-600">Suspend</button>
            }
            @if (merchant().status === 'suspended') {
              <button (click)="approve()" class="px-4 py-2 text-sm rounded-lg bg-green-600 text-white hover:bg-green-700">Reactivate</button>
              <button (click)="terminate()" class="px-4 py-2 text-sm rounded-lg bg-red-600 text-white hover:bg-red-700">Terminate</button>
            }
          </div>
        </div>
      </div>

      <!-- Status Bar -->
      <div class="bg-white rounded-lg border p-4 mb-4 flex items-center gap-6 flex-wrap">
        <div class="flex items-center gap-2">
          <span class="text-xs text-gray-500">Status</span>
          <ui-badge [variant]="statusVariant(merchant().status)">{{ formatStatus(merchant().status) }}</ui-badge>
        </div>
        <div class="flex items-center gap-2">
          <span class="text-xs text-gray-500">KYC</span>
          <ui-badge [variant]="kycVariant(merchant().kyc?.status)">{{ merchant().kyc?.status || 'Not Submitted' }}</ui-badge>
        </div>
        <div class="flex items-center gap-2">
          <span class="text-xs text-gray-500">Bank</span>
          <ui-badge [variant]="bankVariant(merchant().bank_account?.status)">{{ merchant().bank_account?.status || 'None' }}</ui-badge>
        </div>
        <div class="flex items-center gap-2">
          <span class="text-xs text-gray-500">Hotels</span>
          <span class="text-sm font-semibold text-gray-800">{{ merchant().hotel_count || 0 }}</span>
        </div>
        <div class="flex items-center gap-2">
          <span class="text-xs text-gray-500">Tier</span>
          <span class="text-sm font-semibold text-gray-800">{{ merchant().commission_tier?.name || 'Default' }}</span>
        </div>
      </div>

      <!-- Tabs -->
      <div class="flex gap-1 mb-4 border-b">
        @for (t of tabs; track t.key) {
          <button (click)="activeTab.set(t.key)"
            [class]="activeTab() === t.key ? 'border-sage-600 text-sage-700 bg-sage-50/50' : 'border-transparent text-gray-500 hover:text-gray-700'"
            class="px-4 py-2.5 text-sm font-medium border-b-2 -mb-px transition-colors rounded-t-md">
            {{ t.label }}
          </button>
        }
      </div>

      <!-- Tab Content -->
      <div class="bg-white rounded-lg border">
        @switch (activeTab()) {
          @case ('overview') {
            <div class="p-6">
              <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div class="space-y-4">
                  <h3 class="text-sm font-semibold text-gray-900 uppercase tracking-wider">Business Details</h3>
                  <div class="space-y-3">
                    @for (f of overviewFields; track f.key) {
                      <div class="flex justify-between py-2 border-b border-gray-100">
                        <span class="text-sm text-gray-500">{{ f.label }}</span>
                        <span class="text-sm text-gray-900 font-medium">{{ merchant()[f.key] || '—' }}</span>
                      </div>
                    }
                  </div>
                </div>
                <div class="space-y-4">
                  <h3 class="text-sm font-semibold text-gray-900 uppercase tracking-wider">Dates</h3>
                  <div class="space-y-3">
                    <div class="flex justify-between py-2 border-b border-gray-100">
                      <span class="text-sm text-gray-500">Registered</span>
                      <span class="text-sm text-gray-900">{{ merchant().created_at | date:'medium' }}</span>
                    </div>
                    <div class="flex justify-between py-2 border-b border-gray-100">
                      <span class="text-sm text-gray-500">Approved</span>
                      <span class="text-sm text-gray-900">{{ merchant().approved_at ? (merchant().approved_at | date:'medium') : '—' }}</span>
                    </div>
                    @if (merchant().suspended_at) {
                      <div class="flex justify-between py-2 border-b border-gray-100">
                        <span class="text-sm text-gray-500">Suspended</span>
                        <span class="text-sm text-red-600">{{ merchant().suspended_at | date:'medium' }}</span>
                      </div>
                      <div class="flex justify-between py-2 border-b border-gray-100">
                        <span class="text-sm text-gray-500">Reason</span>
                        <span class="text-sm text-red-600">{{ merchant().suspension_reason }}</span>
                      </div>
                    }
                  </div>

                  <!-- User / Invitation -->
                  <h3 class="text-sm font-semibold text-gray-900 uppercase tracking-wider mt-6">Portal Access</h3>
                  @if (merchant().user) {
                    <div class="space-y-3">
                      <div class="flex justify-between py-2 border-b border-gray-100">
                        <span class="text-sm text-gray-500">Login Email</span>
                        <span class="text-sm text-gray-900">{{ merchant().user.email }}</span>
                      </div>
                      <div class="flex justify-between py-2 border-b border-gray-100">
                        <span class="text-sm text-gray-500">Account Status</span>
                        <span class="text-sm" [class]="merchant().user.is_active ? 'text-green-600' : 'text-amber-600'">
                          {{ merchant().user.is_active ? 'Active' : 'Pending Setup' }}
                        </span>
                      </div>
                      @if (merchant().user.invite_url) {
                        <div class="bg-amber-50 border border-amber-200 rounded-lg p-3 mt-2">
                          <div class="text-xs font-medium text-amber-800 mb-1">Invitation Pending</div>
                          <div class="text-xs text-amber-600 mb-2">Merchant hasn't set their password yet. Share this link:</div>
                          <div class="flex gap-2">
                            <input readonly [value]="merchant().user.invite_url" class="flex-1 text-xs px-2 py-1.5 bg-white border rounded font-mono truncate">
                            <button (click)="copyInviteUrl()" class="px-3 py-1.5 text-xs bg-amber-600 text-white rounded hover:bg-amber-700 whitespace-nowrap">
                              {{ copied() ? 'Copied!' : 'Copy Link' }}
                            </button>
                          </div>
                        </div>
                      }
                    </div>
                  } @else {
                    <div class="text-sm text-gray-400 py-2">No user account linked (legacy merchant)</div>
                  }

                  @if (merchant().commission_tier) {
                    <h3 class="text-sm font-semibold text-gray-900 uppercase tracking-wider mt-6">Commission Tier</h3>
                    <div class="space-y-3">
                      <div class="flex justify-between py-2 border-b border-gray-100">
                        <span class="text-sm text-gray-500">Tier</span>
                        <span class="text-sm text-gray-900 font-medium">{{ merchant().commission_tier.name }}</span>
                      </div>
                      <div class="flex justify-between py-2 border-b border-gray-100">
                        <span class="text-sm text-gray-500">New Subscription</span>
                        <span class="text-sm text-gray-900">{{ merchant().commission_tier.new_subscription_rate }}%</span>
                      </div>
                      <div class="flex justify-between py-2 border-b border-gray-100">
                        <span class="text-sm text-gray-500">Renewal</span>
                        <span class="text-sm text-gray-900">{{ merchant().commission_tier.renewal_rate }}%</span>
                      </div>
                    </div>
                  }
                </div>
              </div>
            </div>
          }

          @case ('kyc') {
            <div class="p-6">
              @if (merchant().kyc) {
                <div class="flex items-center justify-between mb-6">
                  <div>
                    <h3 class="font-semibold text-gray-900">KYC Verification</h3>
                    <p class="text-sm text-gray-500">Type: {{ merchant().kyc.kyc_type }}</p>
                  </div>
                  <ui-badge [variant]="kycVariant(merchant().kyc.status)">{{ merchant().kyc.status }}</ui-badge>
                </div>
                <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                  @for (doc of kycDocs(); track doc.label) {
                    <div class="border rounded-lg p-4">
                      <div class="flex items-center justify-between mb-2">
                        <span class="text-sm font-medium text-gray-700">{{ doc.label }}</span>
                        @if (doc.value) {
                          <span class="text-xs text-green-600 bg-green-50 px-2 py-0.5 rounded">Provided</span>
                        } @else {
                          <span class="text-xs text-gray-400 bg-gray-50 px-2 py-0.5 rounded">Missing</span>
                        }
                      </div>
                      @if (doc.value && doc.isUrl) {
                        <a [href]="doc.value" target="_blank" class="text-xs text-sage-600 hover:underline">View Document</a>
                      } @else if (doc.value) {
                        <span class="text-sm text-gray-600">{{ doc.value }}</span>
                      }
                    </div>
                  }
                </div>
                @if (merchant().kyc.status === 'under_review') {
                  <div class="mt-6 flex gap-3">
                    <button (click)="reviewKyc('approved')" class="px-4 py-2 bg-green-600 text-white text-sm rounded-lg hover:bg-green-700">Approve KYC</button>
                    <button (click)="reviewKyc('rejected')" class="px-4 py-2 bg-red-600 text-white text-sm rounded-lg hover:bg-red-700">Reject KYC</button>
                  </div>
                }
              } @else {
                <div class="py-12 text-center text-gray-400">KYC not yet submitted by this merchant.</div>
              }
            </div>
          }

          @case ('bank') {
            <div class="p-6">
              @if (merchant().bank_account) {
                <div class="max-w-md space-y-3">
                  <div class="flex items-center justify-between mb-4">
                    <h3 class="font-semibold text-gray-900">Bank Account</h3>
                    <ui-badge [variant]="bankVariant(merchant().bank_account.status)">{{ merchant().bank_account.status }}</ui-badge>
                  </div>
                  @for (f of bankFields; track f.key) {
                    <div class="flex justify-between py-2 border-b border-gray-100">
                      <span class="text-sm text-gray-500">{{ f.label }}</span>
                      <span class="text-sm text-gray-900 font-medium">{{ merchant().bank_account[f.key] || '—' }}</span>
                    </div>
                  }
                  @if (merchant().bank_account.status === 'pending') {
                    <div class="flex gap-3 mt-4">
                      <button (click)="approveBank()" class="px-4 py-2 bg-green-600 text-white text-sm rounded-lg hover:bg-green-700">Approve Bank</button>
                      <button (click)="freezeBank()" class="px-4 py-2 bg-red-600 text-white text-sm rounded-lg hover:bg-red-700">Freeze Bank</button>
                    </div>
                  }
                </div>
              } @else {
                <div class="py-12 text-center text-gray-400">No bank account added yet.</div>
              }
            </div>
          }

          @case ('hotels') {
            <div class="p-6">
              @if (hotels().length > 0) {
                <div class="space-y-3">
                  @for (h of hotels(); track h.id) {
                    <div class="border rounded-lg p-4 flex items-center justify-between">
                      <div>
                        <div class="font-medium text-gray-900">{{ h.hotel_name }}</div>
                        <div class="text-xs text-gray-500">{{ h.location }} · {{ h.contact_person }}</div>
                      </div>
                      <div class="flex items-center gap-3">
                        <ui-badge [variant]="h.onboarding_status === 'live' ? 'success' : 'warning'">{{ h.onboarding_status }}</ui-badge>
                      </div>
                    </div>
                  }
                </div>
              } @else {
                <div class="py-12 text-center text-gray-400">No hotels registered yet.</div>
              }
            </div>
          }

          @case ('audit') {
            <div class="p-6">
              @if (auditLog().length > 0) {
                <div class="relative">
                  <div class="absolute left-4 top-0 bottom-0 w-px bg-gray-200"></div>
                  <div class="space-y-6">
                    @for (entry of auditLog(); track entry.id) {
                      <div class="relative pl-10">
                        <div class="absolute left-2.5 top-1 w-3 h-3 rounded-full border-2 border-sage-400 bg-white"></div>
                        <div class="bg-gray-50 rounded-lg p-3">
                          <div class="flex items-center justify-between">
                            <span class="text-sm font-medium text-gray-900">{{ entry.action }}</span>
                            <span class="text-xs text-gray-500">{{ entry.logged_at | date:'medium' }}</span>
                          </div>
                          <div class="text-xs text-gray-500 mt-1">
                            By: {{ entry.actor_type }} {{ entry.actor_id?.substring(0, 8) }}
                          </div>
                          @if (entry.old_value || entry.new_value) {
                            <div class="mt-2 text-xs">
                              @if (entry.old_value) { <span class="text-red-500 line-through">{{ entry.old_value }}</span> }
                              @if (entry.new_value) { <span class="text-green-600 ml-2">{{ entry.new_value }}</span> }
                            </div>
                          }
                        </div>
                      </div>
                    }
                  </div>
                </div>
              } @else {
                <div class="py-12 text-center text-gray-400">No audit entries yet.</div>
              }
            </div>
          }
        }
      </div>
    }

    @if (!loading() && !merchant()) {
      <div class="py-20 text-center">
        <div class="text-gray-400 text-lg mb-2">Merchant not found</div>
        <button (click)="goBack()" class="text-sage-600 hover:underline text-sm">Back to merchants</button>
      </div>
    }
  `,
})
export class MerchantDetailPage implements OnInit {
  private api = inject(ApiService);
  private toast = inject(ToastService);
  private route = inject(ActivatedRoute);
  private router = inject(Router);

  loading = signal(true);
  merchant = signal<any>(null);
  hotels = signal<any[]>([]);
  auditLog = signal<any[]>([]);
  activeTab = signal('overview');
  copied = signal(false);

  tabs = [
    { key: 'overview', label: 'Overview' },
    { key: 'kyc', label: 'KYC' },
    { key: 'bank', label: 'Bank Account' },
    { key: 'hotels', label: 'Hotels' },
    { key: 'audit', label: 'Audit Log' },
  ];

  overviewFields = [
    { key: 'email', label: 'Email' },
    { key: 'phone', label: 'Phone' },
    { key: 'address', label: 'Address' },
    { key: 'operating_region', label: 'Region' },
    { key: 'category', label: 'Category' },
    { key: 'type', label: 'Type' },
    { key: 'settlement_currency', label: 'Currency' },
  ];

  bankFields = [
    { key: 'bank_name', label: 'Bank' },
    { key: 'account_name', label: 'Account Name' },
    { key: 'account_number', label: 'Account Number' },
    { key: 'settlement_currency', label: 'Currency' },
    { key: 'payment_method', label: 'Payment Method' },
  ];

  kycDocs = signal<any[]>([]);
  private merchantId = '';

  ngOnInit(): void {
    this.merchantId = this.route.snapshot.paramMap.get('id') || '';
    this.loadMerchant();
  }

  loadMerchant(): void {
    this.loading.set(true);
    this.api.get(`/admin/merchants/${this.merchantId}`).subscribe({
      next: (r: any) => {
        const m = r.data;
        this.merchant.set(m);
        this.buildKycDocs(m.kyc);
        this.loading.set(false);
        this.loadHotels();
        this.loadAuditLog();
      },
      error: () => { this.loading.set(false); this.toast.error('Failed to load merchant'); },
    });
  }

  loadHotels(): void {
    this.api.get(`/admin/merchants/${this.merchantId}/hotels`).subscribe({
      next: (r: any) => this.hotels.set(r.data || []),
      error: () => {},
    });
  }

  loadAuditLog(): void {
    this.api.get(`/admin/merchants/${this.merchantId}/audit-log`).subscribe({
      next: (r: any) => this.auditLog.set(r.data || []),
      error: () => {},
    });
  }

  buildKycDocs(kyc: any): void {
    if (!kyc) { this.kycDocs.set([]); return; }
    this.kycDocs.set([
      { label: 'Government ID Type', value: kyc.government_id_type, isUrl: false },
      { label: 'Government ID Number', value: kyc.government_id_number, isUrl: false },
      { label: 'Government ID Document', value: kyc.government_id_url, isUrl: true },
      { label: 'Selfie', value: kyc.selfie_url, isUrl: true },
      { label: 'Proof of Address', value: kyc.proof_of_address_url, isUrl: true },
      { label: 'CAC Certificate', value: kyc.cac_certificate_url, isUrl: true },
      { label: 'Business Address Verification', value: kyc.business_address_verification_url, isUrl: true },
    ]);
  }

  approve(): void {
    this.api.post(`/admin/merchants/${this.merchantId}/approve`, {}).subscribe({
      next: () => { this.toast.success('Merchant approved'); this.loadMerchant(); },
      error: (e: any) => this.toast.error(e.error?.message || 'Failed'),
    });
  }

  suspend(): void {
    const reason = prompt('Suspension reason:');
    if (reason === null) return;
    this.api.post(`/admin/merchants/${this.merchantId}/suspend`, { reason: reason || 'Admin action' }).subscribe({
      next: () => { this.toast.success('Merchant suspended'); this.loadMerchant(); },
      error: (e: any) => this.toast.error(e.error?.message || 'Failed'),
    });
  }

  terminate(): void {
    if (!confirm('Are you sure you want to terminate this merchant? This action cannot be undone.')) return;
    this.api.post(`/admin/merchants/${this.merchantId}/terminate`, { reason: 'Admin termination' }).subscribe({
      next: () => { this.toast.success('Merchant terminated'); this.loadMerchant(); },
      error: (e: any) => this.toast.error(e.error?.message || 'Failed'),
    });
  }

  reviewKyc(decision: string): void {
    const reason = decision === 'rejected' ? prompt('Rejection reason:') : null;
    if (decision === 'rejected' && reason === null) return;
    this.api.post(`/admin/merchants/kyc/${this.merchant().kyc?.id}/review`, { decision, reason: reason || '' }).subscribe({
      next: () => { this.toast.success(`KYC ${decision}`); this.loadMerchant(); },
      error: (e: any) => this.toast.error(e.error?.message || 'Failed'),
    });
  }

  approveBank(): void {
    this.api.post(`/admin/merchants/bank/${this.merchant().bank_account?.id}/approve`, {}).subscribe({
      next: () => { this.toast.success('Bank account approved'); this.loadMerchant(); },
      error: (e: any) => this.toast.error(e.error?.message || 'Failed'),
    });
  }

  freezeBank(): void {
    this.api.post(`/admin/merchants/bank/${this.merchant().bank_account?.id}/freeze`, {}).subscribe({
      next: () => { this.toast.success('Bank account frozen'); this.loadMerchant(); },
      error: (e: any) => this.toast.error(e.error?.message || 'Failed'),
    });
  }

  goBack(): void { this.router.navigate(['/merchants']); }

  copyInviteUrl(): void {
    const url = this.merchant()?.user?.invite_url;
    if (url) {
      navigator.clipboard.writeText(url).then(() => {
        this.copied.set(true);
        setTimeout(() => this.copied.set(false), 2000);
      });
    }
  }

  formatStatus(s: string): string { return (s || '').replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase()); }
  statusVariant(s: string): any { return ({ active: 'success', suspended: 'danger', terminated: 'danger', pending_approval: 'warning', kyc_in_progress: 'info' } as any)[s] || 'neutral'; }
  kycVariant(s: string): any { return ({ approved: 'success', rejected: 'danger', under_review: 'warning', not_submitted: 'neutral' } as any)[s] || 'neutral'; }
  bankVariant(s: string): any { return ({ verified: 'success', frozen: 'danger', pending: 'warning' } as any)[s] || 'neutral'; }
}

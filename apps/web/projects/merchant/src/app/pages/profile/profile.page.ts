import { Component, inject, signal, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { PageHeaderComponent, LoadingSpinnerComponent, BadgeComponent, ToastService } from '@lodgik/shared';
import { MerchantApiService } from '../../services/merchant-api.service';

@Component({
  selector: 'app-profile',
  standalone: true,
  imports: [FormsModule, PageHeaderComponent, LoadingSpinnerComponent, BadgeComponent],
  template: `
    <ui-page-header title="Profile" icon="user-round" [breadcrumbs]="['Account', 'Profile']" subtitle="Manage your business info, KYC and bank details"></ui-page-header>
    <ui-loading [loading]="loading()"></ui-loading>
    @if (!loading()) {
      <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <!-- Business Info -->
        <div class="bg-white rounded-xl border border-gray-100 shadow-card p-5">
          <h3 class="text-sm font-semibold mb-4">Business Information</h3>
          <div class="space-y-2 text-sm">
            <div class="flex justify-between"><span class="text-gray-500">Merchant ID</span><span class="font-mono text-xs bg-gray-100 px-2 py-0.5 rounded">{{ profile().merchant_id }}</span></div>
            <div class="flex justify-between"><span class="text-gray-500">Legal Name</span><span>{{ profile().legal_name }}</span></div>
            <div class="flex justify-between"><span class="text-gray-500">Business Name</span><span>{{ profile().business_name }}</span></div>
            <div class="flex justify-between"><span class="text-gray-500">Email</span><span>{{ profile().email }}</span></div>
            <div class="flex justify-between"><span class="text-gray-500">Phone</span><span>{{ profile().phone || '—' }}</span></div>
            <div class="flex justify-between"><span class="text-gray-500">Category</span><span class="capitalize">{{ profile().category?.replace('_', ' ') }}</span></div>
            <div class="flex justify-between"><span class="text-gray-500">Status</span><ui-badge [variant]="profile().status === 'active' ? 'success' : 'warning'">{{ profile().status }}</ui-badge></div>
          </div>
        </div>

        <!-- KYC Status -->
        <div class="bg-white rounded-xl border border-gray-100 shadow-card p-5">
          <div class="flex items-center justify-between mb-4">
            <h3 class="text-sm font-semibold">KYC Verification</h3>
            <ui-badge [variant]="kyc().status === 'approved' ? 'success' : kyc().status === 'rejected' ? 'danger' : 'warning'">{{ kyc().status || 'not_submitted' }}</ui-badge>
          </div>
          @if (kyc().status === 'rejected') {
            <div class="bg-red-50 text-red-700 text-xs p-3 rounded-lg mb-3">Rejected: {{ kyc().rejection_reason }}</div>
          }
          @if (kyc().status !== 'approved') {
            <div class="space-y-3">
              <div><label class="block text-xs font-medium text-gray-600 mb-1">Government ID Type</label>
                <select [(ngModel)]="kycForm.government_id_type" class="w-full px-3 py-2 border rounded-lg text-sm"><option value="nin">NIN</option><option value="bvn">BVN</option><option value="passport">Passport</option><option value="drivers_license">Driver's License</option></select>
              </div>
              <div><label class="block text-xs font-medium text-gray-600 mb-1">ID Number</label><input [(ngModel)]="kycForm.government_id_number" class="w-full px-3 py-2 border rounded-lg text-sm"></div>
              <div><label class="block text-xs font-medium text-gray-600 mb-1">Government ID URL</label><input [(ngModel)]="kycForm.government_id_url" class="w-full px-3 py-2 border rounded-lg text-sm" placeholder="https://..."></div>
              <div><label class="block text-xs font-medium text-gray-600 mb-1">Selfie URL</label><input [(ngModel)]="kycForm.selfie_url" class="w-full px-3 py-2 border rounded-lg text-sm" placeholder="https://..."></div>
              <button (click)="submitKyc()" class="w-full py-2 bg-sage-600 text-white text-sm rounded-lg hover:bg-sage-700">Submit KYC</button>
            </div>
          } @else {
            <div class="text-center py-4"><span class="text-3xl">✅</span><p class="text-sm text-gray-600 mt-2">KYC Verified</p></div>
          }
        </div>

        <!-- Bank Account -->
        <div class="bg-white rounded-xl border border-gray-100 shadow-card p-5 lg:col-span-2">
          <h3 class="text-sm font-semibold mb-4">Bank Account</h3>
          @if (profile().bank_account) {
            <div class="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm mb-3">
              <div><span class="text-gray-500 text-xs block">Bank</span>{{ profile().bank_account.bank_name }}</div>
              <div><span class="text-gray-500 text-xs block">Account Name</span>{{ profile().bank_account.account_name }}</div>
              <div><span class="text-gray-500 text-xs block">Account Number</span>{{ profile().bank_account.account_number }}</div>
              <div><span class="text-gray-500 text-xs block">Status</span><ui-badge [variant]="profile().bank_account.status === 'approved' ? 'success' : 'warning'">{{ profile().bank_account.status }}</ui-badge></div>
            </div>
          } @else {
            <div class="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div><label class="block text-xs font-medium text-gray-600 mb-1">Bank Name</label><input [(ngModel)]="bankForm.bank_name" class="w-full px-3 py-2 border rounded-lg text-sm"></div>
              <div><label class="block text-xs font-medium text-gray-600 mb-1">Account Name</label><input [(ngModel)]="bankForm.account_name" class="w-full px-3 py-2 border rounded-lg text-sm"></div>
              <div><label class="block text-xs font-medium text-gray-600 mb-1">Account Number</label><input [(ngModel)]="bankForm.account_number" class="w-full px-3 py-2 border rounded-lg text-sm"></div>
            </div>
            <button (click)="addBank()" class="mt-3 px-4 py-2 bg-sage-600 text-white text-sm rounded-lg hover:bg-sage-700">Add Bank Account</button>
          }
        </div>

        <!-- Commission Tier -->
        @if (profile().commission_tier) {
          <div class="bg-white rounded-xl border border-gray-100 shadow-card p-5 lg:col-span-2">
            <h3 class="text-sm font-semibold mb-3">Commission Tier: {{ profile().commission_tier.name }}</h3>
            <div class="grid grid-cols-3 gap-4">
              <div class="text-center p-3 bg-emerald-50 rounded-lg"><div class="text-xl font-bold text-emerald-700">{{ profile().commission_tier.new_subscription_rate }}%</div><div class="text-xs text-gray-500">New Subscription</div></div>
              <div class="text-center p-3 bg-sage-50 rounded-lg"><div class="text-xl font-bold text-sage-700">{{ profile().commission_tier.renewal_rate }}%</div><div class="text-xs text-gray-500">Renewal</div></div>
              <div class="text-center p-3 bg-amber-50 rounded-lg"><div class="text-xl font-bold text-amber-700">{{ profile().commission_tier.upgrade_rate }}%</div><div class="text-xs text-gray-500">Upgrade</div></div>
            </div>
          </div>
        }
      </div>
    }
  `,
})
export class ProfilePage implements OnInit {
  private api = inject(MerchantApiService);
  private toast = inject(ToastService);
  loading = signal(true); profile = signal<any>({}); kyc = signal<any>({});
  kycForm: any = { government_id_type: 'nin', government_id_number: '', government_id_url: '', selfie_url: '' };
  bankForm: any = { bank_name: '', account_name: '', account_number: '' };

  ngOnInit(): void {
    this.api.profile().subscribe({ next: (p: any) => { this.profile.set(p); this.kyc.set(p.kyc || {}); this.loading.set(false); }, error: () => this.loading.set(false) });
  }
  submitKyc(): void { this.api.submitKyc(this.kycForm).subscribe({ next: () => { this.toast.success('KYC submitted for review'); this.ngOnInit(); }, error: (e: any) => this.toast.error(e?.error?.message || 'KYC submission failed') }); }
  addBank(): void { this.api.addBank(this.bankForm).subscribe({ next: () => { this.toast.success('Bank account added'); this.ngOnInit(); }, error: (e: any) => this.toast.error(e?.error?.message || 'Failed to add bank') }); }
}

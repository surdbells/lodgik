import { Component, inject, signal, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import {
  PageHeaderComponent, LoadingSpinnerComponent, BadgeComponent,
  ToastService, FileUploadComponent,
} from '@lodgik/shared';
import { MerchantApiService } from '../../services/merchant-api.service';

@Component({
  selector: 'app-profile',
  standalone: true,
  imports: [FormsModule, PageHeaderComponent, LoadingSpinnerComponent, BadgeComponent, FileUploadComponent],
  template: `
    <ui-page-header title="Profile" icon="user-round"
      [breadcrumbs]="['Account', 'Profile']"
      subtitle="Manage your business info, KYC documents and bank details">
    </ui-page-header>
    <ui-loading [loading]="loading()"></ui-loading>

    @if (!loading()) {
      <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">

        <!-- Business Info -->
        <div class="bg-white rounded-xl border border-gray-100 shadow-card p-5">
          <h3 class="text-sm font-semibold mb-4">Business Information</h3>
          <div class="space-y-2.5 text-sm">
            <div class="flex justify-between py-1 border-b border-gray-50">
              <span class="text-gray-500">Merchant ID</span>
              <span class="font-mono text-xs bg-gray-100 px-2 py-0.5 rounded">{{ profile().merchant_id }}</span>
            </div>
            <div class="flex justify-between py-1 border-b border-gray-50"><span class="text-gray-500">Legal Name</span><span>{{ profile().legal_name }}</span></div>
            <div class="flex justify-between py-1 border-b border-gray-50"><span class="text-gray-500">Business Name</span><span>{{ profile().business_name }}</span></div>
            <div class="flex justify-between py-1 border-b border-gray-50"><span class="text-gray-500">Email</span><span>{{ profile().email }}</span></div>
            <div class="flex justify-between py-1 border-b border-gray-50"><span class="text-gray-500">Phone</span><span>{{ profile().phone || '—' }}</span></div>
            <div class="flex justify-between py-1 border-b border-gray-50"><span class="text-gray-500">Category</span><span class="capitalize">{{ (profile().category || '').replace('_', ' ') }}</span></div>
            <div class="flex justify-between py-1">
              <span class="text-gray-500">Status</span>
              <ui-badge [variant]="profile().status === 'active' ? 'success' : 'warning'">{{ profile().status }}</ui-badge>
            </div>
          </div>
        </div>

        <!-- KYC Verification -->
        <div class="bg-white rounded-xl border border-gray-100 shadow-card p-5">
          <div class="flex items-center justify-between mb-5">
            <h3 class="text-sm font-semibold">KYC Verification</h3>
            <ui-badge [variant]="kycStatusVariant()">{{ kyc().status || 'not_submitted' }}</ui-badge>
          </div>

          @if (kyc().status === 'rejected') {
            <div class="bg-red-50 border border-red-100 text-red-700 text-xs p-3 rounded-lg mb-4">
              <strong>Rejected:</strong> {{ kyc().rejection_reason || 'Contact support for details.' }}
            </div>
          }
          @if (kyc().status === 'under_review') {
            <div class="bg-amber-50 border border-amber-100 text-amber-700 text-xs p-3 rounded-lg">
              Documents under review. You will be notified once complete (within 24 hours).
            </div>
          }
          @if (kyc().status === 'approved') {
            <div class="text-center py-8">
              <div class="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-3">
                <svg xmlns="http://www.w3.org/2000/svg" class="w-8 h-8 text-green-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="20 6 9 17 4 12"/></svg>
              </div>
              <p class="text-sm font-semibold text-gray-800">Identity Verified</p>
              <p class="text-xs text-gray-400 mt-1">Your KYC was approved</p>
            </div>
          }

          @if (kyc().status !== 'approved' && kyc().status !== 'under_review') {
            @if (kycError()) {
              <div class="bg-red-50 border border-red-100 text-red-700 text-xs p-3 rounded-lg mb-4">{{ kycError() }}</div>
            }
            <div class="space-y-4">
              <div>
                <label class="block text-xs font-medium text-gray-700 mb-1">Government ID Type <span class="text-red-400">*</span></label>
                <select [(ngModel)]="kycForm.government_id_type"
                  class="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-sage-200 focus:border-sage-400 outline-none bg-gray-50 focus:bg-white">
                  <option value="">— Select type —</option>
                  <option value="nin">NIN (National ID)</option>
                  <option value="bvn">BVN</option>
                  <option value="passport">International Passport</option>
                  <option value="drivers_license">Driver's License</option>
                </select>
              </div>
              <div>
                <label class="block text-xs font-medium text-gray-700 mb-1">ID Number <span class="text-red-400">*</span></label>
                <input [(ngModel)]="kycForm.government_id_number"
                  class="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-sage-200 focus:border-sage-400 outline-none bg-gray-50 focus:bg-white"
                  placeholder="Enter your ID number">
              </div>
              <ui-file-upload
                context="kyc" label="Government ID Document" [required]="true"
                accept="image/jpeg,image/png,image/webp,application/pdf"
                [currentUrl]="kycForm.government_id_url"
                (uploaded)="kycForm.government_id_url = $event.url"
                (cleared)="kycForm.government_id_url = ''">
              </ui-file-upload>
              <ui-file-upload
                context="kyc" label="Selfie / Liveness Photo" [required]="true"
                accept="image/jpeg,image/png,image/webp"
                [currentUrl]="kycForm.selfie_url"
                (uploaded)="kycForm.selfie_url = $event.url"
                (cleared)="kycForm.selfie_url = ''">
              </ui-file-upload>
              <ui-file-upload
                context="kyc" label="Proof of Address (optional)" [required]="false"
                accept="image/jpeg,image/png,image/webp,application/pdf"
                [currentUrl]="kycForm.proof_of_address_url"
                (uploaded)="kycForm.proof_of_address_url = $event.url"
                (cleared)="kycForm.proof_of_address_url = ''">
              </ui-file-upload>
              @if (profile().type === 'company') {
                <ui-file-upload
                  context="kyc" label="CAC Certificate" [required]="true"
                  accept="image/jpeg,image/png,image/webp,application/pdf"
                  [currentUrl]="kycForm.cac_certificate_url"
                  (uploaded)="kycForm.cac_certificate_url = $event.url"
                  (cleared)="kycForm.cac_certificate_url = ''">
                </ui-file-upload>
              }
              <button (click)="submitKyc()" [disabled]="kycSubmitting()"
                class="w-full py-2.5 bg-sage-600 text-white text-sm font-semibold rounded-lg hover:bg-sage-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors">
                {{ kycSubmitting() ? 'Submitting...' : 'Submit KYC for Review' }}
              </button>
            </div>
          }
        </div>

        <!-- Bank Account -->
        <div class="bg-white rounded-xl border border-gray-100 shadow-card p-5 lg:col-span-2">
          <h3 class="text-sm font-semibold mb-4">Bank Account</h3>
          @if (profile().bank_account) {
            <div class="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
              <div><span class="text-gray-400 text-xs block mb-0.5">Bank</span><span class="font-medium">{{ profile().bank_account.bank_name }}</span></div>
              <div><span class="text-gray-400 text-xs block mb-0.5">Account Name</span><span class="font-medium">{{ profile().bank_account.account_name }}</span></div>
              <div><span class="text-gray-400 text-xs block mb-0.5">Account Number</span><span class="font-mono font-medium">{{ profile().bank_account.account_number }}</span></div>
              <div><span class="text-gray-400 text-xs block mb-0.5">Status</span>
                <ui-badge [variant]="profile().bank_account.status === 'verified' ? 'success' : profile().bank_account.status === 'frozen' ? 'danger' : 'warning'">{{ profile().bank_account.status }}</ui-badge>
              </div>
            </div>
          } @else {
            @if (bankError()) {
              <div class="bg-red-50 border border-red-100 text-red-700 text-xs p-3 rounded-lg mb-4">{{ bankError() }}</div>
            }
            <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label class="block text-xs font-medium text-gray-700 mb-1">Bank Name <span class="text-red-400">*</span></label>
                <input [(ngModel)]="bankForm.bank_name"
                  class="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-sage-200 focus:border-sage-400 outline-none bg-gray-50 focus:bg-white"
                  placeholder="e.g. First Bank of Nigeria">
              </div>
              <div>
                <label class="block text-xs font-medium text-gray-700 mb-1">Account Name <span class="text-red-400">*</span></label>
                <input [(ngModel)]="bankForm.account_name"
                  class="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-sage-200 focus:border-sage-400 outline-none bg-gray-50 focus:bg-white"
                  placeholder="As on bank records">
              </div>
              <div>
                <label class="block text-xs font-medium text-gray-700 mb-1">Account Number <span class="text-red-400">*</span></label>
                <input [(ngModel)]="bankForm.account_number"
                  class="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-sage-200 focus:border-sage-400 outline-none bg-gray-50 focus:bg-white"
                  placeholder="10-digit NUBAN" maxlength="10">
              </div>
            </div>
            <button (click)="addBank()" [disabled]="bankSubmitting()"
              class="mt-4 px-5 py-2 bg-sage-600 text-white text-sm font-semibold rounded-lg hover:bg-sage-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors">
              {{ bankSubmitting() ? 'Saving...' : 'Add Bank Account' }}
            </button>
          }
        </div>

        <!-- Commission Tier -->
        @if (profile().commission_tier) {
          <div class="bg-white rounded-xl border border-gray-100 shadow-card p-5 lg:col-span-2">
            <h3 class="text-sm font-semibold mb-4">Commission Tier: <span class="text-sage-700">{{ profile().commission_tier.name }}</span></h3>
            <div class="grid grid-cols-3 gap-4">
              <div class="text-center p-4 bg-emerald-50 rounded-xl">
                <div class="text-2xl font-bold text-emerald-700">{{ profile().commission_tier.new_subscription_rate }}%</div>
                <div class="text-xs text-gray-500 mt-1">New Subscription</div>
              </div>
              <div class="text-center p-4 bg-sage-50 rounded-xl">
                <div class="text-2xl font-bold text-sage-700">{{ profile().commission_tier.renewal_rate }}%</div>
                <div class="text-xs text-gray-500 mt-1">Renewal</div>
              </div>
              <div class="text-center p-4 bg-amber-50 rounded-xl">
                <div class="text-2xl font-bold text-amber-700">{{ profile().commission_tier.upgrade_rate }}%</div>
                <div class="text-xs text-gray-500 mt-1">Upgrade</div>
              </div>
            </div>
          </div>
        }

      </div>
    }
  `,
})
export class ProfilePage implements OnInit {
  private api   = inject(MerchantApiService);
  private toast = inject(ToastService);

  loading        = signal(true);
  profile        = signal<any>({});
  kyc            = signal<any>({});
  kycSubmitting  = signal(false);
  bankSubmitting = signal(false);
  kycError       = signal('');
  bankError      = signal('');

  kycForm: any = {
    government_id_type: '',
    government_id_number: '',
    government_id_url: '',
    selfie_url: '',
    proof_of_address_url: '',
    cac_certificate_url: '',
  };

  bankForm: any = { bank_name: '', account_name: '', account_number: '' };

  ngOnInit(): void { this.load(); }

  load(): void {
    this.loading.set(true);
    this.api.profile().subscribe({
      next: (p: any) => {
        this.profile.set(p);
        this.kyc.set(p.kyc || {});
        this.loading.set(false);
      },
      error: () => this.loading.set(false),
    });
  }

  kycStatusVariant(): string {
    return ({ approved: 'success', rejected: 'danger', under_review: 'warning' } as any)[this.kyc().status] ?? 'neutral';
  }

  submitKyc(): void {
    this.kycError.set('');
    if (!this.kycForm.government_id_type) {
      this.kycError.set('Please select a Government ID type.'); return;
    }
    if (!this.kycForm.government_id_number?.trim()) {
      this.kycError.set('ID Number is required.'); return;
    }
    if (!this.kycForm.government_id_url) {
      this.kycError.set('Please upload your Government ID document.'); return;
    }
    if (!this.kycForm.selfie_url) {
      this.kycError.set('Please upload a selfie / liveness photo.'); return;
    }
    if (this.profile().type === 'company' && !this.kycForm.cac_certificate_url) {
      this.kycError.set('CAC Certificate is required for company accounts.'); return;
    }

    this.kycSubmitting.set(true);
    this.api.submitKyc(this.kycForm).subscribe({
      next: () => {
        this.toast.success('KYC submitted. We will review within 24 hours.');
        this.kycSubmitting.set(false);
        this.load();
      },
      error: (e: any) => {
        this.kycSubmitting.set(false);
        this.kycError.set(e?.error?.message || 'KYC submission failed. Please try again.');
      },
    });
  }

  addBank(): void {
    this.bankError.set('');
    if (!this.bankForm.bank_name?.trim()) {
      this.bankError.set('Bank name is required.'); return;
    }
    if (!this.bankForm.account_name?.trim()) {
      this.bankError.set('Account name is required.'); return;
    }
    const accNum = this.bankForm.account_number?.trim() ?? '';
    if (!accNum) {
      this.bankError.set('Account number is required.'); return;
    }
    if (!/^\d{10}$/.test(accNum)) {
      this.bankError.set('Account number must be exactly 10 digits (NUBAN format).'); return;
    }

    this.bankSubmitting.set(true);
    this.api.addBank(this.bankForm).subscribe({
      next: () => {
        this.toast.success('Bank account added. Pending verification.');
        this.bankSubmitting.set(false);
        this.load();
      },
      error: (e: any) => {
        this.bankSubmitting.set(false);
        this.bankError.set(e?.error?.message || 'Failed to add bank account.');
      },
    });
  }
}

import { Component, inject, signal, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { PageHeaderComponent, LoadingSpinnerComponent, BadgeComponent, ToastService } from '@lodgik/shared';
import { MerchantApiService } from '../../services/merchant-api.service';

@Component({
  selector: 'app-profile',
  standalone: true,
  imports: [FormsModule, PageHeaderComponent, LoadingSpinnerComponent, BadgeComponent],
  template: `
    <ui-page-header title="Profile" subtitle="Manage your business profile, KYC & bank account"></ui-page-header>
    <ui-loading [loading]="loading()"></ui-loading>
    @if (!loading()) {
      <!-- Business Info -->
      <div class="bg-white rounded-lg border p-5 mb-6">
        <h3 class="text-sm font-semibold mb-3">Business Information</h3>
        <div class="grid grid-cols-2 gap-3 text-sm">
          <div><span class="text-gray-500">Merchant ID:</span> {{ profile().merchant_id }}</div>
          <div><span class="text-gray-500">Legal Name:</span> {{ profile().legal_name }}</div>
          <div><span class="text-gray-500">Business Name:</span> {{ profile().business_name }}</div>
          <div><span class="text-gray-500">Email:</span> {{ profile().email }}</div>
          <div><span class="text-gray-500">Phone:</span> {{ profile().phone || '—' }}</div>
          <div><span class="text-gray-500">Category:</span> <span class="capitalize">{{ profile().category }}</span></div>
          <div><span class="text-gray-500">Status:</span> <ui-badge [variant]="profile().status === 'active' ? 'success' : 'warning'">{{ profile().status }}</ui-badge></div>
          <div><span class="text-gray-500">Region:</span> {{ profile().operating_region || '—' }}</div>
        </div>
      </div>

      <!-- KYC -->
      <div class="bg-white rounded-lg border p-5 mb-6">
        <div class="flex items-center justify-between mb-3">
          <h3 class="text-sm font-semibold">KYC Verification</h3>
          <ui-badge [variant]="kyc().status === 'approved' ? 'success' : kyc().status === 'rejected' ? 'danger' : 'warning'">{{ kyc().status || 'not_submitted' }}</ui-badge>
        </div>
        @if (kyc().status === 'rejected') { <div class="bg-red-50 text-red-700 text-sm p-3 rounded-lg mb-3">Rejected: {{ kyc().rejection_reason }}</div> }
        @if (kyc().status !== 'approved') {
          <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div><label class="block text-xs font-medium text-gray-600 mb-1">ID Type</label>
              <select [(ngModel)]="kycForm.government_id_type" class="w-full px-3 py-2 border rounded-lg text-sm">
                <option value="nin">NIN</option><option value="bvn">BVN</option><option value="passport">Passport</option><option value="drivers_license">Driver's License</option>
              </select>
            </div>
            <div><label class="block text-xs font-medium text-gray-600 mb-1">ID Number</label><input [(ngModel)]="kycForm.government_id_number" class="w-full px-3 py-2 border rounded-lg text-sm"></div>
            <div><label class="block text-xs font-medium text-gray-600 mb-1">ID Document URL</label><input [(ngModel)]="kycForm.government_id_url" class="w-full px-3 py-2 border rounded-lg text-sm" placeholder="https://..."></div>
            <div><label class="block text-xs font-medium text-gray-600 mb-1">Selfie URL</label><input [(ngModel)]="kycForm.selfie_url" class="w-full px-3 py-2 border rounded-lg text-sm" placeholder="https://..."></div>
            <div><label class="block text-xs font-medium text-gray-600 mb-1">Proof of Address URL</label><input [(ngModel)]="kycForm.proof_of_address_url" class="w-full px-3 py-2 border rounded-lg text-sm"></div>
            <div><label class="block text-xs font-medium text-gray-600 mb-1">CAC Certificate URL</label><input [(ngModel)]="kycForm.cac_certificate_url" class="w-full px-3 py-2 border rounded-lg text-sm"></div>
          </div>
          <button (click)="submitKyc()" class="mt-4 px-4 py-2 bg-emerald-600 text-white text-sm rounded-lg hover:bg-emerald-700">Submit KYC</button>
        }
      </div>

      <!-- Bank Account -->
      <div class="bg-white rounded-lg border p-5">
        <div class="flex items-center justify-between mb-3">
          <h3 class="text-sm font-semibold">Bank Account</h3>
          @if (bank()) { <ui-badge [variant]="bank().status === 'approved' ? 'success' : bank().status === 'frozen' ? 'danger' : 'warning'">{{ bank().status }}</ui-badge> }
        </div>
        @if (bank()) {
          <div class="grid grid-cols-2 gap-3 text-sm mb-3">
            <div><span class="text-gray-500">Bank:</span> {{ bank().bank_name }}</div>
            <div><span class="text-gray-500">Account:</span> {{ bank().account_name }}</div>
            <div><span class="text-gray-500">Number:</span> {{ bank().account_number }}</div>
            <div><span class="text-gray-500">Currency:</span> {{ bank().settlement_currency }}</div>
          </div>
        }
        @if (!bank()) {
          <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div><label class="block text-xs font-medium text-gray-600 mb-1">Bank Name *</label><input [(ngModel)]="bankForm.bank_name" class="w-full px-3 py-2 border rounded-lg text-sm"></div>
            <div><label class="block text-xs font-medium text-gray-600 mb-1">Account Name *</label><input [(ngModel)]="bankForm.account_name" class="w-full px-3 py-2 border rounded-lg text-sm"></div>
            <div><label class="block text-xs font-medium text-gray-600 mb-1">Account Number *</label><input [(ngModel)]="bankForm.account_number" class="w-full px-3 py-2 border rounded-lg text-sm"></div>
            <div><label class="block text-xs font-medium text-gray-600 mb-1">TIN</label><input [(ngModel)]="bankForm.tin" class="w-full px-3 py-2 border rounded-lg text-sm"></div>
          </div>
          <button (click)="addBank()" class="mt-4 px-4 py-2 bg-emerald-600 text-white text-sm rounded-lg">Add Bank Account</button>
        }
      </div>
    }
  `,
})
export class ProfilePage implements OnInit {
  private api = inject(MerchantApiService);
  private toast = inject(ToastService);
  loading = signal(true); profile = signal<any>({}); kyc = signal<any>({}); bank = signal<any>(null);
  kycForm: any = { government_id_type: 'nin', government_id_number: '', government_id_url: '', selfie_url: '', proof_of_address_url: '', cac_certificate_url: '' };
  bankForm: any = { bank_name: '', account_name: '', account_number: '', tin: '' };

  ngOnInit(): void {
    this.api.profile().subscribe({ next: (p: any) => { this.profile.set(p); this.kyc.set(p.kyc || {}); this.bank.set(p.bank_account); this.loading.set(false); } });
  }
  submitKyc(): void { this.api.submitKyc(this.kycForm).subscribe({ next: () => { this.toast.success('KYC submitted for review'); this.ngOnInit(); }, error: (e: any) => this.toast.error(e?.error?.error || 'Failed') }); }
  addBank(): void { this.api.addBank(this.bankForm).subscribe({ next: () => { this.toast.success('Bank account added — pending approval'); this.ngOnInit(); }, error: (e: any) => this.toast.error(e?.error?.error || 'Failed') }); }
}

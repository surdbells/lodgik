import { Component, inject, signal, OnInit } from '@angular/core';
import { DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ApiService, PageHeaderComponent, LoadingSpinnerComponent, BadgeComponent, ToastService } from '@lodgik/shared';

@Component({
  selector: 'app-kyc-review',
  standalone: true,
  imports: [DatePipe, FormsModule, PageHeaderComponent, LoadingSpinnerComponent, BadgeComponent],
  template: `
    <ui-page-header title="KYC Review" icon="shield" [breadcrumbs]="['Marketplace', 'KYC Review']" subtitle="Review and approve merchant KYC submissions"></ui-page-header>
    <ui-loading [loading]="loading()"></ui-loading>
    @if (!loading()) {
      <div class="space-y-4">
        @for (k of pending(); track k.id) {
          <div class="bg-white rounded-lg border p-5">
            <div class="flex items-start justify-between mb-3">
              <div>
                <h4 class="text-sm font-semibold">Merchant: {{ k.merchant_id }}</h4>
                <p class="text-xs text-gray-500">KYC Type: {{ k.kyc_type }} · Submitted: {{ k.created_at | date:'medium' }}</p>
              </div>
              <ui-badge [variant]="k.status === 'approved' ? 'success' : k.status === 'rejected' ? 'danger' : 'warning'">{{ k.status }}</ui-badge>
            </div>
            <div class="grid grid-cols-2 lg:grid-cols-3 gap-3 text-sm mb-4">
              <div><span class="text-gray-500">ID Type:</span> {{ k.government_id_type || '—' }}</div>
              <div><span class="text-gray-500">ID Number:</span> {{ k.government_id_number || '—' }}</div>
              <div><span class="text-gray-500">Liveness:</span> {{ k.liveness_verified ? '✅' : '❌' }}</div>
              @if (k.government_id_url) { <div><a [href]="k.government_id_url" target="_blank" class="text-sage-600 underline text-xs">View ID Document</a></div> }
              @if (k.selfie_url) { <div><a [href]="k.selfie_url" target="_blank" class="text-sage-600 underline text-xs">View Selfie</a></div> }
              @if (k.proof_of_address_url) { <div><a [href]="k.proof_of_address_url" target="_blank" class="text-sage-600 underline text-xs">View Proof of Address</a></div> }
              @if (k.cac_certificate_url) { <div><a [href]="k.cac_certificate_url" target="_blank" class="text-sage-600 underline text-xs">View CAC Certificate</a></div> }
            </div>
            @if (k.status === 'under_review') {
              <div class="flex items-center gap-3 pt-3 border-t border-gray-100">
                <button (click)="review(k.id, 'approved')" class="px-4 py-2 bg-green-600 text-white text-sm rounded-lg hover:bg-green-700">✓ Approve</button>
                <input [(ngModel)]="rejectReason" placeholder="Rejection reason..." class="px-3 py-2 border rounded-lg text-sm flex-1">
                <button (click)="review(k.id, 'rejected')" class="px-4 py-2 bg-red-600 text-white text-sm rounded-lg hover:bg-red-700">✗ Reject</button>
              </div>
            }
          </div>
        } @empty { <div class="text-center py-12 text-gray-400 bg-white rounded-lg border">No pending KYC reviews</div> }
      </div>
    }
  `,
})
export class KycReviewPage implements OnInit {
  private api = inject(ApiService);
  private toast = inject(ToastService);
  loading = signal(true); pending = signal<any[]>([]);
  rejectReason = '';

  ngOnInit(): void { this.load(); }
  load(): void { this.api.get('/admin/merchants/kyc/pending').subscribe({ next: (r: any) => { this.pending.set(r.data || []); this.loading.set(false); }, error: () => this.loading.set(false) }); }
  review(id: string, status: string): void {
    this.api.post(`/admin/merchants/kyc/${id}/review`, { status, reason: this.rejectReason || undefined }).subscribe({
      next: () => { this.toast.success(`KYC ${status}`); this.rejectReason = ''; this.load(); },
      error: (e: any) => this.toast.error(e?.error?.error || 'Failed')
    });
  }
}

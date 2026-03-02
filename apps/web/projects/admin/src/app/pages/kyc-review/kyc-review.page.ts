import { Component, inject, signal, OnInit } from '@angular/core';
import { DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import {
  ApiService, PageHeaderComponent, LoadingSpinnerComponent,
  BadgeComponent, ToastService, DocPreviewComponent,
} from '@lodgik/shared';

@Component({
  selector: 'app-kyc-review',
  standalone: true,
  imports: [DatePipe, FormsModule, PageHeaderComponent, LoadingSpinnerComponent, BadgeComponent, DocPreviewComponent],
  template: `
    <ui-page-header title="KYC Review" icon="shield"
      [breadcrumbs]="['Marketplace', 'KYC Review']"
      subtitle="Review and approve merchant KYC submissions">
    </ui-page-header>
    <ui-loading [loading]="loading()"></ui-loading>

    @if (!loading()) {
      @if (pending().length === 0) {
        <div class="bg-white rounded-xl border border-gray-100 shadow-card p-16 text-center">
          <div class="w-14 h-14 bg-green-50 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg xmlns="http://www.w3.org/2000/svg" class="w-7 h-7 text-green-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="20 6 9 17 4 12"/></svg>
          </div>
          <p class="text-gray-500 text-sm font-medium">All caught up</p>
          <p class="text-gray-300 text-xs mt-1">No pending KYC reviews</p>
        </div>
      }

      <div class="space-y-5">
        @for (k of pending(); track k.id) {
          <div class="bg-white rounded-xl border border-gray-100 shadow-card overflow-hidden">

            <!-- Header -->
            <div class="flex items-center justify-between px-5 py-4 border-b border-gray-100 bg-gray-50">
              <div>
                <h4 class="text-sm font-semibold text-gray-900">Merchant: <span class="font-mono text-xs bg-white border px-2 py-0.5 rounded">{{ k.merchant_id }}</span></h4>
                <p class="text-xs text-gray-400 mt-0.5">
                  {{ k.kyc_type }} · Submitted {{ k.created_at | date:'medium' }}
                </p>
              </div>
              <ui-badge [variant]="k.status === 'approved' ? 'success' : k.status === 'rejected' ? 'danger' : 'warning'">
                {{ k.status }}
              </ui-badge>
            </div>

            <div class="p-5">
              <!-- Text details -->
              <div class="grid grid-cols-2 lg:grid-cols-4 gap-4 text-sm mb-6">
                <div>
                  <span class="block text-xs text-gray-400 mb-0.5">ID Type</span>
                  <span class="font-medium capitalize">{{ k.government_id_type || '—' }}</span>
                </div>
                <div>
                  <span class="block text-xs text-gray-400 mb-0.5">ID Number</span>
                  <span class="font-mono font-medium">{{ k.government_id_number || '—' }}</span>
                </div>
                <div>
                  <span class="block text-xs text-gray-400 mb-0.5">Liveness Verified</span>
                  <span [class]="k.liveness_verified ? 'text-green-600 font-medium' : 'text-gray-400'">
                    {{ k.liveness_verified ? '✓ Verified' : 'Not verified' }}
                  </span>
                </div>
                <div>
                  <span class="block text-xs text-gray-400 mb-0.5">KYC Type</span>
                  <span class="capitalize font-medium">{{ k.kyc_type }}</span>
                </div>
              </div>

              <!-- Document previews — inline with zoom -->
              <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                <ui-doc-preview label="Government ID" [url]="k.government_id_url"></ui-doc-preview>
                <ui-doc-preview label="Selfie / Liveness" [url]="k.selfie_url"></ui-doc-preview>
                <ui-doc-preview label="Proof of Address" [url]="k.proof_of_address_url"></ui-doc-preview>
                <ui-doc-preview label="CAC Certificate" [url]="k.cac_certificate_url"></ui-doc-preview>
              </div>

              <!-- Rejection reason (if already rejected) -->
              @if (k.status === 'rejected' && k.rejection_reason) {
                <div class="bg-red-50 border border-red-100 rounded-lg px-4 py-3 mb-4 text-sm">
                  <span class="font-semibold text-red-700">Rejection reason: </span>
                  <span class="text-red-600">{{ k.rejection_reason }}</span>
                </div>
              }

              <!-- Review actions — only for under_review items -->
              @if (k.status === 'under_review') {
                <div class="flex flex-wrap items-center gap-3 pt-4 border-t border-gray-100">
                  <button (click)="review(k.id, 'approved')"
                    class="px-5 py-2 bg-green-600 text-white text-sm font-medium rounded-lg hover:bg-green-700 transition-colors">
                    ✓ Approve
                  </button>
                  <input [(ngModel)]="rejectReasons[k.id]"
                    placeholder="Rejection reason (required to reject)…"
                    class="flex-1 min-w-0 px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-red-200 focus:border-red-400 outline-none">
                  <button (click)="review(k.id, 'rejected')"
                    class="px-5 py-2 bg-red-600 text-white text-sm font-medium rounded-lg hover:bg-red-700 transition-colors">
                    ✗ Reject
                  </button>
                </div>
              }
            </div>
          </div>
        }
      </div>
    }
  `,
})
export class KycReviewPage implements OnInit {
  private api   = inject(ApiService);
  private toast = inject(ToastService);

  loading      = signal(true);
  pending      = signal<any[]>([]);
  // Per-KYC rejection reason — keyed by KYC id
  rejectReasons: Record<string, string> = {};

  ngOnInit(): void { this.load(); }

  load(): void {
    this.api.get('/admin/merchants/kyc/pending').subscribe({
      next: (r: any) => { this.pending.set(r.data || []); this.loading.set(false); },
      error: () => this.loading.set(false),
    });
  }

  review(id: string, status: string): void {
    const reason = this.rejectReasons[id]?.trim() ?? '';

    if (status === 'rejected' && !reason) {
      this.toast.error('Please enter a rejection reason before rejecting.'); return;
    }

    this.api.post(`/admin/merchants/kyc/${id}/review`, {
      status,
      reason: reason || undefined,
    }).subscribe({
      next: () => {
        this.toast.success(`KYC ${status} successfully.`);
        delete this.rejectReasons[id];
        this.load();
      },
      error: (e: any) => this.toast.error(e?.error?.error || 'Action failed'),
    });
  }
}

import { Component, inject, OnInit, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ApiService, PageHeaderComponent, LoadingSpinnerComponent, ToastService, LODGIK_ICONS, ConfirmDialogService, ConfirmDialogComponent } from '@lodgik/shared';
import { LucideAngularModule, LUCIDE_ICONS, LucideIconProvider } from 'lucide-angular';

@Component({
  selector: 'app-hotel-approvals',
  standalone: true,
  imports: [DatePipe, FormsModule, PageHeaderComponent, LoadingSpinnerComponent, LucideAngularModule, ConfirmDialogComponent],
  providers: [{ provide: LUCIDE_ICONS, multi: true, useValue: new LucideIconProvider(LODGIK_ICONS) }],
  template: `
    <ui-confirm-dialog/>
    <ui-page-header title="Hotel Approvals" subtitle="Review and provision merchant-submitted hotels">
      <div class="flex items-center gap-2 text-sm">
        <span class="px-2.5 py-1 rounded-full bg-amber-50 text-amber-700 font-medium">{{ pendingCount() }} pending</span>
      </div>
    </ui-page-header>

    <ui-loading [loading]="loading()"></ui-loading>

    @if (!loading()) {
      <!-- Filter tabs -->
      <div class="flex gap-1 mb-4 bg-gray-100 rounded-lg p-0.5 w-fit">
        @for (tab of tabs; track tab.value) {
          <button (click)="activeTab = tab.value"
                  class="px-3 py-1.5 text-xs font-medium rounded-md transition-all"
                  [class.bg-white]="activeTab === tab.value" [class.shadow-sm]="activeTab === tab.value"
                  [class.text-gray-900]="activeTab === tab.value" [class.text-gray-500]="activeTab !== tab.value">
            {{ tab.label }} ({{ tabCount(tab.value) }})
          </button>
        }
      </div>

      <div class="space-y-3">
        @for (h of filteredHotels(); track h.id) {
          <div class="bg-white rounded-xl border border-gray-100 shadow-card overflow-hidden">
            <div class="p-5 flex items-start justify-between">
              <div class="flex items-start gap-4">
                <div class="w-12 h-12 rounded-xl flex items-center justify-center text-lg font-bold shrink-0"
                     [class]="h.onboarding_status === 'pending' ? 'bg-amber-50 text-amber-700' : h.onboarding_status === 'provisioned' ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-700'">
                  {{ h.hotel_name?.charAt(0) }}
                </div>
                <div>
                  <h3 class="text-base font-semibold text-gray-900">{{ h.hotel_name }}</h3>
                  <p class="text-sm text-gray-500 mt-0.5">{{ h.location || 'No location' }}</p>
                  <div class="flex flex-wrap gap-3 mt-2 text-xs text-gray-400">
                    <span>Merchant: <strong class="text-gray-600">{{ h.merchant_name }}</strong></span>
                    <span>Contact: {{ h.contact_person || '—' }}</span>
                    <span>Email: {{ h.contact_email || '—' }}</span>
                    <span>Phone: {{ h.contact_phone || '—' }}</span>
                    <span>Rooms: {{ h.rooms_count }}</span>
                    <span>Category: {{ h.hotel_category }}</span>
                    <span>Submitted: {{ h.created_at | date:'mediumDate' }}</span>
                  </div>
                </div>
              </div>

              <div class="flex items-center gap-2 shrink-0">
                <span class="px-2.5 py-1 rounded-full text-xs font-medium"
                      [class]="statusClass(h.onboarding_status)">{{ h.onboarding_status }}</span>

                @if (h.onboarding_status === 'pending') {
                  <button (click)="approve(h)" [disabled]="processing()"
                          class="px-4 py-2 bg-emerald-600 text-white text-sm font-medium rounded-lg hover:bg-emerald-700 disabled:opacity-50">
                    Approve & Provision
                  </button>
                  <button (click)="openReject(h)"
                          class="px-4 py-2 border border-red-200 text-red-600 text-sm font-medium rounded-lg hover:bg-red-50">
                    Reject
                  </button>
                }

                @if (h.onboarding_status === 'provisioned') {
                  <div class="text-xs text-emerald-600 flex items-center gap-1">
                    <lucide-icon name="circle-check" [size]="14"></lucide-icon>
                    Live
                  </div>
                }
              </div>
            </div>

            <!-- Show provisioned info -->
            @if (h.onboarding_status === 'provisioned' && h.tenant_id) {
              <div class="px-5 py-3 bg-emerald-50 border-t border-emerald-100 text-xs text-emerald-700 flex gap-4">
                <span>Tenant ID: {{ h.tenant_id?.substring(0, 8) }}…</span>
                <span>Property ID: {{ h.property_id?.substring(0, 8) }}…</span>
              </div>
            }

            <!-- Show rejection result -->
            @if (h.onboarding_status === 'rejected') {
              <div class="px-5 py-3 bg-red-50 border-t border-red-100 text-xs text-red-600">
                Rejected
              </div>
            }
          </div>
        }

        @if (filteredHotels().length === 0) {
          <div class="bg-white rounded-xl border border-gray-100 shadow-card p-12 text-center text-gray-400">
            <lucide-icon name="hotel" [size]="40" [strokeWidth]="1.25" class="text-gray-200 mx-auto mb-3"></lucide-icon>
            <p class="text-sm">No {{ activeTab === 'all' ? '' : activeTab + ' ' }}hotels found</p>
          </div>
        }
      </div>
    }

    <!-- Reject Modal -->
    @if (rejectingHotel) {
      <div class="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50" (click)="rejectingHotel = null">
        <div class="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6" (click)="$event.stopPropagation()">
          <h3 class="text-lg font-semibold text-gray-900 mb-1">Reject Hotel</h3>
          <p class="text-sm text-gray-400 mb-4">{{ rejectingHotel.hotel_name }} by {{ rejectingHotel.merchant_name }}</p>
          <textarea [(ngModel)]="rejectReason" rows="3" placeholder="Reason for rejection..."
                    class="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm bg-gray-50 mb-4"></textarea>
          <div class="flex gap-2 justify-end">
            <button (click)="rejectingHotel = null" class="px-4 py-2 text-sm text-gray-500 border rounded-lg">Cancel</button>
            <button (click)="confirmReject()" [disabled]="!rejectReason.trim() || processing()"
                    class="px-4 py-2 bg-red-600 text-white text-sm rounded-lg hover:bg-red-700 disabled:opacity-50">Reject</button>
          </div>
        </div>
      </div>
    }

    <!-- Provisioned Credentials Modal -->
    @if (provisionResult) {
      <div class="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
        <div class="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6">
          <div class="flex items-center gap-3 mb-4">
            <div class="w-10 h-10 rounded-full bg-emerald-100 flex items-center justify-center">
              <lucide-icon name="circle-check" [size]="20" class="text-emerald-600"></lucide-icon>
            </div>
            <div>
              <h3 class="text-lg font-semibold text-gray-900">Hotel Provisioned!</h3>
              <p class="text-sm text-gray-400">Account created and email sent</p>
            </div>
          </div>
          <div class="bg-gray-50 rounded-lg p-4 space-y-2 text-sm mb-4">
            <div class="flex justify-between"><span class="text-gray-500">Login Email</span><span class="font-mono text-gray-900">{{ provisionResult.login_email }}</span></div>
            <div class="flex justify-between"><span class="text-gray-500">Temp Password</span><span class="font-mono text-gray-900">{{ provisionResult.temp_password }}</span></div>
            <div class="flex justify-between"><span class="text-gray-500">Tenant ID</span><span class="font-mono text-xs text-gray-600">{{ provisionResult.tenant_id }}</span></div>
            <div class="flex justify-between"><span class="text-gray-500">Property ID</span><span class="font-mono text-xs text-gray-600">{{ provisionResult.property_id }}</span></div>
          </div>
          <p class="text-xs text-gray-400 mb-4">A welcome email with these credentials has been sent to the hotel contact.</p>
          <button (click)="provisionResult = null" class="w-full px-4 py-2 bg-sage-600 text-white text-sm rounded-lg hover:bg-sage-700">Done</button>
        </div>
      </div>
    }
  `,
})
export class HotelApprovalsPage implements OnInit {
  private api = inject(ApiService);
  private toast = inject(ToastService);
  private confirm = inject(ConfirmDialogService);

  loading = signal(true);
  processing = signal(false);
  hotels = signal<any[]>([]);
  activeTab = 'pending';
  rejectingHotel: any = null;
  rejectReason = '';
  provisionResult: any = null;

  tabs = [
    { label: 'Pending', value: 'pending' },
    { label: 'Provisioned', value: 'provisioned' },
    { label: 'Rejected', value: 'rejected' },
    { label: 'All', value: 'all' },
  ];

  pendingCount = () => this.hotels().filter(h => h.onboarding_status === 'pending').length;
  tabCount = (status: string) => status === 'all' ? this.hotels().length : this.hotels().filter(h => h.onboarding_status === status).length;

  filteredHotels() {
    if (this.activeTab === 'all') return this.hotels();
    return this.hotels().filter(h => h.onboarding_status === this.activeTab);
  }

  ngOnInit() { this.load(); }

  load() {
    this.loading.set(true);
    this.api.get('/admin/merchants/hotels').subscribe({
      next: (r: any) => { this.hotels.set(r.data || []); this.loading.set(false); },
      error: () => this.loading.set(false),
    });
  }

  async approve(h: any) {
    const ok = await this.confirm.confirm({ title: 'Approve Hotel', message: `Approve and provision "${h.hotel_name}"? This will create a Tenant, Property, and admin User account for the hotel.`, confirmLabel: 'Approve', variant: 'info' });
    if (!ok) return;
    this.processing.set(true);
    this.api.post(`/admin/merchants/hotels/${h.id}/approve`, { app_url: window.location.origin.replace('admin', 'app') }).subscribe({
      next: (r: any) => {
        this.toast.success('Hotel approved and provisioned!');
        this.provisionResult = r.data;
        this.load();
        this.processing.set(false);
      },
      error: (e: any) => {
        this.toast.error(e?.error?.message || 'Approval failed');
        this.processing.set(false);
      },
    });
  }

  openReject(h: any) { this.rejectingHotel = h; this.rejectReason = ''; }

  confirmReject() {
    if (!this.rejectingHotel) return;
    this.processing.set(true);
    this.api.post(`/admin/merchants/hotels/${this.rejectingHotel.id}/reject`, { reason: this.rejectReason }).subscribe({
      next: () => {
        this.toast.success('Hotel rejected');
        this.rejectingHotel = null;
        this.load();
        this.processing.set(false);
      },
      error: () => { this.toast.error('Failed to reject'); this.processing.set(false); },
    });
  }

  statusClass(status: string): string {
    return {
      pending: 'bg-amber-50 text-amber-700',
      provisioned: 'bg-emerald-50 text-emerald-700',
      rejected: 'bg-red-50 text-red-700',
      live: 'bg-blue-50 text-blue-700',
    }[status] || 'bg-gray-100 text-gray-600';
  }
}

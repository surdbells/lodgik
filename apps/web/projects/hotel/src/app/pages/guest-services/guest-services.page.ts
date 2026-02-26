import { Component, inject, OnInit, signal } from '@angular/core';
import { ApiService, PageHeaderComponent, AuthService, ActivePropertyService} from '@lodgik/shared';

@Component({
  selector: 'app-guest-services', standalone: true, imports: [PageHeaderComponent],
  template: `
    <ui-page-header title="Guest Services" subtitle="Waitlist, charge transfers, amenity vouchers"></ui-page-header>
    <div class="flex gap-1 mb-4">
      @for (tab of tabs; track tab.key) {
        <button (click)="activeTab = tab.key; load()" [class]="activeTab === tab.key ? 'px-4 py-2 bg-sage-600 text-white rounded-lg text-sm' : 'px-4 py-2 border rounded-lg text-sm hover:bg-gray-50'">{{ tab.label }}</button>
      }
    </div>

    <!-- Waitlist -->
    @if (activeTab === 'waitlist') {
      <div class="space-y-2">
        @for (w of waitlist(); track w.id) {
          <div class="bg-white border rounded-lg p-4 flex justify-between items-center">
            <div>
              <div class="font-medium">#{{ w.position }} {{ w.guest_name }} <span class="text-xs text-gray-400">{{ w.waitlist_type.replace('_', ' ') }}</span></div>
              <div class="text-sm text-gray-500">{{ w.requested_item }}</div>
              @if (w.notes) { <div class="text-xs text-gray-400">{{ w.notes }}</div> }
            </div>
            <div class="flex gap-2 items-center">
              <span [class]="'text-xs font-bold px-2 py-1 rounded ' + wlBadge(w.status)">{{ w.status }}</span>
              @if (w.status === 'waiting') { <button (click)="notifyWl(w.id)" class="px-3 py-1 bg-amber-500 text-white rounded text-xs">Notify</button> <button (click)="fulfillWl(w.id)" class="px-3 py-1 bg-green-600 text-white rounded text-xs">Fulfill</button> }
              @if (w.status === 'notified') { <button (click)="fulfillWl(w.id)" class="px-3 py-1 bg-green-600 text-white rounded text-xs">Fulfill</button> }
            </div>
          </div>
        }
        @if (waitlist().length === 0) { <div class="text-center text-gray-400 p-8">No waitlist entries</div> }
      </div>
    }

    <!-- Charge Transfers -->
    @if (activeTab === 'transfers') {
      <div class="space-y-2">
        @for (ct of transfers(); track ct.id) {
          <div class="bg-white border rounded-lg p-4 flex justify-between items-center">
            <div>
              <div class="font-medium">Room {{ ct.from_room_number }} → Room {{ ct.to_room_number }}</div>
              <div class="text-sm text-gray-500">{{ ct.description }} · ₦{{ formatAmount(ct.amount) }}</div>
              <div class="text-xs text-gray-400">By {{ ct.requested_by_name }} · {{ ct.reason || '' }}</div>
            </div>
            <div class="flex gap-2 items-center">
              <span [class]="'text-xs font-bold px-2 py-1 rounded ' + ctBadge(ct.status)">{{ ct.status }}</span>
              @if (ct.status === 'pending') {
                <button (click)="approveTransfer(ct.id)" class="px-3 py-1 bg-green-600 text-white rounded text-xs">Approve</button>
                <button (click)="rejectTransfer(ct.id)" class="px-3 py-1 bg-red-500 text-white rounded text-xs">Reject</button>
              }
            </div>
          </div>
        }
        @if (transfers().length === 0) { <div class="text-center text-gray-400 p-8">No transfer requests</div> }
      </div>
    }

    <!-- Vouchers -->
    @if (activeTab === 'vouchers') {
      <div class="space-y-2">
        @for (v of vouchers(); track v.id) {
          <div class="bg-white border rounded-lg p-4 flex justify-between items-center">
            <div>
              <div class="font-medium">{{ v.amenity_name }} <span class="text-xs bg-sage-100 text-sage-700 rounded px-2 py-0.5 ml-1">{{ v.code }}</span></div>
              <div class="text-xs text-gray-400">{{ v.amenity_type }} · Valid {{ v.valid_date }} · Uses {{ v.use_count }}/{{ v.max_uses }}</div>
            </div>
            <span [class]="'text-xs font-bold px-2 py-1 rounded ' + (v.status === 'active' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500')">{{ v.status }}</span>
          </div>
        }
        @if (vouchers().length === 0) { <div class="text-center text-gray-400 p-8">No vouchers</div> }
      </div>
    }
  `,
})
export class GuestServicesPage implements OnInit {
  private api = inject(ApiService); private auth = inject(AuthService);
  private activeProperty = inject(ActivePropertyService);
  waitlist = signal<any[]>([]); transfers = signal<any[]>([]); vouchers = signal<any[]>([]);
  activeTab = 'waitlist';
  tabs = [{ key: 'waitlist', label: '📋 Waitlist' }, { key: 'transfers', label: '💸 Transfers' }, { key: 'vouchers', label: '🎟️ Vouchers' }];

  ngOnInit() { this.load(); }

  load() {
    const pid = this.activeProperty.propertyId();
    if (this.activeTab === 'waitlist') this.api.get(`/guest-services/waitlist?property_id=${pid}`).subscribe({ next: (r: any) => this.waitlist.set(r.data || []) });
    if (this.activeTab === 'transfers') this.api.get(`/guest-services/transfers?property_id=${pid}`).subscribe({ next: (r: any) => this.transfers.set(r.data || []) });
    if (this.activeTab === 'vouchers') this.api.get(`/guest-services/vouchers?property_id=${pid}`).subscribe({ next: (r: any) => this.vouchers.set(r.data || []) });
  }

  notifyWl(id: string) { this.api.post(`/guest-services/waitlist/${id}/notify`, {}).subscribe({ next: () => this.load() }); }
  fulfillWl(id: string) { this.api.post(`/guest-services/waitlist/${id}/fulfill`, {}).subscribe({ next: () => this.load() }); }

  approveTransfer(id: string) {
    const user = this.auth.currentUser;
    this.api.post(`/guest-services/transfers/${id}/approve`, { user_id: user?.id, user_name: [user?.first_name, user?.last_name].filter(Boolean).join(' ') }).subscribe({ next: () => this.load() });
  }
  rejectTransfer(id: string) {
    const reason = prompt('Rejection reason:') || '';
    const user = this.auth.currentUser;
    this.api.post(`/guest-services/transfers/${id}/reject`, { user_id: user?.id, user_name: [user?.first_name, user?.last_name].filter(Boolean).join(' '), reason }).subscribe({ next: () => this.load() });
  }

  formatAmount(kobo: any): string { return ((+kobo || 0) / 100).toLocaleString(); }
  wlBadge(s: string): string { return s === 'fulfilled' ? 'bg-green-100 text-green-700' : s === 'notified' ? 'bg-amber-100 text-amber-700' : s === 'waiting' ? 'bg-purple-100 text-purple-700' : 'bg-gray-100 text-gray-500'; }
  ctBadge(s: string): string { return s === 'completed' || s === 'approved' ? 'bg-green-100 text-green-700' : s === 'rejected' ? 'bg-red-100 text-red-700' : 'bg-amber-100 text-amber-700'; }
}

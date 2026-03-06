import { Component, inject, OnInit, signal } from '@angular/core';
import { DatePipe, NgClass } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink, ActivatedRoute } from '@angular/router';
import {
  ApiService,
  PageHeaderComponent,
  LoadingSpinnerComponent,
  ToastService,
  ActivePropertyService,
} from '@lodgik/shared';

@Component({
  selector: 'app-card-events',
  standalone: true,
  imports: [DatePipe, NgClass, FormsModule, RouterLink, PageHeaderComponent, LoadingSpinnerComponent],
  template: `
    <ui-page-header title="Card Event Log" subtitle="Complete audit trail of all card scans">
      <div class="flex gap-2">
        <button (click)="loadLive()" class="px-3 py-2 text-sm border border-gray-300 rounded-lg hover:bg-gray-50">⟳ Live</button>
        <button (click)="exportCsv()" class="px-3 py-2 text-sm bg-gray-800 text-white rounded-lg hover:bg-gray-700">↓ Export CSV</button>
      </div>
    </ui-page-header>

    <!-- Filters -->
    <div class="bg-white rounded-xl border border-gray-100 p-4 mb-4 flex flex-wrap gap-3 items-end">
      <div>
        <label class="text-xs text-gray-500 block mb-1">Property</label>
        <select [(ngModel)]="propertyId" class="border rounded-lg px-3 py-2 text-sm w-48" (change)="load()">
          @for (p of activeProperty.properties(); track p.id) {
            <option [value]="p.id">{{ p.name }}</option>
          }
        </select>
      </div>
      <div>
        <label class="text-xs text-gray-500 block mb-1">Event Type</label>
        <select [(ngModel)]="eventTypeFilter" class="border rounded-lg px-3 py-2 text-sm">
          <option value="">All Events</option>
          <option value="check_in">Check-In Issue</option>
          <option value="check_out">Checkout</option>
          <option value="reception_lookup">Reception Lookup</option>
          <option value="entry">Entry</option>
          <option value="exit">Exit</option>
          <option value="security_entry">Security Entry</option>
          <option value="security_exit">Security Exit</option>
          <option value="facility_access">Facility Access</option>
          <option value="pos_charge">POS Charge</option>
          <option value="access_denied">Access Denied</option>
          <option value="lost_reported">Lost Reported</option>
        </select>
      </div>
      <div>
        <label class="text-xs text-gray-500 block mb-1">Scan Point Type</label>
        <select [(ngModel)]="scanPointTypeFilter" class="border rounded-lg px-3 py-2 text-sm">
          <option value="">All Points</option>
          <option value="reception">Reception</option>
          <option value="security">Security Post</option>
          <option value="facility">Facility</option>
          <option value="pos">POS</option>
          <option value="entry_gate">Entry Gate</option>
          <option value="exit_gate">Exit Gate</option>
        </select>
      </div>
      <div>
        <label class="text-xs text-gray-500 block mb-1">Date From</label>
        <input [(ngModel)]="dateFrom" type="date" class="border rounded-lg px-3 py-2 text-sm">
      </div>
      <div>
        <label class="text-xs text-gray-500 block mb-1">Date To</label>
        <input [(ngModel)]="dateTo" type="date" class="border rounded-lg px-3 py-2 text-sm">
      </div>
      <button (click)="load()" class="px-4 py-2 bg-gray-800 text-white text-sm rounded-lg hover:bg-gray-700 h-[38px]">Search</button>
    </div>

    <ui-loading [loading]="loading()"></ui-loading>

    <!-- Live mode banner -->
    @if (liveMode()) {
      <div class="bg-green-50 border border-green-200 rounded-xl px-4 py-3 mb-4 flex items-center gap-3">
        <span class="inline-block w-2 h-2 bg-green-500 rounded-full animate-pulse"></span>
        <span class="text-sm text-green-700 font-medium">Live Mode — showing most recent 50 events</span>
        <button (click)="liveMode.set(false); load()" class="ml-auto text-xs text-green-600 hover:text-green-800">Exit Live</button>
      </div>
    }

    <!-- Events table -->
    @if (!loading() && events().length) {
      <div class="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
        <table class="w-full text-sm">
          <thead class="bg-gray-50 border-b border-gray-100">
            <tr>
              <th class="px-4 py-3 text-left font-medium text-gray-500">Time</th>
              <th class="px-4 py-3 text-left font-medium text-gray-500">Event</th>
              <th class="px-4 py-3 text-left font-medium text-gray-500">Card</th>
              <th class="px-4 py-3 text-left font-medium text-gray-500">Scan Point</th>
              <th class="px-4 py-3 text-left font-medium text-gray-500">Details</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-gray-50">
            @for (ev of events(); track ev.id) {
              <tr class="hover:bg-gray-50 transition-colors"
                  [ngClass]="{ 'bg-red-50 hover:bg-red-50': ev.event_type === 'access_denied' }">
                <td class="px-4 py-3 text-gray-500 text-xs whitespace-nowrap">
                  {{ ev.scanned_at | date:'dd MMM y' }}<br>
                  <span class="font-mono text-gray-700">{{ ev.scanned_at | date:'HH:mm:ss' }}</span>
                </td>
                <td class="px-4 py-3">
                  <div class="flex items-center gap-2">
                    <span class="text-base">{{ ev.event_icon }}</span>
                    <span class="font-medium text-xs" [ngClass]="{
                      'text-red-600': ev.event_type === 'access_denied',
                      'text-green-600': ev.event_type === 'check_in' || ev.event_type === 'facility_access',
                      'text-blue-600': ev.event_type === 'reception_lookup',
                      'text-gray-700': !['access_denied','check_in','facility_access','reception_lookup'].includes(ev.event_type)
                    }">{{ ev.event_label }}</span>
                  </div>
                </td>
                <td class="px-4 py-3 font-mono text-xs text-gray-600">
                  {{ ev.card_id?.slice(0, 8) }}...
                </td>
                <td class="px-4 py-3 text-xs text-gray-600">
                  {{ ev.scan_point || '—' }}
                  @if (ev.scan_point_type) {
                    <span class="ml-1 px-1.5 py-0.5 bg-gray-100 text-gray-500 rounded text-xs">{{ ev.scan_point_type }}</span>
                  }
                </td>
                <td class="px-4 py-3 text-xs text-gray-500">
                  @if (ev.charge_amount) {
                    <span class="text-green-600 font-semibold">₦{{ (+ev.charge_amount).toLocaleString() }}</span>
                  }
                  @if (ev.metadata?.['guest_name']) {
                    <span class="block text-gray-700 font-medium">{{ ev.metadata['guest_name'] }}</span>
                  }
                  @if (ev.metadata?.['reason']) {
                    <span class="text-red-500">{{ ev.metadata['reason'] }}</span>
                  }
                  @if (ev.metadata?.['outstanding_balance'] && (+ev.metadata['outstanding_balance']) > 0) {
                    <span class="text-amber-600 font-medium">Bal: ₦{{ (+ev.metadata['outstanding_balance']).toLocaleString() }}</span>
                  }
                </td>
              </tr>
            }
          </tbody>
        </table>

        <!-- Pagination -->
        <div class="px-4 py-3 border-t border-gray-100 flex items-center justify-between">
          <span class="text-sm text-gray-500">{{ total() }} total events</span>
          <div class="flex gap-2">
            <button (click)="prevPage()" [disabled]="page() === 1" class="px-3 py-1 border rounded text-sm disabled:opacity-40">← Prev</button>
            <span class="px-3 py-1 text-sm text-gray-600">Page {{ page() }}</span>
            <button (click)="nextPage()" [disabled]="page() * limit >= total()" class="px-3 py-1 border rounded text-sm disabled:opacity-40">Next →</button>
          </div>
        </div>
      </div>
    }

    @if (!loading() && !events().length) {
      <div class="bg-white rounded-xl border border-gray-100 p-12 text-center">
        <p class="text-4xl mb-3">📋</p>
        <p class="text-gray-600 font-medium">No events found</p>
        <p class="text-gray-400 text-sm mt-1">Events appear here as cards are scanned across the property.</p>
      </div>
    }
  `,
})
export class CardEventsPage implements OnInit {
  private api   = inject(ApiService);
  private toast = inject(ToastService);
  private route = inject(ActivatedRoute);
  readonly activeProperty = inject(ActivePropertyService);

  events   = signal<any[]>([]);
  total    = signal(0);
  loading  = signal(false);
  liveMode = signal(false);
  page     = signal(1);
  limit    = 50;

  propertyId          = '';
  eventTypeFilter     = '';
  scanPointTypeFilter = '';
  dateFrom            = '';
  dateTo              = '';

  ngOnInit(): void {
    this.propertyId = this.activeProperty.propertyId();
    const guestId  = this.route.snapshot.queryParamMap.get('guest_id');
    if (guestId) this.loadGuestTimeline(guestId);
    else if (this.propertyId) this.load();
  }

  load(): void {
    if (!this.propertyId) return;
    this.loading.set(true);
    this.liveMode.set(false);
    const p = [
      `property_id=${this.propertyId}`,
      this.eventTypeFilter     ? `event_type=${this.eventTypeFilter}` : '',
      this.scanPointTypeFilter ? `scan_point_type=${this.scanPointTypeFilter}` : '',
      this.dateFrom ? `date_from=${this.dateFrom}` : '',
      this.dateTo   ? `date_to=${this.dateTo}` : '',
      `page=${this.page()}`,
      `limit=${this.limit}`,
    ].filter(Boolean).join('&');

    this.api.get(`/card-events?${p}`).subscribe({
      next: (r: any) => {
        this.events.set(r.data?.items ?? []);
        this.total.set(r.data?.total ?? 0);
        this.loading.set(false);
      },
      error: () => this.loading.set(false),
    });
  }

  loadLive(): void {
    if (!this.propertyId) return;
    this.loading.set(true);
    this.liveMode.set(true);
    this.api.get(`/card-events/live?property_id=${this.propertyId}`).subscribe({
      next: (r: any) => {
        this.events.set(r.data?.events ?? []);
        this.total.set(r.data?.events?.length ?? 0);
        this.loading.set(false);
      },
      error: () => this.loading.set(false),
    });
  }

  loadGuestTimeline(guestId: string): void {
    this.loading.set(true);
    this.api.get(`/card-events/guest/${guestId}`).subscribe({
      next: (r: any) => {
        this.events.set(r.data?.events ?? []);
        this.total.set(r.data?.total ?? 0);
        this.loading.set(false);
      },
      error: () => this.loading.set(false),
    });
  }

  prevPage(): void { if (this.page() > 1) { this.page.update(p => p - 1); this.load(); } }
  nextPage(): void { this.page.update(p => p + 1); this.load(); }

  exportCsv(): void {
    if (!this.events().length) { this.toast.error('No events to export'); return; }
    const headers = ['Time', 'Event', 'Card ID', 'Scan Point', 'Scan Point Type', 'Guest', 'Amount', 'Details'];
    const rows    = this.events().map(e => [
      new Date(e.scanned_at).toLocaleString(),
      e.event_label,
      e.card_id ?? '',
      e.scan_point ?? '',
      e.scan_point_type ?? '',
      e.metadata?.guest_name ?? '',
      e.charge_amount ?? '',
      e.metadata?.reason ?? e.metadata?.description ?? '',
    ]);
    const csv     = [headers, ...rows].map(r => r.map(v => `"${String(v).replace(/"/g, '""')}"`).join(',')).join('\n');
    const blob    = new Blob([csv], { type: 'text/csv' });
    const url     = URL.createObjectURL(blob);
    const a       = document.createElement('a');
    a.href = url; a.download = `card-events-${new Date().toISOString().slice(0,10)}.csv`;
    a.click(); URL.revokeObjectURL(url);
  }
}

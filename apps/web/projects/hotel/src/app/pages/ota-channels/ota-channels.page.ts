import { Component, inject, OnInit, signal } from '@angular/core';
import { ApiService, PageHeaderComponent, LoadingSpinnerComponent, ToastService, StatsCardComponent } from '@lodgik/shared';
import { BarChartComponent, ChartDataPoint } from '@lodgik/charts';

@Component({
  selector: 'app-ota-channels',
  standalone: true,
  imports: [PageHeaderComponent, LoadingSpinnerComponent, StatsCardComponent, BarChartComponent],
  template: `
    <ui-page-header title="OTA Channel Manager" icon="globe" subtitle="Manage Booking.com, Expedia, and other distribution channels">
      <button (click)="showAdd = true" class="px-4 py-2 bg-sage-600 text-white text-sm font-medium rounded-lg hover:bg-sage-700">+ Add Channel</button>
    </ui-page-header>

    <ui-loading [loading]="loading()"></ui-loading>

    @if (!loading()) {
      <!-- Revenue Summary -->
      <div class="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
        <ui-stats-card label="Total OTA Revenue" [value]="'₦' + (revenue().total_revenue / 100).toLocaleString()" icon="banknote"></ui-stats-card>
        <ui-stats-card label="Total Bookings" [value]="revenue().total_bookings ?? 0" icon="calendar-check"></ui-stats-card>
        <ui-stats-card label="Active Channels" [value]="channels().filter(c => c.sync_status === 'active').length" icon="wifi"></ui-stats-card>
        <ui-stats-card label="Pending Reservations" [value]="reservations().filter(r => r.sync_status === 'pending').length" icon="clock"></ui-stats-card>
      </div>

      <!-- Channel Revenue Bar Chart -->
      @if (channelRevData().length) {
        <div class="bg-white rounded-xl border border-gray-100 shadow-card p-5 mb-6">
          <h3 class="text-sm font-semibold text-gray-700 mb-4">Revenue by Channel</h3>
          <chart-bar [data]="channelRevData()" [height]="200" [showValues]="true"></chart-bar>
        </div>
      }

      <!-- Channels Grid -->
      <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
        @for (c of channels(); track c.id) {
          <div class="bg-white rounded-xl border border-gray-100 shadow-card p-5">
            <div class="flex items-start justify-between mb-3">
              <div>
                <p class="text-base font-bold text-gray-900">{{ c.display_name }}</p>
                <p class="text-sm text-gray-500">{{ c.commission_percentage }}% commission</p>
              </div>
              <span class="px-2 py-0.5 rounded-full text-xs font-medium" [class]="syncClass(c.sync_status)">{{ c.sync_status }}</span>
            </div>
            <p class="text-xs text-gray-400 mb-4">Last sync: {{ c.last_sync_at || 'Never' }}</p>
            <div class="flex flex-wrap gap-2">
              @if (c.sync_status !== 'active') {
                <button (click)="activate(c.id)" class="px-3 py-1 bg-emerald-600 text-white text-xs rounded-lg hover:bg-emerald-700">Activate</button>
              }
              @if (c.sync_status === 'active') {
                <button (click)="pause(c.id)" class="px-3 py-1 bg-yellow-500 text-white text-xs rounded-lg hover:bg-yellow-600">Pause</button>
              }
              <button (click)="sync(c.id)" class="px-3 py-1 bg-sage-600 text-white text-xs rounded-lg hover:bg-sage-700">Sync</button>
              <button (click)="disconnect(c.id)" class="px-3 py-1 bg-gray-200 text-gray-700 text-xs rounded-lg hover:bg-gray-300">Disconnect</button>
            </div>
          </div>
        }
        @empty {
          <div class="col-span-3 text-center text-gray-400 py-12">
            <p class="text-lg mb-2">No OTA channels connected</p>
            <p class="text-sm">Add a channel to start distributing your inventory.</p>
          </div>
        }
      </div>

      <!-- Reservations Table -->
      <div class="bg-white rounded-xl border border-gray-100 shadow-card overflow-hidden">
        <div class="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
          <h3 class="text-sm font-semibold text-gray-700">OTA Reservations</h3>
          <span class="text-xs text-gray-400">{{ reservations().length }} total</span>
        </div>
        <div class="overflow-x-auto">
          <table class="w-full text-sm">
            <thead class="bg-gray-50">
              <tr>
                @for (h of ['Channel', 'External ID', 'Guest', 'Dates', 'Amount', 'Status', 'Actions']; track h) {
                  <th class="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">{{ h }}</th>
                }
              </tr>
            </thead>
            <tbody>
              @for (r of reservations(); track r.id) {
                <tr class="border-t border-gray-50 hover:bg-gray-50 transition-colors">
                  <td class="px-4 py-3 font-medium">{{ r.channel_name }}</td>
                  <td class="px-4 py-3 font-mono text-xs text-gray-500">{{ r.external_id }}</td>
                  <td class="px-4 py-3">{{ r.guest_name }}</td>
                  <td class="px-4 py-3 text-gray-500 text-xs">{{ r.check_in }} → {{ r.check_out }}</td>
                  <td class="px-4 py-3 font-medium">₦{{ ((+r.amount) / 100).toLocaleString() }}</td>
                  <td class="px-4 py-3">
                    <span class="px-2 py-0.5 rounded-full text-xs font-medium" [class]="rStatClass(r.sync_status)">{{ r.sync_status }}</span>
                  </td>
                  <td class="px-4 py-3">
                    @if (r.sync_status === 'pending') {
                      <div class="flex gap-1">
                        <button (click)="confirmRes(r.id)" class="px-2 py-1 bg-emerald-600 text-white text-xs rounded hover:bg-emerald-700">Confirm</button>
                        <button (click)="cancelRes(r.id)" class="px-2 py-1 bg-red-500 text-white text-xs rounded hover:bg-red-600">Cancel</button>
                      </div>
                    }
                  </td>
                </tr>
              }
              @empty {
                <tr><td colspan="7" class="px-4 py-10 text-center text-gray-400">No OTA reservations found</td></tr>
              }
            </tbody>
          </table>
        </div>
      </div>
    }
  `,
})
export default class OtaChannelsPage implements OnInit {
  private api = inject(ApiService);
  private toast = inject(ToastService);
  loading = signal(true);
  channels = signal<any[]>([]);
  reservations = signal<any[]>([]);
  revenue = signal<any>({ total_revenue: 0, total_bookings: 0, by_channel: [] });
  channelRevData = signal<ChartDataPoint[]>([]);
  showAdd = false;

  ngOnInit() {
    this.loading.set(true);
    let done = 0;
    const finish = () => { if (++done === 3) this.loading.set(false); };

    this.api.get('/ota/channels').subscribe((r: any) => { this.channels.set(r?.data || []); finish(); });
    this.api.get('/ota/reservations').subscribe((r: any) => { this.reservations.set(r?.data || []); finish(); });
    this.api.get('/ota/revenue').subscribe((r: any) => {
      this.revenue.set(r?.data || {});
      this.channelRevData.set((r?.data?.by_channel || []).map((c: any) => ({
        label: c.channel_name, value: (c.revenue || 0) / 100,
      })));
      finish();
    });
  }

  activate(id: string) { this.api.post(`/ota/channels/${id}/activate`, {}).subscribe(() => { this.toast.success('Channel activated'); this.ngOnInit(); }); }
  pause(id: string) { this.api.post(`/ota/channels/${id}/pause`, {}).subscribe(() => { this.toast.success('Channel paused'); this.ngOnInit(); }); }
  sync(id: string) { this.api.post(`/ota/channels/${id}/sync`, {}).subscribe(() => { this.toast.success('Sync triggered'); this.ngOnInit(); }); }
  disconnect(id: string) { this.api.post(`/ota/channels/${id}/disconnect`, {}).subscribe(() => { this.toast.success('Channel disconnected'); this.ngOnInit(); }); }

  confirmRes(id: string) {
    this.api.post(`/ota/reservations/${id}/confirm`, {}).subscribe(r => {
      if (r?.success) { this.toast.success('Reservation confirmed'); this.ngOnInit(); }
      else this.toast.error(r?.message || 'Failed');
    });
  }

  cancelRes(id: string) {
    this.api.post(`/ota/reservations/${id}/cancel`, {}).subscribe(r => {
      if (r?.success) { this.toast.success('Reservation cancelled'); this.ngOnInit(); }
      else this.toast.error(r?.message || 'Failed');
    });
  }

  syncClass(s: string): string {
    return { active: 'bg-emerald-100 text-emerald-700', paused: 'bg-yellow-100 text-yellow-700', disconnected: 'bg-gray-100 text-gray-600', error: 'bg-red-100 text-red-700' }[s] || '';
  }
  rStatClass(s: string): string {
    return { pending: 'bg-yellow-100 text-yellow-700', confirmed: 'bg-emerald-100 text-emerald-700', cancelled: 'bg-red-100 text-red-700' }[s] || '';
  }
}

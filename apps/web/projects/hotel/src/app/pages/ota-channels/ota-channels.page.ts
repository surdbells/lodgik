import { Component, inject, OnInit, signal } from '@angular/core';
import { ApiService, PageHeaderComponent, LoadingSpinnerComponent } from '@lodgik/shared';
@Component({
  selector: 'app-ota-channels', standalone: true, imports: [PageHeaderComponent, LoadingSpinnerComponent],
  template: `
    <ui-page-header title="OTA Channel Manager" subtitle="Manage Booking.com, Expedia, and other distribution channels"></ui-page-header>
    <ui-loading [loading]="loading()"></ui-loading>
    <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
      @for (c of channels(); track c.id) {
        <div class="bg-white rounded-lg border p-5">
          <div class="flex items-start justify-between"><div><p class="text-lg font-bold">{{c.display_name}}</p><p class="text-sm text-gray-500">{{c.commission_percentage}}% commission</p></div>
            <span [class]="syncClass(c.sync_status)" class="px-2 py-0.5 rounded-full text-xs font-medium">{{c.sync_status}}</span></div>
          <div class="mt-4 text-sm text-gray-600"><p>Last sync: {{c.last_sync_at || 'Never'}}</p></div>
          <div class="mt-4 flex gap-2">
            @if (c.sync_status !== 'active') { <button (click)="activate(c.id)" class="px-3 py-1 bg-green-600 text-white text-xs rounded">Activate</button> }
            @if (c.sync_status === 'active') { <button (click)="pause(c.id)" class="px-3 py-1 bg-yellow-600 text-white text-xs rounded">Pause</button> }
            <button (click)="sync(c.id)" class="px-3 py-1 bg-sage-600 text-white text-xs rounded">Sync Now</button>
            <button (click)="disconnect(c.id)" class="px-3 py-1 bg-gray-300 text-gray-700 text-xs rounded">Disconnect</button>
          </div>
        </div>
      } @empty { <p class="col-span-3 text-center text-gray-400 py-8">No OTA channels connected</p> }
    </div>
    <div class="bg-white rounded-lg border"><h3 class="px-4 py-3 font-semibold border-b">Recent OTA Reservations</h3>
      <table class="w-full text-sm"><thead class="bg-gray-50"><tr>
        <th class="px-4 py-3 text-left">Channel</th><th class="px-4 py-3 text-left">External ID</th><th class="px-4 py-3 text-left">Guest</th>
        <th class="px-4 py-3 text-left">Dates</th><th class="px-4 py-3 text-right">Amount</th><th class="px-4 py-3 text-center">Status</th>
      </tr></thead><tbody>
        @for (r of reservations(); track r.id) {
          <tr class="border-t hover:bg-gray-50"><td class="px-4 py-3">{{r.channel_name}}</td><td class="px-4 py-3 font-mono text-xs">{{r.external_id}}</td>
            <td class="px-4 py-3">{{r.guest_name}}</td><td class="px-4 py-3">{{r.check_in}} → {{r.check_out}}</td>
            <td class="px-4 py-3 text-right">₦{{((+r.amount)/100).toLocaleString()}}</td>
            <td class="px-4 py-3 text-center"><span [class]="'px-2 py-0.5 rounded text-xs font-medium ' + rStatClass(r.sync_status)">{{r.sync_status}}</span></td></tr>
        } @empty { <tr><td colspan="6" class="px-4 py-8 text-center text-gray-400">No OTA reservations</td></tr> }
      </tbody></table>
    </div>
  `
})
export default class OtaChannelsPage implements OnInit {
  private api = inject(ApiService); loading = signal(true); channels = signal<any[]>([]); reservations = signal<any[]>([]);
  ngOnInit() { this.api.get('/ota/channels').subscribe((r: any) => { this.channels.set(r?.data || []); this.loading.set(false); });
    this.api.get('/ota/reservations').subscribe((r: any) => this.reservations.set(r?.data || [])); }
  activate(id: string) { this.api.post(`/ota/channels/${id}/activate`, {}).subscribe(() => this.ngOnInit()); }
  pause(id: string) { this.api.post(`/ota/channels/${id}/pause`, {}).subscribe(() => this.ngOnInit()); }
  sync(id: string) { this.api.post(`/ota/channels/${id}/sync`, {}).subscribe(() => this.ngOnInit()); }
  disconnect(id: string) { this.api.post(`/ota/channels/${id}/disconnect`, {}).subscribe(() => this.ngOnInit()); }
  syncClass(s: string): string { return { active: 'bg-green-100 text-green-700', paused: 'bg-yellow-100 text-yellow-700', disconnected: 'bg-gray-100 text-gray-600', error: 'bg-red-100 text-red-700' }[s] || ''; }
  rStatClass(s: string): string { return { pending: 'bg-yellow-100 text-yellow-700', confirmed: 'bg-green-100 text-green-700', cancelled: 'bg-red-100 text-red-700' }[s] || ''; }
}

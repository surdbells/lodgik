import { Component, inject, OnInit, signal } from '@angular/core';
import { ApiService, PageHeaderComponent, LoadingSpinnerComponent } from '@lodgik/shared';
@Component({
  selector: 'app-platform-analytics', standalone: true, imports: [PageHeaderComponent, LoadingSpinnerComponent],
  template: `<ui-page-header title="Platform Analytics" subtitle="Global usage metrics across all tenants"></ui-page-header>
    <ui-loading [loading]="loading()"></ui-loading>
    <div class="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
      <div class="bg-white rounded-lg border p-4"><p class="text-xs text-gray-500">Total Tenants</p><p class="text-2xl font-bold">{{stats().tenants || 0}}</p></div>
      <div class="bg-white rounded-lg border p-4"><p class="text-xs text-gray-500">Total Properties</p><p class="text-2xl font-bold">{{stats().properties || 0}}</p></div>
      <div class="bg-white rounded-lg border p-4"><p class="text-xs text-gray-500">Active Users</p><p class="text-2xl font-bold text-green-600">{{stats().active_users || 0}}</p></div>
      <div class="bg-white rounded-lg border p-4"><p class="text-xs text-gray-500">Total Bookings</p><p class="text-2xl font-bold text-blue-600">{{stats().total_bookings || 0}}</p></div>
    </div>
    <div class="bg-white rounded-lg border p-6"><h3 class="font-semibold mb-3">Feature Usage</h3><p class="text-gray-400 text-sm">Detailed platform analytics coming soon — data aggregation across tenants.</p></div>`
})
export class PlatformAnalyticsPage implements OnInit {
  private api = inject(ApiService); loading = signal(true); stats = signal<any>({});
  ngOnInit() { this.api.get('/admin/stats').subscribe({ next: (r: any) => { this.stats.set(r?.data || {}); this.loading.set(false); }, error: () => this.loading.set(false) }); }
}

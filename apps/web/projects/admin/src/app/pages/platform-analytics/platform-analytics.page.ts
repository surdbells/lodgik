import { Component, inject, OnInit, signal } from '@angular/core';
import { ApiService, PageHeaderComponent, LoadingSpinnerComponent, StatsCardComponent } from '@lodgik/shared';
import { LineChartComponent, BarChartComponent, DonutChartComponent, ChartSeries, ChartDataPoint } from '@lodgik/charts';

@Component({
  selector: 'app-platform-analytics',
  standalone: true,
  imports: [PageHeaderComponent, LoadingSpinnerComponent, StatsCardComponent, LineChartComponent, BarChartComponent, DonutChartComponent],
  template: `
    <ui-page-header title="Platform Analytics" subtitle="Usage metrics and feature adoption across all tenants"></ui-page-header>
    <ui-loading [loading]="loading()"></ui-loading>

    @if (!loading()) {
      <div class="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <ui-stats-card label="Total Tenants" [value]="stats().total_tenants || 0" icon="🏨"></ui-stats-card>
        <ui-stats-card label="Total Properties" [value]="stats().total_properties || 0" icon="🏢"></ui-stats-card>
        <ui-stats-card label="Active Users" [value]="stats().total_users || 0" icon="👤"></ui-stats-card>
        <ui-stats-card label="Total Bookings" [value]="stats().total_bookings || 0" icon="📅"></ui-stats-card>
      </div>

      <div class="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        <!-- User Growth -->
        <div class="bg-white rounded-lg border p-5">
          <h3 class="text-sm font-semibold text-gray-700 mb-3">User Growth (Monthly)</h3>
          @if (growthSeries().length) {
            <chart-line [series]="growthSeries()" [labels]="growthLabels()" [width]="500" [height]="240" [showArea]="true"></chart-line>
          } @else { <p class="text-gray-400 text-sm py-8 text-center">No data yet</p> }
        </div>

        <!-- Feature Adoption -->
        <div class="bg-white rounded-lg border p-5">
          <h3 class="text-sm font-semibold text-gray-700 mb-3">Feature Adoption</h3>
          @if (featureData().length) {
            <chart-bar [data]="featureData()" [height]="240" [showValues]="true"></chart-bar>
          } @else { <p class="text-gray-400 text-sm py-8 text-center">No data yet</p> }
        </div>
      </div>

      <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <!-- Bookings by Tenant (top 10) -->
        <div class="bg-white rounded-lg border p-5">
          <h3 class="text-sm font-semibold text-gray-700 mb-3">Top Tenants by Bookings</h3>
          <div class="space-y-2">
            @for (t of topTenants(); track t.name) {
              <div class="flex items-center justify-between py-1.5">
                <span class="text-sm">{{ t.name }}</span>
                <div class="flex items-center gap-2">
                  <div class="w-32 h-2 bg-gray-200 rounded-full"><div class="h-2 bg-blue-500 rounded-full" [style.width.%]="t.percent"></div></div>
                  <span class="text-xs text-gray-500 w-12 text-right">{{ t.bookings }}</span>
                </div>
              </div>
            }
          </div>
        </div>

        <!-- Revenue by Tenant -->
        <div class="bg-white rounded-lg border p-5">
          <h3 class="text-sm font-semibold text-gray-700 mb-3">Revenue Distribution</h3>
          @if (revenueDonut().length) {
            <chart-donut [data]="revenueDonut()" [height]="240"></chart-donut>
          } @else { <p class="text-gray-400 text-sm py-8 text-center">No revenue data yet</p> }
        </div>
      </div>
    }
  `,
})
export class PlatformAnalyticsPage implements OnInit {
  private api = inject(ApiService);
  loading = signal(true);
  stats = signal<any>({});
  growthSeries = signal<ChartSeries[]>([]);
  growthLabels = signal<string[]>([]);
  featureData = signal<ChartDataPoint[]>([]);
  topTenants = signal<any[]>([]);
  revenueDonut = signal<ChartDataPoint[]>([]);

  ngOnInit(): void {
    this.api.get('/admin/analytics').subscribe({
      next: r => {
        if (r.success) {
          const d = r.data || {};
          this.stats.set(d);
          if (d.user_growth?.length) {
            this.growthLabels.set(d.user_growth.map((m: any) => m.month));
            this.growthSeries.set([{ name: 'Users', data: d.user_growth.map((m: any) => m.count), color: '#3b82f6' }]);
          }
          if (d.feature_adoption?.length) {
            this.featureData.set(d.feature_adoption.map((f: any) => ({ label: f.name, value: f.tenant_count })));
          }
          this.topTenants.set((d.top_tenants || []).map((t: any) => ({ ...t, percent: d.max_bookings ? (t.bookings / d.max_bookings) * 100 : 0 })));
          if (d.revenue_by_tenant?.length) {
            const colors = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4', '#f97316', '#ec4899'];
            this.revenueDonut.set(d.revenue_by_tenant.map((t: any, i: number) => ({ label: t.name, value: t.revenue, color: colors[i % colors.length] })));
          }
        }
        this.loading.set(false);
      },
      error: () => this.loading.set(false),
    });
  }
}

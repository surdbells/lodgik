import { Component, inject, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ApiService, PageHeaderComponent, LoadingSpinnerComponent, StatsCardComponent } from '@lodgik/shared';
import { LineChartComponent, BarChartComponent, DonutChartComponent, ChartSeries, ChartDataPoint } from '@lodgik/charts';

@Component({
  selector: 'app-platform-analytics',
  standalone: true,
  imports: [PageHeaderComponent, LoadingSpinnerComponent, StatsCardComponent, FormsModule, LineChartComponent, BarChartComponent, DonutChartComponent],
  template: `
    <ui-page-header title="Platform Analytics" subtitle="Global usage metrics, growth, and adoption across all tenants">
      <select [(ngModel)]="period" (ngModelChange)="load()" class="px-3 py-2 border rounded-lg text-sm">
        <option value="30">Last 30 days</option><option value="90">Last 90 days</option><option value="365">Last year</option>
      </select>
    </ui-page-header>
    <ui-loading [loading]="loading()"></ui-loading>

    @if (!loading()) {
      <!-- Top stats -->
      <div class="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 mb-6">
        <ui-stats-card label="Total Tenants" [value]="stats().total_tenants" icon="🏨"></ui-stats-card>
        <ui-stats-card label="Active Users" [value]="stats().active_users" icon="👤"></ui-stats-card>
        <ui-stats-card label="Total Bookings" [value]="stats().total_bookings" icon="📅"></ui-stats-card>
        <ui-stats-card label="Total Rooms" [value]="stats().total_rooms" icon="🛏️"></ui-stats-card>
        <ui-stats-card label="Total Properties" [value]="stats().total_properties" icon="🏢"></ui-stats-card>
        <ui-stats-card label="MRR" [value]="'₦' + ((stats().mrr || 0)).toLocaleString()" icon="💰"></ui-stats-card>
      </div>

      <div class="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        <!-- User growth -->
        <div class="bg-white rounded-lg border p-5">
          <h3 class="text-sm font-semibold text-gray-700 mb-3">Tenant & User Growth</h3>
          @if (growthSeries().length) {
            <chart-line [series]="growthSeries()" [labels]="growthLabels()" [width]="500" [height]="240" [showArea]="true"></chart-line>
          } @else { <p class="text-gray-400 text-sm py-12 text-center">No growth data</p> }
        </div>

        <!-- Bookings trend -->
        <div class="bg-white rounded-lg border p-5">
          <h3 class="text-sm font-semibold text-gray-700 mb-3">Bookings Over Time</h3>
          @if (bookingSeries().length) {
            <chart-line [series]="bookingSeries()" [labels]="bookingLabels()" [width]="500" [height]="240" [showArea]="true"></chart-line>
          } @else { <p class="text-gray-400 text-sm py-12 text-center">No booking data</p> }
        </div>
      </div>

      <div class="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
        <!-- Feature adoption -->
        <div class="bg-white rounded-lg border p-5">
          <h3 class="text-sm font-semibold text-gray-700 mb-3">Top Feature Modules</h3>
          @if (featureData().length) {
            <chart-bar [data]="featureData()" [height]="260" [showValues]="true"></chart-bar>
          } @else { <p class="text-gray-400 text-sm py-12 text-center">No data</p> }
        </div>

        <!-- Revenue by plan -->
        <div class="bg-white rounded-lg border p-5">
          <h3 class="text-sm font-semibold text-gray-700 mb-3">Revenue by Plan</h3>
          @if (planRevenue().length) {
            <chart-donut [data]="planRevenue()" [height]="260" centerValue="" centerLabel="revenue"></chart-donut>
          } @else { <p class="text-gray-400 text-sm py-12 text-center">No data</p> }
        </div>

        <!-- Tenants by tier -->
        <div class="bg-white rounded-lg border p-5">
          <h3 class="text-sm font-semibold text-gray-700 mb-3">Tenants by Tier</h3>
          @if (tierData().length) {
            <chart-donut [data]="tierData()" [height]="260" centerValue="" centerLabel="tenants"></chart-donut>
          } @else { <p class="text-gray-400 text-sm py-12 text-center">No data</p> }
        </div>
      </div>

      <!-- Top tenants table -->
      <div class="bg-white rounded-lg border p-5">
        <h3 class="text-sm font-semibold text-gray-700 mb-3">Top Tenants by Usage</h3>
        <table class="w-full text-sm">
          <thead class="bg-gray-50"><tr>
            <th class="px-4 py-2 text-left font-medium text-gray-600">Tenant</th>
            <th class="px-4 py-2 text-center font-medium text-gray-600">Plan</th>
            <th class="px-4 py-2 text-right font-medium text-gray-600">Rooms</th>
            <th class="px-4 py-2 text-right font-medium text-gray-600">Staff</th>
            <th class="px-4 py-2 text-right font-medium text-gray-600">Bookings</th>
            <th class="px-4 py-2 text-center font-medium text-gray-600">Status</th>
          </tr></thead>
          <tbody>
            @for (t of topTenants(); track t.id) {
              <tr class="border-t hover:bg-gray-50">
                <td class="px-4 py-2 font-medium">{{ t.name }}</td>
                <td class="px-4 py-2 text-center"><span class="px-2 py-0.5 rounded-full text-xs bg-blue-100 text-blue-700">{{ t.plan_name || 'Free' }}</span></td>
                <td class="px-4 py-2 text-right">{{ t.rooms_used }}</td>
                <td class="px-4 py-2 text-right">{{ t.staff_used }}</td>
                <td class="px-4 py-2 text-right">{{ t.bookings_count }}</td>
                <td class="px-4 py-2 text-center"><span class="text-xs px-2 py-0.5 rounded-full"
                  [class]="t.subscription_status === 'active' ? 'bg-emerald-100 text-emerald-700' : 'bg-gray-100 text-gray-600'">{{ t.subscription_status }}</span></td>
              </tr>
            } @empty { <tr><td colspan="6" class="px-4 py-8 text-center text-gray-400">No data available</td></tr> }
          </tbody>
        </table>
      </div>
    }
  `,
})
export class PlatformAnalyticsPage implements OnInit {
  private api = inject(ApiService);
  loading = signal(true);
  period = '30';
  stats = signal<any>({});
  topTenants = signal<any[]>([]);

  growthSeries = signal<ChartSeries[]>([]);
  growthLabels = signal<string[]>([]);
  bookingSeries = signal<ChartSeries[]>([]);
  bookingLabels = signal<string[]>([]);
  featureData = signal<ChartDataPoint[]>([]);
  planRevenue = signal<ChartDataPoint[]>([]);
  tierData = signal<ChartDataPoint[]>([]);

  ngOnInit(): void { this.load(); }

  load(): void {
    this.loading.set(true);
    this.api.get(`/admin/analytics?days=${this.period}`).subscribe({
      next: r => {
        if (r.success) {
          const d = r.data;
          this.stats.set(d);
          this.topTenants.set(d.top_tenants || []);

          // Growth trend
          if (d.growth_trend?.length) {
            this.growthLabels.set(d.growth_trend.map((g: any) => g.month || g.date));
            this.growthSeries.set([
              { name: 'Tenants', data: d.growth_trend.map((g: any) => g.tenants || 0), color: '#3b82f6' },
              { name: 'Users', data: d.growth_trend.map((g: any) => g.users || 0), color: '#10b981' },
            ]);
          }

          // Booking trend
          if (d.booking_trend?.length) {
            this.bookingLabels.set(d.booking_trend.map((b: any) => b.month || b.date));
            this.bookingSeries.set([
              { name: 'Bookings', data: d.booking_trend.map((b: any) => b.count || 0), color: '#8b5cf6' },
            ]);
          }

          // Feature adoption
          if (d.feature_adoption?.length) {
            this.featureData.set(d.feature_adoption.slice(0, 10).map((f: any) => ({ label: f.name || f.module_key, value: f.count || 0 })));
          }

          // Revenue by plan
          const colors = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899'];
          if (d.revenue_by_plan?.length) {
            this.planRevenue.set(d.revenue_by_plan.map((p: any, i: number) => ({ label: p.name, value: p.revenue || 0, color: colors[i % colors.length] })));
          }

          // Tenants by tier
          if (d.tenants_by_tier) {
            const tierColors: Record<string, string> = { starter: '#3b82f6', professional: '#10b981', enterprise: '#f59e0b', custom: '#8b5cf6' };
            this.tierData.set(Object.entries(d.tenants_by_tier).map(([k, v]) => ({ label: k, value: v as number, color: tierColors[k] || '#9ca3af' })));
          }
        }
        this.loading.set(false);
      },
      error: () => this.loading.set(false),
    });
  }
}

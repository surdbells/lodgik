import { Component, inject, OnInit, signal } from '@angular/core';
import { ApiService, StatsCardComponent, PageHeaderComponent, LoadingSpinnerComponent } from '@lodgik/shared';
import { LineChartComponent, DonutChartComponent, BarChartComponent, SparklineChartComponent, ChartSeries, ChartDataPoint } from '@lodgik/charts';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [StatsCardComponent, PageHeaderComponent, LoadingSpinnerComponent, LineChartComponent, DonutChartComponent, BarChartComponent, SparklineChartComponent],
  template: `
    <ui-page-header title="Platform Dashboard" subtitle="Overview of your SaaS platform" icon="layout-dashboard"></ui-page-header>
    <ui-loading [loading]="loading()" message="Loading dashboard..."></ui-loading>

    @if (!loading()) {
      <!-- Stats row -->
      <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <ui-stats-card label="Total Tenants" [value]="stats().total_tenants" icon="hotel" [trend]="stats().tenant_growth_pct">
          <chart-sparkline [data]="tenantSpark()" color="#466846" [width]="120" [height]="32"></chart-sparkline>
        </ui-stats-card>
        <ui-stats-card label="Active Subscriptions" [value]="stats().active_subscriptions || stats().active_tenants" icon="circle-check">
          <chart-sparkline [data]="subSpark()" color="#10b981" [width]="120" [height]="32"></chart-sparkline>
        </ui-stats-card>
        <ui-stats-card label="MRR" [value]="'₦' + ((stats().mrr || 0)).toLocaleString()" icon="hand-coins" [trend]="stats().mrr_growth_pct">
          <chart-sparkline [data]="mrrSpark()" color="#f59e0b" [width]="120" [height]="32"></chart-sparkline>
        </ui-stats-card>
        <ui-stats-card label="Churn Rate" [value]="(stats().churn_rate || 0) + '%'" icon="trending-up" [trend]="stats().churn_trend">
        </ui-stats-card>
      </div>

      <div class="grid grid-cols-1 sm:grid-cols-4 gap-4 mb-6">
        <ui-stats-card label="Trial Tenants" [value]="stats().trial_tenants" icon="clock"></ui-stats-card>
        <ui-stats-card label="Total Users" [value]="stats().total_users" icon="user-round"></ui-stats-card>
        <ui-stats-card label="Total Properties" [value]="stats().total_properties" icon="building"></ui-stats-card>
        <ui-stats-card label="Total Plans" [value]="stats().total_plans" icon="star"></ui-stats-card>
      </div>

      <!-- Charts -->
      <div class="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
        <!-- Signup & Revenue Trend -->
        <div class="lg:col-span-2 bg-white rounded-xl border border-gray-100 shadow-card p-5">
          <h3 class="text-sm font-semibold text-gray-700 mb-3">Monthly Signups & Revenue</h3>
          @if (trendSeries().length) {
            <chart-line [series]="trendSeries()" [labels]="trendLabels()" [width]="650" [height]="260" [showArea]="true"></chart-line>
          } @else {
            <p class="text-gray-400 text-sm py-12 text-center">No trend data yet</p>
          }
        </div>

        <!-- Tenants by Status (donut) -->
        <div class="bg-white rounded-xl border border-gray-100 shadow-card p-5">
          <h3 class="text-sm font-semibold text-gray-700 mb-3">Tenants by Status</h3>
          <chart-donut [data]="statusData()" centerValue="" centerLabel="tenants" [height]="200"></chart-donut>
        </div>
      </div>

      <div class="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        <!-- Revenue by Plan -->
        <div class="bg-white rounded-xl border border-gray-100 shadow-card p-5">
          <h3 class="text-sm font-semibold text-gray-700 mb-3">Revenue by Plan</h3>
          @if (planData().length) {
            <chart-bar [data]="planData()" [height]="220" [showValues]="true"></chart-bar>
          } @else { <p class="text-gray-400 text-sm py-8 text-center">No plan data</p> }
        </div>

        <!-- Recent Signups -->
        <div class="bg-white rounded-xl border border-gray-100 shadow-card p-5">
          <h3 class="text-sm font-semibold text-gray-700 mb-3">Recent Signups</h3>
          <div class="space-y-2">
            @for (t of recentTenants(); track t.id) {
              <div class="flex items-center justify-between py-1.5 border-b border-gray-100">
                <div><p class="text-sm font-medium">{{ t.name }}</p><p class="text-xs text-gray-500">{{ t.email }}</p></div>
                <div class="text-right"><span class="text-xs px-2 py-0.5 rounded-full" [class]="t.subscription_status === 'active' ? 'bg-emerald-100 text-emerald-700' : t.subscription_status === 'trial' ? 'bg-sage-100 text-sage-700' : 'bg-gray-100 text-gray-600'">{{ t.subscription_status }}</span>
                  <p class="text-xs text-gray-400 mt-0.5">{{ t.created_at }}</p>
                </div>
              </div>
            } @empty { <p class="text-gray-400 text-sm text-center py-4">No recent signups</p> }
          </div>
        </div>
      </div>
    }
  `,
})
export class DashboardPage implements OnInit {
  private api = inject(ApiService);
  loading = signal(true);
  stats = signal<any>({});
  statusData = signal<ChartDataPoint[]>([]);
  planData = signal<ChartDataPoint[]>([]);
  tenantSpark = signal<number[]>([]);
  subSpark = signal<number[]>([]);
  mrrSpark = signal<number[]>([]);
  trendSeries = signal<ChartSeries[]>([]);
  trendLabels = signal<string[]>([]);
  recentTenants = signal<any[]>([]);

  ngOnInit(): void {
    this.api.get('/admin/dashboard').subscribe({
      next: r => {
        if (r.success) {
          const d = r.data;
          this.stats.set(d);

          // Tenants by status donut
          const statusMap = d.tenants_by_status || {};
          const colors: Record<string, string> = { trial: '#466846', active: '#10b981', past_due: '#f59e0b', cancelled: '#ef4444', expired: '#6b7280', suspended: '#dc2626' };
          this.statusData.set(Object.entries(statusMap).map(([k, v]) => ({ label: k, value: v as number, color: colors[k] || '#9ca3af' })));

          // Revenue by plan
          this.planData.set((d.revenue_by_plan || []).map((p: any) => ({ label: p.name, value: p.revenue || 0 })));

          // Sparklines
          this.tenantSpark.set(d.tenant_trend || [3, 5, 8, 12, 15, 18, 22]);
          this.subSpark.set(d.subscription_trend || [2, 4, 6, 10, 12, 15, 18]);
          this.mrrSpark.set(d.mrr_trend || []);

          // Monthly trend
          if (d.monthly_trend?.length) {
            this.trendLabels.set(d.monthly_trend.map((m: any) => m.month));
            this.trendSeries.set([
              { name: 'Signups', data: d.monthly_trend.map((m: any) => m.signups || 0), color: '#466846' },
              { name: 'Revenue (₦k)', data: d.monthly_trend.map((m: any) => (m.revenue || 0) / 1000), color: '#10b981' },
            ]);
          }

          // Recent tenants
          this.recentTenants.set(d.recent_tenants || []);
        }
        this.loading.set(false);
      },
      error: () => this.loading.set(false),
    });
  }
}

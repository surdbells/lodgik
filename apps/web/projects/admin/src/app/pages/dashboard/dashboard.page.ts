import { Component, inject, OnInit, signal } from '@angular/core';
import { ApiService, StatsCardComponent, PageHeaderComponent, LoadingSpinnerComponent } from '@lodgik/shared';
import { LineChartComponent, DonutChartComponent, BarChartComponent, SparklineChartComponent, ChartSeries, ChartDataPoint } from '@lodgik/charts';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [StatsCardComponent, PageHeaderComponent, LoadingSpinnerComponent, LineChartComponent, DonutChartComponent, BarChartComponent, SparklineChartComponent],
  template: `
    <ui-page-header title="Platform Dashboard" subtitle="Overview of your SaaS platform"></ui-page-header>

    <ui-loading [loading]="loading()" message="Loading dashboard..."></ui-loading>

    @if (!loading()) {
      <!-- Stats row -->
      <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <ui-stats-card label="Total Tenants" [value]="stats().total_tenants" icon="🏨" [trend]="12.5">
          <chart-sparkline [data]="[3,5,8,12,15,18,22]" color="#3b82f6" [width]="120" [height]="32"></chart-sparkline>
        </ui-stats-card>
        <ui-stats-card label="Active Tenants" [value]="stats().active_tenants" icon="✅" [trend]="8.2"></ui-stats-card>
        <ui-stats-card label="Trial Tenants" [value]="stats().trial_tenants" icon="⏱️"></ui-stats-card>
        <ui-stats-card label="Total Users" [value]="stats().total_users" icon="👥" [trend]="15.3">
          <chart-sparkline [data]="[10,18,25,30,42,55,68]" color="#10b981" [width]="120" [height]="32"></chart-sparkline>
        </ui-stats-card>
      </div>

      <div class="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
        <!-- Tenants by status donut -->
        <div class="bg-white rounded-lg border border-gray-200 p-5">
          <h3 class="text-sm font-semibold text-gray-700 mb-4">Tenants by Status</h3>
          <chart-donut [data]="statusData()" centerValue="" centerLabel="tenants" [height]="180"></chart-donut>
        </div>

        <!-- Plans distribution -->
        <div class="bg-white rounded-lg border border-gray-200 p-5 lg:col-span-2">
          <h3 class="text-sm font-semibold text-gray-700 mb-4">Subscription Plans</h3>
          <chart-bar [data]="planData()" [height]="200" [showValues]="true"></chart-bar>
        </div>
      </div>

      <!-- Quick stats row -->
      <div class="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <ui-stats-card label="Properties" [value]="stats().total_properties" icon="🏢"></ui-stats-card>
        <ui-stats-card label="Subscription Plans" [value]="stats().total_plans" icon="📋"></ui-stats-card>
        <ui-stats-card label="Active Modules" [value]="45" icon="🧩"></ui-stats-card>
      </div>
    }
  `,
})
export class DashboardPage implements OnInit {
  private api = inject(ApiService);
  loading = signal(true);
  stats = signal<any>({ total_tenants: 0, active_tenants: 0, trial_tenants: 0, total_users: 0, total_properties: 0, total_plans: 0, tenants_by_status: {} });

  statusData = signal<ChartDataPoint[]>([]);
  planData = signal<ChartDataPoint[]>([]);

  ngOnInit(): void {
    this.api.get('/admin/dashboard').subscribe({
      next: res => {
        if (res.success) {
          this.stats.set(res.data);
          const s = res.data.tenants_by_status || {};
          this.statusData.set(Object.entries(s).map(([label, value]) => ({ label, value: value as number })));
        }
        this.loading.set(false);
      },
      error: () => this.loading.set(false),
    });
    this.api.get('/plans').subscribe(res => {
      if (res.success) {
        this.planData.set((res.data || []).map((p: any) => ({ label: p.name, value: p.monthly_price || 0 })));
      }
    });
  }
}

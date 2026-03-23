import { PAGE_TOURS } from '../../services/page-tours';
import { TourService } from '@lodgik/shared';
import { Component, inject, OnInit, signal, computed } from '@angular/core';
import { RouterLink } from '@angular/router';
import { DatePipe, CurrencyPipe } from '@angular/common';
import { ApiService, PageHeaderComponent, StatsCardComponent, LoadingSpinnerComponent, AuthService, ActivePropertyService} from '@lodgik/shared';
import { BarChartComponent, GaugeChartComponent, LineChartComponent, ChartDataPoint } from '@lodgik/charts';

@Component({
  selector: 'app-gym-dashboard',
  standalone: true,
  imports: [RouterLink, DatePipe, PageHeaderComponent, StatsCardComponent, LoadingSpinnerComponent, BarChartComponent, GaugeChartComponent, LineChartComponent],
  template: `
    <ui-page-header title="Gym & Fitness" subtitle="Membership management and access control"
      tourKey="gym" (tourClick)="startTour()">
      <div class="flex gap-2">
        <a routerLink="/gym/check-in" class="px-4 py-2 bg-green-600 text-white text-sm font-medium rounded-lg hover:bg-green-700">🔍 Check-in</a>
        <a routerLink="/gym/members" class="px-4 py-2 bg-sage-600 text-white text-sm font-medium rounded-lg hover:bg-sage-700">+ New Member</a>
      </div>
    </ui-page-header>

    <ui-loading [loading]="loading()"></ui-loading>

    @if (!loading()) {
      <div class="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 mb-6">
        <ui-stats-card label="Active Members" [value]="dashboard().active_members" icon="dumbbell"></ui-stats-card>
        <ui-stats-card label="Active Memberships" [value]="dashboard().active_memberships" icon="clipboard-list"></ui-stats-card>
        <ui-stats-card label="Visits Today" [value]="dashboard().visits_today" icon="circle-check"></ui-stats-card>
        <ui-stats-card label="Expiring Soon" [value]="dashboard().expiring_soon" icon="triangle-alert"></ui-stats-card>
        <ui-stats-card label="Revenue (Month)" [value]="'₦' + formatAmount(dashboard().month_revenue)" icon="hand-coins"></ui-stats-card>
      </div>

      <div class="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
        <!-- Visits Bar Chart -->
        <div class="lg:col-span-2 bg-white rounded-xl border border-gray-100 shadow-card p-5">
          <h3 class="text-sm font-semibold text-gray-700 mb-3">Visits Per Day (30 days)</h3>
          @if (visitsData().length) {
            <chart-bar [data]="visitsData()" barColor="#3b82f6" [height]="240"></chart-bar>
          } @else {
            <p class="text-gray-400 text-sm">No visit data yet</p>
          }
        </div>

        <!-- Capacity Gauge -->
        <div class="bg-white rounded-xl border border-gray-100 shadow-card p-5 flex flex-col items-center justify-center">
          <h3 class="text-sm font-semibold text-gray-700 mb-3">Gym Utilization Today</h3>
          <chart-gauge [value]="capacityPercent()" [max]="100" label="Capacity" suffix="%" [width]="180" [height]="120" lowColor="#22c55e"></chart-gauge>
          <p class="text-xs text-gray-500 mt-2">{{ dashboard().visits_today }} visits today</p>
        </div>
      </div>

      <!-- Revenue Trend -->
      <div class="bg-white rounded-xl border border-gray-100 shadow-card p-5 mb-6">
        <h3 class="text-sm font-semibold text-gray-700 mb-3">Monthly Revenue Trend</h3>
        @if (revenueData().length) {
          <chart-line [series]="revenueSeries()" [labels]="revenueLabels()" [height]="200"></chart-line>
        } @else {
          <p class="text-gray-400 text-sm">No revenue data yet</p>
        }
      </div>

      <!-- Quick Links -->
      <div class="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
        <a routerLink="/gym/members" class="bg-white border rounded-lg p-4 text-center hover:border-blue-400 transition-colors">
          <div class="text-2xl mb-1">👥</div><div class="text-sm font-medium text-gray-700">Members</div>
        </a>
        <a routerLink="/gym/plans" class="bg-white border rounded-lg p-4 text-center hover:border-blue-400 transition-colors">
          <div class="text-2xl mb-1">📋</div><div class="text-sm font-medium text-gray-700">Plans</div>
        </a>
        <a routerLink="/gym/classes" class="bg-white border rounded-lg p-4 text-center hover:border-blue-400 transition-colors">
          <div class="text-2xl mb-1">🗓️</div><div class="text-sm font-medium text-gray-700">Classes</div>
        </a>
        <a routerLink="/gym/payments" class="bg-white border rounded-lg p-4 text-center hover:border-blue-400 transition-colors">
          <div class="text-2xl mb-1">💳</div><div class="text-sm font-medium text-gray-700">Payments</div>
        </a>
      </div>
    }
  `,
})
export class GymDashboardPage implements OnInit {
  private tour = inject(TourService);
  private api = inject(ApiService);
  private auth = inject(AuthService);
  private activeProperty = inject(ActivePropertyService);
  loading = signal(true);
  dashboard = signal<any>({});
  visitsData = signal<ChartDataPoint[]>([]);
  revenueData = signal<ChartDataPoint[]>([]);
  revenueSeries = computed(() => {
    const data = this.revenueData();
    return data.length ? [{ name: 'Revenue', data: data.map(d => d.value), color: '#10b981' }] : [];
  });
  revenueLabels = computed(() => this.revenueData().map(d => d.label));
  capacityPercent = computed(() => {
    const visits = this.dashboard().visits_today || 0;
    const cap = 50; // Configurable gym capacity
    return Math.min(100, Math.round((visits / cap) * 100));
  });

  ngOnInit() {
    const pid = this.activeProperty.propertyId();
    this.api.get(`/gym/dashboard?property_id=${pid}`).subscribe({
      next: (r: any) => { this.dashboard.set(r.data || {}); },
    });
    this.api.get(`/gym/visits/per-day?property_id=${pid}&days=30`).subscribe({
      next: (r: any) => {
        this.visitsData.set((r.data || []).map((d: any) => ({ label: d.date?.substring(5) || '', value: +d.count })));
      },
    });
    this.api.get(`/gym/payments/monthly-revenue?property_id=${pid}&months=12`).subscribe({
      next: (r: any) => {
        this.revenueData.set((r.data || []).map((d: any) => ({ label: d.month || '', value: +(d.total || 0) / 100 })));
        this.loading.set(false);
      },
      error: () => this.loading.set(false),
    });
  }

  formatAmount(kobo: any): string { return (+kobo / 100).toLocaleString('en-NG', { minimumFractionDigits: 0 }); }

  startTour(): void { this.tour.start(PAGE_TOURS['gym'] ?? [], 'gym'); }
}

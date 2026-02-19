import { Component, inject, OnInit, signal, computed } from '@angular/core';
import { RouterLink } from '@angular/router';
import { DatePipe } from '@angular/common';
import { ApiService, PageHeaderComponent, StatsCardComponent, LoadingSpinnerComponent, TokenService } from '@lodgik/shared';
import { LineChartComponent, BarChartComponent, DonutChartComponent, GaugeChartComponent, SparklineChartComponent, ChartDataPoint, ChartSeries } from '@lodgik/charts';
import { AuthService } from '@lodgik/shared';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [RouterLink, DatePipe, PageHeaderComponent, StatsCardComponent, LoadingSpinnerComponent, LineChartComponent, BarChartComponent, DonutChartComponent, GaugeChartComponent, SparklineChartComponent],
  template: `
    <ui-page-header title="Dashboard" [subtitle]="'Welcome back, ' + (user()?.first_name || '')">
      <div class="flex gap-2">
        <a routerLink="/bookings" class="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700">+ New Booking</a>
      </div>
    </ui-page-header>

    <ui-loading [loading]="loading()"></ui-loading>

    @if (!loading()) {
      <!-- Top Stats Row -->
      <div class="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 mb-6">
        <ui-stats-card label="Occupancy" [value]="overview().occupancy_rate + '%'" icon="📊">
          <chart-sparkline [data]="occupancySpark()" color="#3b82f6" [width]="100" [height]="28"></chart-sparkline>
        </ui-stats-card>
        <ui-stats-card label="Available" [value]="overview().rooms?.available || 0" icon="✅"></ui-stats-card>
        <ui-stats-card label="Occupied" [value]="overview().rooms?.occupied || 0" icon="🔵"></ui-stats-card>
        <ui-stats-card label="Today Revenue" [value]="'₦' + (+overview().today_revenue || 0).toLocaleString()" icon="💰"></ui-stats-card>
        <ui-stats-card label="Check-ins" [value]="overview().today_check_ins + ' / ' + overview().pending_check_ins" [subtitle]="'done / pending'" icon="📥"></ui-stats-card>
        <ui-stats-card label="Check-outs" [value]="overview().today_check_outs" icon="📤"></ui-stats-card>
      </div>

      <!-- Charts Row -->
      <div class="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
        <!-- Occupancy Trend (line) -->
        <div class="lg:col-span-2 bg-white rounded-lg border border-gray-200 p-5">
          <div class="flex items-center justify-between mb-3">
            <h3 class="text-sm font-semibold text-gray-700">Occupancy & Revenue (30 days)</h3>
          </div>
          @if (trendSeries().length > 0) {
            <chart-line [series]="trendSeries()" [labels]="trendLabels()" [width]="700" [height]="260" [showArea]="true"></chart-line>
          } @else {
            <p class="text-gray-400 text-sm py-12 text-center">No trend data yet</p>
          }
        </div>

        <!-- Room Status Donut -->
        <div class="bg-white rounded-lg border border-gray-200 p-5">
          <h3 class="text-sm font-semibold text-gray-700 mb-3">Room Status</h3>
          <chart-donut [data]="roomStatusData()" [height]="220" [centerValue]="String(overview().rooms?.total || 0)" centerLabel="Total"></chart-donut>
        </div>
      </div>

      <div class="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
        <!-- Revenue by Type (bar) -->
        <div class="bg-white rounded-lg border border-gray-200 p-5">
          <h3 class="text-sm font-semibold text-gray-700 mb-3">Revenue by Type</h3>
          @if (revenueBreakdown().length > 0) {
            <chart-bar [data]="revenueBreakdown()" [width]="320" [height]="220" [showValues]="true"></chart-bar>
          } @else {
            <p class="text-gray-400 text-sm py-8 text-center">No revenue data yet</p>
          }
        </div>

        <!-- Occupancy Gauge -->
        <div class="bg-white rounded-lg border border-gray-200 p-5 flex flex-col items-center">
          <h3 class="text-sm font-semibold text-gray-700 mb-3 self-start">Current Occupancy</h3>
          <chart-gauge [value]="overview().occupancy_rate || 0" [max]="100" label="Occupancy" suffix="%" [width]="220" [height]="140"></chart-gauge>
          <div class="grid grid-cols-2 gap-4 mt-4 w-full text-center text-sm">
            <div><span class="text-gray-400 text-xs">ADR</span><p class="font-bold">₦{{ (+overview().adr || 0).toLocaleString() }}</p></div>
            <div><span class="text-gray-400 text-xs">RevPAR</span><p class="font-bold">₦{{ (+overview().revpar || 0).toLocaleString() }}</p></div>
          </div>
        </div>

        <!-- Activity Feed -->
        <div class="bg-white rounded-lg border border-gray-200 p-5">
          <h3 class="text-sm font-semibold text-gray-700 mb-3">Recent Activity</h3>
          <div class="space-y-2 max-h-[300px] overflow-y-auto">
            @for (a of activity(); track $index) {
              <div class="flex items-start gap-2 py-2 border-b border-gray-50 last:border-0">
                <span class="text-base mt-0.5">{{ activityIcon(a.new_status) }}</span>
                <div class="min-w-0">
                  <div class="text-sm"><span class="font-medium">{{ a.booking_ref }}</span> <span class="text-gray-500">{{ a.action_label }}</span></div>
                  <div class="text-xs text-gray-400">{{ a.timestamp | date:'short' }}</div>
                </div>
              </div>
            }
            @if (activity().length === 0) {
              <p class="text-gray-400 text-sm py-4 text-center">No recent activity</p>
            }
          </div>
        </div>
      </div>

      <!-- Quick Actions -->
      <div class="bg-white rounded-lg border border-gray-200 p-5">
        <h3 class="text-sm font-semibold text-gray-700 mb-3">Quick Actions</h3>
        <div class="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <a routerLink="/bookings" class="flex items-center gap-3 p-3 rounded-lg border border-gray-200 hover:bg-blue-50 hover:border-blue-200 transition-colors">
            <span class="text-2xl">📋</span><div><span class="text-sm font-medium">New Booking</span><p class="text-xs text-gray-400">Create reservation</p></div>
          </a>
          <a routerLink="/rooms" class="flex items-center gap-3 p-3 rounded-lg border border-gray-200 hover:bg-blue-50 hover:border-blue-200 transition-colors">
            <span class="text-2xl">🚪</span><div><span class="text-sm font-medium">Room Status</span><p class="text-xs text-gray-400">View room grid</p></div>
          </a>
          <a routerLink="/guests" class="flex items-center gap-3 p-3 rounded-lg border border-gray-200 hover:bg-blue-50 hover:border-blue-200 transition-colors">
            <span class="text-2xl">🧑</span><div><span class="text-sm font-medium">Add Guest</span><p class="text-xs text-gray-400">Register new guest</p></div>
          </a>
          <a routerLink="/staff" class="flex items-center gap-3 p-3 rounded-lg border border-gray-200 hover:bg-blue-50 hover:border-blue-200 transition-colors">
            <span class="text-2xl">👥</span><div><span class="text-sm font-medium">Staff</span><p class="text-xs text-gray-400">Manage team</p></div>
          </a>
        </div>
      </div>
    }
  `,
})
export class DashboardPage implements OnInit {
  private api = inject(ApiService);
  private auth = inject(AuthService);
  protected user = inject(TokenService).user;
  protected String = String;

  loading = signal(true);
  overview = signal<any>({});
  trends = signal<any[]>([]);
  revenueBreakdown = signal<ChartDataPoint[]>([]);
  activity = signal<any[]>([]);
  propertyId = '';

  // Computed chart data
  trendLabels = computed(() => this.trends().map((t: any) => t.date.slice(5))); // MM-DD
  trendSeries = computed((): ChartSeries[] => {
    const data = this.trends();
    if (data.length === 0) return [];
    return [
      { name: 'Occupancy %', data: data.map((t: any) => t.occupancy_rate), color: '#3b82f6' },
      { name: 'Rooms Sold', data: data.map((t: any) => t.rooms_sold), color: '#22c55e' },
    ];
  });

  occupancySpark = computed(() => this.trends().slice(-7).map((t: any) => t.occupancy_rate));

  roomStatusData = computed((): ChartDataPoint[] => {
    const r = this.overview().rooms;
    if (!r) return [];
    return [
      { label: 'Occupied', value: r.occupied || 0, color: '#3b82f6' },
      { label: 'Available', value: r.available || 0, color: '#22c55e' },
      { label: 'Dirty', value: r.dirty || 0, color: '#f59e0b' },
      { label: 'Reserved', value: r.reserved || 0, color: '#8b5cf6' },
      { label: 'OOO', value: (r.out_of_order || 0) + (r.maintenance || 0), color: '#ef4444' },
    ].filter(d => d.value > 0);
  });

  ngOnInit(): void {
    const user = this.auth.currentUser;
    if (user?.property_id) this.propertyId = user.property_id;
    this.loadAll();
  }

  loadAll(): void {
    if (!this.propertyId) { this.loading.set(false); return; }

    let loaded = 0;
    const done = () => { loaded++; if (loaded >= 4) this.loading.set(false); };

    this.api.get('/dashboard/overview', { property_id: this.propertyId }).subscribe({ next: r => { if (r.success) this.overview.set(r.data); done(); }, error: done });

    this.api.get('/dashboard/occupancy-trends', { property_id: this.propertyId, days: 30 }).subscribe({ next: r => { if (r.success) this.trends.set(r.data ?? []); done(); }, error: done });

    this.api.get('/dashboard/revenue-breakdown', { property_id: this.propertyId, days: 30 }).subscribe({
      next: r => {
        if (r.success) {
          const colors: Record<string, string> = { overnight: '#3b82f6', short_rest_3hr: '#f59e0b', short_rest_6hr: '#f97316', walk_in: '#22c55e', corporate: '#8b5cf6', half_day: '#06b6d4' };
          this.revenueBreakdown.set((r.data ?? []).map((d: any) => ({
            label: d.booking_type, value: +d.revenue, color: colors[d.booking_type] || '#6b7280',
          })));
        }
        done();
      }, error: done
    });

    this.api.get('/dashboard/activity-feed', { property_id: this.propertyId, limit: 15 }).subscribe({ next: r => { if (r.success) this.activity.set(r.data ?? []); done(); }, error: done });
  }

  activityIcon(status: string): string {
    return { confirmed: '✅', checked_in: '📥', checked_out: '📤', cancelled: '❌', no_show: '🚫', pending: '⏳' }[status] ?? '📋';
  }
}

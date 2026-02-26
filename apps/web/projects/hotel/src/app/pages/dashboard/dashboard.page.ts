import { Component, inject, OnInit, signal, computed } from '@angular/core';
import { RouterLink } from '@angular/router';
import { DatePipe } from '@angular/common';
import { ApiService, PageHeaderComponent, StatsCardComponent, LoadingSpinnerComponent, TokenService, LODGIK_ICONS, ActivePropertyService} from '@lodgik/shared';
import { LucideAngularModule, LUCIDE_ICONS, LucideIconProvider } from 'lucide-angular';
import { LineChartComponent, BarChartComponent, DonutChartComponent, GaugeChartComponent, SparklineChartComponent, ChartDataPoint, ChartSeries } from '@lodgik/charts';
import { AuthService } from '@lodgik/shared';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [RouterLink, DatePipe, PageHeaderComponent, StatsCardComponent, LoadingSpinnerComponent, LineChartComponent, BarChartComponent, DonutChartComponent, GaugeChartComponent, SparklineChartComponent, LucideAngularModule],
  providers: [{ provide: LUCIDE_ICONS, multi: true, useValue: new LucideIconProvider(LODGIK_ICONS) }],
  template: `
    <div class="fade-in">
      <ui-page-header title="Dashboard" [subtitle]="greeting()">
        <div class="flex gap-2">
          <a routerLink="/bookings/new"
             class="px-4 py-2.5 bg-sage-600 text-white text-sm font-semibold rounded-lg hover:bg-sage-700 transition-colors shadow-sm">
            + New Booking
          </a>
        </div>
      </ui-page-header>

      <ui-loading [loading]="loading()"></ui-loading>

      @if (!loading()) {
        <!-- ═══ KPI Cards (Gradient) ═══ -->
        <div class="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6 stagger-children">
          <ui-stats-card
            label="Total Bookings"
            [value]="overview().total_bookings || '0'"
            icon="hotel"
            variant="gradient"
            gradient="linear-gradient(135deg, #293929 0%, #3a543a 50%, #5a825a 100%)"
            [trend]="10">
          </ui-stats-card>

          <ui-stats-card
            label="Check In"
            [value]="(overview().today_check_ins || 0) + ''"
            icon="door-open"
            variant="gradient"
            gradient="linear-gradient(135deg, #3a543a 0%, #5a825a 50%, #7a9e7a 100%)"
            [trend]="16">
            <p class="text-xs text-white/50 mt-1">+ {{ overview().pending_check_ins || 0 }} pending</p>
          </ui-stats-card>

          <ui-stats-card
            label="Check Out"
            [value]="(overview().today_check_outs || 0) + ''"
            icon="log-out"
            variant="gradient"
            gradient="linear-gradient(135deg, #5a825a 0%, #7a9e7a 50%, #a3bfa3 100%)">
          </ui-stats-card>

          <ui-stats-card
            label="Today Revenue"
            [value]="'₦' + (+overview().today_revenue || 0).toLocaleString()"
            icon="hand-coins"
            variant="gradient"
            gradient="linear-gradient(135deg, #466846 0%, #5a825a 100%)">
          </ui-stats-card>
        </div>

        <!-- ═══ Row 2: Occupancy Chart + Room Status ═══ -->
        <div class="grid grid-cols-1 lg:grid-cols-3 gap-5 mb-6">
          <!-- Occupancy Trend -->
          <div class="lg:col-span-2 bg-white rounded-xl border border-gray-100 p-5 shadow-card">
            <div class="flex items-center justify-between mb-4">
              <h3 class="text-base font-bold text-gray-900 font-heading">Occupancy</h3>
              <div class="flex items-center gap-4 text-xs text-gray-500">
                <span class="flex items-center gap-1.5"><span class="w-2.5 h-2.5 rounded-full bg-sage-500"></span> Available</span>
                <span class="flex items-center gap-1.5"><span class="w-2.5 h-2.5 rounded-full bg-sage-800"></span> Occupied</span>
                <span class="flex items-center gap-1.5"><span class="w-2.5 h-2.5 rounded-full bg-gray-300"></span> Not Ready</span>
              </div>
            </div>
            @if (trendSeries().length > 0) {
              <chart-line [series]="trendSeries()" [labels]="trendLabels()" [width]="700" [height]="260" [showArea]="true"></chart-line>
            } @else {
              <div class="flex flex-col items-center justify-center py-16 text-gray-400">
                <span class="text-3xl mb-2">📈</span>
                <p class="text-sm">No trend data yet</p>
              </div>
            }
          </div>

          <!-- Room Status Donut -->
          <div class="bg-white rounded-xl border border-gray-100 p-5 shadow-card">
            <h3 class="text-base font-bold text-gray-900 font-heading mb-3">Room Status</h3>
            <chart-donut [data]="roomStatusData()" [height]="200" [centerValue]="String(overview().rooms?.total || 0)" centerLabel="Total"></chart-donut>
            <div class="mt-4 grid grid-cols-2 gap-2">
              @for (s of roomStatusData(); track s.label) {
                <div class="flex items-center gap-2 text-xs">
                  <span class="w-2 h-2 rounded-full shrink-0" [style.background]="s.color"></span>
                  <span class="text-gray-500">{{ s.label }}</span>
                  <span class="ml-auto font-semibold text-gray-700">{{ s.value }}</span>
                </div>
              }
            </div>
          </div>
        </div>

        <!-- ═══ Row 3: Revenue + Recent Arrivals ═══ -->
        <div class="grid grid-cols-1 lg:grid-cols-2 gap-5 mb-6">
          <!-- Revenue Overview -->
          <div class="bg-white rounded-xl border border-gray-100 p-5 shadow-card">
            <div class="flex items-center justify-between mb-4">
              <div>
                <h3 class="text-base font-bold text-gray-900 font-heading">Revenue Overview</h3>
                <p class="text-sm text-gray-400 mt-0.5">Total Revenue</p>
                <p class="text-2xl font-bold text-gray-900 font-heading mt-1">₦{{ totalRevenue().toLocaleString() }}</p>
              </div>
            </div>
            @if (revenueBreakdown().length > 0) {
              <chart-bar [data]="revenueBreakdown()" [width]="400" [height]="180" [showValues]="true"></chart-bar>
            }

            <!-- ADR / RevPAR -->
            <div class="grid grid-cols-2 gap-4 mt-4 pt-4 border-t border-gray-100">
              <div class="flex items-center gap-3">
                <span class="w-9 h-9 rounded-lg bg-sage-50 flex items-center justify-center text-sm">🏷️</span>
                <div>
                  <p class="text-xs text-gray-400">ADR</p>
                  <p class="text-sm font-bold text-gray-900">₦{{ (+overview().adr || 0).toLocaleString() }}</p>
                </div>
              </div>
              <div class="flex items-center gap-3">
                <span class="w-9 h-9 rounded-lg bg-sage-50 flex items-center justify-center text-sm">📊</span>
                <div>
                  <p class="text-xs text-gray-400">RevPAR</p>
                  <p class="text-sm font-bold text-gray-900">₦{{ (+overview().revpar || 0).toLocaleString() }}</p>
                </div>
              </div>
            </div>
          </div>

          <!-- Recent Arrivals -->
          <div class="bg-white rounded-xl border border-gray-100 p-5 shadow-card">
            <div class="flex items-center justify-between mb-4">
              <h3 class="text-base font-bold text-gray-900 font-heading">Recent Activity</h3>
              <a routerLink="/bookings" class="text-sm font-medium text-sage-600 hover:text-sage-700">View All</a>
            </div>
            <div class="space-y-1">
              @for (a of activity(); track $index) {
                <div class="flex items-center gap-3 py-2.5 px-3 rounded-lg hover:bg-gray-50 transition-colors">
                  <span class="w-8 h-8 rounded-full flex items-center justify-center shrink-0"
                        [class]="activityBg(a.new_status)">
                    <lucide-icon [name]="activityIcon(a.new_status)" [size]="15" [strokeWidth]="2"></lucide-icon>
                  </span>
                  <div class="min-w-0 flex-1">
                    <p class="text-sm font-medium text-gray-800">{{ a.booking_ref }}</p>
                    <p class="text-xs text-gray-400">{{ a.action_label }}</p>
                  </div>
                  <span class="text-xs text-gray-400 shrink-0">{{ a.timestamp | date:'shortTime' }}</span>
                </div>
              }
              @if (activity().length === 0) {
                <div class="flex flex-col items-center py-8 text-gray-400">
                  <lucide-icon name="clipboard-list" [size]="32" [strokeWidth]="1.5" class="text-gray-300 mb-2"></lucide-icon>
                  <p class="text-sm">No recent activity</p>
                </div>
              }
            </div>
          </div>
        </div>

        <!-- ═══ Quick Actions ═══ -->
        <div class="bg-white rounded-xl border border-gray-100 p-5 shadow-card">
          <h3 class="text-base font-bold text-gray-900 font-heading mb-4">Quick Actions</h3>
          <div class="grid grid-cols-2 sm:grid-cols-4 gap-3">
            @for (qa of quickActions; track qa.route) {
              <a [routerLink]="qa.route"
                 class="flex items-center gap-3 p-3.5 rounded-xl border border-gray-100 hover:border-sage-200 hover:bg-sage-50 transition-all group">
                <span class="w-10 h-10 rounded-lg flex items-center justify-center text-xl group-hover:scale-110 transition-transform"
                      [class]="qa.bgClass"><lucide-icon [name]="qa.icon" [size]="20" [strokeWidth]="1.75"></lucide-icon></span>
                <div>
                  <p class="text-sm font-semibold text-gray-800">{{ qa.label }}</p>
                  <p class="text-xs text-gray-400">{{ qa.sub }}</p>
                </div>
              </a>
            }
          </div>
        </div>
      }
    </div>
  `,
})
export class DashboardPage implements OnInit {
  private api = inject(ApiService);
  private auth = inject(AuthService);
  private activeProperty = inject(ActivePropertyService);
  protected user = inject(TokenService).user;
  protected String = String;

  loading = signal(true);
  overview = signal<any>({});
  trends = signal<any[]>([]);
  revenueBreakdown = signal<ChartDataPoint[]>([]);
  activity = signal<any[]>([]);
  propertyId = '';

  greeting = computed(() => {
    const name = this.user()?.first_name || '';
    const hour = new Date().getHours();
    const period = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';
    return `${period}, ${name}`;
  });

  totalRevenue = computed(() => {
    return this.revenueBreakdown().reduce((sum, d) => sum + d.value, 0);
  });

  trendLabels = computed(() => this.trends().map((t: any) => t.date.slice(5)));
  trendSeries = computed((): ChartSeries[] => {
    const data = this.trends();
    if (data.length === 0) return [];
    return [
      { name: 'Occupancy %', data: data.map((t: any) => t.occupancy_rate), color: '#3a543a' },
      { name: 'Rooms Sold', data: data.map((t: any) => t.rooms_sold), color: '#7a9e7a' },
    ];
  });

  roomStatusData = computed((): ChartDataPoint[] => {
    const r = this.overview().rooms;
    if (!r) return [];
    return [
      { label: 'Occupied', value: r.occupied || 0, color: '#3a543a' },
      { label: 'Available', value: r.available || 0, color: '#7a9e7a' },
      { label: 'Dirty', value: r.dirty || 0, color: '#d97706' },
      { label: 'Reserved', value: r.reserved || 0, color: '#6366f1' },
      { label: 'OOO', value: (r.out_of_order || 0) + (r.maintenance || 0), color: '#ef4444' },
    ].filter(d => d.value > 0);
  });

  quickActions = [
    { label: 'New Booking', sub: 'Create reservation', icon: 'clipboard-list', route: '/bookings/new', bgClass: 'bg-sage-50' },
    { label: 'Room Status', sub: 'View room grid', icon: 'hotel', route: '/rooms', bgClass: 'bg-emerald-50' },
    { label: 'Add Guest', sub: 'Register new guest', icon: 'user-round', route: '/guests', bgClass: 'bg-blue-50' },
    { label: 'Housekeeping', sub: 'Manage tasks', icon: 'spray-can', route: '/housekeeping', bgClass: 'bg-amber-50' },
  ];

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
          const colors: Record<string, string> = { overnight: '#3a543a', short_rest_3hr: '#d97706', short_rest_6hr: '#b45309', walk_in: '#7a9e7a', corporate: '#6366f1', half_day: '#0891b2' };
          this.revenueBreakdown.set((r.data ?? []).map((d: any) => ({
            label: d.booking_type, value: +d.revenue, color: colors[d.booking_type] || '#6b7280',
          })));
        }
        done();
      }, error: done
    });

    this.api.get('/dashboard/activity-feed', { property_id: this.propertyId, limit: 10 }).subscribe({ next: r => { if (r.success) this.activity.set(r.data ?? []); done(); }, error: done });
  }

  activityIcon(status: string): string {
    return { confirmed: 'circle-check', checked_in: 'door-open', checked_out: 'log-out', cancelled: 'circle-x', no_show: 'circle-x', pending: 'clock' }[status] ?? 'clipboard-list';
  }

  activityBg(status: string): string {
    const map: Record<string, string> = {
      confirmed: 'bg-emerald-50',
      checked_in: 'bg-blue-50',
      checked_out: 'bg-orange-50',
      cancelled: 'bg-red-50',
      no_show: 'bg-gray-100',
      pending: 'bg-amber-50',
    };
    return map[status] ?? 'bg-gray-50';
  }
}

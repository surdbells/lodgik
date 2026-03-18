import { Component, inject, OnInit, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { ApiService, StatsCardComponent, PageHeaderComponent } from '@lodgik/shared';
import { LineChartComponent, DonutChartComponent, BarChartComponent, SparklineChartComponent, ChartSeries, ChartDataPoint } from '@lodgik/charts';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [RouterLink, StatsCardComponent, PageHeaderComponent, LineChartComponent, DonutChartComponent, BarChartComponent, SparklineChartComponent],
  template: `
    <ui-page-header title="Platform Dashboard" subtitle="Overview of your SaaS platform" icon="layout-dashboard"></ui-page-header>

    @if (loading()) {
      <div class="flex items-center justify-center py-12">
        <div class="animate-spin rounded-full border-2 border-gray-300 border-t-sage-600 w-7 h-7"></div>
      </div>
    } @else {
      <!-- Pending Actions -->
      @if (pendingHotels() > 0) {
        <a routerLink="/hotel-approvals" class="flex items-center gap-3 px-4 py-3 mb-4 bg-amber-50 border border-amber-200 rounded-xl hover:bg-amber-100 transition-colors">
          <span class="w-8 h-8 rounded-full bg-amber-100 flex items-center justify-center text-amber-600 text-sm font-bold">{{ pendingHotels() }}</span>
          <div>
            <p class="text-sm font-medium text-amber-800">Hotel{{ pendingHotels() > 1 ? 's' : '' }} awaiting approval</p>
            <p class="text-xs text-amber-600">Merchants have submitted hotels for provisioning</p>
          </div>
          <span class="ml-auto text-amber-400 text-xs">Review →</span>
        </a>
      }
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
        <ui-stats-card label="Merchants" [value]="(stats().active_merchants || 0) + ' / ' + (stats().total_merchants || 0)" icon="handshake">
        </ui-stats-card>
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

      <!-- ── System Health ── -->
      <div class="mt-8">
        <div class="flex items-center justify-between mb-4">
          <h2 class="text-base font-bold text-gray-800">System Health</h2>
          <button (click)="loadHealth()" [disabled]="healthLoading()"
            class="px-3 py-1.5 text-xs border border-gray-200 rounded-lg hover:bg-gray-50 disabled:opacity-50 flex items-center gap-1.5">
            <span [class.animate-spin]="healthLoading()">↺</span> Refresh
          </button>
        </div>
        @if (!health() && !healthLoading()) {
          <button (click)="loadHealth()" class="w-full py-6 border border-dashed border-gray-200 rounded-xl text-sm text-gray-400 hover:bg-gray-50">
            Click to load system status
          </button>
        }
        @if (healthLoading() && !health()) {
          <div class="text-center py-8 text-gray-400 text-sm">Checking all services…</div>
        }
        @if (health()) {
          <div class="flex items-center gap-3 px-4 py-3 rounded-xl border mb-4"
               [class]="health().status==='ok'?'bg-emerald-50 border-emerald-200':health().status==='degraded'?'bg-amber-50 border-amber-200':'bg-red-50 border-red-300'">
            <span class="text-lg">{{ health().status==='ok'?'✅':health().status==='degraded'?'⚠️':'❌' }}</span>
            <div>
              <p class="text-sm font-bold" [class]="health().status==='ok'?'text-emerald-800':'text-amber-800'">
                Lodgik API {{ health().checks.api?.version }} · {{ health().status.toUpperCase() }} · Uptime {{ health().uptime }}
              </p>
              <p class="text-xs text-gray-500 mt-0.5">PHP {{ health().checks.system?.php_version }} · Redis {{ health().checks.redis?.version }} · {{ fmtTime(health().timestamp) }}</p>
            </div>
          </div>

          <!-- Services -->
          <div class="grid grid-cols-2 lg:grid-cols-3 gap-3 mb-4">
            @for (svc of serviceEntries(); track svc.key) {
              <div class="bg-white rounded-xl border shadow-card p-3" [class]="svc.data.status!=='ok'&&svc.data.status!=='not_configured'?'border-amber-200':'border-gray-100'">
                <div class="flex justify-between items-start mb-1">
                  <p class="text-xs font-bold text-gray-800">{{ serviceLabel(svc.key) }}</p>
                  <span class="text-[10px] font-bold px-1.5 py-0.5 rounded-full" [class]="hsc(svc.data.status)">{{ hsi(svc.data.status) }} {{ tc(svc.data.status) }}</span>
                </div>
                <div class="text-[11px] text-gray-500 space-y-0.5">
                  @if (svc.data.latency_ms) { <div>{{ svc.data.latency_ms }}ms</div> }
                  @if (svc.data.balance)    { <div class="text-emerald-700">{{ svc.data.balance }}</div> }
                  @if (svc.data.from_address) { <div class="truncate">{{ svc.data.from_address }}</div> }
                  @if (svc.data.message)    { <div class="text-amber-600">{{ svc.data.message }}</div> }
                </div>
              </div>
            }
          </div>

          <!-- Infrastructure + Cron side by side -->
          <div class="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <!-- Infra -->
            <div class="bg-white rounded-xl border border-gray-100 shadow-card p-4">
              <p class="text-xs font-bold text-gray-500 uppercase tracking-wider mb-3">Infrastructure</p>
              <div class="space-y-3">
                @if (health().checks.database) {
                  <div class="flex justify-between items-center text-xs">
                    <div class="flex items-center gap-2"><span class="w-2 h-2 rounded-full" [class]="hsd(health().checks.database.status)"></span><span class="font-medium">PostgreSQL</span></div>
                    <span class="text-gray-500">{{ health().checks.database.latency_ms }}ms · {{ health().checks.database.database }}</span>
                  </div>
                }
                @if (health().checks.redis) {
                  <div class="flex justify-between items-center text-xs">
                    <div class="flex items-center gap-2"><span class="w-2 h-2 rounded-full" [class]="hsd(health().checks.redis.status)"></span><span class="font-medium">Redis</span></div>
                    <span class="text-gray-500">{{ health().checks.redis.latency_ms }}ms · {{ health().checks.redis.memory }}</span>
                  </div>
                }
                @if (health().checks.storage) {
                  <div>
                    <div class="flex justify-between text-xs mb-1">
                      <div class="flex items-center gap-2"><span class="w-2 h-2 rounded-full" [class]="hsd(health().checks.storage.status)"></span><span class="font-medium">Disk</span></div>
                      <span class="text-gray-500">{{ health().checks.storage.used_pct }}% · {{ health().checks.storage.free_gb }}GB free</span>
                    </div>
                    <div class="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                      <div class="h-full rounded-full" [style.width.%]="health().checks.storage.used_pct" [class]="(health().checks.storage.used_pct||0)>80?'bg-red-400':'bg-emerald-400'"></div>
                    </div>
                  </div>
                }
              </div>
            </div>
            <!-- Cron -->
            <div class="bg-white rounded-xl border border-gray-100 shadow-card p-4">
              <p class="text-xs font-bold text-gray-500 uppercase tracking-wider mb-3">Scheduled Jobs</p>
              <div class="space-y-2">
                @for (job of cronEntries(); track job.key) {
                  <div class="flex justify-between items-center text-xs">
                    <span class="text-gray-700 truncate max-w-48">{{ job.data.name }}</span>
                    <div class="flex items-center gap-2 flex-shrink-0">
                      <span class="text-gray-400 font-mono hidden sm:inline">{{ job.data.schedule }}</span>
                      <span class="px-1.5 py-0.5 rounded text-[10px] font-bold" [class]="hsc(job.data.status)">{{ hsi(job.data.status) }}</span>
                    </div>
                  </div>
                }
              </div>
            </div>
          </div>
        }
      </div>

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
  pendingHotels = signal(0);

  ngOnInit(): void {
    // Load pending hotels count
    this.api.get('/admin/merchants/hotels/pending').subscribe({
      next: (r: any) => {
        const hotels = r?.data || [];
        this.pendingHotels.set(hotels.filter((h: any) => h.onboarding_status === 'pending').length);
      },
    });

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

  health        = signal<any>(null);
  healthLoading = signal(false);
  serviceEntries = () => {
    const checks = this.health()?.checks ?? {};
    return ['email','sms','whatsapp','paystack','fcm','apns']
      .map(k => ({ key: k, data: checks[k] ?? { status: 'unknown' } }));
  };
  cronEntries = () => Object.entries(this.health()?.checks?.cron ?? {}).map(([k,v]) => ({ key: k, data: v as any }));
  serviceLabel(k: string): string { return ({email:'Email',sms:'SMS',whatsapp:'WhatsApp',paystack:'Paystack Billing',fcm:'Firebase Push',apns:'Apple Push (APNs)'})[k as keyof object] ?? k; }
  hsc(s: string): string { return s==='ok'?'bg-emerald-100 text-emerald-700 border border-emerald-200':s==='warning'||s==='degraded'?'bg-amber-100 text-amber-700 border border-amber-200':s==='not_configured'?'bg-gray-100 text-gray-500 border border-gray-200':'bg-red-100 text-red-700 border border-red-200'; }
  hsd(s: string): string { return s==='ok'?'bg-emerald-500':s==='warning'||s==='degraded'?'bg-amber-400':s==='not_configured'?'bg-gray-300':'bg-red-500'; }
  hsi(s: string): string { return s==='ok'?'✓':s==='warning'||s==='degraded'?'⚠':s==='not_configured'?'—':'✗'; }
  tc(s: string): string { return s?s.charAt(0).toUpperCase()+s.slice(1).replace(/_/g,' '):''; }
  fd(dt: string): string { return dt?new Date(dt).toLocaleString('en-NG',{day:'numeric',month:'short',hour:'2-digit',minute:'2-digit',hour12:true}):'—'; }
  fmtTime(dt: string): string { return dt?new Date(dt).toLocaleTimeString('en-NG',{hour:'2-digit',minute:'2-digit',second:'2-digit'}):''; }
  loadHealth(): void {
    this.healthLoading.set(true);
    this.api.get('/health/detailed').subscribe(r => { if (r.success) this.health.set(r.data); this.healthLoading.set(false); });
  }
}

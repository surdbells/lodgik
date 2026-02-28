import { Component, inject, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ApiService, PageHeaderComponent, LoadingSpinnerComponent, StatsCardComponent } from '@lodgik/shared';
import { LineChartComponent, BarChartComponent, DonutChartComponent, ChartDataPoint, ChartSeries } from '@lodgik/charts';

@Component({
  selector: 'app-analytics',
  standalone: true,
  imports: [FormsModule, PageHeaderComponent, LoadingSpinnerComponent, StatsCardComponent, LineChartComponent, BarChartComponent, DonutChartComponent],
  template: `
    <ui-page-header title="Analytics & BI" icon="chart-bar" subtitle="Revenue, occupancy, and performance insights">
      <select [(ngModel)]="period" (ngModelChange)="reload()" class="border rounded-lg px-3 py-2 text-sm">
        <option value="7">Last 7 days</option>
        <option value="30">Last 30 days</option>
        <option value="90">Last 90 days</option>
      </select>
    </ui-page-header>

    <ui-loading [loading]="loading()"></ui-loading>

    @if (!loading()) {
      <!-- KPI Row -->
      <div class="grid grid-cols-2 lg:grid-cols-6 gap-3 mb-6">
        <ui-stats-card label="Total Revenue" [value]="'₦' + (revenue().total / 100).toLocaleString()" icon="banknote"></ui-stats-card>
        <ui-stats-card label="Room Revenue" [value]="'₦' + (revenue().room / 100).toLocaleString()" icon="bed-double"></ui-stats-card>
        <ui-stats-card label="F&B Revenue" [value]="'₦' + (revenue().fnb / 100).toLocaleString()" icon="utensils"></ui-stats-card>
        <ui-stats-card label="Net Profit" [value]="'₦' + (pnl().net_profit / 100).toLocaleString()" icon="trending-up"></ui-stats-card>
        <ui-stats-card label="RevPAR" [value]="revparValue()" icon="chart-line"></ui-stats-card>
        <ui-stats-card label="Avg Occupancy" [value]="avgOccupancy() + '%'" icon="percent"></ui-stats-card>
      </div>

      <!-- Tabs -->
      <div class="flex gap-1 mb-5 bg-gray-100 p-1 rounded-xl w-fit">
        @for (tab of tabs; track tab) {
          <button (click)="activeTab.set(tab)"
            class="px-4 py-1.5 rounded-lg text-sm font-medium transition-all"
            [class.bg-white]="activeTab() === tab" [class.shadow-sm]="activeTab() === tab"
            [class.text-sage-700]="activeTab() === tab" [class.font-semibold]="activeTab() === tab"
            [class.text-gray-500]="activeTab() !== tab">
            {{ tab }}
          </button>
        }
      </div>

      <!-- Revenue Tab -->
      @if (activeTab() === 'Revenue') {
        <div class="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
          <div class="bg-white rounded-xl border border-gray-100 shadow-card p-5">
            <h3 class="text-sm font-semibold text-gray-700 mb-4">Monthly Revenue Trend</h3>
            @if (monthlySeries().length) {
              <chart-line [series]="monthlySeries()" [labels]="monthlyLabels()" [height]="250" [showArea]="true"></chart-line>
            } @else { <p class="text-gray-400 text-sm py-12 text-center">No data yet</p> }
          </div>
          <div class="bg-white rounded-xl border border-gray-100 shadow-card p-5">
            <h3 class="text-sm font-semibold text-gray-700 mb-4">Revenue Breakdown</h3>
            @if (revenueDonut().length) {
              <chart-donut [data]="revenueDonut()" [height]="250"></chart-donut>
            } @else { <p class="text-gray-400 text-sm py-12 text-center">No data yet</p> }
          </div>
        </div>
        <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div class="bg-white rounded-xl border border-gray-100 shadow-card p-5">
            <h3 class="text-sm font-semibold text-gray-700 mb-4">ADR by Day of Week</h3>
            @if (adrData().length) { <chart-bar [data]="adrData()" [height]="220" [showValues]="true"></chart-bar> }
            @else { <p class="text-gray-400 text-sm py-8 text-center">No data</p> }
          </div>
          <div class="bg-white rounded-xl border border-gray-100 shadow-card p-5">
            <h3 class="text-sm font-semibold text-gray-700 mb-4">Top Rooms by Revenue</h3>
            <div class="space-y-2">
              @for (r of topRooms(); track r.room_number) {
                <div class="flex items-center justify-between py-2 border-b border-gray-50 text-sm">
                  <span class="font-medium">Room {{ r.room_number }}</span>
                  <span class="text-gray-500">{{ r.bookings }} bookings · ₦{{ ((+r.revenue || 0) / 100).toLocaleString() }}</span>
                </div>
              }
              @if (topRooms().length === 0) { <p class="text-gray-400 text-sm py-8 text-center">No data</p> }
            </div>
          </div>
        </div>
      }

      <!-- Occupancy Tab -->
      @if (activeTab() === 'Occupancy') {
        <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div class="bg-white rounded-xl border border-gray-100 shadow-card p-5">
            <h3 class="text-sm font-semibold text-gray-700 mb-4">Occupancy Trend</h3>
            @if (occupancySeries().length) {
              <chart-line [series]="occupancySeries()" [labels]="occupancyLabels()" [height]="250" [showArea]="true"></chart-line>
            } @else { <p class="text-gray-400 text-sm py-12 text-center">No occupancy data</p> }
          </div>
          <div class="bg-white rounded-xl border border-gray-100 shadow-card p-5">
            <h3 class="text-sm font-semibold text-gray-700 mb-4">RevPAR Trend</h3>
            @if (revparSeries().length) {
              <chart-line [series]="revparSeries()" [labels]="revparLabels()" [height]="250" [showArea]="true"></chart-line>
            } @else { <p class="text-gray-400 text-sm py-12 text-center">No RevPAR data</p> }
          </div>
        </div>
      }

      <!-- Booking Sources Tab -->
      @if (activeTab() === 'Booking Sources') {
        <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div class="bg-white rounded-xl border border-gray-100 shadow-card p-5">
            <h3 class="text-sm font-semibold text-gray-700 mb-4">Bookings by Channel</h3>
            @if (sourcesDonut().length) {
              <chart-donut [data]="sourcesDonut()" [height]="280"></chart-donut>
            } @else { <p class="text-gray-400 text-sm py-12 text-center">No data</p> }
          </div>
          <div class="bg-white rounded-xl border border-gray-100 shadow-card p-5">
            <h3 class="text-sm font-semibold text-gray-700 mb-4">Source Breakdown</h3>
            <div class="space-y-3">
              @for (s of bookingSources(); track s.source) {
                <div class="flex items-center gap-3">
                  <div class="flex-1">
                    <div class="flex justify-between text-sm mb-1">
                      <span class="font-medium capitalize">{{ s.source || 'Direct' }}</span>
                      <span class="text-gray-500">{{ s.bookings }} · {{ s.percentage }}%</span>
                    </div>
                    <div class="h-2 bg-gray-100 rounded-full overflow-hidden">
                      <div class="h-full bg-sage-500 rounded-full" [style.width]="s.percentage + '%'"></div>
                    </div>
                  </div>
                </div>
              }
              @if (bookingSources().length === 0) { <p class="text-gray-400 text-sm py-8 text-center">No source data</p> }
            </div>
          </div>
        </div>
      }

      <!-- Demographics Tab -->
      @if (activeTab() === 'Demographics') {
        <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div class="bg-white rounded-xl border border-gray-100 shadow-card p-5">
            <h3 class="text-sm font-semibold text-gray-700 mb-4">Guests by Nationality</h3>
            @if (nationDonut().length) {
              <chart-donut [data]="nationDonut()" [height]="280"></chart-donut>
            } @else { <p class="text-gray-400 text-sm py-12 text-center">No data</p> }
          </div>
          <div class="bg-white rounded-xl border border-gray-100 shadow-card p-5">
            <h3 class="text-sm font-semibold text-gray-700 mb-4">Age Distribution</h3>
            @if (ageData().length) {
              <chart-bar [data]="ageData()" [height]="250" [showValues]="true"></chart-bar>
            } @else { <p class="text-gray-400 text-sm py-8 text-center">No data</p> }
          </div>
        </div>
      }

      <!-- P&L Tab -->
      @if (activeTab() === 'P&L') {
        <div class="bg-white rounded-xl border border-gray-100 shadow-card p-6">
          <h3 class="text-sm font-semibold text-gray-700 mb-4">Profit & Loss Summary</h3>
          <div class="space-y-3 max-w-lg">
            <div class="flex justify-between py-2 border-b text-sm"><span class="text-gray-500">Total Revenue</span><span class="font-semibold text-emerald-700">₦{{ (pnl().total_revenue / 100).toLocaleString() }}</span></div>
            <div class="flex justify-between py-2 border-b text-sm"><span class="text-gray-500">Total Expenses</span><span class="font-semibold text-red-600">₦{{ (pnl().total_expenses / 100).toLocaleString() }}</span></div>
            <div class="flex justify-between py-2 border-b text-sm"><span class="text-gray-500">Gross Profit</span><span class="font-semibold">₦{{ (pnl().gross_profit / 100).toLocaleString() }}</span></div>
            <div class="flex justify-between py-3 text-base font-bold" [class.text-emerald-700]="pnl().net_profit > 0" [class.text-red-600]="pnl().net_profit < 0">
              <span>Net Profit</span><span>₦{{ (pnl().net_profit / 100).toLocaleString() }}</span>
            </div>
          </div>
        </div>
      }
    }
  `,
})
export default class AnalyticsPage implements OnInit {
  private api = inject(ApiService);
  loading = signal(true);
  activeTab = signal('Revenue');
  period = '30';
  tabs = ['Revenue', 'Occupancy', 'Booking Sources', 'Demographics', 'P&L'];

  revenue = signal<any>({ total: 0, room: 0, fnb: 0, other: 0 });
  pnl = signal<any>({ net_profit: 0, total_revenue: 0, total_expenses: 0, gross_profit: 0 });
  topRooms = signal<any[]>([]);
  bookingSources = signal<any[]>([]);
  demographics = signal<any>({});

  monthlySeries = signal<ChartSeries[]>([]);
  monthlyLabels = signal<string[]>([]);
  revenueDonut = signal<ChartDataPoint[]>([]);
  adrData = signal<ChartDataPoint[]>([]);
  occupancySeries = signal<ChartSeries[]>([]);
  occupancyLabels = signal<string[]>([]);
  revparSeries = signal<ChartSeries[]>([]);
  revparLabels = signal<string[]>([]);
  sourcesDonut = signal<ChartDataPoint[]>([]);
  nationDonut = signal<ChartDataPoint[]>([]);
  ageData = signal<ChartDataPoint[]>([]);

  revparValue(): string {
    const d = this.revparSeries()[0]?.data;
    if (!d?.length) return '—';
    const avg = d.reduce((a: number, b: number) => a + b, 0) / d.length;
    return '₦' + avg.toLocaleString(undefined, { maximumFractionDigits: 0 });
  }

  avgOccupancy(): string {
    const d = this.occupancySeries()[0]?.data;
    if (!d?.length) return '0';
    const avg = d.reduce((a: number, b: number) => a + b, 0) / d.length;
    return avg.toFixed(1);
  }

  ngOnInit() { this.reload(); }

  reload() {
    this.loading.set(true);
    let pending = 8;
    const done = () => { if (--pending === 0) this.loading.set(false); };

    const params = { days: this.period };

    this.api.get('/analytics/revenue', params).subscribe((r: any) => {
      this.revenue.set(r?.data || {}); this.buildDonut(); done();
    });
    this.api.get('/analytics/profit-loss', params).subscribe((r: any) => { this.pnl.set(r?.data || {}); done(); });
    this.api.get('/analytics/top-rooms', params).subscribe((r: any) => { this.topRooms.set(r?.data || []); done(); });
    this.api.get('/analytics/monthly-summary', params).subscribe((r: any) => { this.buildMonthly(r?.data || []); done(); });
    this.api.get('/analytics/adr-by-day', params).subscribe((r: any) => {
      this.adrData.set((r?.data || []).map((d: any) => ({ label: d.day, value: +(d.avg_adr || 0) / 100 }))); done();
    });
    this.api.get('/analytics/occupancy', params).subscribe((r: any) => { this.buildOccupancy(r?.data || []); done(); });
    this.api.get('/analytics/revpar', params).subscribe((r: any) => { this.buildRevpar(r?.data || []); done(); });
    this.api.get('/analytics/booking-sources', params).subscribe((r: any) => {
      this.bookingSources.set(r?.data || []); this.buildSources(r?.data || []); done();
    });
    this.api.get('/analytics/demographics', params).subscribe((r: any) => {
      this.demographics.set(r?.data || {}); this.buildDemographics(r?.data || {}); done();
    });
    pending = 9; // correct count after adding demographics
  }

  buildDonut() {
    const r = this.revenue();
    this.revenueDonut.set([
      { label: 'Room', value: r.room / 100, color: '#3b82f6' },
      { label: 'F&B', value: r.fnb / 100, color: '#10b981' },
      { label: 'Other', value: r.other / 100, color: '#f59e0b' },
    ]);
  }

  buildMonthly(data: any[]) {
    this.monthlyLabels.set(data.map(d => d.month));
    this.monthlySeries.set([{ name: 'Revenue', data: data.map(d => d.revenue / 100), color: '#3b82f6' }]);
  }

  buildOccupancy(data: any[]) {
    this.occupancyLabels.set(data.map(d => d.date || d.period || ''));
    this.occupancySeries.set([{ name: 'Occupancy %', data: data.map(d => +(d.occupancy_rate || 0)), color: '#10b981' }]);
  }

  buildRevpar(data: any[]) {
    this.revparLabels.set(data.map(d => d.date || d.period || ''));
    this.revparSeries.set([{ name: 'RevPAR (₦)', data: data.map(d => +(d.revpar || 0) / 100), color: '#8b5cf6' }]);
  }

  buildSources(data: any[]) {
    const colors = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4'];
    this.sourcesDonut.set(data.map((s: any, i: number) => ({
      label: s.source || 'Direct',
      value: s.bookings,
      color: colors[i % colors.length],
    })));
  }

  buildDemographics(data: any) {
    const nat = data.nationalities || [];
    const colors = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6'];
    this.nationDonut.set(nat.slice(0, 5).map((n: any, i: number) => ({
      label: n.nationality || 'Unknown',
      value: n.count,
      color: colors[i],
    })));
    const ages = data.age_groups || [];
    this.ageData.set(ages.map((a: any) => ({ label: a.group, value: a.count })));
  }
}

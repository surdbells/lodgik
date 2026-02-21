import { Component, inject, OnInit, signal } from '@angular/core';
import { ApiService, PageHeaderComponent, LoadingSpinnerComponent } from '@lodgik/shared';
import { LineChartComponent, BarChartComponent, DonutChartComponent, ChartDataPoint, ChartSeries } from '@lodgik/charts';
@Component({
  selector: 'app-analytics', standalone: true, imports: [PageHeaderComponent, LoadingSpinnerComponent, LineChartComponent, BarChartComponent, DonutChartComponent],
  template: `
    <ui-page-header title="Analytics & BI" subtitle="Revenue, occupancy, and performance insights"></ui-page-header>
    <ui-loading [loading]="loading()"></ui-loading>
    @if (!loading()) {
      <div class="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <div class="bg-white rounded-lg border p-4"><p class="text-xs text-gray-500">Total Revenue</p><p class="text-2xl font-bold text-green-600">₦{{(revenue().total / 100).toLocaleString()}}</p></div>
        <div class="bg-white rounded-lg border p-4"><p class="text-xs text-gray-500">Room Revenue</p><p class="text-2xl font-bold">₦{{(revenue().room / 100).toLocaleString()}}</p></div>
        <div class="bg-white rounded-lg border p-4"><p class="text-xs text-gray-500">F&B Revenue</p><p class="text-2xl font-bold">₦{{(revenue().fnb / 100).toLocaleString()}}</p></div>
        <div class="bg-white rounded-lg border p-4"><p class="text-xs text-gray-500">Net Profit</p><p class="text-2xl font-bold" [class.text-green-600]="pnl().net_profit > 0" [class.text-red-600]="pnl().net_profit < 0">₦{{(pnl().net_profit / 100).toLocaleString()}}</p></div>
      </div>
      <div class="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        <div class="bg-white rounded-lg border p-5"><h3 class="text-sm font-semibold text-gray-700 mb-3">Monthly Revenue Trend</h3>
          @if (monthlySeries().length) { <chart-line [series]="monthlySeries()" [labels]="monthlyLabels()" [width]="500" [height]="250" [showArea]="true"></chart-line> }
          @else { <p class="text-gray-400 text-sm py-12 text-center">No data</p> }
        </div>
        <div class="bg-white rounded-lg border p-5"><h3 class="text-sm font-semibold text-gray-700 mb-3">Revenue Breakdown</h3>
          @if (revenueDonut().length) { <chart-donut [data]="revenueDonut()" [height]="250"></chart-donut> }
          @else { <p class="text-gray-400 text-sm py-12 text-center">No data</p> }
        </div>
      </div>
      <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div class="bg-white rounded-lg border p-5"><h3 class="text-sm font-semibold text-gray-700 mb-3">ADR by Day of Week</h3>
          @if (adrData().length) { <chart-bar [data]="adrData()" [width]="500" [height]="220" [showValues]="true"></chart-bar> }
        </div>
        <div class="bg-white rounded-lg border p-5"><h3 class="text-sm font-semibold text-gray-700 mb-3">Top Rooms by Revenue</h3>
          <div class="space-y-2">@for (r of topRooms(); track r.roomNumber) {
            <div class="flex items-center justify-between py-1"><span class="font-medium">Room {{r.roomNumber}}</span><span class="text-sm text-gray-600">{{r.bookings}} bookings • ₦{{((+r.revenue || 0)/100).toLocaleString()}}</span></div>
          }</div>
        </div>
      </div>
    }
  `
})
export default class AnalyticsPage implements OnInit {
  private api = inject(ApiService); loading = signal(true);
  revenue = signal<any>({ total: 0, room: 0, fnb: 0, other: 0 }); pnl = signal<any>({ net_profit: 0 }); topRooms = signal<any[]>([]);
  monthlySeries = signal<ChartSeries[]>([]); monthlyLabels = signal<string[]>([]); revenueDonut = signal<ChartDataPoint[]>([]); adrData = signal<ChartDataPoint[]>([]);
  ngOnInit() {
    this.api.get('/analytics/revenue').subscribe((r: any) => { this.revenue.set(r?.data || {}); this.buildDonut(); this.loading.set(false); });
    this.api.get('/analytics/profit-loss').subscribe((r: any) => this.pnl.set(r?.data || {}));
    this.api.get('/analytics/top-rooms').subscribe((r: any) => this.topRooms.set(r?.data || []));
    this.api.get('/analytics/monthly-summary').subscribe((r: any) => this.buildMonthly(r?.data || []));
    this.api.get('/analytics/adr-by-day').subscribe((r: any) => this.adrData.set((r?.data || []).map((d: any) => ({ label: d.day, value: +(d.avg_adr || 0) / 100 }))));
  }
  buildDonut() { const r = this.revenue(); this.revenueDonut.set([{ label: 'Room', value: r.room / 100, color: '#3b82f6' }, { label: 'F&B', value: r.fnb / 100, color: '#10b981' }, { label: 'Other', value: r.other / 100, color: '#f59e0b' }]); }
  buildMonthly(data: any[]) { this.monthlyLabels.set(data.map(d => d.month)); this.monthlySeries.set([{ name: 'Revenue', data: data.map(d => d.revenue / 100), color: '#3b82f6' }]); }
}

import { Component, inject, OnInit, signal } from '@angular/core';
import { ApiService, PageHeaderComponent, StatsCardComponent, LoadingSpinnerComponent } from '@lodgik/shared';
import { BarChartComponent, ChartDataPoint } from '@lodgik/charts';

@Component({
  selector: 'app-usage',
  standalone: true,
  imports: [PageHeaderComponent, StatsCardComponent, LoadingSpinnerComponent, BarChartComponent],
  template: `
    <ui-page-header title="Usage Analytics" subtitle="Platform-wide usage overview"></ui-page-header>
    <ui-loading [loading]="loading()"></ui-loading>
    @if (!loading()) {
      <div class="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        <ui-stats-card label="Total Downloads" [value]="analytics().total_downloads" icon="📥"></ui-stats-card>
        <ui-stats-card label="Active Installations" [value]="analytics().active_installations" icon="📱"></ui-stats-card>
        <ui-stats-card label="App Types" [value]="analytics().latest_versions?.length || 0" icon="🖥️"></ui-stats-card>
      </div>
      <div class="bg-white rounded-lg border border-gray-200 p-5">
        <h3 class="text-sm font-semibold text-gray-700 mb-4">Downloads by Platform</h3>
        <chart-bar [data]="downloadsByType()" [height]="250" [showValues]="true"></chart-bar>
      </div>
    }
  `,
})
export class UsagePage implements OnInit {
  private api = inject(ApiService);
  loading = signal(true);
  analytics = signal<any>({});
  downloadsByType = signal<ChartDataPoint[]>([]);

  ngOnInit(): void {
    this.api.get('/admin/apps/analytics').subscribe({
      next: r => {
        if (r.success) {
          this.analytics.set(r.data);
          this.downloadsByType.set((r.data.by_app_type || []).map((d: any) => ({ label: d.app_type, value: d.downloads })));
        }
        this.loading.set(false);
      },
      error: () => this.loading.set(false),
    });
  }
}

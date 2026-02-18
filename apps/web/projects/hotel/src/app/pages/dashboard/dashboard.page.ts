import { Component, inject, OnInit, signal } from '@angular/core';
import { ApiService, PageHeaderComponent, StatsCardComponent, LoadingSpinnerComponent, TokenService } from '@lodgik/shared';
import { RouterLink } from '@angular/router';
import { SparklineChartComponent, GaugeChartComponent } from '@lodgik/charts';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [PageHeaderComponent, StatsCardComponent, LoadingSpinnerComponent, SparklineChartComponent, GaugeChartComponent, RouterLink],
  template: `
    <ui-page-header title="Dashboard" [subtitle]="'Welcome back, ' + (user()?.first_name || '')"></ui-page-header>
    <ui-loading [loading]="loading()"></ui-loading>

    @if (!loading()) {
      <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <ui-stats-card label="Staff Members" [value]="usage().staff?.used || 0" [subtitle]="'of ' + (usage().staff?.limit || 0)" icon="👥">
          <chart-sparkline [data]="[2,3,4,5,5]" color="#3b82f6" [width]="100" [height]="28"></chart-sparkline>
        </ui-stats-card>
        <ui-stats-card label="Properties" [value]="usage().properties?.used || 0" [subtitle]="'of ' + (usage().properties?.limit || 0)" icon="🏨"></ui-stats-card>
        <ui-stats-card label="Rooms" [value]="usage().rooms?.used || 0" [subtitle]="'of ' + (usage().rooms?.limit || 0)" icon="🛏️"></ui-stats-card>
        <ui-stats-card label="Plan" [value]="limits().plan?.name || 'None'" icon="💎"></ui-stats-card>
      </div>

      <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div class="bg-white rounded-lg border border-gray-200 p-5">
          <h3 class="text-sm font-semibold text-gray-700 mb-3">Room Usage</h3>
          <chart-gauge [value]="usage().rooms?.percent || 0" [max]="100" label="Capacity" suffix="%" [width]="220" [height]="140"></chart-gauge>
        </div>
        <div class="bg-white rounded-lg border border-gray-200 p-5">
          <h3 class="text-sm font-semibold text-gray-700 mb-3">Staff Usage</h3>
          <chart-gauge [value]="usage().staff?.percent || 0" [max]="100" label="Capacity" suffix="%" [width]="220" [height]="140"></chart-gauge>
        </div>
        <div class="bg-white rounded-lg border border-gray-200 p-5">
          <h3 class="text-sm font-semibold text-gray-700 mb-3">Quick Actions</h3>
          <div class="space-y-2">
            <a routerLink="/staff" class="block px-3 py-2 bg-gray-50 rounded-lg text-sm text-gray-700 hover:bg-gray-100">👥 Manage Staff</a>
            <a routerLink="/properties" class="block px-3 py-2 bg-gray-50 rounded-lg text-sm text-gray-700 hover:bg-gray-100">🏨 Properties</a>
            <a routerLink="/features" class="block px-3 py-2 bg-gray-50 rounded-lg text-sm text-gray-700 hover:bg-gray-100">🧩 Features</a>
            <a routerLink="/apps" class="block px-3 py-2 bg-gray-50 rounded-lg text-sm text-gray-700 hover:bg-gray-100">📱 Downloads</a>
          </div>
        </div>
      </div>
    }
  `,
})
export class DashboardPage implements OnInit {
  private api = inject(ApiService);
  protected user = inject(TokenService).user;
  loading = signal(true);
  usage = signal<any>({});
  limits = signal<any>({});

  ngOnInit(): void {
    this.api.get('/usage/current').subscribe({ next: r => { if (r.success) this.usage.set(r.data); this.loading.set(false); }, error: () => this.loading.set(false) });
    this.api.get('/usage/limits').subscribe(r => { if (r.success) this.limits.set(r.data); });
  }
}

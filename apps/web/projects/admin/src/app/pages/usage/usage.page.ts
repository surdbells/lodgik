import { Component, inject, OnInit, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { ApiService, PageHeaderComponent, StatsCardComponent, LoadingSpinnerComponent, ToastService } from '@lodgik/shared';
import { BarChartComponent, ChartDataPoint } from '@lodgik/charts';

@Component({
  selector: 'app-usage',
  standalone: true,
  imports: [PageHeaderComponent, StatsCardComponent, LoadingSpinnerComponent, BarChartComponent, DatePipe],
  template: `
    <ui-page-header title="Usage & Installations" icon="trending-up" [breadcrumbs]="['Overview', 'Usage']" subtitle="Platform-wide app downloads, installs, and usage snapshots">
      <button (click)="recordSnapshot()" [disabled]="snapshotting()"
        class="px-4 py-2 bg-sage-600 text-white text-sm font-medium rounded-lg hover:bg-sage-700 disabled:opacity-60 transition-colors">
        {{ snapshotting() ? 'Recording…' : '📸 Record Snapshot' }}
      </button>
    </ui-page-header>

    <ui-loading [loading]="loading()"></ui-loading>

    @if (!loading()) {
      <!-- Stats row -->
      <div class="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
        <ui-stats-card label="Total Downloads" [value]="analytics().total_downloads ?? 0" icon="download"></ui-stats-card>
        <ui-stats-card label="Active Installs" [value]="analytics().active_installations ?? 0" icon="smartphone"></ui-stats-card>
        <ui-stats-card label="App Types" [value]="analytics().latest_versions?.length ?? 0" icon="layers"></ui-stats-card>
        <ui-stats-card label="Unique Tenants" [value]="totalUniqueTenants()" icon="hotel"></ui-stats-card>
      </div>

      <!-- Tabs -->
      <div class="flex gap-1 mb-5 bg-gray-100 p-1 rounded-xl w-fit">
        @for (tab of tabs; track tab) {
          <button (click)="activeTab.set(tab)"
            class="px-5 py-2 rounded-lg text-sm font-medium transition-all"
            [class.bg-white]="activeTab() === tab" [class.shadow-sm]="activeTab() === tab"
            [class.text-sage-700]="activeTab() === tab" [class.font-semibold]="activeTab() === tab"
            [class.text-gray-500]="activeTab() !== tab">
            {{ tab }}
          </button>
        }
      </div>

      <!-- Downloads by platform -->
      @if (activeTab() === 'Downloads') {
        <div class="bg-white rounded-xl border border-gray-100 shadow-card p-5">
          <h3 class="text-sm font-semibold text-gray-700 mb-4">Downloads by Platform</h3>
          @if (downloadsByType().length > 0) {
            <chart-bar [data]="downloadsByType()" [height]="250" [showValues]="true"></chart-bar>
          } @else {
            <p class="text-sm text-gray-400 text-center py-8">No download data yet.</p>
          }
        </div>
      }

      <!-- Installations -->
      @if (activeTab() === 'Installations') {
        <div class="bg-white rounded-xl border border-gray-100 shadow-card overflow-hidden">
          <div class="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
            <h3 class="text-sm font-semibold text-gray-700">Active Installations ({{ installations().length }})</h3>
          </div>
          @if (installations().length === 0) {
            <div class="text-center py-12 text-gray-400 text-sm">No installations recorded yet.</div>
          } @else {
            <div class="overflow-x-auto">
              <table class="w-full text-sm">
                <thead class="bg-gray-50">
                  <tr>
                    @for (h of ['Tenant', 'App Type', 'Version', 'Device', 'OS', 'Last Seen']; track h) {
                      <th class="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">{{ h }}</th>
                    }
                  </tr>
                </thead>
                <tbody>
                  @for (i of installations(); track i.id) {
                    <tr class="border-t border-gray-50 hover:bg-gray-50 transition-colors">
                      <td class="px-4 py-3 font-medium text-gray-800">{{ i.tenant_name || i.tenant_id }}</td>
                      <td class="px-4 py-3 text-gray-600 capitalize">{{ i.app_type }}</td>
                      <td class="px-4 py-3 font-mono text-xs text-gray-600">{{ i.app_version }}</td>
                      <td class="px-4 py-3 text-gray-500 truncate max-w-[160px]">{{ i.device_model || '—' }}</td>
                      <td class="px-4 py-3 text-gray-500">{{ i.os_version || '—' }}</td>
                      <td class="px-4 py-3 text-gray-400 text-xs">{{ i.last_seen_at | date:'dd MMM, HH:mm' }}</td>
                    </tr>
                  }
                </tbody>
              </table>
            </div>
          }
        </div>
      }

      <!-- Latest Versions -->
      @if (activeTab() === 'Latest Versions') {
        <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          @for (v of analytics().latest_versions || []; track v.app_type) {
            <div class="bg-white rounded-xl border border-gray-100 shadow-card p-4">
              <div class="flex items-center justify-between mb-2">
                <span class="text-sm font-semibold text-gray-800 capitalize">{{ v.app_type?.replace('_', ' ') }}</span>
                <span class="px-2 py-0.5 rounded-full text-xs font-medium bg-sage-50 text-sage-700">v{{ v.version }}</span>
              </div>
              <p class="text-xs text-gray-400">Build {{ v.build_number }}</p>
              @if (v.is_mandatory) {
                <span class="text-xs text-orange-600 font-medium">⚠️ Mandatory</span>
              }
            </div>
          }
        </div>
      }
    }
  `,
})
export class UsagePage implements OnInit {
  private api = inject(ApiService);
  private toast = inject(ToastService);
  loading = signal(true);
  snapshotting = signal(false);
  analytics = signal<any>({});
  installations = signal<any[]>([]);
  downloadsByType = signal<ChartDataPoint[]>([]);
  activeTab = signal<string>('Downloads');
  tabs = ['Downloads', 'Installations', 'Latest Versions'];

  totalUniqueTenants(): number {
    const ids = new Set(this.installations().map((i: any) => i.tenant_id));
    return ids.size;
  }

  ngOnInit(): void { this.load(); }

  load(): void {
    this.loading.set(true);
    let done = 0;
    const finish = () => { if (++done === 2) this.loading.set(false); };

    this.api.get('/admin/apps/analytics').subscribe({
      next: r => {
        if (r.success) {
          this.analytics.set(r.data);
          this.downloadsByType.set((r.data.by_app_type || []).map((d: any) => ({ label: d.app_type, value: d.downloads })));
        }
        finish();
      },
      error: () => finish(),
    });

    this.api.get('/admin/apps/installations').subscribe({
      next: r => { this.installations.set(r.data || []); finish(); },
      error: () => finish(),
    });
  }

  recordSnapshot(): void {
    this.snapshotting.set(true);
    this.api.post('/admin/usage/snapshot', {}).subscribe({
      next: r => {
        this.snapshotting.set(false);
        if (r.success) this.toast.success('Usage snapshot recorded successfully');
        else this.toast.error(r.message || 'Failed to record snapshot');
      },
      error: () => { this.snapshotting.set(false); this.toast.error('Failed to record snapshot'); },
    });
  }
}

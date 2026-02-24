import { Component, inject, OnInit, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { ApiService, PageHeaderComponent, LoadingSpinnerComponent, EmptyStateComponent } from '@lodgik/shared';

@Component({
  selector: 'app-apps',
  standalone: true,
  imports: [PageHeaderComponent, LoadingSpinnerComponent, EmptyStateComponent, DatePipe],
  template: `
    <ui-page-header title="Apps & Downloads" subtitle="Download Lodgik apps for your devices"></ui-page-header>
    <ui-loading [loading]="loading()"></ui-loading>
    @if (!loading()) {
      @if (releases().length) {
        <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          @for (r of releases(); track r.id) {
            <div class="bg-white rounded-xl border border-gray-100 shadow-card p-5">
              <div class="flex items-center gap-3 mb-3">
                <span class="text-3xl">{{ appIcon(r.app_type) }}</span>
                <div>
                  <h3 class="text-sm font-semibold text-gray-800">{{ appLabel(r.app_type) }}</h3>
                  <p class="text-xs text-gray-500">v{{ r.version }} (Build {{ r.build_number }})</p>
                </div>
              </div>
              @if (r.release_notes) {
                <p class="text-xs text-gray-600 mb-3 line-clamp-2">{{ r.release_notes }}</p>
              }
              <div class="flex items-center justify-between text-xs text-gray-400">
                <span>{{ r.file_size ? formatSize(r.file_size) : 'N/A' }}</span>
                <span>{{ r.published_at ? (r.published_at | date:'mediumDate') : '' }}</span>
              </div>
            </div>
          }
        </div>
      } @else {
        <ui-empty-state title="No apps available" message="App releases will appear here when published" icon="📱"></ui-empty-state>
      }
    }
  `,
})
export class AppsPage implements OnInit {
  private api = inject(ApiService);
  loading = signal(true); releases = signal<any[]>([]);

  ngOnInit(): void {
    this.api.get('/apps/latest').subscribe({ next: r => { if (r.success) this.releases.set(r.data); this.loading.set(false); }, error: () => this.loading.set(false) });
  }

  appIcon(t: string): string {
    const m: Record<string,string> = { android: '🤖', ios: '🍎', windows: '🪟', macos: '💻', linux: '🐧', pwa: '🌐', pos_terminal: '🖥️', kds_display: '📺' };
    return m[t] || '📦';
  }
  appLabel(t: string): string {
    const m: Record<string,string> = { android: 'Android', ios: 'iOS', windows: 'Windows', macos: 'macOS', linux: 'Linux', pwa: 'Web App', pos_terminal: 'POS Terminal', kds_display: 'KDS Display' };
    return m[t] || t;
  }
  formatSize(bytes: number): string {
    if (bytes > 1048576) return (bytes / 1048576).toFixed(1) + ' MB';
    return (bytes / 1024).toFixed(0) + ' KB';
  }
}

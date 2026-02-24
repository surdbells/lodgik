import { Component, inject, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ApiService, PageHeaderComponent, DataTableComponent, TableColumn, TableAction, LoadingSpinnerComponent, ToastService, ConfirmDialogService } from '@lodgik/shared';

@Component({
  selector: 'app-app-list',
  standalone: true,
  imports: [PageHeaderComponent, DataTableComponent, LoadingSpinnerComponent, FormsModule],
  template: `
    <ui-page-header title="App Releases" icon="smartphone" [breadcrumbs]="['Overview', 'Apps']" subtitle="Manage platform app distribution">
      <button class="px-4 py-2 bg-sage-600 text-white text-sm font-medium rounded-lg hover:bg-sage-700" (click)="showUpload = !showUpload">
        {{ showUpload ? 'Cancel' : '+ Upload Release' }}
      </button>
    </ui-page-header>

    @if (showUpload) {
      <div class="bg-white rounded-xl border border-gray-100 shadow-card p-5 mb-6">
        <h3 class="text-sm font-semibold text-gray-700 mb-4">Upload New Release</h3>
        <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
          <div><label class="block text-xs font-medium text-gray-600 mb-1">App Type</label>
            <select [(ngModel)]="uploadForm.app_type" class="w-full px-3 py-2 border rounded-lg text-sm">
              @for (at of appTypes; track at.key) { <option [value]="at.key">{{ at.icon }} {{ at.label }}</option> }
            </select></div>
          <div><label class="block text-xs font-medium text-gray-600 mb-1">Version</label>
            <input [(ngModel)]="uploadForm.version" placeholder="1.2.0" class="w-full px-3 py-2 border rounded-lg text-sm"></div>
          <div><label class="block text-xs font-medium text-gray-600 mb-1">Build Number</label>
            <input [(ngModel)]="uploadForm.build_number" type="number" placeholder="42" class="w-full px-3 py-2 border rounded-lg text-sm"></div>
          <div><label class="block text-xs font-medium text-gray-600 mb-1">Min OS Version</label>
            <input [(ngModel)]="uploadForm.min_os_version" placeholder="Android 8.0" class="w-full px-3 py-2 border rounded-lg text-sm"></div>
        </div>
        <div class="mb-4">
          <label class="block text-xs font-medium text-gray-600 mb-1">Release Notes</label>
          <textarea [(ngModel)]="uploadForm.release_notes" rows="3" placeholder="What's new in this version..." class="w-full px-3 py-2 border rounded-lg text-sm"></textarea>
        </div>
        <div class="flex items-center gap-4 mb-4">
          <label class="flex items-center gap-2 text-sm"><input type="checkbox" [(ngModel)]="uploadForm.is_mandatory" class="rounded"> Mandatory update</label>
          <div class="flex-1"><label class="block text-xs font-medium text-gray-600 mb-1">Download URL</label>
            <input [(ngModel)]="uploadForm.download_url" placeholder="https://storage.example.com/app-v1.2.0.apk" class="w-full px-3 py-2 border rounded-lg text-sm"></div>
        </div>
        <div class="flex gap-2">
          <button (click)="createRelease()" class="px-4 py-2 bg-sage-600 text-white text-sm rounded-lg hover:bg-sage-700">Create Release</button>
          <button (click)="showUpload = false" class="px-4 py-2 bg-gray-200 text-sm rounded-lg">Cancel</button>
        </div>
      </div>
    }

    <!-- App Type Grid -->
    <div class="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
      @for (at of appTypes; track at.key) {
        <button (click)="filterType = filterType === at.key ? null : at.key; load()"
                class="bg-white rounded-lg border p-4 text-center hover:shadow-sm transition-shadow"
                [class.border-sage-500]="filterType === at.key" [class.ring-1]="filterType === at.key" [class.ring-sage-200]="filterType === at.key">
          <span class="text-2xl block mb-1">{{ at.icon }}</span>
          <span class="text-xs font-medium text-gray-700">{{ at.label }}</span>
          <span class="block text-lg font-bold text-gray-800">{{ countByType(at.key) }}</span>
        </button>
      }
    </div>

    <ui-loading [loading]="loading()"></ui-loading>
    @if (!loading()) {
      <ui-data-table [columns]="columns" [data]="filteredReleases()" [actions]="actions" [totalItems]="filteredReleases().length"></ui-data-table>
    }
  `,
})
export class AppListPage implements OnInit {
  private api = inject(ApiService);
  private toast = inject(ToastService);
  loading = signal(true);
  releases = signal<any[]>([]);
  filteredReleases = signal<any[]>([]);
  showUpload = false;
  filterType: string | null = null;

  appTypes = [
    { key: 'android', icon: '🤖', label: 'Android' }, { key: 'ios', icon: '🍎', label: 'iOS' },
    { key: 'windows', icon: '🪟', label: 'Windows' }, { key: 'macos', icon: '💻', label: 'macOS' },
    { key: 'linux', icon: '🐧', label: 'Linux' }, { key: 'pwa', icon: '🌐', label: 'Web PWA' },
    { key: 'pos_terminal', icon: '🖥️', label: 'POS' }, { key: 'kds_display', icon: '📺', label: 'KDS' },
  ];

  uploadForm: any = { app_type: 'android', version: '', build_number: 1, release_notes: '', min_os_version: '', is_mandatory: false, download_url: '' };

  columns: TableColumn[] = [
    { key: 'app_type', label: 'Type', render: (v: string) => this.appTypes.find(a => a.key === v)?.icon + ' ' + (this.appTypes.find(a => a.key === v)?.label || v) },
    { key: 'version', label: 'Version' },
    { key: 'build_number', label: 'Build', align: 'center' },
    { key: 'status', label: 'Status', render: (v: string) => v === 'published' ? '🟢 Published' : v === 'draft' ? '📝 Draft' : '⚠️ Deprecated' },
    { key: 'download_count', label: 'Downloads', align: 'right' },
    { key: 'is_mandatory', label: 'Mandatory', align: 'center', render: (v: boolean) => v ? '⚠️' : '' },
    { key: 'is_latest', label: 'Latest', align: 'center', render: (v: boolean) => v ? '✅' : '' },
  ];

  actions: TableAction[] = [
    { label: 'Publish', color: 'primary', handler: (r: any) => this.publish(r), hidden: (r: any) => r.status !== 'draft' },
    { label: 'Deprecate', color: 'primary', handler: (r: any) => this.deprecate(r), hidden: (r: any) => r.status !== 'published' },
  ];

  ngOnInit(): void { this.load(); }

  load(): void {
    this.loading.set(true);
    const url = this.filterType ? `/admin/releases?app_type=${this.filterType}` : '/admin/releases';
    this.api.get(url).subscribe({ next: r => { this.releases.set(r.data || []); this.filteredReleases.set(r.data || []); this.loading.set(false); }, error: () => this.loading.set(false) });
  }

  countByType(type: string): number { return this.releases().filter(r => r.app_type === type).length; }

  createRelease(): void {
    this.api.post('/admin/releases', this.uploadForm).subscribe({ next: r => {
      if (r.success) { this.toast.success('Release created'); this.showUpload = false; this.load(); }
      else this.toast.error(r.message || 'Failed');
    }, error: () => this.toast.error('Failed') });
  }

  publish(r: any): void { this.api.post(`/admin/releases/${r.id}/publish`).subscribe({ next: () => { this.toast.success('Published'); this.load(); } }); }
  deprecate(r: any): void { this.api.post(`/admin/releases/${r.id}/deprecate`).subscribe({ next: () => { this.toast.success('Deprecated'); this.load(); } }); }
}

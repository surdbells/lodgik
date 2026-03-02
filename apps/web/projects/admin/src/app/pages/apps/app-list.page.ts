import { Component, inject, OnInit, signal, ViewChild, ElementRef } from '@angular/core';
import { FormsModule } from '@angular/forms';
import {
  ApiService, PageHeaderComponent, DataTableComponent, TableColumn, TableAction,
  LoadingSpinnerComponent, ToastService,
} from '@lodgik/shared';

@Component({
  selector: 'app-app-list',
  standalone: true,
  imports: [PageHeaderComponent, DataTableComponent, LoadingSpinnerComponent, FormsModule],
  template: `
    <ui-page-header title="App Releases" icon="smartphone"
      [breadcrumbs]="['Overview', 'Apps']"
      subtitle="Manage platform app distribution">
      <button class="px-4 py-2 bg-sage-600 text-white text-sm font-medium rounded-lg hover:bg-sage-700"
              (click)="showUpload = !showUpload">
        {{ showUpload ? 'Cancel' : '+ Upload Release' }}
      </button>
    </ui-page-header>

    @if (showUpload) {
      <div class="bg-white rounded-xl border border-gray-100 shadow-card p-6 mb-6">
        <h3 class="text-sm font-semibold text-gray-700 mb-1">Upload New Release</h3>
        <p class="text-xs text-gray-400 mb-5">Fields marked <span class="text-red-400">*</span> are required. Max file size: 500 MB.</p>

        @if (uploadError()) {
          <div class="bg-red-50 border border-red-100 text-red-700 text-xs p-3 rounded-lg mb-4">{{ uploadError() }}</div>
        }

        <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
          <div>
            <label class="block text-xs font-medium text-gray-600 mb-1">App Type <span class="text-red-400">*</span></label>
            <select [(ngModel)]="uploadForm.app_type"
              class="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-sage-200 outline-none bg-gray-50 focus:bg-white">
              @for (at of appTypes; track at.key) {
                <option [value]="at.key">{{ at.icon }} {{ at.label }}</option>
              }
            </select>
          </div>
          <div>
            <label class="block text-xs font-medium text-gray-600 mb-1">Version <span class="text-red-400">*</span></label>
            <input [(ngModel)]="uploadForm.version" placeholder="1.2.0"
              class="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-sage-200 outline-none bg-gray-50 focus:bg-white">
          </div>
          <div>
            <label class="block text-xs font-medium text-gray-600 mb-1">Build Number <span class="text-red-400">*</span></label>
            <input [(ngModel)]="uploadForm.build_number" type="number" min="1" placeholder="42"
              class="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-sage-200 outline-none bg-gray-50 focus:bg-white">
          </div>
          <div>
            <label class="block text-xs font-medium text-gray-600 mb-1">Min OS Version</label>
            <input [(ngModel)]="uploadForm.min_os_version" placeholder="Android 8.0"
              class="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-sage-200 outline-none bg-gray-50 focus:bg-white">
          </div>
        </div>

        <div class="mb-4">
          <label class="block text-xs font-medium text-gray-600 mb-1">Release Notes</label>
          <textarea [(ngModel)]="uploadForm.release_notes" rows="3"
            placeholder="What's new in this version…"
            class="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-sage-200 outline-none bg-gray-50 focus:bg-white resize-none"></textarea>
        </div>

        <!-- Binary file picker -->
        <div class="mb-4">
          <label class="block text-xs font-medium text-gray-600 mb-1">
            Binary File <span class="text-red-400">*</span>
            <span class="text-gray-400 font-normal ml-1">(APK, IPA, EXE, DMG, AppImage, ZIP — max 500 MB)</span>
          </label>
          <div class="border-2 border-dashed border-gray-200 rounded-lg p-4 text-center hover:border-sage-400 transition-colors cursor-pointer"
               [class.border-sage-400]="selectedFile"
               (click)="fileInput.click()">
            @if (selectedFile) {
              <div class="flex items-center justify-between">
                <div class="flex items-center gap-2 text-sm">
                  <span class="text-2xl">{{ fileIcon(selectedFile.name) }}</span>
                  <div class="text-left">
                    <p class="font-medium text-gray-800">{{ selectedFile.name }}</p>
                    <p class="text-xs text-gray-400">{{ formatBytes(selectedFile.size) }}</p>
                  </div>
                </div>
                <button type="button" (click)="clearFile($event)"
                  class="text-xs text-red-500 hover:text-red-700 px-2 py-1 hover:bg-red-50 rounded">
                  Remove
                </button>
              </div>
            } @else {
              <div class="text-gray-400">
                <svg xmlns="http://www.w3.org/2000/svg" class="w-8 h-8 mx-auto mb-2 text-gray-300" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>
                <p class="text-sm">Click to select binary file, or drag & drop</p>
                <p class="text-xs mt-1">APK · IPA · EXE · DMG · AppImage · ZIP</p>
              </div>
            }
          </div>
          <input #fileInput type="file"
            accept=".apk,.ipa,.exe,.dmg,.pkg,.appimage,.deb,.rpm,.zip"
            class="hidden" (change)="onFileSelected($event)">
        </div>

        <label class="flex items-center gap-2 text-sm text-gray-700 mb-5 cursor-pointer select-none">
          <input type="checkbox" [(ngModel)]="uploadForm.is_mandatory" class="rounded border-gray-300">
          Mark as mandatory update (users will be forced to update)
        </label>

        <!-- Upload progress -->
        @if (uploading()) {
          <div class="mb-4">
            <div class="flex justify-between text-xs text-gray-500 mb-1">
              <span>Uploading…</span>
              <span>{{ uploadProgress() }}%</span>
            </div>
            <div class="w-full bg-gray-200 rounded-full h-2">
              <div class="bg-sage-500 h-2 rounded-full transition-all duration-300"
                   [style.width]="uploadProgress() + '%'"></div>
            </div>
          </div>
        }

        <div class="flex gap-2">
          <button (click)="createRelease()" [disabled]="uploading()"
            class="px-5 py-2 bg-sage-600 text-white text-sm font-medium rounded-lg hover:bg-sage-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors">
            {{ uploading() ? 'Uploading…' : 'Create Release' }}
          </button>
          <button (click)="cancelUpload()" [disabled]="uploading()"
            class="px-4 py-2 bg-gray-100 text-gray-700 text-sm rounded-lg hover:bg-gray-200 disabled:opacity-50 transition-colors">
            Cancel
          </button>
        </div>
      </div>
    }

    <!-- App type filter grid -->
    <div class="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-3 mb-6">
      @for (at of appTypes; track at.key) {
        <button (click)="toggleFilter(at.key)"
                class="bg-white rounded-lg border p-3 text-center hover:shadow-sm transition-all"
                [class.border-sage-500]="filterType === at.key"
                [class.ring-1]="filterType === at.key"
                [class.ring-sage-200]="filterType === at.key">
          <span class="text-xl block mb-0.5">{{ at.icon }}</span>
          <span class="text-xs font-medium text-gray-700 block leading-tight">{{ at.label }}</span>
          <span class="block text-base font-bold text-gray-800 mt-0.5">{{ countByType(at.key) }}</span>
        </button>
      }
    </div>

    <ui-loading [loading]="loading()"></ui-loading>
    @if (!loading()) {
      <ui-data-table
        [columns]="columns"
        [data]="filteredReleases()"
        [actions]="actions"
        [totalItems]="filteredReleases().length">
      </ui-data-table>
    }
  `,
})
export class AppListPage implements OnInit {
  @ViewChild('fileInput') fileInputRef!: ElementRef<HTMLInputElement>;

  private api   = inject(ApiService);
  private toast = inject(ToastService);

  loading          = signal(true);
  uploading        = signal(false);
  uploadProgress   = signal(0);
  uploadError      = signal('');
  releases         = signal<any[]>([]);
  filteredReleases = signal<any[]>([]);
  showUpload       = false;
  filterType: string | null = null;
  selectedFile: File | null  = null;

  appTypes = [
    { key: 'android',     icon: '🤖', label: 'Android' },
    { key: 'ios',         icon: '🍎', label: 'iOS' },
    { key: 'windows',     icon: '🪟', label: 'Windows' },
    { key: 'macos',       icon: '💻', label: 'macOS' },
    { key: 'linux',       icon: '🐧', label: 'Linux' },
    { key: 'pwa',         icon: '🌐', label: 'Web PWA' },
    { key: 'pos_terminal',icon: '🖥️', label: 'POS' },
    { key: 'kds_display', icon: '📺', label: 'KDS' },
  ];

  uploadForm: any = {
    app_type: 'android', version: '', build_number: 1,
    release_notes: '', min_os_version: '', is_mandatory: false,
  };

  columns: TableColumn[] = [
    { key: 'app_type',      label: 'Type',       render: (v: string) => (this.appTypes.find(a => a.key === v)?.icon ?? '') + ' ' + (this.appTypes.find(a => a.key === v)?.label ?? v) },
    { key: 'version',       label: 'Version' },
    { key: 'build_number',  label: 'Build',      align: 'center' },
    { key: 'status',        label: 'Status',     render: (v: string) => ({ published: '🟢 Published', draft: '📝 Draft' }[v] ?? '⚠️ Deprecated') },
    { key: 'file_size',     label: 'Size',       render: (v: number) => v ? this.formatBytes(v) : '—' },
    { key: 'download_count',label: 'Downloads',  align: 'right' },
    { key: 'is_mandatory',  label: 'Mandatory',  align: 'center', render: (v: boolean) => v ? '⚠️ Yes' : '' },
    { key: 'is_latest',     label: 'Latest',     align: 'center', render: (v: boolean) => v ? '✅' : '' },
  ];

  actions: TableAction[] = [
    { label: 'Publish',    color: 'primary', handler: (r: any) => this.publish(r),    hidden: (r: any) => r.status !== 'draft' },
    { label: 'Deprecate',  color: 'primary', handler: (r: any) => this.deprecate(r), hidden: (r: any) => r.status !== 'published' },
  ];

  ngOnInit(): void { this.load(); }

  load(): void {
    this.loading.set(true);
    const url = this.filterType ? `/admin/releases?app_type=${this.filterType}` : '/admin/releases';
    this.api.get(url).subscribe({
      next: (r: any) => {
        this.releases.set(r.data || []);
        this.filteredReleases.set(r.data || []);
        this.loading.set(false);
      },
      error: () => this.loading.set(false),
    });
  }

  toggleFilter(type: string): void {
    this.filterType = this.filterType === type ? null : type;
    this.load();
  }

  countByType(type: string): number {
    return this.releases().filter(r => r.app_type === type).length;
  }

  onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file  = input.files?.[0] ?? null;
    if (!file) return;

    const maxBytes = 500 * 1024 * 1024;
    if (file.size > maxBytes) {
      this.uploadError.set('File exceeds the 500 MB maximum. Please choose a smaller file.');
      this.selectedFile = null;
      input.value = '';
      return;
    }
    this.uploadError.set('');
    this.selectedFile = file;
  }

  clearFile(event: Event): void {
    event.stopPropagation();
    this.selectedFile = null;
    if (this.fileInputRef) this.fileInputRef.nativeElement.value = '';
  }

  cancelUpload(): void {
    this.showUpload = false;
    this.selectedFile = null;
    this.uploadError.set('');
    this.uploadForm = { app_type: 'android', version: '', build_number: 1, release_notes: '', min_os_version: '', is_mandatory: false };
  }

  createRelease(): void {
    this.uploadError.set('');

    if (!this.uploadForm.version?.trim()) {
      this.uploadError.set('Version is required (e.g. 1.2.0).'); return;
    }
    if (!this.uploadForm.build_number || this.uploadForm.build_number < 1) {
      this.uploadError.set('Build number must be a positive integer.'); return;
    }
    if (!this.selectedFile) {
      this.uploadError.set('Please select a binary file to upload.'); return;
    }

    // Step 1: upload binary via multipart
    this.uploading.set(true);
    this.uploadProgress.set(0);

    const formData = new FormData();
    formData.append('file', this.selectedFile);
    formData.append('context', 'binary');

    // Use XMLHttpRequest for real upload progress
    const xhr = new XMLHttpRequest();
    const apiBase = (window as any).__API_URL__ ?? '/api';

    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable) {
        this.uploadProgress.set(Math.round((e.loaded / e.total) * 90));
      }
    };

    xhr.onload = () => {
      if (xhr.status === 200 || xhr.status === 201) {
        let uploadResult: any;
        try { uploadResult = JSON.parse(xhr.responseText); } catch { uploadResult = null; }

        const downloadUrl = uploadResult?.data?.url;
        if (!downloadUrl) {
          this.uploading.set(false);
          this.uploadError.set('Binary upload succeeded but URL was not returned. Check server logs.');
          return;
        }

        // Step 2: create release record with the stored URL
        this.uploadProgress.set(95);
        this.api.post('/admin/releases', {
          ...this.uploadForm,
          download_url: downloadUrl,
        }).subscribe({
          next: (r: any) => {
            this.uploadProgress.set(100);
            this.uploading.set(false);
            if (r.success !== false) {
              this.toast.success('Release created and binary uploaded successfully.');
              this.cancelUpload();
              this.load();
            } else {
              this.uploadError.set(r.message || 'Release creation failed.');
            }
          },
          error: (e: any) => {
            this.uploading.set(false);
            this.uploadError.set(e?.error?.message || 'Release creation failed.');
          },
        });
      } else {
        this.uploading.set(false);
        let errMsg = 'Binary upload failed.';
        try {
          const err = JSON.parse(xhr.responseText);
          errMsg = err?.error?.message || err?.message || errMsg;
        } catch { /* noop */ }
        this.uploadError.set(errMsg);
      }
    };

    xhr.onerror = () => {
      this.uploading.set(false);
      this.uploadError.set('Network error during upload. Check your connection and try again.');
    };

    // Get JWT from localStorage to authenticate the upload
    const token = localStorage.getItem('access_token') ?? '';
    xhr.open('POST', `${apiBase}/admin/upload/binary`);
    xhr.setRequestHeader('Authorization', `Bearer ${token}`);
    xhr.send(formData);
  }

  publish(r: any): void {
    this.api.post(`/admin/releases/${r.id}/publish`).subscribe({
      next: () => { this.toast.success('Release published.'); this.load(); },
    });
  }

  deprecate(r: any): void {
    this.api.post(`/admin/releases/${r.id}/deprecate`).subscribe({
      next: () => { this.toast.success('Release deprecated.'); this.load(); },
    });
  }

  formatBytes(bytes: number): string {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  }

  fileIcon(name: string): string {
    const ext = name.split('.').pop()?.toLowerCase() ?? '';
    return ({ apk: '🤖', ipa: '🍎', exe: '🪟', dmg: '💻', appimage: '🐧', zip: '📦', pkg: '📦', deb: '🐧', rpm: '🐧' } as any)[ext] ?? '📱';
  }
}

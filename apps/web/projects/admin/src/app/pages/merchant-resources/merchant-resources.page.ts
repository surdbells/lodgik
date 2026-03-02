import { Component, inject, signal, OnInit, ViewChild, ElementRef } from '@angular/core';
import { DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import {
  ApiService, PageHeaderComponent, LoadingSpinnerComponent,
  BadgeComponent, ToastService,
} from '@lodgik/shared';

@Component({
  selector: 'app-merchant-resources',
  standalone: true,
  imports: [DatePipe, FormsModule, PageHeaderComponent, LoadingSpinnerComponent, BadgeComponent],
  template: `
    <ui-page-header title="Resource Management" icon="folder-open"
      [breadcrumbs]="['Marketplace', 'Resources']"
      subtitle="Upload and manage merchant resources (PDFs, slides, guides)">
      <button (click)="openForm()"
        class="px-4 py-2 bg-sage-600 text-white text-sm font-medium rounded-lg hover:bg-sage-700">
        + Upload Resource
      </button>
    </ui-page-header>
    <ui-loading [loading]="loading()"></ui-loading>

    @if (showForm()) {
      <div class="bg-white rounded-xl border border-gray-100 shadow-card p-6 mb-6">
        <h3 class="text-sm font-semibold mb-1">Upload New Resource</h3>
        <p class="text-xs text-gray-400 mb-5">Allowed: PDF, PPTX, XLSX, MP4, ZIP. Max 100 MB.</p>

        @if (formError()) {
          <div class="bg-red-50 border border-red-100 text-red-700 text-xs p-3 rounded-lg mb-4">{{ formError() }}</div>
        }

        <div class="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
          <div>
            <label class="block text-xs font-medium text-gray-700 mb-1">Title <span class="text-red-400">*</span></label>
            <input [(ngModel)]="form.title"
              class="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-sage-200 outline-none bg-gray-50 focus:bg-white"
              placeholder="e.g. Lodgik Sales Deck 2026">
          </div>
          <div>
            <label class="block text-xs font-medium text-gray-700 mb-1">Category <span class="text-red-400">*</span></label>
            <select [(ngModel)]="form.category"
              class="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-sage-200 outline-none bg-gray-50 focus:bg-white">
              <option value="user_manual">User Manual</option>
              <option value="sales_deck">Sales Deck</option>
              <option value="training">Training</option>
              <option value="marketing">Marketing</option>
              <option value="policy">Policy</option>
            </select>
          </div>
          <div>
            <label class="block text-xs font-medium text-gray-700 mb-1">Version</label>
            <input [(ngModel)]="form.version"
              class="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-sage-200 outline-none bg-gray-50 focus:bg-white"
              placeholder="v1.0">
          </div>
          <div>
            <label class="block text-xs font-medium text-gray-700 mb-1">Visibility</label>
            <select [(ngModel)]="form.visibility"
              class="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-sage-200 outline-none bg-gray-50 focus:bg-white">
              <option value="merchant">Merchant Only</option>
              <option value="both">Both (Merchant + Hotel)</option>
              <option value="internal">Internal Only</option>
            </select>
          </div>
          <div class="md:col-span-2">
            <label class="block text-xs font-medium text-gray-700 mb-1">Description</label>
            <textarea [(ngModel)]="form.description" rows="2"
              class="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-sage-200 outline-none bg-gray-50 focus:bg-white resize-none"
              placeholder="Brief description of this resource…"></textarea>
          </div>
        </div>

        <!-- File picker -->
        <div class="mb-5">
          <label class="block text-xs font-medium text-gray-700 mb-1">
            File <span class="text-red-400">*</span>
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
                <svg xmlns="http://www.w3.org/2000/svg" class="w-7 h-7 mx-auto mb-2 text-gray-300" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>
                <p class="text-sm">Click to select a resource file</p>
                <p class="text-xs mt-0.5 text-gray-300">PDF · PPTX · XLSX · MP4 · ZIP</p>
              </div>
            }
          </div>
          <input #fileInput type="file"
            accept=".pdf,.pptx,.ppt,.xlsx,.xls,.mp4,.zip"
            class="hidden" (change)="onFileSelected($event)">
        </div>

        @if (uploading()) {
          <div class="mb-4">
            <div class="flex justify-between text-xs text-gray-400 mb-1">
              <span>Uploading…</span><span>{{ uploadProgress() }}%</span>
            </div>
            <div class="w-full bg-gray-200 rounded-full h-1.5">
              <div class="bg-sage-500 h-1.5 rounded-full transition-all"
                   [style.width]="uploadProgress() + '%'"></div>
            </div>
          </div>
        }

        <div class="flex gap-2">
          <button (click)="upload()" [disabled]="uploading()"
            class="px-5 py-2 bg-sage-600 text-white text-sm font-medium rounded-lg hover:bg-sage-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors">
            {{ uploading() ? 'Uploading…' : 'Upload Resource' }}
          </button>
          <button (click)="cancelForm()" [disabled]="uploading()"
            class="px-4 py-2 bg-gray-100 text-gray-700 text-sm rounded-lg hover:bg-gray-200 disabled:opacity-50 transition-colors">
            Cancel
          </button>
        </div>
      </div>
    }

    @if (!loading()) {
      <div class="bg-white rounded-xl border border-gray-100 shadow-card overflow-hidden">
        <table class="w-full text-sm">
          <thead class="bg-gray-50 text-xs text-gray-500 uppercase tracking-wide">
            <tr>
              <th class="px-4 py-3 text-left">Title</th>
              <th class="px-4 py-3 text-center">Category</th>
              <th class="px-4 py-3 text-center">Type</th>
              <th class="px-4 py-3 text-center">Version</th>
              <th class="px-4 py-3 text-center">Visibility</th>
              <th class="px-4 py-3 text-center">Downloads</th>
              <th class="px-4 py-3 text-center">Status</th>
              <th class="px-4 py-3"></th>
            </tr>
          </thead>
          <tbody class="divide-y divide-gray-100">
            @for (r of resources(); track r.id) {
              <tr class="hover:bg-gray-50 transition-colors">
                <td class="px-4 py-3 font-medium text-gray-900">
                  <div class="flex items-center gap-2">
                    <span>{{ fileIcon(r.file_type) }}</span>
                    {{ r.title }}
                  </div>
                </td>
                <td class="px-4 py-3 text-center capitalize text-gray-600">{{ (r.category || '').replace('_', ' ') }}</td>
                <td class="px-4 py-3 text-center uppercase text-xs font-mono text-gray-500">{{ r.file_type }}</td>
                <td class="px-4 py-3 text-center text-gray-500">{{ r.version }}</td>
                <td class="px-4 py-3 text-center capitalize text-gray-500">{{ r.visibility }}</td>
                <td class="px-4 py-3 text-center text-gray-600 font-medium">{{ r._downloads ?? '—' }}</td>
                <td class="px-4 py-3 text-center">
                  <ui-badge [variant]="r.status === 'active' ? 'success' : 'neutral'">{{ r.status }}</ui-badge>
                </td>
                <td class="px-4 py-3">
                  <div class="flex gap-2 justify-end">
                    <button (click)="loadAnalytics(r)" class="text-sage-600 text-xs hover:underline">Stats</button>
                    @if (r.status === 'active') {
                      <button (click)="archive(r.id)" class="text-red-500 text-xs hover:underline">Archive</button>
                    }
                  </div>
                </td>
              </tr>
            } @empty {
              <tr><td colspan="8" class="px-4 py-12 text-center text-gray-400">No resources uploaded yet.</td></tr>
            }
          </tbody>
        </table>
      </div>
    }
  `,
})
export class MerchantResourcesPage implements OnInit {
  @ViewChild('fileInput') fileInputRef!: ElementRef<HTMLInputElement>;

  private api   = inject(ApiService);
  private toast = inject(ToastService);

  loading        = signal(true);
  showForm_      = signal(false);
  uploading      = signal(false);
  uploadProgress = signal(0);
  formError      = signal('');
  resources      = signal<any[]>([]);
  selectedFile: File | null = null;

  form: any = {
    title: '', category: 'user_manual', file_type: 'pdf',
    version: 'v1.0', visibility: 'merchant', description: '',
  };

  get showForm() { return this.showForm_; }

  openForm(): void {
    this.form = { title: '', category: 'user_manual', file_type: 'pdf', version: 'v1.0', visibility: 'merchant', description: '' };
    this.selectedFile = null;
    this.formError.set('');
    this.showForm_.set(true);
  }

  cancelForm(): void { this.showForm_.set(false); this.formError.set(''); this.selectedFile = null; }

  ngOnInit(): void { this.loadResources(); }

  loadResources(): void {
    this.loading.set(true);
    this.api.get('/admin/merchants/resources').subscribe({
      next: (r: any) => { this.resources.set(r.data || []); this.loading.set(false); },
      error: () => this.loading.set(false),
    });
  }

  onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file  = input.files?.[0] ?? null;
    if (!file) return;

    const maxBytes = 100 * 1024 * 1024; // 100 MB for resources
    if (file.size > maxBytes) {
      this.formError.set('File exceeds the 100 MB maximum.'); this.selectedFile = null; input.value = ''; return;
    }

    const ext = file.name.split('.').pop()?.toLowerCase() ?? '';
    const allowed = ['pdf', 'pptx', 'ppt', 'xlsx', 'xls', 'mp4', 'zip'];
    if (!allowed.includes(ext)) {
      this.formError.set(`File type ".${ext}" is not allowed. Allowed: ${allowed.join(', ')}.`);
      this.selectedFile = null; input.value = ''; return;
    }

    // Auto-fill file_type
    this.form.file_type = ext.includes('ppt') ? 'pptx' : ext.includes('xls') ? 'xlsx' : ext;
    this.formError.set('');
    this.selectedFile = file;
  }

  clearFile(event: Event): void {
    event.stopPropagation();
    this.selectedFile = null;
    if (this.fileInputRef) this.fileInputRef.nativeElement.value = '';
  }

  upload(): void {
    this.formError.set('');

    if (!this.form.title?.trim()) { this.formError.set('Title is required.'); return; }
    if (!this.selectedFile) { this.formError.set('Please select a file to upload.'); return; }

    this.uploading.set(true);
    this.uploadProgress.set(0);

    const formData = new FormData();
    formData.append('file', this.selectedFile);
    formData.append('context', 'resource');

    const xhr   = new XMLHttpRequest();
    const token = localStorage.getItem('access_token') ?? '';
    const base  = (window as any).__API_URL__ ?? '/api';

    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable) this.uploadProgress.set(Math.round((e.loaded / e.total) * 85));
    };

    xhr.onload = () => {
      if (xhr.status === 200 || xhr.status === 201) {
        let up: any;
        try { up = JSON.parse(xhr.responseText); } catch { up = null; }
        const fileUrl = up?.data?.url;

        this.uploadProgress.set(90);
        this.api.post('/admin/merchants/resources', { ...this.form, file_url: fileUrl }).subscribe({
          next: () => {
            this.uploadProgress.set(100);
            this.uploading.set(false);
            this.toast.success('Resource uploaded successfully.');
            this.cancelForm();
            this.loadResources();
          },
          error: (e: any) => {
            this.uploading.set(false);
            this.formError.set(e?.error?.error || 'Resource creation failed.');
          },
        });
      } else {
        this.uploading.set(false);
        let msg = 'Upload failed.';
        try { msg = JSON.parse(xhr.responseText)?.error?.message ?? msg; } catch { /* noop */ }
        this.formError.set(msg);
      }
    };

    xhr.onerror = () => { this.uploading.set(false); this.formError.set('Network error. Please try again.'); };

    xhr.open('POST', `${base}/admin/upload/binary`);
    xhr.setRequestHeader('Authorization', `Bearer ${token}`);
    xhr.send(formData);
  }

  archive(id: string): void {
    this.api.post(`/admin/merchants/resources/${id}/archive`, {}).subscribe({
      next: () => { this.toast.success('Resource archived.'); this.loadResources(); },
    });
  }

  loadAnalytics(r: any): void {
    this.api.get(`/admin/merchants/resources/${r.id}/analytics`).subscribe({
      next: (d: any) => {
        r._downloads = d.total_downloads;
        this.toast.success(`Downloads: ${d.total_downloads} · Unique merchants: ${d.unique_merchants}`);
      },
    });
  }

  formatBytes(bytes: number): string {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1048576) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / 1048576).toFixed(1)} MB`;
  }

  fileIcon(nameOrExt: string): string {
    const ext = nameOrExt.includes('.') ? (nameOrExt.split('.').pop()?.toLowerCase() ?? '') : nameOrExt.toLowerCase();
    return ({ pdf: '📄', pptx: '📊', ppt: '📊', xlsx: '📈', xls: '📈', mp4: '🎬', zip: '📦' } as any)[ext] ?? '📁';
  }
}

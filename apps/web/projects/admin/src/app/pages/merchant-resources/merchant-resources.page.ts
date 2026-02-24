import { Component, inject, signal, OnInit } from '@angular/core';
import { DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ApiService, PageHeaderComponent, LoadingSpinnerComponent, BadgeComponent, ToastService } from '@lodgik/shared';

@Component({
  selector: 'app-merchant-resources',
  standalone: true,
  imports: [DatePipe, FormsModule, PageHeaderComponent, LoadingSpinnerComponent, BadgeComponent],
  template: `
    <ui-page-header title="Resource Management" subtitle="Upload and manage merchant resources">
      <button (click)="showForm.set(true)" class="px-4 py-2 bg-sage-600 text-white text-sm rounded-lg hover:bg-sage-700">+ Upload Resource</button>
    </ui-page-header>
    <ui-loading [loading]="loading()"></ui-loading>

    @if (showForm()) {
      <div class="bg-white rounded-lg border p-5 mb-6">
        <h3 class="text-sm font-semibold mb-4">Upload New Resource</h3>
        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div><label class="block text-xs font-medium mb-1">Title *</label><input [(ngModel)]="form.title" class="w-full px-3 py-2 border rounded-lg text-sm"></div>
          <div><label class="block text-xs font-medium mb-1">Category</label>
            <select [(ngModel)]="form.category" class="w-full px-3 py-2 border rounded-lg text-sm">
              <option value="user_manual">User Manual</option><option value="sales_deck">Sales Deck</option><option value="training">Training</option><option value="marketing">Marketing</option><option value="policy">Policy</option>
            </select>
          </div>
          <div><label class="block text-xs font-medium mb-1">File URL *</label><input [(ngModel)]="form.file_url" class="w-full px-3 py-2 border rounded-lg text-sm" placeholder="https://..."></div>
          <div><label class="block text-xs font-medium mb-1">File Type</label>
            <select [(ngModel)]="form.file_type" class="w-full px-3 py-2 border rounded-lg text-sm">
              <option value="pdf">PDF</option><option value="pptx">PPTX</option><option value="xlsx">XLSX</option><option value="mp4">MP4</option><option value="zip">ZIP</option>
            </select>
          </div>
          <div><label class="block text-xs font-medium mb-1">Version</label><input [(ngModel)]="form.version" class="w-full px-3 py-2 border rounded-lg text-sm" placeholder="v1.0"></div>
          <div><label class="block text-xs font-medium mb-1">Visibility</label>
            <select [(ngModel)]="form.visibility" class="w-full px-3 py-2 border rounded-lg text-sm"><option value="merchant">Merchant Only</option><option value="both">Both</option><option value="internal">Internal</option></select>
          </div>
          <div class="md:col-span-2"><label class="block text-xs font-medium mb-1">Description</label><textarea [(ngModel)]="form.description" rows="2" class="w-full px-3 py-2 border rounded-lg text-sm"></textarea></div>
        </div>
        <div class="flex gap-2 mt-4">
          <button (click)="upload()" class="px-4 py-2 bg-sage-600 text-white text-sm rounded-lg">Upload</button>
          <button (click)="showForm.set(false)" class="px-4 py-2 bg-gray-100 text-sm rounded-lg">Cancel</button>
        </div>
      </div>
    }

    @if (!loading()) {
      <div class="bg-white rounded-lg border overflow-hidden">
        <table class="w-full text-sm">
          <thead class="bg-gray-50 text-xs text-gray-500 uppercase"><tr><th class="px-4 py-2 text-left">Title</th><th class="px-4 py-2">Category</th><th class="px-4 py-2">Type</th><th class="px-4 py-2">Version</th><th class="px-4 py-2">Visibility</th><th class="px-4 py-2">Downloads</th><th class="px-4 py-2">Status</th><th class="px-4 py-2"></th></tr></thead>
          <tbody class="divide-y divide-gray-100">
            @for (r of resources(); track r.id) {
              <tr class="hover:bg-gray-50">
                <td class="px-4 py-2 font-medium">{{ r.title }}</td>
                <td class="px-4 py-2 text-center capitalize">{{ r.category }}</td>
                <td class="px-4 py-2 text-center uppercase">{{ r.file_type }}</td>
                <td class="px-4 py-2 text-center">{{ r.version }}</td>
                <td class="px-4 py-2 text-center capitalize">{{ r.visibility }}</td>
                <td class="px-4 py-2 text-center">{{ r._downloads || '—' }}</td>
                <td class="px-4 py-2 text-center"><ui-badge [variant]="r.status === 'active' ? 'success' : 'neutral'">{{ r.status }}</ui-badge></td>
                <td class="px-4 py-2">
                  <div class="flex gap-1">
                    <button (click)="loadAnalytics(r)" class="text-sage-600 text-xs hover:underline">Stats</button>
                    @if (r.status === 'active') { <button (click)="archive(r.id)" class="text-red-600 text-xs hover:underline">Archive</button> }
                  </div>
                </td>
              </tr>
            } @empty { <tr><td colspan="8" class="px-4 py-8 text-center text-gray-400">No resources</td></tr> }
          </tbody>
        </table>
      </div>
    }
  `,
})
export class MerchantResourcesPage implements OnInit {
  private api = inject(ApiService);
  private toast = inject(ToastService);
  loading = signal(true); resources = signal<any[]>([]); showForm = signal(false);
  form: any = { title: '', file_url: '', category: 'user_manual', file_type: 'pdf', version: 'v1.0', visibility: 'merchant', description: '' };

  ngOnInit(): void { this.load(); }
  load(): void { this.api.get('/admin/merchants/resources').subscribe({ next: () => {}, error: () => {} }); this.loadResources(); }
  loadResources(): void {
    // Resources are listed from merchant endpoint
    this.api.get('/admin/merchants/tiers').subscribe({ error: () => {} }); // Preload
    // For now, show empty; resources are managed via the createResource admin endpoint
    this.loading.set(false);
    // Try to list resources through a general approach
    this.api.get('/merchant/resources').subscribe({ next: (d: any) => this.resources.set(d), error: () => {} });
  }
  upload(): void {
    this.api.post('/admin/merchants/resources', this.form).subscribe({
      next: () => { this.toast.success('Resource uploaded'); this.showForm.set(false); this.loadResources(); },
      error: (e: any) => this.toast.error(e?.error?.error || 'Failed')
    });
  }
  archive(id: string): void { this.api.post(`/admin/merchants/resources/${id}/archive`, {}).subscribe({ next: () => { this.toast.success('Resource archived'); this.loadResources(); } }); }
  loadAnalytics(r: any): void { this.api.get(`/admin/merchants/resources/${r.id}/analytics`).subscribe({ next: (d: any) => { r._downloads = d.total_downloads; this.toast.success(`Downloads: ${d.total_downloads}, Unique: ${d.unique_merchants}`); } }); }
}

import { Component, inject, signal, OnInit } from '@angular/core';
import { PageHeaderComponent, LoadingSpinnerComponent, ToastService } from '@lodgik/shared';
import { MerchantApiService } from '../../services/merchant-api.service';

@Component({
  selector: 'app-resources',
  standalone: true,
  imports: [PageHeaderComponent, LoadingSpinnerComponent],
  template: `
    <ui-page-header title="Resources" icon="folder-open" [breadcrumbs]="['Resources']" subtitle="Download sales materials, guides, and documentation"></ui-page-header>
    <ui-loading [loading]="loading()"></ui-loading>
    @if (!loading()) {
      <div class="flex gap-2 mb-4">
        @for (c of categories; track c) {
          <button (click)="filterCat.set(c.value); load()" [class.bg-emerald-100]="filterCat() === c.value" [class.text-emerald-700]="filterCat() === c.value" class="px-3 py-1 text-xs rounded-full border hover:bg-gray-50">{{ c.label }}</button>
        }
      </div>
      <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        @for (r of resources(); track r.id) {
          <div class="bg-white rounded-xl border border-gray-100 shadow-card p-4 hover:shadow-sm transition-shadow">
            <div class="flex items-start justify-between mb-2">
              <div class="text-2xl">{{ fileIcon(r.file_type) }}</div>
              <span class="text-[10px] bg-gray-100 text-gray-600 px-2 py-0.5 rounded">{{ r.version }}</span>
            </div>
            <h4 class="text-sm font-semibold text-gray-800 mb-1">{{ r.title }}</h4>
            <p class="text-xs text-gray-500 mb-3 line-clamp-2">{{ r.description || 'No description' }}</p>
            <div class="flex items-center justify-between">
              <span class="text-[10px] text-gray-400 capitalize">{{ r.category.replace('_', ' ') }}</span>
              <button (click)="download(r)" class="px-3 py-1 bg-sage-50 text-sage-700 text-xs rounded hover:bg-emerald-100">Download</button>
            </div>
          </div>
        } @empty { <div class="col-span-3 text-center py-12 text-gray-400">No resources available</div> }
      </div>
    }
  `,
})
export class ResourcesPage implements OnInit {
  private api = inject(MerchantApiService);
  private toast = inject(ToastService);
  loading = signal(true); resources = signal<any[]>([]); filterCat = signal('');
  categories = [{ label: 'All', value: '' }, { label: 'Sales Deck', value: 'sales_deck' }, { label: 'User Manual', value: 'user_manual' }, { label: 'Marketing', value: 'marketing' }, { label: 'Training', value: 'training' }];

  ngOnInit(): void { this.load(); }
  load(): void { this.api.listResources(this.filterCat() ? { category: this.filterCat() } : {}).subscribe({ next: (r: any[]) => { this.resources.set(r || []); this.loading.set(false); }, error: () => this.loading.set(false) }); }
  download(r: any): void { this.api.downloadResource(r.id).subscribe({ next: (d: any) => { window.open(d.file_url, '_blank'); this.toast.success('Download started'); }, error: () => this.toast.error('Download failed') }); }
  fileIcon(type: string): string { return { pdf: '📄', doc: '📝', docx: '📝', pptx: '📊', xlsx: '📈', zip: '📦', mp4: '🎬' }[type] || '📁'; }
}

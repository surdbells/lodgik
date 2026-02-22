import { Component, inject, signal, OnInit } from '@angular/core';
import { PageHeaderComponent, LoadingSpinnerComponent, ToastService } from '@lodgik/shared';
import { MerchantApiService } from '../../services/merchant-api.service';

@Component({
  selector: 'app-resources',
  standalone: true,
  imports: [PageHeaderComponent, LoadingSpinnerComponent],
  template: `
    <ui-page-header title="Resources" subtitle="Sales materials, guides, and documentation"></ui-page-header>
    <ui-loading [loading]="loading()"></ui-loading>
    @if (!loading()) {
      <div class="flex gap-2 mb-4">
        @for (c of categories; track c) { <button (click)="filterCat.set(c === 'All' ? '' : c.toLowerCase()); load()" [class.bg-emerald-100]="(c === 'All' ? '' : c.toLowerCase()) === filterCat()" class="px-3 py-1 text-xs rounded-full border hover:bg-gray-50">{{ c }}</button> }
      </div>
      <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        @for (r of resources(); track r.id) {
          <div class="bg-white rounded-lg border p-4 hover:shadow-sm transition-shadow">
            <div class="flex items-start justify-between mb-2">
              <div class="flex items-center gap-2">
                <span class="text-2xl">{{ fileIcon(r.file_type) }}</span>
                <div><h4 class="text-sm font-semibold">{{ r.title }}</h4><p class="text-xs text-gray-500">{{ r.category }} · {{ r.version }}</p></div>
              </div>
            </div>
            @if (r.description) { <p class="text-xs text-gray-600 mb-3 line-clamp-2">{{ r.description }}</p> }
            <div class="flex items-center justify-between">
              <span class="text-xs text-gray-400">{{ (r.file_size / 1024).toFixed(0) }}KB · {{ r.file_type }}</span>
              <button (click)="download(r.id)" class="px-3 py-1 bg-emerald-50 text-emerald-700 text-xs rounded-lg hover:bg-emerald-100">Download</button>
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
  categories = ['All', 'Sales_deck', 'User_manual', 'Training', 'Marketing', 'Policy'];

  ngOnInit(): void { this.load(); }
  load(): void { this.api.listResources(this.filterCat() ? { category: this.filterCat() } : {}).subscribe({ next: (r: any[]) => { this.resources.set(r); this.loading.set(false); } }); }
  download(id: string): void { this.api.downloadResource(id).subscribe({ next: (d: any) => { window.open(d.file_url, '_blank'); this.toast.success('Download started'); } }); }
  fileIcon(type: string): string { return ({ pdf: '📄', xlsx: '📊', pptx: '📑', mp4: '🎬', zip: '📦' } as any)[type] || '📁'; }
}

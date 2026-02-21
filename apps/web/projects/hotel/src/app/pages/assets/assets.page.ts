import { Component, inject, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ApiService, PageHeaderComponent, LoadingSpinnerComponent } from '@lodgik/shared';
@Component({
  selector: 'app-assets', standalone: true, imports: [FormsModule, PageHeaderComponent, LoadingSpinnerComponent],
  template: `
    <ui-page-header title="Asset Registry" subtitle="Track all property assets with QR codes">
      <button (click)="showForm = !showForm" class="px-4 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700">+ Register Asset</button>
    </ui-page-header>
    <ui-loading [loading]="loading()"></ui-loading>
    <div class="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
      @for (s of statusCounts(); track s[0]) {
        <div class="bg-white rounded-lg border p-4"><p class="text-xs text-gray-500 uppercase">{{s[0]}}</p><p class="text-2xl font-bold">{{s[1]}}</p></div>
      }
    </div>
    @if (showForm) {
      <div class="bg-white rounded-lg border p-6 mb-6">
        <h3 class="text-lg font-semibold mb-4">Register New Asset</h3>
        <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div><label class="block text-sm font-medium mb-1">Name</label><input type="text" [(ngModel)]="form.name" class="w-full border rounded-lg px-3 py-2 text-sm" placeholder="Samsung 55in TV"></div>
          <div><label class="block text-sm font-medium mb-1">Category</label>
            <select [(ngModel)]="form.category_id" class="w-full border rounded-lg px-3 py-2 text-sm">@for (c of categories(); track c.id) { <option [value]="c.id">{{c.name}}</option> }</select></div>
          <div><label class="block text-sm font-medium mb-1">Brand / Model</label><input type="text" [(ngModel)]="form.brand" class="w-full border rounded-lg px-3 py-2 text-sm"></div>
          <div><label class="block text-sm font-medium mb-1">Location (Room/Area)</label><input type="text" [(ngModel)]="form.room_number" class="w-full border rounded-lg px-3 py-2 text-sm" placeholder="Room 101 or Lobby"></div>
          <div><label class="block text-sm font-medium mb-1">Serial Number</label><input type="text" [(ngModel)]="form.serial_number" class="w-full border rounded-lg px-3 py-2 text-sm"></div>
          <div><label class="block text-sm font-medium mb-1">Criticality</label>
            <select [(ngModel)]="form.criticality" class="w-full border rounded-lg px-3 py-2 text-sm"><option value="low">Low</option><option value="medium">Medium</option><option value="high">High</option><option value="critical">Critical</option></select></div>
        </div>
        <div class="flex gap-2 mt-4"><button (click)="create()" class="px-4 py-2 bg-blue-600 text-white text-sm rounded-lg">Register</button><button (click)="showForm = false" class="px-4 py-2 bg-gray-200 text-sm rounded-lg">Cancel</button></div>
      </div>
    }
    <div class="bg-white rounded-lg border overflow-x-auto">
      <table class="w-full text-sm"><thead class="bg-gray-50"><tr>
        <th class="px-4 py-3 text-left font-medium text-gray-600">QR Code</th><th class="px-4 py-3 text-left font-medium text-gray-600">Name</th><th class="px-4 py-3 text-left font-medium text-gray-600">Location</th>
        <th class="px-4 py-3 text-left font-medium text-gray-600">Brand</th><th class="px-4 py-3 text-center font-medium text-gray-600">Criticality</th><th class="px-4 py-3 text-center font-medium text-gray-600">Status</th>
      </tr></thead><tbody>
        @for (a of assets(); track a.id) {
          <tr class="border-t hover:bg-gray-50">
            <td class="px-4 py-3 font-mono text-xs text-blue-600">{{a.qr_code}}</td><td class="px-4 py-3 font-medium">{{a.name}}</td><td class="px-4 py-3">{{a.room_number || a.floor || '-'}}</td>
            <td class="px-4 py-3">{{a.brand || '-'}}</td>
            <td class="px-4 py-3 text-center"><span [class]="'px-2 py-0.5 rounded text-xs font-medium ' + critClass(a.criticality)">{{a.criticality}}</span></td>
            <td class="px-4 py-3 text-center"><span [class]="'px-2 py-0.5 rounded text-xs font-medium ' + statClass(a.status)">{{a.status}}</span></td>
          </tr>
        } @empty { <tr><td colspan="6" class="px-4 py-8 text-center text-gray-400">No assets registered</td></tr> }
      </tbody></table>
    </div>
  `
})
export default class AssetsPage implements OnInit {
  private api = inject(ApiService); loading = signal(true); assets = signal<any[]>([]); categories = signal<any[]>([]); statusCounts = signal<any[]>([]);
  showForm = false; form: any = { name: '', category_id: '', brand: '', room_number: '', serial_number: '', criticality: 'medium' };
  ngOnInit() { this.api.get('/assets').subscribe((r: any) => { this.assets.set(r?.data || []); this.loading.set(false); });
    this.api.get('/assets/categories').subscribe((r: any) => this.categories.set(r?.data || []));
    this.api.get('/assets/status-counts').subscribe((r: any) => this.statusCounts.set(Object.entries(r?.data || {}))); }
  create() { this.api.post('/assets', this.form).subscribe(() => { this.showForm = false; this.ngOnInit(); }); }
  critClass(c: string): string { return { low: 'bg-gray-100 text-gray-700', medium: 'bg-yellow-100 text-yellow-700', high: 'bg-orange-100 text-orange-700', critical: 'bg-red-100 text-red-700' }[c] || ''; }
  statClass(s: string): string { return { active: 'bg-green-100 text-green-700', under_repair: 'bg-yellow-100 text-yellow-700', retired: 'bg-gray-100 text-gray-700', disposed: 'bg-red-100 text-red-700' }[s] || ''; }
}

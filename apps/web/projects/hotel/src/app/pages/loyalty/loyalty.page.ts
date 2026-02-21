import { Component, inject, OnInit, signal } from '@angular/core';
import { ApiService, PageHeaderComponent, LoadingSpinnerComponent } from '@lodgik/shared';
@Component({
  selector: 'app-loyalty', standalone: true, imports: [PageHeaderComponent, LoadingSpinnerComponent],
  template: `
    <ui-page-header title="Loyalty & Promotions" subtitle="CRM loyalty tiers, points, and promotional codes">
      <div class="flex gap-2">
        <button (click)="tab = 'tiers'" [class]="tab === 'tiers' ? 'bg-blue-600 text-white' : 'bg-gray-200'" class="px-3 py-2 text-sm rounded-lg">Tiers</button>
        <button (click)="tab = 'promos'" [class]="tab === 'promos' ? 'bg-blue-600 text-white' : 'bg-gray-200'" class="px-3 py-2 text-sm rounded-lg">Promotions</button>
      </div>
    </ui-page-header>
    <ui-loading [loading]="loading()"></ui-loading>
    @if (tab === 'tiers') {
      <div class="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4 mb-6">
        @for (t of tiers(); track t.id) {
          <div class="bg-white rounded-lg border p-4 text-center" [style.border-left-color]="t.color || '#ccc'" style="border-left-width: 4px">
            <p class="text-lg font-bold">{{t.name}}</p><p class="text-sm text-gray-500">{{t.min_points}} pts min</p>
            <p class="text-2xl font-bold text-blue-600 mt-2">{{t.discount_percentage}}%</p><p class="text-xs text-gray-400">discount</p>
          </div>
        } @empty { <p class="col-span-5 text-center text-gray-400 py-8">No loyalty tiers configured</p> }
      </div>
    }
    @if (tab === 'promos') {
      <div class="bg-white rounded-lg border overflow-x-auto"><table class="w-full text-sm"><thead class="bg-gray-50"><tr>
        <th class="px-4 py-3 text-left">Code</th><th class="px-4 py-3 text-left">Name</th><th class="px-4 py-3 text-left">Type</th>
        <th class="px-4 py-3 text-right">Value</th><th class="px-4 py-3 text-left">Period</th><th class="px-4 py-3 text-center">Used</th><th class="px-4 py-3 text-center">Active</th>
      </tr></thead><tbody>
        @for (p of promos(); track p.id) {
          <tr class="border-t hover:bg-gray-50"><td class="px-4 py-3 font-mono font-bold text-blue-600">{{p.code}}</td><td class="px-4 py-3">{{p.name}}</td><td class="px-4 py-3">{{p.type}}</td>
            <td class="px-4 py-3 text-right">{{p.type === 'percentage' ? p.value + '%' : '₦' + ((+p.value)/100).toLocaleString()}}</td>
            <td class="px-4 py-3">{{p.start_date}} → {{p.end_date}}</td><td class="px-4 py-3 text-center">{{p.usage_count}}{{p.usage_limit ? '/' + p.usage_limit : ''}}</td>
            <td class="px-4 py-3 text-center"><span [class]="p.is_active ? 'text-green-600' : 'text-gray-400'">{{p.is_active ? '●' : '○'}}</span></td></tr>
        } @empty { <tr><td colspan="7" class="px-4 py-8 text-center text-gray-400">No promotions</td></tr> }
      </tbody></table></div>
    }
  `
})
export default class LoyaltyPage implements OnInit {
  private api = inject(ApiService); loading = signal(true); tiers = signal<any[]>([]); promos = signal<any[]>([]); tab = 'tiers';
  ngOnInit() { this.api.get('/loyalty/tiers').subscribe((r: any) => { this.tiers.set(r?.data || []); this.loading.set(false); });
    this.api.get('/loyalty/promotions').subscribe((r: any) => this.promos.set(r?.data || [])); }
}

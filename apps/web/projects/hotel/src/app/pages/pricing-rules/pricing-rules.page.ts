import { Component, inject, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ApiService, PageHeaderComponent, LoadingSpinnerComponent } from '@lodgik/shared';

@Component({
  selector: 'app-pricing-rules',
  standalone: true,
  imports: [FormsModule, PageHeaderComponent, LoadingSpinnerComponent],
  template: `
    <ui-page-header title="Dynamic Pricing" subtitle="Automated rate adjustments based on demand, season, and occupancy">
      <button (click)="showForm = !showForm" class="px-4 py-2 bg-sage-600 text-white text-sm rounded-xl hover:bg-sage-700 transition-colors">+ New Rule</button>
    </ui-page-header>
    <ui-loading [loading]="loading()"></ui-loading>

    @if (showForm) {
      <div class="bg-white rounded-lg border p-6 mb-6">
        <h3 class="text-lg font-semibold mb-4">Create Pricing Rule</h3>
        <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div><label class="block text-sm font-medium text-gray-700 mb-1">Name</label><input type="text" [(ngModel)]="form.name" class="w-full border rounded-lg px-3 py-2 text-sm"></div>
          <div><label class="block text-sm font-medium text-gray-700 mb-1">Type</label>
            <select [(ngModel)]="form.rule_type" class="w-full border rounded-lg px-3 py-2 text-sm">
              <option value="occupancy">Occupancy-Based</option><option value="seasonal">Seasonal</option><option value="day_of_week">Day of Week</option><option value="last_minute">Last Minute</option><option value="early_bird">Early Bird</option>
            </select></div>
          <div><label class="block text-sm font-medium text-gray-700 mb-1">Adjustment (%)</label><input type="number" [(ngModel)]="form.adjustment_percentage" class="w-full border rounded-lg px-3 py-2 text-sm" placeholder="15 or -10"></div>
          <div><label class="block text-sm font-medium text-gray-700 mb-1">Priority</label><input type="number" [(ngModel)]="form.priority" class="w-full border rounded-lg px-3 py-2 text-sm" placeholder="1"></div>
          <div><label class="block text-sm font-medium text-gray-700 mb-1">Start Date</label><input type="date" [(ngModel)]="form.start_date" class="w-full border rounded-lg px-3 py-2 text-sm"></div>
          <div><label class="block text-sm font-medium text-gray-700 mb-1">End Date</label><input type="date" [(ngModel)]="form.end_date" class="w-full border rounded-lg px-3 py-2 text-sm"></div>
        </div>
        <div class="flex gap-2 mt-4">
          <button (click)="createRule()" class="px-4 py-2 bg-sage-600 text-white text-sm rounded-lg">Create</button>
          <button (click)="showForm = false" class="px-4 py-2 bg-gray-200 text-gray-700 text-sm rounded-lg">Cancel</button>
        </div>
      </div>
    }

    <div class="bg-white rounded-lg border overflow-x-auto">
      <table class="w-full text-sm">
        <thead class="bg-gray-50"><tr>
          <th class="px-4 py-3 text-left font-medium text-gray-600">Name</th><th class="px-4 py-3 text-left font-medium text-gray-600">Type</th>
          <th class="px-4 py-3 text-right font-medium text-gray-600">Adjustment</th><th class="px-4 py-3 text-center font-medium text-gray-600">Priority</th>
          <th class="px-4 py-3 text-left font-medium text-gray-600">Period</th><th class="px-4 py-3 text-center font-medium text-gray-600">Active</th>
        </tr></thead>
        <tbody>
          @for (r of rules(); track r.id) {
            <tr class="border-t hover:bg-gray-50">
              <td class="px-4 py-3 font-medium">{{r.name}}</td><td class="px-4 py-3">{{r.rule_type}}</td>
              <td class="px-4 py-3 text-right" [class.text-green-600]="r.adjustment_percentage > 0" [class.text-red-600]="r.adjustment_percentage < 0">{{r.adjustment_percentage > 0 ? '+' : ''}}{{r.adjustment_percentage}}%</td>
              <td class="px-4 py-3 text-center">{{r.priority}}</td>
              <td class="px-4 py-3">{{r.start_date || 'Always'}} {{r.end_date ? '→ ' + r.end_date : ''}}</td>
              <td class="px-4 py-3 text-center"><button (click)="toggle(r)" [class]="r.is_active ? 'bg-green-500' : 'bg-gray-300'" class="w-10 h-5 rounded-full relative"><span [class]="'absolute top-0.5 w-4 h-4 bg-white rounded-full transition-all ' + (r.is_active ? 'left-5' : 'left-0.5')"></span></button></td>
            </tr>
          } @empty { <tr><td colspan="6" class="px-4 py-8 text-center text-gray-400">No pricing rules configured</td></tr> }
        </tbody>
      </table>
    </div>
  `
})
export default class PricingRulesPage implements OnInit {
  private api = inject(ApiService);
  loading = signal(true); rules = signal<any[]>([]);
  showForm = false; form: any = { name: '', rule_type: 'occupancy', adjustment_percentage: '', priority: 1, start_date: '', end_date: '' };
  ngOnInit() { this.api.get('/pricing-rules').subscribe((r: any) => { this.rules.set(r?.data || []); this.loading.set(false); }); }
  createRule() { this.api.post('/pricing-rules', this.form).subscribe(() => { this.showForm = false; this.ngOnInit(); }); }
  toggle(r: any) { this.api.put(`/finance/pricing-rules/${r.id}`, { is_active: !r.is_active }).subscribe(() => this.ngOnInit()); }
}

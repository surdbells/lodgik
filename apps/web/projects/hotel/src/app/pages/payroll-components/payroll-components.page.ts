import { Component, inject, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ApiService, PageHeaderComponent, LoadingSpinnerComponent, ToastService } from '@lodgik/shared';

@Component({
  selector: 'app-payroll-components',
  standalone: true,
  imports: [FormsModule, PageHeaderComponent, LoadingSpinnerComponent],
  template: `
<ui-page-header title="Payroll Components" icon="layers" [breadcrumbs]="['HR', 'Payroll', 'Components']"
  subtitle="Configure salary structure: earnings, deductions and benefits">
  <button (click)="openAdd()" class="bg-sage-600 text-white px-4 py-2 text-sm rounded-xl hover:bg-sage-700">+ Add Component</button>
</ui-page-header>

<ui-loading [loading]="loading()"></ui-loading>

@if (!loading()) {
  @for (type of ['earning', 'deduction', 'benefit']; track type) {
    @let group = byType(type);
    @if (group.length > 0 || type === 'earning') {
      <div class="mb-6">
        <h3 class="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3 flex items-center gap-2">
          <span class="w-2 h-2 rounded-full" [class]="type==='earning'?'bg-emerald-500':type==='deduction'?'bg-red-400':'bg-blue-400'"></span>
          {{ capitalise(type) }}s
        </h3>
        @if (group.length === 0) {
          <p class="text-sm text-gray-400 italic pl-4">No {{ type }}s configured</p>
        } @else {
          <div class="bg-white rounded-xl border border-gray-100 shadow-card overflow-hidden">
            <table class="w-full text-sm">
              <thead class="bg-gray-50"><tr>
                <th class="px-4 py-3 text-left text-xs font-semibold text-gray-500">Name</th>
                <th class="px-4 py-3 text-left text-xs font-semibold text-gray-500">Code</th>
                <th class="px-4 py-3 text-left text-xs font-semibold text-gray-500">Calculation</th>
                <th class="px-4 py-3 text-right text-xs font-semibold text-gray-500">Value</th>
                <th class="px-4 py-3 text-left text-xs font-semibold text-gray-500">Taxable</th>
                <th class="px-4 py-3 text-left text-xs font-semibold text-gray-500">Status</th>
                <th class="px-4 py-3 text-left text-xs font-semibold text-gray-500">Actions</th>
              </tr></thead>
              <tbody>
                @for (c of group; track c.id) {
                  <tr class="border-t border-gray-50 hover:bg-gray-50">
                    <td class="px-4 py-3 font-medium">{{ c.name }}</td>
                    <td class="px-4 py-3 font-mono text-xs text-gray-500">{{ c.code }}</td>
                    <td class="px-4 py-3 text-xs text-gray-500">{{ fmtCalc(c.calculation) }}</td>
                    <td class="px-4 py-3 text-right font-medium">
                      @if (c.calculation === 'fixed') { ₦{{ (c.value / 100).toLocaleString() }} }
                      @else { {{ c.value }}% }
                    </td>
                    <td class="px-4 py-3">
                      <span class="text-xs px-2 py-0.5 rounded-full" [class]="c.is_taxable ? 'bg-amber-50 text-amber-700' : 'bg-gray-100 text-gray-500'">
                        {{ c.is_taxable ? 'Taxable' : 'Non-taxable' }}
                      </span>
                    </td>
                    <td class="px-4 py-3">
                      <span class="text-xs px-2 py-0.5 rounded-full" [class]="c.is_active ? 'bg-emerald-50 text-emerald-700' : 'bg-gray-100 text-gray-400'">
                        {{ c.is_active ? 'Active' : 'Inactive' }}
                      </span>
                    </td>
                    <td class="px-4 py-3">
                      <button (click)="openEdit(c)" class="text-xs text-sage-600 hover:underline mr-2">Edit</button>
                      <button (click)="toggle(c)" class="text-xs text-gray-400 hover:underline">{{ c.is_active ? 'Disable' : 'Enable' }}</button>
                    </td>
                  </tr>
                }
              </tbody>
            </table>
          </div>
        }
      </div>
    }
  }
}

<!-- Add/Edit Modal -->
@if (showForm) {
  <div class="fixed inset-0 bg-black/50 flex items-center justify-center z-50" (click)="showForm = false">
    <div class="bg-white rounded-2xl shadow-2xl w-full max-w-md p-5" (click)="$event.stopPropagation()">
      <h3 class="text-base font-semibold mb-4">{{ editing ? 'Edit' : 'Add' }} Component</h3>
      <div class="grid grid-cols-2 gap-3">
        <div class="col-span-2"><label class="text-xs text-gray-500 mb-1 block">Name *</label>
          <input [(ngModel)]="form.name" class="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm bg-gray-50"></div>
        <div><label class="text-xs text-gray-500 mb-1 block">Code *</label>
          <input [(ngModel)]="form.code" placeholder="e.g. BASIC" class="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm bg-gray-50"></div>
        <div><label class="text-xs text-gray-500 mb-1 block">Type</label>
          <select [(ngModel)]="form.component_type" class="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm bg-gray-50">
            <option value="earning">Earning</option>
            <option value="deduction">Deduction</option>
            <option value="benefit">Benefit</option>
          </select></div>
        <div><label class="text-xs text-gray-500 mb-1 block">Calculation</label>
          <select [(ngModel)]="form.calculation" class="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm bg-gray-50">
            <option value="fixed">Fixed Amount (₦)</option>
            <option value="percent_of_basic">% of Basic</option>
            <option value="percent_of_gross">% of Gross</option>
          </select></div>
        <div><label class="text-xs text-gray-500 mb-1 block">Value {{ form.calculation === 'fixed' ? '(₦)' : '(%)' }}</label>
          <input [(ngModel)]="form.value" type="number" class="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm bg-gray-50"></div>
        <div><label class="text-xs text-gray-500 mb-1 block">Sort Order</label>
          <input [(ngModel)]="form.sort_order" type="number" class="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm bg-gray-50"></div>
        <div class="col-span-2 flex items-center gap-4">
          <label class="flex items-center gap-2 cursor-pointer">
            <input [(ngModel)]="form.is_taxable" type="checkbox" class="rounded">
            <span class="text-sm text-gray-700">Taxable</span>
          </label>
          <label class="flex items-center gap-2 cursor-pointer">
            <input [(ngModel)]="form.is_active" type="checkbox" class="rounded">
            <span class="text-sm text-gray-700">Active</span>
          </label>
        </div>
      </div>
      <div class="flex justify-end gap-2 mt-4">
        <button (click)="showForm = false" class="px-4 py-2 text-sm border border-gray-200 rounded-xl text-gray-600 hover:bg-gray-50">Cancel</button>
        <button (click)="save()" class="px-4 py-2 text-sm bg-sage-600 text-white rounded-xl hover:bg-sage-700">{{ editing ? 'Update' : 'Create' }}</button>
      </div>
    </div>
  </div>
}
  `,
})
export class PayrollComponentsPage implements OnInit {
  private api   = inject(ApiService);
  private toast = inject(ToastService);

  loading    = signal(true);
  components = signal<any[]>([]);
  showForm   = false;
  editing: any = null;
  form: any  = { name: '', code: '', component_type: 'earning', calculation: 'fixed', value: 0, is_taxable: true, is_active: true, sort_order: 0 };

  ngOnInit() { this.load(); }
  load() {
    this.loading.set(true);
    this.api.get('/hr/payroll-components').subscribe({
      next: (r: any) => { this.components.set(r.data ?? []); this.loading.set(false); },
      error: () => this.loading.set(false),
    });
  }
  byType(t: string) { return this.components().filter(c => c.component_type === t).sort((a,b)=>a.sort_order-b.sort_order); }
  fmtCalc(v: string) { return { fixed: 'Fixed', percent_of_basic: '% of Basic', percent_of_gross: '% of Gross' }[v] ?? v; }

  openAdd() {
    this.editing = null;
    this.form = { name: '', code: '', component_type: 'earning', calculation: 'fixed', value: 0, is_taxable: true, is_active: true, sort_order: 0 };
    this.showForm = true;
  }
  openEdit(c: any) {
    this.editing = c;
    this.form = { ...c, value: c.calculation === 'fixed' ? c.value / 100 : c.value };
    this.showForm = true;
  }
  save() {
    const body = { ...this.form };
    if (body.calculation === 'fixed') body.value = Math.round(Number(body.value) * 100);
    const req = this.editing
      ? this.api.put(`/hr/payroll-components/${this.editing.id}`, body)
      : this.api.post('/hr/payroll-components', body);
    req.subscribe({
      next: (r: any) => { if (r.success) { this.toast.success(this.editing ? 'Updated' : 'Created'); this.showForm = false; this.load(); } else this.toast.error(r.message ?? 'Failed'); },
    });
  }
  toggle(c: any) {
    this.api.put(`/hr/payroll-components/${c.id}`, { is_active: !c.is_active }).subscribe({ next: () => this.load() });
  }
  capitalise(s: string): string { return s.charAt(0).toUpperCase() + s.slice(1); }

}

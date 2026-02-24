import { Component, inject, OnInit, signal, computed } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ApiService, PageHeaderComponent, DataTableComponent, TableColumn, TableAction, ToastService, LoadingSpinnerComponent, ConfirmDialogService, BadgeComponent } from '@lodgik/shared';

@Component({
  selector: 'app-plan-list',
  standalone: true,
  imports: [PageHeaderComponent, DataTableComponent, LoadingSpinnerComponent, FormsModule, BadgeComponent],
  template: `
    <ui-page-header title="Subscription Plans" icon="clipboard-list" [breadcrumbs]="['Overview', 'Plans']" subtitle="Manage pricing plans with module bundles">
      <button class="px-4 py-2 bg-sage-600 text-white text-sm font-medium rounded-lg hover:bg-sage-700" (click)="toggleCreate()">
        {{ showCreate ? 'Cancel' : '+ New Plan' }}
      </button>
    </ui-page-header>

    @if (showCreate) {
      <div class="bg-white rounded-xl border border-gray-100 shadow-card p-5 mb-6">
        <h3 class="text-sm font-semibold text-gray-700 mb-4">{{ editingId ? 'Edit Plan' : 'Create Plan' }}</h3>

        <!-- Basic info -->
        <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
          <div><label class="block text-xs font-medium text-gray-600 mb-1">Plan Name</label>
            <input [(ngModel)]="form.name" placeholder="Professional" class="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm bg-gray-50"></div>
          <div><label class="block text-xs font-medium text-gray-600 mb-1">Tier</label>
            <select [(ngModel)]="form.tier" class="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm bg-gray-50">
              <option value="starter">Starter</option><option value="professional">Professional</option><option value="enterprise">Enterprise</option><option value="custom">Custom</option>
            </select></div>
          <div><label class="block text-xs font-medium text-gray-600 mb-1">Monthly Price (NGN)</label>
            <input [(ngModel)]="form.monthly_price" type="number" class="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm bg-gray-50"></div>
          <div><label class="block text-xs font-medium text-gray-600 mb-1">Annual Price (NGN)</label>
            <input [(ngModel)]="form.annual_price" type="number" class="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm bg-gray-50"></div>
        </div>

        <!-- Limits -->
        <div class="grid grid-cols-1 sm:grid-cols-4 gap-4 mb-4">
          <div><label class="block text-xs font-medium text-gray-600 mb-1">Max Rooms</label>
            <input [(ngModel)]="form.max_rooms" type="number" class="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm bg-gray-50"></div>
          <div><label class="block text-xs font-medium text-gray-600 mb-1">Max Staff</label>
            <input [(ngModel)]="form.max_staff" type="number" class="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm bg-gray-50"></div>
          <div><label class="block text-xs font-medium text-gray-600 mb-1">Max Properties</label>
            <input [(ngModel)]="form.max_properties" type="number" class="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm bg-gray-50"></div>
          <div><label class="block text-xs font-medium text-gray-600 mb-1">Trial Days</label>
            <input [(ngModel)]="form.trial_days" type="number" class="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm bg-gray-50"></div>
        </div>

        <!-- Visibility -->
        <div class="flex items-center gap-6 mb-4 text-sm">
          <label class="flex items-center gap-2"><input type="checkbox" [(ngModel)]="form.is_public" class="rounded"> Public plan (visible on pricing page)</label>
          <label class="flex items-center gap-2"><input type="checkbox" [(ngModel)]="showPrivateTenant" class="rounded"> Private plan for specific tenant</label>
          @if (showPrivateTenant) {
            <input [(ngModel)]="form.for_tenant_id" placeholder="Tenant ID" class="px-3 py-1.5 border rounded-lg text-sm w-64">
          }
        </div>

        <!-- Module Selection -->
        <div class="mb-4">
          <div class="flex items-center justify-between mb-2">
            <label class="text-xs font-medium text-gray-600">Included Modules ({{ selectedModuleCount() }} selected)</label>
            <div class="flex gap-2">
              <button (click)="selectAllModules()" class="text-xs text-sage-600 hover:underline">Select All</button>
              <button (click)="selectCoreOnly()" class="text-xs text-gray-500 hover:underline">Core Only</button>
              <button (click)="clearModules()" class="text-xs text-red-500 hover:underline">Clear</button>
            </div>
          </div>
          @for (cat of moduleCategories(); track cat.name) {
            <div class="mb-3">
              <div class="text-xs font-semibold text-gray-500 uppercase mb-1">{{ cat.name }} ({{ cat.modules.length }})</div>
              <div class="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-1">
                @for (m of cat.modules; track m.module_key) {
                  <label class="flex items-center gap-2 px-2 py-1.5 rounded text-xs cursor-pointer hover:bg-gray-50"
                         [class.bg-sage-50]="form.included_modules.includes(m.module_key)"
                         [class.opacity-50]="m.is_core">
                    <input type="checkbox"
                           [checked]="form.included_modules.includes(m.module_key)"
                           [disabled]="m.is_core"
                           (change)="toggleModule(m.module_key, m)"
                           class="rounded text-sage-600">
                    <span>{{ m.icon || '📦' }}</span>
                    <span class="truncate">{{ m.name }}</span>
                    @if (m.is_core) { <span class="text-gray-400">(core)</span> }
                  </label>
                }
              </div>
            </div>
          }
        </div>

        @if (depWarnings().length) {
          <div class="bg-amber-50 border border-amber-200 rounded-lg p-3 mb-4 text-xs text-amber-800">
            <strong>Auto-resolved dependencies:</strong>
            @for (w of depWarnings(); track w) { <div>• {{ w }}</div> }
          </div>
        }

        <div class="flex gap-2">
          <button (click)="savePlan()" class="px-4 py-2 bg-sage-600 text-white text-sm rounded-lg hover:bg-sage-700">
            {{ editingId ? 'Update Plan' : 'Create Plan' }}
          </button>
          <button (click)="toggleCreate()" class="px-4 py-2 bg-gray-200 text-gray-700 text-sm rounded-lg">Cancel</button>
        </div>
      </div>
    }

    <ui-loading [loading]="loading()"></ui-loading>
    @if (!loading()) {
      <ui-data-table [columns]="columns" [data]="plans()" [actions]="actions" [totalItems]="total()"></ui-data-table>
    }
  `,
})
export class PlanListPage implements OnInit {
  private api = inject(ApiService);
  private toast = inject(ToastService);
  private confirm = inject(ConfirmDialogService);
  loading = signal(true);
  plans = signal<any[]>([]);
  total = signal(0);
  allModules = signal<any[]>([]);
  moduleCategories = signal<{ name: string; modules: any[] }[]>([]);
  showCreate = false;
  showPrivateTenant = false;
  editingId: string | null = null;
  depWarnings = signal<string[]>([]);

  form: any = this.emptyForm();

  selectedModuleCount = computed(() => this.form.included_modules?.length || 0);

  columns: TableColumn[] = [
    { key: 'name', label: 'Plan Name' },
    { key: 'tier', label: 'Tier' },
    { key: 'monthly_price', label: 'Monthly', align: 'right', render: (v: number) => `₦${(v || 0).toLocaleString()}` },
    { key: 'annual_price', label: 'Annual', align: 'right', render: (v: number) => `₦${(v || 0).toLocaleString()}` },
    { key: 'max_rooms', label: 'Rooms', align: 'center' },
    { key: 'max_staff', label: 'Staff', align: 'center' },
    { key: 'max_properties', label: 'Props', align: 'center' },
    { key: 'included_modules', label: 'Modules', align: 'center', render: (v: any[]) => `${v?.length || 0}` },
    { key: 'is_public', label: 'Public', align: 'center', render: (v: boolean) => v ? '✅' : '🔒' },
    { key: 'is_active', label: 'Active', align: 'center', render: (v: boolean) => v ? '●' : '○' },
  ];

  actions: TableAction[] = [
    { label: 'Edit', color: 'primary', handler: (row: any) => this.editPlan(row) },
    { label: 'Duplicate', color: 'primary', handler: (row: any) => this.duplicatePlan(row) },
    { label: 'Delete', color: 'danger', handler: (row: any) => this.deletePlan(row) },
  ];

  ngOnInit(): void { this.load(); this.loadModules(); }

  load(): void {
    this.loading.set(true);
    this.api.get('/admin/plans').subscribe({ next: r => { this.plans.set(r.data || []); this.total.set(r.data?.length || 0); this.loading.set(false); }, error: () => this.loading.set(false) });
  }

  loadModules(): void {
    this.api.get('/features/modules').subscribe(r => {
      if (r.success) {
        const mods = r.data || [];
        this.allModules.set(mods);
        const catMap = new Map<string, any[]>();
        mods.forEach((m: any) => { const cat = m.category || 'other'; if (!catMap.has(cat)) catMap.set(cat, []); catMap.get(cat)!.push(m); });
        this.moduleCategories.set(Array.from(catMap.entries()).map(([name, modules]) => ({ name, modules })));
      }
    });
  }

  emptyForm(): any {
    return { name: '', tier: 'starter', monthly_price: 0, annual_price: 0, max_rooms: 10, max_staff: 5, max_properties: 1, trial_days: 14, is_public: true, for_tenant_id: null, included_modules: ['auth', 'booking_engine', 'room_management', 'guest_management', 'dashboard'] };
  }

  toggleCreate(): void { this.showCreate = !this.showCreate; if (!this.showCreate) { this.editingId = null; this.form = this.emptyForm(); this.depWarnings.set([]); } }

  toggleModule(key: string, mod: any): void {
    const idx = this.form.included_modules.indexOf(key);
    if (idx >= 0) { this.form.included_modules.splice(idx, 1); }
    else {
      this.form.included_modules.push(key);
      // Auto-resolve dependencies
      this.resolveDependencies(mod);
    }
  }

  resolveDependencies(mod: any): void {
    const warnings: string[] = [];
    const deps = mod.dependencies || [];
    deps.forEach((depKey: string) => {
      if (!this.form.included_modules.includes(depKey)) {
        this.form.included_modules.push(depKey);
        const depMod = this.allModules().find(m => m.module_key === depKey);
        warnings.push(`"${mod.name}" requires "${depMod?.name || depKey}" — auto-enabled`);
      }
    });
    if (warnings.length) this.depWarnings.set([...this.depWarnings(), ...warnings]);
  }

  selectAllModules(): void { this.form.included_modules = this.allModules().map((m: any) => m.module_key); }
  selectCoreOnly(): void { this.form.included_modules = this.allModules().filter((m: any) => m.is_core).map((m: any) => m.module_key); }
  clearModules(): void { this.form.included_modules = this.allModules().filter((m: any) => m.is_core).map((m: any) => m.module_key); }

  savePlan(): void {
    const payload = { ...this.form, for_tenant_id: this.showPrivateTenant ? this.form.for_tenant_id : null };
    const req = this.editingId
      ? this.api.patch(`/admin/plans/${this.editingId}`, payload)
      : this.api.post('/admin/plans', payload);
    req.subscribe({ next: r => { if (r.success) { this.toast.success(this.editingId ? 'Plan updated' : 'Plan created'); this.toggleCreate(); this.load(); } else this.toast.error(r.message || 'Failed'); }, error: () => this.toast.error('Failed to save plan') });
  }

  editPlan(plan: any): void {
    this.editingId = plan.id;
    this.form = { ...plan, included_modules: [...(plan.included_modules || [])] };
    this.showPrivateTenant = !!plan.for_tenant_id;
    this.showCreate = true;
    this.depWarnings.set([]);
  }

  async duplicatePlan(plan: any): Promise<void> {
    this.api.post(`/admin/plans/${plan.id}/duplicate`, {}).subscribe({ next: r => { if (r.success) { this.toast.success('Plan duplicated'); this.load(); } }, error: () => this.toast.error('Failed') });
  }

  async deletePlan(plan: any): Promise<void> {
    const ok = await this.confirm.confirm({ title: 'Delete Plan', message: `Delete "${plan.name}"? This cannot be undone.`, confirmLabel: 'Delete', variant: 'danger' });
    if (ok) this.api.delete(`/admin/plans/${plan.id}`).subscribe({ next: () => { this.toast.success('Plan deleted'); this.load(); } });
  }
}

import { Component, inject, OnInit, signal } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { ApiService, PageHeaderComponent, StatsCardComponent, LoadingSpinnerComponent, ToastService, BadgeComponent, ConfirmDialogService } from '@lodgik/shared';
import { DonutChartComponent, BarChartComponent, ChartDataPoint } from '@lodgik/charts';

@Component({
  selector: 'app-tenant-detail',
  standalone: true,
  imports: [PageHeaderComponent, StatsCardComponent, LoadingSpinnerComponent, BadgeComponent, DonutChartComponent, BarChartComponent, FormsModule],
  template: `
    <ui-page-header [title]="t.name || 'Tenant'" subtitle="Tenant management & overview">
      <div class="flex gap-2">
        @if (t.is_active) {
          <button class="px-3 py-1.5 text-sm text-red-600 border border-red-200 rounded-lg hover:bg-red-50" (click)="suspend()">Suspend</button>
        } @else {
          <button class="px-3 py-1.5 text-sm text-sage-600 border border-emerald-200 rounded-lg hover:bg-sage-50" (click)="activate()">Activate</button>
        }
        <button class="px-3 py-1.5 text-sm text-indigo-600 border border-indigo-200 rounded-lg hover:bg-indigo-50" (click)="impersonate()">🎭 Impersonate</button>
        <button class="px-3 py-1.5 text-sm text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-50" (click)="router.navigate(['/tenants'])">← Back</button>
      </div>
    </ui-page-header>

    <ui-loading [loading]="loading()"></ui-loading>

    @if (!loading()) {
      <!-- Stats Row -->
      <div class="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 mb-6">
        <ui-stats-card label="Status" [value]="t.subscription_status" icon="clipboard-list"></ui-stats-card>
        <ui-stats-card label="Plan" [value]="t.plan_name || 'None'" icon="star"></ui-stats-card>
        <ui-stats-card label="Rooms" [value]="(usage()?.rooms?.used || 0) + '/' + t.max_rooms" icon="bed-double"></ui-stats-card>
        <ui-stats-card label="Staff" [value]="(usage()?.staff?.used || 0) + '/' + t.max_staff" icon="users"></ui-stats-card>
        <ui-stats-card label="Properties" [value]="(usage()?.properties?.used || 0) + '/' + t.max_properties" icon="hotel"></ui-stats-card>
        <ui-stats-card label="Active" [value]="t.is_active ? 'Yes' : 'Suspended'" [icon]="t.is_active ? '✅' : '🚫'"></ui-stats-card>
      </div>

      <div class="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
        <!-- Tenant Info -->
        <div class="bg-white rounded-xl border border-gray-100 shadow-card p-5">
          <h3 class="text-sm font-semibold text-gray-700 mb-3">Tenant Info</h3>
          <div class="space-y-2 text-sm">
            <div class="flex justify-between"><span class="text-gray-500">Email</span><span>{{ t.email || '—' }}</span></div>
            <div class="flex justify-between"><span class="text-gray-500">Phone</span><span>{{ t.phone || '—' }}</span></div>
            <div class="flex justify-between"><span class="text-gray-500">Slug</span><span class="font-mono text-xs">{{ t.slug }}</span></div>
            <div class="flex justify-between"><span class="text-gray-500">Locale</span><span>{{ t.locale }}</span></div>
            <div class="flex justify-between"><span class="text-gray-500">Timezone</span><span>{{ t.timezone }}</span></div>
            <div class="flex justify-between"><span class="text-gray-500">Currency</span><span>{{ t.currency }}</span></div>
            <div class="flex justify-between"><span class="text-gray-500">Created</span><span>{{ t.created_at }}</span></div>
            @if (t.trial_ends_at) {
              <div class="flex justify-between"><span class="text-gray-500">Trial Ends</span><span>{{ t.trial_ends_at }}</span></div>
            }
            @if (t.subscription_ends_at) {
              <div class="flex justify-between"><span class="text-gray-500">Sub Ends</span><span>{{ t.subscription_ends_at }}</span></div>
            }
          </div>
          <!-- Branding preview -->
          @if (t.primary_color || t.logo_url) {
            <div class="mt-4 pt-3 border-t">
              <h4 class="text-xs font-medium text-gray-500 mb-2">Branding</h4>
              <div class="flex items-center gap-3">
                @if (t.logo_url) { <img [src]="t.logo_url" class="w-10 h-10 rounded object-contain bg-gray-50 border"> }
                @if (t.primary_color) { <div class="w-8 h-8 rounded-full border" [style.background-color]="t.primary_color"></div> }
                @if (t.secondary_color) { <div class="w-8 h-8 rounded-full border" [style.background-color]="t.secondary_color"></div> }
              </div>
            </div>
          }
        </div>

        <!-- Usage Chart -->
        <div class="bg-white rounded-xl border border-gray-100 shadow-card p-5">
          <h3 class="text-sm font-semibold text-gray-700 mb-3">Resource Usage</h3>
          @if (usageData().length) {
            <chart-donut [data]="usageData()" centerValue="" centerLabel="usage" [height]="200"></chart-donut>
          }
          <!-- Usage bars -->
          <div class="mt-4 space-y-3">
            @if (usage()) {
              @for (r of ['rooms', 'staff', 'properties']; track r) {
                <div>
                  <div class="flex justify-between text-xs text-gray-600 mb-1"><span class="capitalize">{{ r }}</span><span>{{ usage()[r]?.used || 0 }}/{{ usage()[r]?.limit || 0 }} ({{ usage()[r]?.percent || 0 }}%)</span></div>
                  <div class="w-full h-2 bg-gray-200 rounded-full"><div class="h-2 rounded-full transition-all" [style.width.%]="usage()[r]?.percent || 0" [class]="(usage()[r]?.percent || 0) > 80 ? 'bg-red-500' : 'bg-sage-500'"></div></div>
                </div>
              }
            }
          </div>
        </div>

        <!-- Assign Plan -->
        <div class="bg-white rounded-xl border border-gray-100 shadow-card p-5">
          <h3 class="text-sm font-semibold text-gray-700 mb-3">Subscription</h3>
          <div class="mb-3">
            <label class="block text-xs text-gray-500 mb-1">Assign Plan</label>
            <select [(ngModel)]="selectedPlanId" class="w-full px-3 py-2 border rounded-lg text-sm">
              <option value="">— Select —</option>
              @for (p of availPlans(); track p.id) { <option [value]="p.id">{{ p.name }} ({{ p.tier }})</option> }
            </select>
            <button (click)="assignPlan()" [disabled]="!selectedPlanId" class="mt-2 w-full px-3 py-2 bg-sage-600 text-white text-sm rounded-lg hover:bg-sage-700 disabled:opacity-50">Assign Plan</button>
          </div>
          <div class="text-xs text-gray-400 space-y-1 mt-4">
            <p>Paystack Customer: {{ t.paystack_customer_code || '—' }}</p>
            <p>Paystack Sub: {{ t.paystack_subscription_code || '—' }}</p>
          </div>
        </div>
      </div>

      <!-- Feature Toggles -->
      <div class="bg-white rounded-xl border border-gray-100 shadow-card p-5 mb-6">
        <div class="flex items-center justify-between mb-3">
          <h3 class="text-sm font-semibold text-gray-700">Feature Modules ({{ enabledModules().length }} enabled)</h3>
        </div>
        <div class="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2">
          @for (m of tenantModules(); track m.module_key) {
            <label class="flex items-center gap-2 px-2 py-1.5 rounded text-xs cursor-pointer hover:bg-gray-50"
                   [class.bg-sage-50]="m.is_enabled" [class.bg-gray-50]="!m.is_enabled">
              <input type="checkbox" [checked]="m.is_enabled" (change)="toggleFeature(m)" class="rounded text-sage-600" [disabled]="m.is_core">
              <span>{{ m.name }}</span>
              @if (m.is_core) { <span class="text-gray-400">(core)</span> }
            </label>
          }
        </div>
      </div>
    }
  `,
})
export class TenantDetailPage implements OnInit {
  private api = inject(ApiService);
  private route = inject(ActivatedRoute);
  private toast = inject(ToastService);
  private confirm = inject(ConfirmDialogService);
  router = inject(Router);

  loading = signal(true);
  t: any = {};
  usage = signal<any>(null);
  usageData = signal<ChartDataPoint[]>([]);
  tenantModules = signal<any[]>([]);
  enabledModules = signal<string[]>([]);
  availPlans = signal<any[]>([]);
  selectedPlanId = '';

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('id')!;
    this.api.get(`/admin/tenants/${id}`).subscribe({
      next: r => {
        if (r.success) {
          this.t = r.data;
          this.loadUsage(id);
          this.loadModules(id);
          this.loadPlans();
        }
        this.loading.set(false);
      },
      error: () => this.loading.set(false),
    });
  }

  loadUsage(id: string): void {
    this.api.get(`/admin/tenants/${id}/usage`).subscribe(r => {
      if (r.success) {
        this.usage.set(r.data);
        this.usageData.set([
          { label: 'Rooms', value: r.data.rooms?.percent || 0, color: '#3b82f6' },
          { label: 'Staff', value: r.data.staff?.percent || 0, color: '#10b981' },
          { label: 'Properties', value: r.data.properties?.percent || 0, color: '#f59e0b' },
        ]);
      }
    });
  }

  loadModules(id: string): void {
    this.api.get(`/admin/tenants/${id}/features`).subscribe(r => {
      if (r.success) {
        this.tenantModules.set(r.data.modules || []);
        this.enabledModules.set(r.data.enabled_modules || []);
      }
    });
  }

  loadPlans(): void {
    this.api.get('/admin/plans').subscribe(r => { if (r.success) this.availPlans.set(r.data || []); });
  }

  async suspend(): Promise<void> {
    const ok = await this.confirm.confirm({ title: 'Suspend Tenant', message: `Suspend "${this.t.name}"? They will lose access.`, confirmLabel: 'Suspend', variant: 'danger' });
    if (ok) this.api.patch(`/admin/tenants/${this.t.id}/suspend`).subscribe(r => { if (r.success) { this.t.is_active = false; this.toast.success('Tenant suspended'); } });
  }

  activate(): void {
    this.api.patch(`/admin/tenants/${this.t.id}/activate`).subscribe(r => { if (r.success) { this.t.is_active = true; this.toast.success('Tenant activated'); } });
  }

  impersonate(): void {
    this.api.post(`/admin/tenants/${this.t.id}/impersonate`, {}).subscribe(r => {
      if (r.success) {
        // Store admin token for later restore, set impersonated token
        localStorage.setItem('lodgik_admin_backup_token', localStorage.getItem('lodgik_access_token') || '');
        localStorage.setItem('lodgik_access_token', r.data.access_token);
        localStorage.setItem('lodgik_refresh_token', r.data.refresh_token);
        localStorage.setItem('lodgik_user', JSON.stringify(r.data.user));
        this.toast.success(`Impersonating ${this.t.name}`);
        window.open('/dashboard', '_blank');
      } else this.toast.error('Impersonation not available');
    });
  }

  assignPlan(): void {
    this.api.post(`/admin/tenants/${this.t.id}/assign-plan`, { plan_id: this.selectedPlanId }).subscribe(r => {
      if (r.success) { this.toast.success('Plan assigned'); this.ngOnInit(); }
      else this.toast.error(r.message || 'Failed');
    });
  }

  toggleFeature(m: any): void {
    const action = m.is_enabled ? 'disable' : 'enable';
    this.api.post(`/admin/tenants/${this.t.id}/features/${action}/${m.module_key}`, {}).subscribe(r => {
      if (r.success) { m.is_enabled = !m.is_enabled; this.toast.success(`${m.name} ${action}d`); }
    });
  }
}

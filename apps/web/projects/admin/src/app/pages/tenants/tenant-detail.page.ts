import { Component, inject, OnInit, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { ApiService, PageHeaderComponent, StatsCardComponent, BadgeComponent, LoadingSpinnerComponent, ToastService, ConfirmDialogService } from '@lodgik/shared';
import { DonutChartComponent, ChartDataPoint } from '@lodgik/charts';

@Component({
  selector: 'app-tenant-detail',
  standalone: true,
  imports: [PageHeaderComponent, StatsCardComponent, BadgeComponent, LoadingSpinnerComponent, DonutChartComponent, DatePipe],
  template: `
    <ui-page-header [title]="tenant()?.name || 'Tenant'" [breadcrumbs]="['Tenants', tenant()?.name || '']">
      <button class="px-3 py-1.5 text-sm border border-gray-300 rounded-lg hover:bg-gray-50" (click)="back()">← Back</button>
      @if (tenant()?.is_active) {
        <button class="px-3 py-1.5 text-sm text-red-600 border border-red-200 rounded-lg hover:bg-red-50" (click)="suspend()">Suspend</button>
      } @else {
        <button class="px-3 py-1.5 text-sm text-emerald-600 border border-emerald-200 rounded-lg hover:bg-emerald-50" (click)="activate()">Activate</button>
      }
    </ui-page-header>

    <ui-loading [loading]="loading()"></ui-loading>

    @if (!loading() && tenant(); as t) {
      <!-- Info cards -->
      <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <ui-stats-card label="Status" [value]="t.subscription_status" icon="📋"></ui-stats-card>
        <ui-stats-card label="Plan" [value]="t.plan_name || 'None'" icon="💎"></ui-stats-card>
        <ui-stats-card label="Max Rooms" [value]="t.max_rooms" icon="🛏️"></ui-stats-card>
        <ui-stats-card label="Max Staff" [value]="t.max_staff" icon="👥"></ui-stats-card>
      </div>

      <!-- Details grid -->
      <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div class="bg-white rounded-lg border border-gray-200 p-5">
          <h3 class="text-sm font-semibold text-gray-700 mb-4">Tenant Details</h3>
          <dl class="space-y-3 text-sm">
            <div class="flex justify-between"><dt class="text-gray-500">Email</dt><dd class="text-gray-800">{{ t.email || '—' }}</dd></div>
            <div class="flex justify-between"><dt class="text-gray-500">Phone</dt><dd class="text-gray-800">{{ t.phone || '—' }}</dd></div>
            <div class="flex justify-between"><dt class="text-gray-500">Slug</dt><dd class="text-gray-800 font-mono">{{ t.slug }}</dd></div>
            <div class="flex justify-between"><dt class="text-gray-500">Trial Ends</dt><dd class="text-gray-800">{{ t.trial_ends_at ? (t.trial_ends_at | date) : '—' }}</dd></div>
            <div class="flex justify-between"><dt class="text-gray-500">Created</dt><dd class="text-gray-800">{{ t.created_at | date }}</dd></div>
          </dl>
        </div>

        <div class="bg-white rounded-lg border border-gray-200 p-5">
          <h3 class="text-sm font-semibold text-gray-700 mb-4">Usage</h3>
          @if (usage()) {
            <chart-donut [data]="usageData()" centerValue="" centerLabel="usage" [height]="160"></chart-donut>
          }
        </div>
      </div>
    }
  `,
})
export class TenantDetailPage implements OnInit {
  private api = inject(ApiService);
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private toast = inject(ToastService);
  private confirm = inject(ConfirmDialogService);

  loading = signal(true);
  tenant = signal<any>(null);
  usage = signal<any>(null);
  usageData = signal<ChartDataPoint[]>([]);

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('id');
    if (!id) return;
    this.api.get(`/admin/tenants/${id}`).subscribe({
      next: res => {
        if (res.success) this.tenant.set(res.data);
        this.loading.set(false);
      },
      error: () => this.loading.set(false),
    });
  }

  back(): void { this.router.navigate(['/tenants']); }

  async suspend(): Promise<void> {
    const ok = await this.confirm.confirm({ title: 'Suspend Tenant', message: 'This will block all access for this hotel.', variant: 'danger', confirmLabel: 'Suspend' });
    if (!ok) return;
    this.api.patch(`/admin/tenants/${this.tenant().id}/suspend`).subscribe(res => {
      if (res.success) { this.toast.success('Tenant suspended'); this.tenant.update((t: any) => ({ ...t, is_active: false, subscription_status: 'suspended' })); }
    });
  }

  activate(): void {
    this.api.patch(`/admin/tenants/${this.tenant().id}/activate`).subscribe(res => {
      if (res.success) { this.toast.success('Tenant activated'); this.tenant.update((t: any) => ({ ...t, is_active: true, subscription_status: 'active' })); }
    });
  }
}

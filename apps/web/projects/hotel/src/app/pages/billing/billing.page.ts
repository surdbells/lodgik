import { Component, inject, OnInit, signal } from '@angular/core';
import { ApiService, PageHeaderComponent, StatsCardComponent, LoadingSpinnerComponent } from '@lodgik/shared';

@Component({
  selector: 'app-billing',
  standalone: true,
  imports: [PageHeaderComponent, StatsCardComponent, LoadingSpinnerComponent],
  template: `
    <ui-page-header title="Billing & Subscription" subtitle="Manage your plan and payments"></ui-page-header>
    <ui-loading [loading]="loading()"></ui-loading>

    @if (!loading()) {
      <div class="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        <ui-stats-card label="Current Plan" [value]="limits().plan?.name || 'Free'" icon="💎"></ui-stats-card>
        <ui-stats-card label="Plan Tier" [value]="limits().plan?.tier || '—'" icon="📊"></ui-stats-card>
        <ui-stats-card label="Status" [value]="tenant().subscription_status || '—'" icon="📋"></ui-stats-card>
      </div>

      <div class="bg-white rounded-lg border border-gray-200 p-5 mb-6">
        <h3 class="text-sm font-semibold text-gray-700 mb-3">Plan Limits</h3>
        <div class="grid grid-cols-3 gap-4 text-sm">
          <div>
            <span class="text-gray-500">Max Rooms</span>
            <div class="text-lg font-bold text-gray-800">{{ limits().limits?.max_rooms || 0 }}</div>
          </div>
          <div>
            <span class="text-gray-500">Max Staff</span>
            <div class="text-lg font-bold text-gray-800">{{ limits().limits?.max_staff || 0 }}</div>
          </div>
          <div>
            <span class="text-gray-500">Max Properties</span>
            <div class="text-lg font-bold text-gray-800">{{ limits().limits?.max_properties || 0 }}</div>
          </div>
        </div>
      </div>

      <div class="bg-white rounded-lg border border-gray-200 p-5">
        <h3 class="text-sm font-semibold text-gray-700 mb-3">Available Plans</h3>
        <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          @for (plan of plans(); track plan.id) {
            <div class="border rounded-lg p-4" [class.border-blue-500]="plan.id === limits().plan?.id" [class.border-gray-200]="plan.id !== limits().plan?.id">
              <h4 class="font-semibold text-gray-800">{{ plan.name }}</h4>
              <div class="text-lg font-bold text-blue-700 mt-1">₦{{ plan.monthly_price?.toLocaleString() }}<span class="text-xs text-gray-500 font-normal">/mo</span></div>
              <ul class="mt-2 text-xs text-gray-500 space-y-1">
                <li>{{ plan.max_rooms }} rooms</li>
                <li>{{ plan.max_staff }} staff</li>
                <li>{{ plan.max_properties }} properties</li>
              </ul>
              @if (plan.id !== limits().plan?.id) {
                <button class="mt-3 w-full py-1.5 text-xs font-medium bg-blue-50 text-blue-700 rounded hover:bg-blue-100">Upgrade</button>
              } @else {
                <div class="mt-3 w-full py-1.5 text-xs font-medium text-center text-emerald-700 bg-emerald-50 rounded">Current Plan</div>
              }
            </div>
          }
        </div>
      </div>
    }
  `,
})
export class BillingPage implements OnInit {
  private api = inject(ApiService);
  loading = signal(true);
  limits = signal<any>({});
  tenant = signal<any>({});
  plans = signal<any[]>([]);

  ngOnInit(): void {
    this.api.get('/usage/limits').subscribe({ next: r => { if (r.success) this.limits.set(r.data); this.loading.set(false); }, error: () => this.loading.set(false) });
    this.api.get('/tenant/current').subscribe(r => { if (r.success) this.tenant.set(r.data); });
    this.api.get('/plans').subscribe(r => { if (r.success) this.plans.set(r.data); });
  }
}

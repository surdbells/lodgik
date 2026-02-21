import { Component, inject, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ApiService, PageHeaderComponent, StatsCardComponent, LoadingSpinnerComponent, ToastService, ConfirmDialogService, BadgeComponent } from '@lodgik/shared';

@Component({
  selector: 'app-billing',
  standalone: true,
  imports: [PageHeaderComponent, StatsCardComponent, LoadingSpinnerComponent, FormsModule, BadgeComponent],
  template: `
    <ui-page-header title="Billing & Subscription" subtitle="Manage your plan, payments, and invoices"></ui-page-header>
    <ui-loading [loading]="loading()"></ui-loading>

    @if (!loading()) {
      <!-- Current Plan Stats -->
      <div class="grid grid-cols-1 sm:grid-cols-4 gap-4 mb-6">
        <ui-stats-card label="Current Plan" [value]="currentPlan()?.name || 'Free'" icon="💎"></ui-stats-card>
        <ui-stats-card label="Status" [value]="subscription().status || tenant().subscription_status || '—'" icon="📋"></ui-stats-card>
        <ui-stats-card label="Billing Cycle" [value]="subscription().billing_cycle || '—'" icon="🔄"></ui-stats-card>
        <ui-stats-card label="Next Payment" [value]="subscription().next_payment_date || '—'" icon="📅"></ui-stats-card>
      </div>

      <!-- Plan Limits & Usage -->
      <div class="bg-white rounded-lg border border-gray-200 p-5 mb-6">
        <h3 class="text-sm font-semibold text-gray-700 mb-3">Usage & Limits</h3>
        <div class="grid grid-cols-3 gap-6">
          @for (r of ['rooms', 'staff', 'properties']; track r) {
            <div>
              <div class="flex justify-between text-sm mb-1"><span class="text-gray-600 capitalize">{{ r }}</span><span class="font-medium">{{ usage()[r]?.used || 0 }} / {{ usage()[r]?.limit || 0 }}</span></div>
              <div class="w-full h-3 bg-gray-200 rounded-full"><div class="h-3 rounded-full transition-all" [style.width.%]="usage()[r]?.percent || 0" [class]="(usage()[r]?.percent || 0) > 80 ? 'bg-red-500' : 'bg-blue-500'"></div></div>
              <p class="text-xs text-gray-400 mt-1">{{ usage()[r]?.percent || 0 }}% used</p>
            </div>
          }
        </div>
      </div>

      <!-- Available Plans -->
      <div class="bg-white rounded-lg border border-gray-200 p-5 mb-6">
        <h3 class="text-sm font-semibold text-gray-700 mb-3">Available Plans</h3>
        <div class="flex items-center gap-3 mb-4">
          <button (click)="billingCycle = 'monthly'" [class]="billingCycle === 'monthly' ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-600'" class="px-3 py-1.5 text-sm rounded-lg">Monthly</button>
          <button (click)="billingCycle = 'annually'" [class]="billingCycle === 'annually' ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-600'" class="px-3 py-1.5 text-sm rounded-lg">Annual <span class="text-xs">(save ~17%)</span></button>
        </div>
        <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          @for (plan of plans(); track plan.id) {
            <div class="border rounded-lg p-5 relative" [class.border-blue-500]="plan.id === currentPlan()?.id" [class.ring-2]="plan.id === currentPlan()?.id" [class.ring-blue-200]="plan.id === currentPlan()?.id">
              @if (plan.id === currentPlan()?.id) { <div class="absolute -top-2.5 left-4 px-2 py-0.5 bg-blue-600 text-white text-xs rounded">Current</div> }
              <h4 class="font-semibold text-gray-800">{{ plan.name }}</h4>
              <p class="text-xs text-gray-500 mb-2">{{ plan.tier }}</p>
              <div class="text-2xl font-bold text-blue-700">
                ₦{{ billingCycle === 'monthly' ? plan.monthly_price?.toLocaleString() : plan.annual_price?.toLocaleString() }}
                <span class="text-xs text-gray-500 font-normal">/{{ billingCycle === 'monthly' ? 'mo' : 'yr' }}</span>
              </div>
              <ul class="mt-3 text-xs text-gray-600 space-y-1">
                <li>🛏️ {{ plan.max_rooms }} rooms</li>
                <li>👥 {{ plan.max_staff }} staff</li>
                <li>🏢 {{ plan.max_properties }} properties</li>
                <li>📦 {{ plan.included_modules?.length || 0 }} modules</li>
              </ul>
              @if (plan.id !== currentPlan()?.id) {
                <button (click)="checkout(plan)" class="mt-4 w-full py-2 text-sm font-medium bg-blue-600 text-white rounded-lg hover:bg-blue-700">
                  {{ isUpgrade(plan) ? 'Upgrade' : 'Switch' }} to {{ plan.name }}
                </button>
              }
            </div>
          }
        </div>
      </div>

      <!-- Invoice History -->
      <div class="bg-white rounded-lg border border-gray-200 p-5 mb-6">
        <h3 class="text-sm font-semibold text-gray-700 mb-3">Invoice History</h3>
        <table class="w-full text-sm">
          <thead class="bg-gray-50"><tr>
            <th class="px-3 py-2 text-left font-medium text-gray-600">Date</th>
            <th class="px-3 py-2 text-left font-medium text-gray-600">Description</th>
            <th class="px-3 py-2 text-right font-medium text-gray-600">Amount</th>
            <th class="px-3 py-2 text-center font-medium text-gray-600">Status</th>
          </tr></thead>
          <tbody>
            @for (inv of invoices(); track inv.id) {
              <tr class="border-t hover:bg-gray-50">
                <td class="px-3 py-2">{{ inv.paid_at || inv.created_at }}</td>
                <td class="px-3 py-2">{{ inv.description || 'Subscription payment' }}</td>
                <td class="px-3 py-2 text-right font-medium">₦{{ (inv.amount / 100).toLocaleString() }}</td>
                <td class="px-3 py-2 text-center"><ui-badge [variant]="inv.status === 'paid' ? 'success' : inv.status === 'pending' ? 'warning' : 'danger'">{{ inv.status }}</ui-badge></td>
              </tr>
            } @empty { <tr><td colspan="4" class="px-3 py-6 text-center text-gray-400">No invoices yet</td></tr> }
          </tbody>
        </table>
      </div>

      <!-- Cancel -->
      @if (subscription().status === 'active') {
        <div class="bg-red-50 border border-red-200 rounded-lg p-5">
          <h3 class="text-sm font-semibold text-red-700 mb-1">Cancel Subscription</h3>
          <p class="text-xs text-red-600 mb-3">Your access will continue until the end of the current billing period.</p>
          <button (click)="cancelSubscription()" class="px-4 py-2 bg-red-600 text-white text-sm rounded-lg hover:bg-red-700">Cancel Subscription</button>
        </div>
      }
    }
  `,
})
export class BillingPage implements OnInit {
  private api = inject(ApiService);
  private toast = inject(ToastService);
  private confirm = inject(ConfirmDialogService);

  loading = signal(true);
  tenant = signal<any>({});
  subscription = signal<any>({});
  currentPlan = signal<any>(null);
  usage = signal<any>({});
  plans = signal<any[]>([]);
  invoices = signal<any[]>([]);
  billingCycle: 'monthly' | 'annually' = 'monthly';

  ngOnInit(): void {
    // Load all data
    this.api.get('/subscriptions/current').subscribe(r => { if (r.success) { this.subscription.set(r.data); this.currentPlan.set(r.data.plan || null); } });
    this.api.get('/usage/current').subscribe(r => { if (r.success) this.usage.set(r.data); });
    this.api.get('/tenant/current').subscribe(r => { if (r.success) this.tenant.set(r.data); });
    this.api.get('/plans').subscribe(r => { if (r.success) this.plans.set(r.data || []); this.loading.set(false); });
    this.api.get('/subscriptions/invoices').subscribe(r => { if (r.success) this.invoices.set(r.data || []); });
  }

  isUpgrade(plan: any): boolean {
    const tiers = ['starter', 'professional', 'enterprise', 'custom'];
    return tiers.indexOf(plan.tier) > tiers.indexOf(this.currentPlan()?.tier || 'starter');
  }

  checkout(plan: any): void {
    this.api.post('/subscriptions/initialize', { plan_id: plan.id, billing_cycle: this.billingCycle }).subscribe({
      next: r => {
        if (r.success && r.data?.authorization_url) {
          // Redirect to Paystack checkout
          window.location.href = r.data.authorization_url;
        } else if (r.success && r.data?.reference) {
          // Direct upgrade (already has payment method)
          this.api.post('/subscriptions/verify', { reference: r.data.reference }).subscribe(vr => {
            if (vr.success) { this.toast.success('Plan upgraded!'); this.ngOnInit(); }
          });
        } else {
          this.toast.error(r.message || 'Failed to start checkout');
        }
      },
      error: () => this.toast.error('Failed to start checkout'),
    });
  }

  async cancelSubscription(): Promise<void> {
    const ok = await this.confirm.confirm({
      title: 'Cancel Subscription',
      message: 'Are you sure? You will lose access to premium features at the end of the billing period.',
      confirmLabel: 'Cancel Subscription',
      variant: 'danger',
    });
    if (ok) {
      this.api.post('/subscriptions/cancel', {}).subscribe({
        next: r => { if (r.success) { this.toast.success('Subscription cancelled'); this.ngOnInit(); } else this.toast.error(r.message || 'Failed'); },
      });
    }
  }
}

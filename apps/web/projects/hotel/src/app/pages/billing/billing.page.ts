import { Component, inject, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { ApiService, PageHeaderComponent, StatsCardComponent, LoadingSpinnerComponent, ToastService, BadgeComponent } from '@lodgik/shared';

@Component({
  selector: 'app-billing',
  standalone: true,
  imports: [PageHeaderComponent, StatsCardComponent, LoadingSpinnerComponent, FormsModule, BadgeComponent],
  template: `
    <ui-page-header title="Billing & Subscription" subtitle="Manage your plan, payments, and invoices">
      <div class="flex gap-2">
        <button (click)="tab = 'plan'" [class]="tab === 'plan' ? 'bg-sage-600 text-white' : 'bg-gray-200 text-gray-700'" class="px-3 py-2 text-sm rounded-lg">Plan</button>
        <button (click)="tab = 'invoices'; loadInvoices()" [class]="tab === 'invoices' ? 'bg-sage-600 text-white' : 'bg-gray-200 text-gray-700'" class="px-3 py-2 text-sm rounded-lg">Invoices</button>
      </div>
    </ui-page-header>
    <ui-loading [loading]="loading()"></ui-loading>

    @if (!loading() && tab === 'plan') {
      <!-- Current subscription summary -->
      <div class="grid grid-cols-1 sm:grid-cols-4 gap-4 mb-6">
        <ui-stats-card label="Current Plan" [value]="sub().plan_name || 'Free Trial'" icon="star"></ui-stats-card>
        <ui-stats-card label="Status" [value]="sub().status || tenant().subscription_status || '—'" icon="clipboard-list"></ui-stats-card>
        <ui-stats-card label="Billing Cycle" [value]="sub().billing_cycle || '—'" icon="trending-up"></ui-stats-card>
        <ui-stats-card label="Next Payment" [value]="sub().next_payment_date || '—'" icon="calendar-days"></ui-stats-card>
      </div>

      <!-- Usage meters -->
      <div class="bg-white rounded-lg border p-5 mb-6">
        <h3 class="text-sm font-semibold text-gray-700 mb-3">Current Usage</h3>
        <div class="grid grid-cols-3 gap-6">
          @for (r of ['rooms', 'staff', 'properties']; track r) {
            <div>
              <div class="flex justify-between text-xs text-gray-600 mb-1"><span class="capitalize">{{ r }}</span>
                <span>{{ usage()[r]?.used || 0 }} / {{ usage()[r]?.limit || 0 }}</span></div>
              <div class="w-full h-3 bg-gray-200 rounded-full overflow-hidden">
                <div class="h-3 rounded-full transition-all" [style.width.%]="usage()[r]?.percent || 0"
                     [class]="(usage()[r]?.percent || 0) > 80 ? 'bg-red-500' : (usage()[r]?.percent || 0) > 60 ? 'bg-amber-500' : 'bg-sage-500'"></div>
              </div>
            </div>
          }
        </div>
      </div>

      <!-- Plan selector -->
      <div class="bg-white rounded-lg border p-5 mb-6">
        <h3 class="text-sm font-semibold text-gray-700 mb-1">Choose a Plan</h3>
        <p class="text-xs text-gray-400 mb-4">Select billing cycle then pick a plan to subscribe or upgrade.</p>
        <div class="flex gap-2 mb-4">
          <button (click)="billingCycle = 'monthly'" [class]="billingCycle === 'monthly' ? 'bg-sage-600 text-white' : 'bg-gray-100 text-gray-700'" class="px-4 py-2 text-sm rounded-lg">Monthly</button>
          <button (click)="billingCycle = 'annually'" [class]="billingCycle === 'annually' ? 'bg-sage-600 text-white' : 'bg-gray-100 text-gray-700'" class="px-4 py-2 text-sm rounded-lg">Annual <span class="text-xs opacity-75">(Save ~20%)</span></button>
        </div>
        <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          @for (plan of plans(); track plan.id) {
            <div class="border rounded-lg p-5 transition-all hover:shadow-md"
                 [class.border-sage-500]="plan.id === currentPlanId()"
                 [class.ring-2]="plan.id === currentPlanId()"
                 [class.ring-sage-200]="plan.id === currentPlanId()"
                 [class.border-gray-200]="plan.id !== currentPlanId()">
              <div class="flex items-center justify-between mb-2">
                <h4 class="font-semibold text-gray-800">{{ plan.name }}</h4>
                @if (plan.id === currentPlanId()) { <ui-badge variant="success">Current</ui-badge> }
              </div>
              <div class="text-2xl font-bold text-sage-700 mb-1">
                ₦{{ (billingCycle === 'monthly' ? plan.monthly_price : plan.annual_price)?.toLocaleString() }}
                <span class="text-xs text-gray-500 font-normal">{{ billingCycle === 'monthly' ? '/mo' : '/yr' }}</span>
              </div>
              <p class="text-xs text-gray-500 mb-3">{{ plan.description || plan.tier }}</p>
              <ul class="text-xs text-gray-600 space-y-1.5 mb-4">
                <li>🛏️ {{ plan.max_rooms }} rooms</li>
                <li>👥 {{ plan.max_staff }} staff</li>
                <li>🏢 {{ plan.max_properties }} properties</li>
                <li>📦 {{ plan.included_modules?.length || 0 }} modules</li>
                <li>⏱️ {{ plan.trial_days }}-day trial</li>
              </ul>
              @if (plan.id === currentPlanId()) {
                <div class="w-full py-2 text-xs font-medium text-center text-emerald-700 bg-emerald-50 rounded-lg">Current Plan</div>
              } @else {
                <button (click)="subscribeToPlan(plan)" [disabled]="processing()"
                        class="w-full py-2 text-xs font-medium bg-sage-600 text-white rounded-lg hover:bg-sage-700 disabled:opacity-50">
                  {{ processing() ? 'Processing...' : (currentPlanId() ? 'Upgrade' : 'Subscribe') }}
                </button>
              }
            </div>
          }
        </div>
      </div>

      <!-- Cancel subscription -->
      @if (sub().status === 'active' || tenant().subscription_status === 'active') {
        <div class="bg-red-50 border border-red-200 rounded-lg p-5">
          <h3 class="text-sm font-semibold text-red-700 mb-1">Cancel Subscription</h3>
          <p class="text-xs text-red-600 mb-3">Your access will continue until the end of your current billing period.</p>
          <button (click)="cancelSubscription()" [disabled]="processing()" class="px-4 py-2 bg-red-600 text-white text-sm rounded-lg hover:bg-red-700 disabled:opacity-50">Cancel Subscription</button>
        </div>
      }
    }

    @if (!loading() && tab === 'invoices') {
      <div class="bg-white rounded-lg border">
        <table class="w-full text-sm">
          <thead class="bg-gray-50"><tr>
            <th class="px-4 py-3 text-left font-medium text-gray-600">Invoice #</th>
            <th class="px-4 py-3 text-left font-medium text-gray-600">Date</th>
            <th class="px-4 py-3 text-left font-medium text-gray-600">Plan</th>
            <th class="px-4 py-3 text-right font-medium text-gray-600">Amount</th>
            <th class="px-4 py-3 text-center font-medium text-gray-600">Status</th>
            <th class="px-4 py-3 text-center font-medium text-gray-600">Reference</th>
          </tr></thead>
          <tbody>
            @for (inv of invoices(); track inv.id) {
              <tr class="border-t hover:bg-gray-50">
                <td class="px-4 py-3 font-mono text-xs">{{ inv.invoice_number || inv.id?.slice(0,8) }}</td>
                <td class="px-4 py-3">{{ inv.created_at }}</td>
                <td class="px-4 py-3">{{ inv.plan_name || '—' }}</td>
                <td class="px-4 py-3 text-right font-medium">₦{{ (inv.amount || 0).toLocaleString() }}</td>
                <td class="px-4 py-3 text-center">
                  <span class="px-2 py-0.5 rounded-full text-xs"
                        [class]="inv.status === 'paid' ? 'bg-emerald-100 text-emerald-700' : inv.status === 'pending' ? 'bg-amber-100 text-amber-700' : 'bg-red-100 text-red-700'">
                    {{ inv.status }}
                  </span>
                </td>
                <td class="px-4 py-3 text-center font-mono text-xs text-gray-400">{{ inv.payment_reference || '—' }}</td>
              </tr>
            } @empty {
              <tr><td colspan="6" class="px-4 py-12 text-center text-gray-400">No invoices yet</td></tr>
            }
          </tbody>
        </table>
      </div>
    }
  `,
})
export class BillingPage implements OnInit {
  private api = inject(ApiService);
  private toast = inject(ToastService);
  private route = inject(ActivatedRoute);
  loading = signal(true);
  processing = signal(false);
  tenant = signal<any>({});
  sub = signal<any>({});
  usage = signal<any>({});
  plans = signal<any[]>([]);
  invoices = signal<any[]>([]);
  currentPlanId = signal<string>('');
  billingCycle: 'monthly' | 'annually' = 'monthly';
  tab = 'plan';

  ngOnInit(): void {
    // Check for Paystack callback
    const ref = this.route.snapshot.queryParamMap.get('reference') || this.route.snapshot.queryParamMap.get('trxref');
    if (ref) { this.verifyPayment(ref); return; }

    this.api.get('/tenant/current').subscribe(r => { if (r.success) this.tenant.set(r.data); });
    this.api.get('/subscriptions/current').subscribe(r => {
      if (r.success) { this.sub.set(r.data); this.currentPlanId.set(r.data.plan_id || ''); }
    });
    this.api.get('/usage/current').subscribe(r => { if (r.success) this.usage.set(r.data); });
    this.api.get('/plans').subscribe(r => { if (r.success) this.plans.set(r.data || []); this.loading.set(false); });
  }

  subscribeToPlan(plan: any): void {
    this.processing.set(true);
    const endpoint = this.currentPlanId() ? '/subscriptions/upgrade' : '/subscriptions/initialize';
    const payload = { plan_id: plan.id, billing_cycle: this.billingCycle };

    this.api.post(endpoint, payload).subscribe({
      next: r => {
        this.processing.set(false);
        if (r.success && r.data.authorization_url) {
          // Redirect to Paystack checkout
          window.location.href = r.data.authorization_url;
        } else if (r.success) {
          this.toast.success('Subscription updated!');
          this.ngOnInit();
        } else {
          this.toast.error(r.message || 'Failed to process');
        }
      },
      error: () => { this.processing.set(false); this.toast.error('Payment initialization failed'); },
    });
  }

  verifyPayment(reference: string): void {
    this.loading.set(true);
    this.api.post('/subscriptions/verify', { reference }).subscribe({
      next: r => {
        if (r.success) {
          this.toast.success('Payment verified! Subscription active.');
          // Clear query params
          window.history.replaceState({}, '', window.location.pathname);
        } else {
          this.toast.error(r.message || 'Payment verification failed');
        }
        this.loading.set(false);
        this.ngOnInit();
      },
      error: () => { this.loading.set(false); this.toast.error('Verification failed'); },
    });
  }

  cancelSubscription(): void {
    if (!confirm('Are you sure you want to cancel? Access continues until end of billing period.')) return;
    this.processing.set(true);
    this.api.post('/subscriptions/cancel', {}).subscribe({
      next: r => {
        this.processing.set(false);
        if (r.success) { this.toast.success('Subscription cancelled'); this.ngOnInit(); }
        else this.toast.error(r.message || 'Failed');
      },
      error: () => { this.processing.set(false); this.toast.error('Failed'); },
    });
  }

  loadInvoices(): void {
    this.api.get('/subscriptions/invoices').subscribe(r => { if (r.success) this.invoices.set(r.data || []); });
  }
}

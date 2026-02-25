import { Component, inject, signal, OnInit } from '@angular/core';
import { RouterLink } from '@angular/router';
import { PageHeaderComponent, StatsCardComponent, LoadingSpinnerComponent } from '@lodgik/shared';
import { MerchantApiService } from '../../services/merchant-api.service';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [RouterLink, PageHeaderComponent, StatsCardComponent, LoadingSpinnerComponent],
  template: `
    <ui-page-header title="Dashboard" icon="layout-dashboard" subtitle="Welcome to your Merchant Portal"></ui-page-header>
    <ui-loading [loading]="loading()"></ui-loading>
    @if (!loading()) {
      <!-- Onboarding Prompts -->
      @if (onboardingSteps().length > 0) {
        <div class="mb-6 bg-gradient-to-r from-sage-50 to-emerald-50 border border-sage-200 rounded-xl p-5">
          <h3 class="text-sm font-semibold text-sage-800 mb-1">Complete Your Setup</h3>
          <p class="text-xs text-sage-600 mb-4">Finish these steps to start earning commissions</p>
          <div class="space-y-2">
            @for (s of onboardingSteps(); track s.key) {
              <a [routerLink]="s.route" class="flex items-center gap-3 bg-white rounded-lg p-3 border border-sage-100 hover:border-sage-300 transition-colors">
                <div class="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold"
                     [class]="s.done ? 'bg-green-100 text-green-600' : 'bg-amber-100 text-amber-600'">
                  {{ s.done ? '✓' : s.num }}
                </div>
                <div class="flex-1">
                  <div class="text-sm font-medium" [class]="s.done ? 'text-green-700 line-through' : 'text-gray-900'">{{ s.label }}</div>
                  <div class="text-xs text-gray-500">{{ s.desc }}</div>
                </div>
                @if (!s.done) {
                  <span class="text-xs text-sage-600 font-medium">Complete →</span>
                }
              </a>
            }
          </div>
        </div>
      }

      <div class="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <ui-stats-card label="Active Hotels" [value]="dash().hotels?.total || 0" icon="hotel"></ui-stats-card>
        <ui-stats-card label="Total Earned" [value]="'₦' + (+dash().earnings?.total_earned || 0).toLocaleString()" icon="hand-coins"></ui-stats-card>
        <ui-stats-card label="Pending Commission" [value]="'₦' + (+dash().earnings?.pending || 0).toLocaleString()" icon="clock"></ui-stats-card>
        <ui-stats-card label="Total Paid" [value]="'₦' + (+dash().earnings?.paid || 0).toLocaleString()" icon="circle-check"></ui-stats-card>
      </div>
      <div class="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
        <div class="bg-white rounded-xl border border-gray-100 shadow-card p-5">
          <h3 class="text-sm font-semibold text-gray-700 mb-3">Hotels by Status</h3>
          @for (entry of hotelStatusEntries(); track entry[0]) {
            <div class="flex justify-between py-1.5 text-sm"><span class="text-gray-600 capitalize">{{ entry[0] }}</span><span class="font-medium">{{ entry[1] }}</span></div>
          }
          @if (hotelStatusEntries().length === 0) { <p class="text-gray-400 text-sm">No hotels yet</p> }
        </div>
        <div class="bg-white rounded-xl border border-gray-100 shadow-card p-5">
          <h3 class="text-sm font-semibold text-gray-700 mb-3">Lead Pipeline</h3>
          @for (entry of leadStatusEntries(); track entry[0]) {
            <div class="flex justify-between py-1.5 text-sm"><span class="text-gray-600 capitalize">{{ entry[0] }}</span><span class="font-medium">{{ entry[1] }}</span></div>
          }
          @if (leadStatusEntries().length === 0) { <p class="text-gray-400 text-sm">No leads yet</p> }
        </div>
        <div class="bg-white rounded-xl border border-gray-100 shadow-card p-5 space-y-2">
          <h3 class="text-sm font-semibold text-gray-700 mb-3">Quick Actions</h3>
          <a routerLink="/hotels" class="block w-full py-2 px-3 bg-sage-50 text-sage-700 text-sm rounded-lg hover:bg-emerald-100 text-center">+ Register Hotel</a>
          <a routerLink="/leads" class="block w-full py-2 px-3 bg-sage-50 text-sage-700 text-sm rounded-lg hover:bg-sage-100 text-center">+ New Lead</a>
          <a routerLink="/support" class="block w-full py-2 px-3 bg-amber-50 text-amber-700 text-sm rounded-lg hover:bg-amber-100 text-center">Open Support Ticket</a>
          <div class="flex gap-2 mt-3 pt-3 border-t border-gray-100">
            <div class="flex-1 text-center"><div class="text-lg font-bold text-red-500">{{ dash().open_tickets || 0 }}</div><div class="text-[10px] text-gray-500">Open Tickets</div></div>
            <div class="flex-1 text-center"><div class="text-lg font-bold text-sage-500">{{ dash().unread_notifications || 0 }}</div><div class="text-[10px] text-gray-500">Unread</div></div>
          </div>
        </div>
      </div>
    }
  `,
})
export class DashboardPage implements OnInit {
  private api = inject(MerchantApiService);
  loading = signal(true);
  dash = signal<any>({});
  hotelStatusEntries = signal<[string, number][]>([]);
  leadStatusEntries = signal<[string, number][]>([]);
  onboardingSteps = signal<any[]>([]);

  ngOnInit(): void {
    this.api.dashboard().subscribe({ next: (d: any) => {
      this.dash.set(d); this.loading.set(false);
      this.hotelStatusEntries.set(Object.entries(d.hotels?.by_status || {}) as [string, number][]);
      this.leadStatusEntries.set(Object.entries(d.leads?.by_status || {}) as [string, number][]);
    }, error: () => this.loading.set(false) });

    // Load profile to check onboarding status
    this.api.profile().subscribe({ next: (p: any) => {
      const kycDone = p.kyc?.status && p.kyc.status !== 'not_submitted';
      const kycApproved = p.kyc?.status === 'approved';
      const bankDone = !!p.bank_account;
      const steps: any[] = [];
      if (!kycApproved) {
        steps.push({ key: 'kyc', num: 1, label: 'Submit KYC Documents', desc: kycDone ? 'KYC submitted — awaiting review' : 'Required for account approval', route: '/profile', done: kycDone });
      }
      if (!bankDone) {
        steps.push({ key: 'bank', num: 2, label: 'Add Bank Account', desc: 'Required for receiving payouts', route: '/profile', done: false });
      }
      this.onboardingSteps.set(steps);
    }, error: () => {} });
  }
}

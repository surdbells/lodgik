import { Component, inject, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { ApiService, ToastService, PageHeaderComponent, LoadingSpinnerComponent } from '@lodgik/shared';

@Component({
  selector: 'app-onboarding',
  standalone: true,
  imports: [FormsModule, PageHeaderComponent, LoadingSpinnerComponent],
  template: `
    <div class="min-h-screen bg-gray-50 p-6">
      <div class="max-w-2xl mx-auto">
        <div class="text-center mb-8">
          <h1 class="text-2xl font-bold text-gray-900">Complete Your Setup</h1>
          <p class="text-gray-500 mt-1">{{ progress().completed }}/{{ progress().total }} steps complete</p>
          <div class="w-full bg-gray-200 rounded-full h-2 mt-3">
            <div class="bg-sage-600 h-2 rounded-full transition-all" [style.width.%]="progress().percent"></div>
          </div>
        </div>

        <!-- Steps -->
        <div class="space-y-4">
          @for (step of progress().steps; track step.step) {
            <div class="bg-white rounded-lg border p-5" [class.border-emerald-300]="step.complete" [class.border-gray-200]="!step.complete">
              <div class="flex items-center gap-3 mb-3">
                <span class="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold"
                      [class]="step.complete ? 'bg-emerald-100 text-emerald-700' : 'bg-gray-100 text-gray-500'">
                  {{ step.complete ? '✓' : step.step }}
                </span>
                <h3 class="text-sm font-semibold" [class.text-emerald-700]="step.complete" [class.text-gray-700]="!step.complete">{{ step.name }}</h3>
              </div>

              @if (!step.complete) {
                @switch (step.step) {
                  @case (4) {
                    <div class="grid grid-cols-2 gap-3">
                      <input [(ngModel)]="bank.bank_name" placeholder="Bank name" class="px-3 py-2 border border-gray-200 rounded-xl text-sm bg-gray-50">
                      <input [(ngModel)]="bank.account_number" placeholder="Account number (10 digits)" class="px-3 py-2 border border-gray-200 rounded-xl text-sm bg-gray-50">
                      <input [(ngModel)]="bank.account_name" placeholder="Account name" class="col-span-2 px-3 py-2 border border-gray-200 rounded-xl text-sm bg-gray-50">
                    </div>
                    <button (click)="saveBank()" class="mt-3 px-4 py-2 bg-sage-600 text-white text-sm rounded-xl hover:bg-sage-700 transition-colors">Save Bank</button>
                  }
                  @case (5) {
                    <div class="grid grid-cols-2 gap-3">
                      <input [(ngModel)]="branding.primary_color" type="color" class="h-10 w-full rounded-lg cursor-pointer">
                      <input [(ngModel)]="branding.secondary_color" type="color" class="h-10 w-full rounded-lg cursor-pointer">
                    </div>
                    <button (click)="saveBranding()" class="mt-3 px-4 py-2 bg-sage-600 text-white text-sm rounded-xl hover:bg-sage-700 transition-colors">Save Branding</button>
                  }
                  @case (6) {
                    <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      @for (plan of plans(); track plan.id) {
                        <button (click)="selectPlan(plan.id)"
                                class="p-4 border rounded-lg text-left hover:border-blue-400 transition-colors"
                                [class.border-sage-500]="selectedPlan === plan.id" [class.border-gray-200]="selectedPlan !== plan.id">
                          <div class="text-sm font-semibold">{{ plan.name }}</div>
                          <div class="text-xs text-gray-500">₦{{ plan.monthly_price?.toLocaleString() }}/mo</div>
                        </button>
                      }
                    </div>
                  }
                  @case (7) {
                    <p class="text-xs text-gray-500">Optional — invite your staff later from Settings.</p>
                  }
                }
              }
            </div>
          }
        </div>

        @if (progress().is_complete) {
          <div class="mt-6 text-center">
            <button (click)="goToDashboard()" class="px-6 py-3 bg-sage-700 text-white font-medium rounded-lg hover:bg-sage-600">
              Go to Dashboard →
            </button>
          </div>
        }
      </div>
    </div>
  `,
})
export class OnboardingPage implements OnInit {
  private api = inject(ApiService);
  private toast = inject(ToastService);
  private router = inject(Router);

  progress = signal<any>({ steps: [], completed: 0, total: 7, percent: 0, is_complete: false });
  plans = signal<any[]>([]);
  selectedPlan = '';
  bank: any = { bank_name: '', account_number: '', account_name: '', property_id: '' };
  branding: any = { primary_color: '#1e3a5f', secondary_color: '#f59e0b' };

  ngOnInit(): void {
    this.loadProgress();
    this.api.get('/plans').subscribe(r => { if (r.success) this.plans.set(r.data); });
  }

  loadProgress(): void {
    this.api.get('/onboarding/progress').subscribe(r => { if (r.success) this.progress.set(r.data); });
  }

  saveBank(): void {
    this.api.post('/onboarding/bank-account', this.bank).subscribe(r => {
      if (r.success) { this.toast.success('Bank account saved'); this.loadProgress(); }
      else this.toast.error(r.message || 'Failed');
    });
  }

  saveBranding(): void {
    this.api.post('/onboarding/branding', this.branding).subscribe(r => {
      if (r.success) { this.toast.success('Branding saved'); this.loadProgress(); }
    });
  }

  selectPlan(planId: string): void {
    this.selectedPlan = planId;
    this.api.post('/onboarding/select-plan', { plan_id: planId }).subscribe(r => {
      if (r.success) { this.toast.success('Plan selected'); this.loadProgress(); }
    });
  }

  goToDashboard(): void { this.router.navigate(['/dashboard']); }
}

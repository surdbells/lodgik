import { Component, inject, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ApiService, PageHeaderComponent, LoadingSpinnerComponent, StatsCardComponent, ActivePropertyService, HasPermDirective, PermDisableDirective, TokenService } from '@lodgik/shared';
import { AuthService } from '@lodgik/shared';

@Component({
  selector: 'app-payroll',
  standalone: true,
  imports: [FormsModule, PageHeaderComponent, LoadingSpinnerComponent, StatsCardComponent, HasPermDirective, PermDisableDirective],
  template: `
    <ui-page-header title="Payroll" icon="hand-coins" [breadcrumbs]="['Human Resources', 'Payroll']" subtitle="Monthly payroll processing & payslips">
      <button *hasPerm="'payroll.run'" (click)="showCreate = true" class="bg-sage-600 text-white px-4 py-2 text-sm rounded-xl hover:bg-sage-700 transition-colors">+ New Payroll</button>
    </ui-page-header>
    <ui-loading [loading]="loading()"></ui-loading>

    @if (!loading() && !selectedPeriod()) {
      <!-- Periods List -->
      <div class="bg-white rounded-xl border overflow-hidden">
        <table class="w-full text-sm">
          <thead class="bg-gray-50"><tr>
            <th class="px-4 py-3 text-left font-medium text-gray-500">Period</th>
            <th class="px-4 py-3 text-left font-medium text-gray-500">Status</th>
            <th class="px-4 py-3 text-left font-medium text-gray-500">Employees</th>
            <th class="px-4 py-3 text-right font-medium text-gray-500">Gross</th>
            <th class="px-4 py-3 text-right font-medium text-gray-500">Net</th>
            <th class="px-4 py-3 text-left font-medium text-gray-500">Actions</th>
          </tr></thead>
          <tbody>
            @for (p of periods(); track p.id) {
              <tr class="border-t hover:bg-gray-50 cursor-pointer" (click)="viewPeriod(p.id)">
                <td class="px-4 py-3 font-medium">{{ p.period_label }}</td>
                <td class="px-4 py-3"><span class="px-2 py-0.5 rounded-full text-xs text-white" [style.background]="p.status_color">{{ p.status_label }}</span></td>
                <td class="px-4 py-3">{{ p.employee_count }}</td>
                <td class="px-4 py-3 text-right">₦{{ fmt(p.total_gross) }}</td>
                <td class="px-4 py-3 text-right font-medium text-green-600">₦{{ fmt(p.total_net) }}</td>
                <td class="px-4 py-3">
                  @if (p.status === 'draft' || p.status === 'calculated') {
                    <button (click)="calculate(p.id); $event.stopPropagation()" [permDisable]="'payroll.run'" class="text-sage-600 hover:underline text-xs mr-2">Calculate</button>
                  }
                  @if (p.status === 'calculated') {
                    <button (click)="review(p.id); $event.stopPropagation()" [permDisable]="'payroll.run'" class="text-purple-600 hover:underline text-xs mr-2">Review</button>
                  }
                  @if (p.status === 'reviewed') {
                    <button (click)="approve(p.id); $event.stopPropagation()" [permDisable]="'payroll.approve'" class="text-green-600 hover:underline text-xs mr-2">Approve</button>
                  }
                  @if (p.status === 'approved') {
                    <button (click)="markPaid(p.id); $event.stopPropagation()" [permDisable]="'payroll.approve'" class="text-emerald-600 hover:underline text-xs">Mark Paid</button>
                  }
                </td>
              </tr>
            } @empty {
              <tr><td colspan="6" class="px-4 py-8 text-center text-gray-400">No payroll periods. Create one to get started.</td></tr>
            }
          </tbody>
        </table>
      </div>
    }

    <!-- Period Detail View -->
    @if (selectedPeriod()) {
      <div class="mb-4">
        <button (click)="selectedPeriod.set(null); payslips.set([])" class="text-sage-600 hover:underline text-sm">← Back to list</button>
      </div>

      <div class="grid grid-cols-2 sm:grid-cols-5 gap-3 mb-5">
        <ui-stats-card label="Period" [value]="selectedPeriod()!.period_label" icon="calendar-days"></ui-stats-card>
        <ui-stats-card label="Employees" [value]="selectedPeriod()!.employee_count" icon="users"></ui-stats-card>
        <ui-stats-card label="Total Gross" [value]="'₦' + fmt(selectedPeriod()!.total_gross)" icon="hand-coins"></ui-stats-card>
        <ui-stats-card label="Total Tax" [value]="'₦' + fmt(selectedPeriod()!.total_tax)" icon="building"></ui-stats-card>
        <ui-stats-card label="Total Net" [value]="'₦' + fmt(selectedPeriod()!.total_net)" icon="circle-check"></ui-stats-card>
      </div>

      <div class="grid grid-cols-3 gap-3 mb-5">
        <div class="bg-amber-50 border border-amber-200 rounded-xl p-4 text-center">
          <p class="text-xs text-amber-600 font-medium">Pension (8%)</p>
          <p class="text-lg font-bold text-amber-700">₦{{ fmt(selectedPeriod()!.total_pension) }}</p>
        </div>
        <div class="bg-purple-50 border border-purple-200 rounded-xl p-4 text-center">
          <p class="text-xs text-purple-600 font-medium">NHF (2.5%)</p>
          <p class="text-lg font-bold text-purple-700">₦{{ fmt(selectedPeriod()!.total_nhf) }}</p>
        </div>
        <div class="bg-sage-50 border border-sage-200 rounded-xl p-4 text-center">
          <p class="text-xs text-sage-600 font-medium">PAYE Tax</p>
          <p class="text-lg font-bold text-sage-700">₦{{ fmt(selectedPeriod()!.total_tax) }}</p>
        </div>
      </div>

      <!-- Payslips Table -->
      <h3 class="text-sm font-semibold text-gray-500 mb-3">Employee Payslips</h3>
      <div class="bg-white rounded-xl border overflow-hidden">
        <table class="w-full text-sm">
          <thead class="bg-gray-50"><tr>
            <th class="px-4 py-3 text-left font-medium text-gray-500">Staff ID</th>
            <th class="px-4 py-3 text-left font-medium text-gray-500">Name</th>
            <th class="px-4 py-3 text-right font-medium text-gray-500">Gross</th>
            <th class="px-4 py-3 text-right font-medium text-gray-500">Tax</th>
            <th class="px-4 py-3 text-right font-medium text-gray-500">Pension</th>
            <th class="px-4 py-3 text-right font-medium text-gray-500">Net</th>
            <th class="px-4 py-3 text-left font-medium text-gray-500">Bank</th>
            <th class="px-4 py-3 text-left font-medium text-gray-500">Actions</th>
          </tr></thead>
          <tbody>
            @for (s of payslips(); track s.id) {
              <tr class="border-t hover:bg-gray-50">
                <td class="px-4 py-3 text-xs font-mono">{{ s.employee_staff_id }}</td>
                <td class="px-4 py-3">{{ s.employee_name }}</td>
                <td class="px-4 py-3 text-right">₦{{ fmt(s.gross_pay) }}</td>
                <td class="px-4 py-3 text-right text-red-600">₦{{ fmt(s.paye_tax) }}</td>
                <td class="px-4 py-3 text-right text-amber-600">₦{{ fmt(s.pension_employee) }}</td>
                <td class="px-4 py-3 text-right font-medium text-green-600">₦{{ fmt(s.net_pay) }}</td>
                <td class="px-4 py-3 text-xs">{{ s.bank_name || '—' }}</td>
                <td class="px-4 py-3">
                  <button (click)="showPayslipDetail(s)" class="text-sage-600 hover:underline text-xs mr-2">View</button>
                  <button (click)="emailPayslip(s.id)" [permDisable]="'payroll.view_payslips'" class="text-green-600 hover:underline text-xs">Email</button>
                </td>
              </tr>
            }
          </tbody>
        </table>
      </div>
    }

    <!-- Create Dialog -->
    @if (showCreate) {
      <div class="fixed inset-0 bg-black/50 flex items-center justify-center z-50" (click)="showCreate = false">
        <div class="bg-white rounded-2xl shadow-2xl p-6 w-full max-w-sm" (click)="$event.stopPropagation()">
          <h3 class="text-lg font-semibold mb-4">Create Payroll Period</h3>
          <div class="grid grid-cols-2 gap-3 mb-3">
            <select [(ngModel)]="createMonth" class="border rounded-lg px-3 py-2 text-sm">
              @for (m of months; track m.v) { <option [value]="m.v">{{ m.l }}</option> }
            </select>
            <input [(ngModel)]="createYear" type="number" class="border rounded-lg px-3 py-2 text-sm" />
          </div>
          <div class="flex justify-end gap-2">
            <button (click)="showCreate = false" class="px-4 py-2 text-sm border rounded-lg">Cancel</button>
            <button (click)="createPeriod()" [permDisable]="'payroll.run'" class="px-4 py-2 text-sm bg-sage-600 text-white rounded-lg hover:bg-sage-700">Create & Calculate</button>
          </div>
        </div>
      </div>
    }

    <!-- Payslip Detail Dialog -->
    @if (detailPayslip()) {
      <div class="fixed inset-0 bg-black/50 flex items-center justify-center z-50" (click)="detailPayslip.set(null)">
        <div class="bg-white rounded-2xl shadow-2xl p-6 w-full max-w-md max-h-[90vh] overflow-y-auto" (click)="$event.stopPropagation()">
          <h3 class="text-lg font-semibold mb-1">{{ detailPayslip()!.employee_name }}</h3>
          <p class="text-xs text-gray-400 mb-4">{{ detailPayslip()!.employee_staff_id }}</p>

          <div class="space-y-2 text-sm">
            <p class="font-medium text-gray-500">Earnings</p>
            <div class="flex justify-between"><span>Basic Salary</span><span>₦{{ fmt(detailPayslip()!.basic_salary) }}</span></div>
            <div class="flex justify-between"><span>Housing</span><span>₦{{ fmt(detailPayslip()!.housing_allowance) }}</span></div>
            <div class="flex justify-between"><span>Transport</span><span>₦{{ fmt(detailPayslip()!.transport_allowance) }}</span></div>
            <div class="flex justify-between"><span>Other</span><span>₦{{ fmt(detailPayslip()!.other_allowances) }}</span></div>
            <div class="flex justify-between font-bold border-t pt-2"><span>GROSS</span><span>₦{{ fmt(detailPayslip()!.gross_pay) }}</span></div>

            <p class="font-medium text-gray-500 mt-3">Deductions</p>
            <div class="flex justify-between text-red-600"><span>PAYE Tax</span><span>₦{{ fmt(detailPayslip()!.paye_tax) }}</span></div>
            <div class="flex justify-between text-amber-600"><span>Pension (8%)</span><span>₦{{ fmt(detailPayslip()!.pension_employee) }}</span></div>
            <div class="flex justify-between text-purple-600"><span>NHF (2.5%)</span><span>₦{{ fmt(detailPayslip()!.nhf) }}</span></div>
            <div class="flex justify-between font-bold border-t pt-2"><span>TOTAL DEDUCTIONS</span><span>₦{{ fmt(detailPayslip()!.total_deductions) }}</span></div>

            <p class="font-medium text-gray-500 mt-3">PAYE Calculation</p>
            <div class="flex justify-between"><span>Monthly CRA</span><span>₦{{ fmt(detailPayslip()!.cra) }}</span></div>
            <div class="flex justify-between"><span>Taxable Income</span><span>₦{{ fmt(detailPayslip()!.taxable_income) }}</span></div>

            <div class="flex justify-between font-bold text-lg text-green-600 border-t-2 pt-3 mt-3">
              <span>NET PAY</span><span>₦{{ fmt(detailPayslip()!.net_pay) }}</span>
            </div>

            @if (detailPayslip()!.bank_name) {
              <div class="bg-sage-50 border border-sage-200 rounded-lg p-3 mt-3">
                <p class="text-xs text-sage-600">{{ detailPayslip()!.bank_name }} — {{ detailPayslip()!.bank_account_number }}</p>
                <p class="text-xs text-sage-500">{{ detailPayslip()!.bank_account_name }}</p>
              </div>
            }
          </div>
          <div class="flex justify-end mt-4">
            <button (click)="detailPayslip.set(null)" class="px-4 py-2 text-sm border rounded-lg">Close</button>
          </div>
        </div>
      </div>
    }
  `,
})
export class PayrollPage implements OnInit {
  private api   = inject(ApiService);
  private auth  = inject(AuthService);
  private token = inject(TokenService);
  private activeProperty = inject(ActivePropertyService);

  loading = signal(true);
  periods = signal<any[]>([]);
  selectedPeriod = signal<any>(null);
  payslips = signal<any[]>([]);
  detailPayslip = signal<any>(null);
  showCreate = false;
  createMonth = new Date().getMonth() + 1;
  createYear = new Date().getFullYear();
  months = Array.from({ length: 12 }, (_, i) => ({ v: i + 1, l: new Date(2000, i).toLocaleString('en', { month: 'long' }) }));

  ngOnInit() { this.load(); }

  load() {
    this.loading.set(true);
    this.api.get('/payroll', { property_id: this.activeProperty.propertyId() }).subscribe({
      next: (r: any) => { this.periods.set(r.data || []); this.loading.set(false); },
      error: () => this.loading.set(false),
    });
  }

  viewPeriod(id: string) {
    this.api.get(`/payroll/${id}`).subscribe({
      next: (r: any) => {
        this.selectedPeriod.set(r.data?.period ?? r.data);
        // Load payslips from dedicated endpoint
        this.api.get<any>(`/payroll/${id}/payslips`).subscribe({
          next: pr => this.payslips.set(pr.data ?? []),
        });
      },
    });
  }

  createPeriod() {
    this.api.post('/payroll', { property_id: this.activeProperty.propertyId(), year: this.createYear, month: this.createMonth }).subscribe({
      next: (r: any) => {
        this.showCreate = false;
        // Auto-calculate after create
        this.api.post(`/payroll/${r.data.id}/calculate`, {}).subscribe({ next: () => this.load() });
      },
    });
  }

  calculate(id: string) { this.api.post(`/payroll/${id}/calculate`, {}).subscribe({ next: () => this.load() }); }
  review(id: string) { this.api.post(`/payroll/${id}/review`, {}).subscribe({ next: () => this.load() }); }
  approve(id: string) { this.api.post(`/payroll/${id}/approve`, {}).subscribe({ next: () => this.load() }); }
  markPaid(id: string) { this.api.post(`/payroll/${id}/paid`, {}).subscribe({ next: () => this.load() }); }
  showPayslipDetail(s: any) { this.detailPayslip.set(s); }
  emailPayslip(id: string) { this.api.post(`/payslips/${id}/email`, { hotel_name: 'Hotel' }).subscribe(); }

  fmt(kobo: string | number): string {
    return (Number(kobo) / 100).toLocaleString('en-NG', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }
}

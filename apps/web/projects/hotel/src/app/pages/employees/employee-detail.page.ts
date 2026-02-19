import { Component, inject, OnInit, signal } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { ApiService, PageHeaderComponent, LoadingSpinnerComponent } from '@lodgik/shared';

@Component({
  selector: 'app-employee-detail',
  standalone: true,
  imports: [FormsModule, RouterLink, PageHeaderComponent, LoadingSpinnerComponent],
  template: `
    <ui-page-header [title]="emp()?.full_name || 'Employee'" [subtitle]="emp()?.staff_id || ''">
      <div class="flex gap-2">
        @if (emp()?.employment_status === 'active' || emp()?.employment_status === 'probation') {
          <button (click)="showTerminate = true" class="bg-red-600 text-white px-4 py-2 text-sm rounded-lg hover:bg-red-700">Terminate</button>
        }
        <button (click)="editing = !editing" class="bg-blue-600 text-white px-4 py-2 text-sm rounded-lg hover:bg-blue-700">{{ editing ? 'Cancel' : 'Edit' }}</button>
      </div>
    </ui-page-header>
    <ui-loading [loading]="loading()"></ui-loading>

    @if (!loading() && emp()) {
      <div class="flex gap-2 mb-4">
        <span class="px-3 py-1 rounded-full text-xs font-medium text-white" [style.background]="emp()!.employment_status_color">{{ emp()!.employment_status_label }}</span>
      </div>

      <div class="grid grid-cols-1 md:grid-cols-2 gap-5">
        <!-- Personal Info -->
        <div class="bg-white rounded-xl border p-5">
          <h3 class="text-sm font-semibold text-gray-500 mb-3">👤 Personal Information</h3>
          @if (!editing) {
            <div class="space-y-2 text-sm">
              <p><span class="text-gray-500 w-32 inline-block">Name:</span> {{ emp()!.full_name }}</p>
              <p><span class="text-gray-500 w-32 inline-block">Email:</span> {{ emp()!.email || '—' }}</p>
              <p><span class="text-gray-500 w-32 inline-block">Phone:</span> {{ emp()!.phone || '—' }}</p>
              <p><span class="text-gray-500 w-32 inline-block">Gender:</span> {{ emp()!.gender || '—' }}</p>
              <p><span class="text-gray-500 w-32 inline-block">DOB:</span> {{ emp()!.date_of_birth || '—' }}</p>
              <p><span class="text-gray-500 w-32 inline-block">Address:</span> {{ emp()!.address || '—' }}</p>
            </div>
          } @else {
            <div class="grid grid-cols-2 gap-2">
              <input [(ngModel)]="form.first_name" placeholder="First Name" class="border rounded px-2 py-1.5 text-sm" />
              <input [(ngModel)]="form.last_name" placeholder="Last Name" class="border rounded px-2 py-1.5 text-sm" />
              <input [(ngModel)]="form.email" placeholder="Email" class="border rounded px-2 py-1.5 text-sm" />
              <input [(ngModel)]="form.phone" placeholder="Phone" class="border rounded px-2 py-1.5 text-sm" />
              <input [(ngModel)]="form.gender" placeholder="Gender" class="border rounded px-2 py-1.5 text-sm" />
              <input [(ngModel)]="form.date_of_birth" type="date" class="border rounded px-2 py-1.5 text-sm" />
              <textarea [(ngModel)]="form.address" placeholder="Address" class="border rounded px-2 py-1.5 text-sm col-span-2"></textarea>
            </div>
          }
        </div>

        <!-- Employment -->
        <div class="bg-white rounded-xl border p-5">
          <h3 class="text-sm font-semibold text-gray-500 mb-3">💼 Employment</h3>
          <div class="space-y-2 text-sm">
            <p><span class="text-gray-500 w-32 inline-block">Job Title:</span>
              @if (editing) { <input [(ngModel)]="form.job_title" class="border rounded px-2 py-1 text-sm" /> } @else { {{ emp()!.job_title }} }</p>
            <p><span class="text-gray-500 w-32 inline-block">Hire Date:</span> {{ emp()!.hire_date }}</p>
            <p><span class="text-gray-500 w-32 inline-block">Gross Salary:</span> ₦{{ (emp()!.gross_salary / 100).toLocaleString() }}/mo</p>
            @if (editing) {
              <p><span class="text-gray-500 w-32 inline-block">New Salary (₦):</span> <input [(ngModel)]="form.gross_salary" type="number" class="border rounded px-2 py-1 text-sm" /></p>
            }
          </div>
        </div>

        <!-- Bank Details -->
        <div class="bg-white rounded-xl border p-5">
          <h3 class="text-sm font-semibold text-gray-500 mb-3">🏦 Bank Details</h3>
          @if (!editing) {
            <div class="space-y-2 text-sm">
              <p><span class="text-gray-500 w-32 inline-block">Bank:</span> {{ emp()!.bank_name || '—' }}</p>
              <p><span class="text-gray-500 w-32 inline-block">Account #:</span> {{ emp()!.bank_account_number || '—' }}</p>
              <p><span class="text-gray-500 w-32 inline-block">Account Name:</span> {{ emp()!.bank_account_name || '—' }}</p>
            </div>
          } @else {
            <div class="grid gap-2">
              <input [(ngModel)]="form.bank_name" placeholder="Bank Name" class="border rounded px-2 py-1.5 text-sm" />
              <input [(ngModel)]="form.bank_account_number" placeholder="Account Number" class="border rounded px-2 py-1.5 text-sm" />
              <input [(ngModel)]="form.bank_account_name" placeholder="Account Name" class="border rounded px-2 py-1.5 text-sm" />
            </div>
          }
        </div>

        <!-- Tax IDs & Emergency -->
        <div class="bg-white rounded-xl border p-5">
          <h3 class="text-sm font-semibold text-gray-500 mb-3">📋 Tax & Emergency</h3>
          @if (!editing) {
            <div class="space-y-2 text-sm">
              <p><span class="text-gray-500 w-32 inline-block">NIN:</span> {{ emp()!.nin || '—' }}</p>
              <p><span class="text-gray-500 w-32 inline-block">Tax ID:</span> {{ emp()!.tax_id || '—' }}</p>
              <p><span class="text-gray-500 w-32 inline-block">Pension PIN:</span> {{ emp()!.pension_pin || '—' }}</p>
              <p><span class="text-gray-500 w-32 inline-block">NHF ID:</span> {{ emp()!.nhf_id || '—' }}</p>
              <hr class="my-2" />
              <p><span class="text-gray-500 w-32 inline-block">Emergency:</span> {{ emp()!.emergency_contact_name || '—' }} ({{ emp()!.emergency_contact_phone || '—' }})</p>
            </div>
          } @else {
            <div class="grid grid-cols-2 gap-2">
              <input [(ngModel)]="form.nin" placeholder="NIN" class="border rounded px-2 py-1.5 text-sm" />
              <input [(ngModel)]="form.tax_id" placeholder="Tax ID" class="border rounded px-2 py-1.5 text-sm" />
              <input [(ngModel)]="form.pension_pin" placeholder="Pension PIN" class="border rounded px-2 py-1.5 text-sm" />
              <input [(ngModel)]="form.nhf_id" placeholder="NHF ID" class="border rounded px-2 py-1.5 text-sm" />
              <input [(ngModel)]="form.emergency_contact_name" placeholder="Emergency Contact" class="border rounded px-2 py-1.5 text-sm" />
              <input [(ngModel)]="form.emergency_contact_phone" placeholder="Emergency Phone" class="border rounded px-2 py-1.5 text-sm" />
            </div>
          }
        </div>
      </div>

      @if (editing) {
        <div class="flex justify-end mt-4">
          <button (click)="save()" class="bg-blue-600 text-white px-6 py-2 text-sm rounded-lg hover:bg-blue-700">Save Changes</button>
        </div>
      }
    }

    @if (showTerminate) {
      <div class="fixed inset-0 bg-black/50 flex items-center justify-center z-50" (click)="showTerminate = false">
        <div class="bg-white rounded-xl shadow-xl p-6 w-full max-w-md" (click)="$event.stopPropagation()">
          <h3 class="text-lg font-semibold text-red-600 mb-4">⚠️ Terminate Employee</h3>
          <textarea [(ngModel)]="terminateReason" placeholder="Reason for termination *" rows="3" class="border rounded-lg px-3 py-2 text-sm w-full mb-3"></textarea>
          <input [(ngModel)]="terminateDate" type="date" class="border rounded-lg px-3 py-2 text-sm w-full mb-3" />
          <div class="flex justify-end gap-2">
            <button (click)="showTerminate = false" class="px-4 py-2 text-sm border rounded-lg">Cancel</button>
            <button (click)="terminate()" class="px-4 py-2 text-sm bg-red-600 text-white rounded-lg hover:bg-red-700">Terminate</button>
          </div>
        </div>
      </div>
    }
  `,
})
export class EmployeeDetailPage implements OnInit {
  private api = inject(ApiService);
  private route = inject(ActivatedRoute);
  private router = inject(Router);

  loading = signal(true);
  emp = signal<any>(null);
  editing = false;
  form: any = {};
  showTerminate = false;
  terminateReason = '';
  terminateDate = new Date().toISOString().split('T')[0];

  ngOnInit() {
    const id = this.route.snapshot.paramMap.get('id');
    this.api.get(`/employees/${id}`).subscribe({
      next: (r: any) => { this.emp.set(r.data); this.form = { ...r.data }; this.loading.set(false); },
      error: () => this.loading.set(false),
    });
  }

  save() {
    const data = { ...this.form };
    if (data.gross_salary && typeof data.gross_salary === 'number') data.gross_salary = String(Math.round(data.gross_salary * 100));
    this.api.put(`/employees/${this.emp()!.id}`, data).subscribe({
      next: (r: any) => { this.emp.set(r.data); this.editing = false; },
    });
  }

  terminate() {
    this.api.post(`/employees/${this.emp()!.id}/terminate`, { reason: this.terminateReason, termination_date: this.terminateDate }).subscribe({
      next: (r: any) => { this.emp.set(r.data); this.showTerminate = false; },
    });
  }
}

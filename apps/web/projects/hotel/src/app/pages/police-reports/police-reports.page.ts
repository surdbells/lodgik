import { Component, inject, OnInit, signal, computed } from '@angular/core';
import { FormsModule } from '@angular/forms';
import {
  ApiService, PageHeaderComponent, LoadingSpinnerComponent,
  ToastService, ActivePropertyService, ConfirmDialogService, ConfirmDialogComponent
} from '@lodgik/shared';

@Component({
  selector: 'app-police-reports',
  standalone: true,
  imports: [PageHeaderComponent, LoadingSpinnerComponent, ConfirmDialogComponent, FormsModule],
  template: `
    <ui-confirm-dialog/>
    <ui-page-header title="Police Reports" subtitle="Nigeria Form C — auto-generated on check-in, editable here">
      <div class="flex gap-2">
        <button (click)="showForm.set(true)" class="px-4 py-2 bg-sage-600 text-white text-sm rounded-lg hover:bg-sage-700">
          + Add Report
        </button>
        <button (click)="exportAll()" class="px-4 py-2 bg-gray-600 text-white text-sm rounded-lg hover:bg-gray-700">
          📋 Export CSV
        </button>
      </div>
    </ui-page-header>

    <ui-loading [loading]="loading()"></ui-loading>

    @if (!loading()) {
      <!-- Stats -->
      <div class="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <div class="bg-white rounded-xl border border-gray-100 shadow-card p-4">
          <p class="text-xs text-gray-500 mb-1">Total Reports</p>
          <p class="text-2xl font-bold text-gray-900">{{ reports().length }}</p>
        </div>
        <div class="bg-white rounded-xl border border-gray-100 shadow-card p-4">
          <p class="text-xs text-gray-500 mb-1">Pending Submission</p>
          <p class="text-2xl font-bold text-amber-600">{{ pendingCount() }}</p>
        </div>
        <div class="bg-white rounded-xl border border-gray-100 shadow-card p-4">
          <p class="text-xs text-gray-500 mb-1">Submitted</p>
          <p class="text-2xl font-bold text-emerald-600">{{ submittedCount() }}</p>
        </div>
        <div class="bg-white rounded-xl border border-gray-100 shadow-card p-4">
          <p class="text-xs text-gray-500 mb-1">Foreign Guests</p>
          <p class="text-2xl font-bold text-sage-600">{{ foreignCount() }}</p>
        </div>
      </div>

      <!-- Date filter -->
      <div class="flex items-center gap-3 mb-4">
        <input type="date" [(ngModel)]="filterFrom"
          class="px-3 py-2 border border-gray-200 rounded-lg text-sm">
        <span class="text-gray-400 text-sm">to</span>
        <input type="date" [(ngModel)]="filterTo"
          class="px-3 py-2 border border-gray-200 rounded-lg text-sm">
        <button (click)="load()" class="px-4 py-2 bg-sage-600 text-white text-sm rounded-lg hover:bg-sage-700">
          Filter
        </button>
        <button (click)="filterFrom = ''; filterTo = ''; load()"
          class="px-4 py-2 border border-gray-200 text-sm rounded-lg hover:bg-gray-50 text-gray-600">
          Clear
        </button>
      </div>

      <!-- Table -->
      <div class="bg-white rounded-xl border border-gray-100 shadow-card overflow-x-auto">
        <table class="w-full text-sm">
          <thead class="bg-gray-50 border-b border-gray-100">
            <tr>
              <th class="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Guest</th>
              <th class="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Nationality</th>
              <th class="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">ID / Passport</th>
              <th class="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Room</th>
              <th class="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Arrival</th>
              <th class="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Departure</th>
              <th class="px-4 py-3 text-center text-xs font-semibold text-gray-500 uppercase tracking-wider">Status</th>
              <th class="px-4 py-3 text-center text-xs font-semibold text-gray-500 uppercase tracking-wider">Action</th>
            </tr>
          </thead>
          <tbody>
            @for (r of reports(); track r.id) {
              <tr class="border-t border-gray-50 hover:bg-gray-50 transition-colors">
                <td class="px-4 py-3 font-medium text-gray-900">{{ r.guest_name }}</td>
                <td class="px-4 py-3 text-gray-600">{{ r.nationality || '—' }}</td>
                <td class="px-4 py-3 font-mono text-xs text-gray-600">{{ r.id_number || r.passport_number || r.nin || '—' }}</td>
                <td class="px-4 py-3 text-gray-600">{{ r.room_number || '—' }}</td>
                <td class="px-4 py-3 text-gray-600">{{ r.arrival_date }}</td>
                <td class="px-4 py-3 text-gray-600">{{ r.departure_date || '—' }}</td>
                <td class="px-4 py-3 text-center">
                  <span class="px-2.5 py-1 rounded-full text-xs font-semibold"
                    [class]="r.status === 'submitted'
                      ? 'bg-emerald-100 text-emerald-800'
                      : 'bg-amber-100 text-amber-800'">
                    {{ r.status === 'submitted' ? '✓ Submitted' : 'Pending' }}
                  </span>
                </td>
                <td class="px-4 py-3 text-center">
                  @if (r.status !== 'submitted') {
                    <button (click)="submit(r)"
                      class="text-sage-600 hover:text-sage-800 text-xs font-semibold hover:underline">
                      Submit
                    </button>
                  }
                </td>
              </tr>
            }
            @if (reports().length === 0) {
              <tr>
                <td colspan="8" class="px-4 py-12 text-center">
                  <div class="text-4xl mb-3">📋</div>
                  <p class="text-gray-500 font-medium">No police reports found</p>
                  <p class="text-gray-400 text-xs mt-1">
                    Reports are auto-created when guests check in. You can also add them manually.
                  </p>
                </td>
              </tr>
            }
          </tbody>
        </table>
      </div>
    }

    <!-- Create / Add Report Modal -->
    @if (showForm()) {
      <div class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40">
        <div class="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
          <div class="flex items-center justify-between p-5 border-b border-gray-100">
            <h3 class="font-bold text-gray-900">Add Police Report</h3>
            <button (click)="closeForm()" class="w-8 h-8 flex items-center justify-center rounded-xl hover:bg-gray-100 text-gray-400">✕</button>
          </div>
          <div class="p-5 space-y-4">
            <div class="grid grid-cols-2 gap-3">
              <div class="col-span-2">
                <label class="block text-xs font-medium text-gray-700 mb-1">Guest Name *</label>
                <input [(ngModel)]="form.guest_name" placeholder="Full name as on ID"
                  class="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-sage-300">
              </div>
              <div>
                <label class="block text-xs font-medium text-gray-700 mb-1">Nationality</label>
                <input [(ngModel)]="form.nationality" placeholder="e.g. Nigerian"
                  class="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-sage-300">
              </div>
              <div>
                <label class="block text-xs font-medium text-gray-700 mb-1">ID Type</label>
                <select [(ngModel)]="form.id_type"
                  class="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-sage-300">
                  <option value="">Select…</option>
                  <option value="passport">International Passport</option>
                  <option value="nin">NIN</option>
                  <option value="drivers_license">Driver's License</option>
                  <option value="voters_card">Voter's Card</option>
                  <option value="national_id">National ID</option>
                </select>
              </div>
              <div>
                <label class="block text-xs font-medium text-gray-700 mb-1">ID / Passport Number</label>
                <input [(ngModel)]="form.id_number" placeholder="ID number"
                  class="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-sage-300">
              </div>
              <div>
                <label class="block text-xs font-medium text-gray-700 mb-1">Phone</label>
                <input [(ngModel)]="form.phone" placeholder="+234..."
                  class="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-sage-300">
              </div>
              <div>
                <label class="block text-xs font-medium text-gray-700 mb-1">Room Number *</label>
                <input [(ngModel)]="form.room_number" placeholder="e.g. 201"
                  class="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-sage-300">
              </div>
              <div>
                <label class="block text-xs font-medium text-gray-700 mb-1">Arrival Date *</label>
                <input type="date" [(ngModel)]="form.arrival_date"
                  class="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-sage-300">
              </div>
              <div>
                <label class="block text-xs font-medium text-gray-700 mb-1">Departure Date</label>
                <input type="date" [(ngModel)]="form.departure_date"
                  class="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-sage-300">
              </div>
              <div>
                <label class="block text-xs font-medium text-gray-700 mb-1">Purpose of Visit</label>
                <select [(ngModel)]="form.purpose_of_visit"
                  class="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-sage-300">
                  <option value="">Select…</option>
                  <option value="business">Business</option>
                  <option value="leisure">Leisure / Tourism</option>
                  <option value="conference">Conference / Event</option>
                  <option value="medical">Medical</option>
                  <option value="transit">Transit</option>
                  <option value="other">Other</option>
                </select>
              </div>
              <div>
                <label class="block text-xs font-medium text-gray-700 mb-1">Accompanying Persons</label>
                <input type="number" [(ngModel)]="form.accompanying_persons" min="0" placeholder="0"
                  class="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-sage-300">
              </div>
              <div class="col-span-2">
                <label class="block text-xs font-medium text-gray-700 mb-1">Home Address</label>
                <input [(ngModel)]="form.address" placeholder="Residential address"
                  class="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-sage-300">
              </div>
            </div>
            @if (formError()) {
              <p class="text-red-500 text-sm">{{ formError() }}</p>
            }
            <div class="flex gap-3 pt-2">
              <button (click)="saveForm()" [disabled]="saving()"
                class="flex-1 py-3 bg-sage-600 text-white font-semibold text-sm rounded-xl hover:bg-sage-700 disabled:opacity-50">
                {{ saving() ? 'Saving…' : 'Save Report' }}
              </button>
              <button (click)="closeForm()"
                class="flex-1 py-3 border border-gray-200 text-gray-600 text-sm rounded-xl hover:bg-gray-50">
                Cancel
              </button>
            </div>
          </div>
        </div>
      </div>
    }
  `,
})
export default class PoliceReportsPage implements OnInit {
  private api      = inject(ApiService);
  private toast    = inject(ToastService);
  private confirm  = inject(ConfirmDialogService);
  private activeProperty = inject(ActivePropertyService);

  loading   = signal(true);
  reports   = signal<any[]>([]);
  showForm  = signal(false);
  saving    = signal(false);
  formError = signal('');

  filterFrom = '';
  filterTo   = '';

  pendingCount   = computed(() => this.reports().filter(r => r.status !== 'submitted').length);
  submittedCount = computed(() => this.reports().filter(r => r.status === 'submitted').length);
  foreignCount   = computed(() => this.reports().filter(r => r.nationality && !r.nationality.toLowerCase().includes('nigerian')).length);

  form: any = {
    guest_name: '', nationality: '', id_type: '', id_number: '',
    phone: '', room_number: '', arrival_date: '', departure_date: '',
    purpose_of_visit: '', accompanying_persons: 0, address: '',
    booking_id: '', guest_id: '',
  };

  private get pid(): string { return this.activeProperty.propertyId() ?? ''; }

  ngOnInit(): void {
    // Set default arrival date to today
    this.form.arrival_date = new Date().toISOString().split('T')[0];
    this.load();
  }

  load(): void {
    if (!this.pid) { this.loading.set(false); return; }
    this.loading.set(true);
    const params: any = { property_id: this.pid };
    if (this.filterFrom) params.from = this.filterFrom;
    if (this.filterTo)   params.to   = this.filterTo;
    this.api.get('/police-reports', params).subscribe({
      next: (r: any) => { this.reports.set(r?.data ?? []); this.loading.set(false); },
      error: () => { this.loading.set(false); this.toast.error('Failed to load police reports'); },
    });
  }

  closeForm(): void {
    this.showForm.set(false);
    this.formError.set('');
    this.form = {
      guest_name: '', nationality: '', id_type: '', id_number: '',
      phone: '', room_number: '', arrival_date: new Date().toISOString().split('T')[0],
      departure_date: '', purpose_of_visit: '', accompanying_persons: 0, address: '',
      booking_id: '', guest_id: '',
    };
  }

  saveForm(): void {
    if (!this.form.guest_name?.trim()) { this.formError.set('Guest name is required'); return; }
    if (!this.form.arrival_date)       { this.formError.set('Arrival date is required'); return; }
    this.formError.set('');
    this.saving.set(true);
    this.api.post('/police-reports', { ...this.form, property_id: this.pid }).subscribe({
      next: (r: any) => {
        this.saving.set(false);
        if (r.success || r.data) {
          this.toast.success('Report saved');
          this.closeForm();
          this.load();
        } else {
          this.formError.set(r.message ?? 'Failed to save');
        }
      },
      error: (e: any) => {
        this.saving.set(false);
        this.formError.set(e?.error?.message ?? 'Failed to save');
      },
    });
  }

  async submit(report: any): Promise<void> {
    const ok = await this.confirm.confirm({
      title: 'Submit Police Report',
      message: `Mark ${report.guest_name}'s report as officially submitted to the police?`,
      confirmLabel: 'Submit',
      variant: 'info',
    });
    if (!ok) return;
    this.api.post(`/police-reports/${report.id}/submit`, {}).subscribe({
      next: () => { this.toast.success('Report submitted'); this.load(); },
      error: () => this.toast.error('Submission failed'),
    });
  }

  exportAll(): void {
    if (this.reports().length === 0) { this.toast.error('No reports to export'); return; }
    const headers = ['Guest Name', 'Nationality', 'ID Type', 'ID Number', 'Phone', 'Room', 'Arrival', 'Departure', 'Purpose', 'Accompanying', 'Status'];
    const rows = this.reports().map(r => [
      r.guest_name, r.nationality || '', r.id_type || '', r.id_number || '',
      r.phone || '', r.room_number || '', r.arrival_date, r.departure_date || '',
      r.purpose_of_visit || '', r.accompanying_persons ?? 0, r.status,
    ].map(v => `"${String(v).replace(/"/g, '""')}"`).join(','));
    const csv = [headers.join(','), ...rows].join('\n');
    const a = document.createElement('a');
    a.href = 'data:text/csv;charset=utf-8,' + encodeURIComponent(csv);
    a.download = `police_reports_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
  }
}

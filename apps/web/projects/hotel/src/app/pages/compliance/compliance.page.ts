import { Component, inject, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ApiService, PageHeaderComponent, LoadingSpinnerComponent, ToastService, ActivePropertyService } from '@lodgik/shared';

interface DataRequest {
  id: string;
  type: string;
  type_label: string;
  subject_type: string;
  subject_id: string;
  subject_name: string;
  status: string;
  status_color: string;
  rejection_reason: string | null;
  download_url: string | null;
  requested_by_name: string;
  completed_at: string | null;
  created_at: string;
}

@Component({
  selector: 'app-compliance',
  standalone: true,
  imports: [FormsModule, PageHeaderComponent, LoadingSpinnerComponent],
  template: `
<ui-page-header
  title="Data & Privacy Compliance"
  icon="shield"
  [breadcrumbs]="['Settings', 'Compliance']"
  subtitle="Manage NDPR data export and erasure requests for guests and employees">
  <button (click)="openCreate()"
    class="px-4 py-2 bg-sage-600 text-white text-sm font-medium rounded-xl hover:bg-sage-700 transition-colors">
    + New Request
  </button>
</ui-page-header>

<ui-loading [loading]="loading()"></ui-loading>

@if (!loading()) {
<div class="px-6 max-w-5xl">

  <!-- Info banner -->
  <div class="mb-5 p-4 bg-blue-50 border border-blue-200 rounded-xl text-sm text-blue-700">
    <p class="font-semibold mb-1">Nigeria Data Protection Regulation (NDPR)</p>
    <p class="text-xs text-blue-600">
      Under the NDPR, data subjects have the right to request an export of their personal data
      or request erasure of their data. Erasure permanently anonymises all PII — this cannot be undone.
    </p>
  </div>

  <!-- Filter tabs -->
  <div class="flex gap-3 mb-5 flex-wrap">
    @for (tab of statusTabs; track tab.key) {
      <button (click)="filterStatus = tab.key; load()"
        [class]="filterStatus === tab.key
          ? 'px-3 py-1.5 text-sm rounded-lg bg-sage-600 text-white font-medium'
          : 'px-3 py-1.5 text-sm rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50'">
        {{ tab.label }}
      </button>
    }
    <span class="ml-auto text-sm text-gray-400 self-center">{{ total() }} request(s)</span>
  </div>

  <!-- Requests table -->
  @if (requests().length === 0) {
    <div class="text-center py-16 text-gray-400">
      <p class="text-lg">No compliance requests</p>
      <p class="text-sm mt-1">{{ filterStatus ? 'Try a different filter' : 'Create a data export or erasure request' }}</p>
    </div>
  } @else {
    <div class="bg-white rounded-xl border border-gray-200 overflow-hidden">
      <table class="w-full text-sm">
        <thead class="bg-gray-50 border-b border-gray-200">
          <tr>
            <th class="px-4 py-3 text-left font-medium text-gray-600">Type</th>
            <th class="px-4 py-3 text-left font-medium text-gray-600">Subject</th>
            <th class="px-4 py-3 text-left font-medium text-gray-600">Status</th>
            <th class="px-4 py-3 text-left font-medium text-gray-600">Requested By</th>
            <th class="px-4 py-3 text-left font-medium text-gray-600">Date</th>
            <th class="px-4 py-3 text-right font-medium text-gray-600">Actions</th>
          </tr>
        </thead>
        <tbody class="divide-y divide-gray-100">
          @for (r of requests(); track r.id) {
            <tr class="hover:bg-gray-50">
              <td class="px-4 py-3">
                <span [class]="typeClass(r.type)">{{ r.type_label }}</span>
              </td>
              <td class="px-4 py-3">
                <p class="font-medium text-gray-800">{{ r.subject_name }}</p>
                <p class="text-xs text-gray-400 capitalize">{{ r.subject_type }}</p>
              </td>
              <td class="px-4 py-3">
                <span [class]="statusClass(r.status_color)">{{ r.status }}</span>
                @if (r.rejection_reason) {
                  <p class="text-xs text-red-500 mt-0.5">{{ r.rejection_reason }}</p>
                }
              </td>
              <td class="px-4 py-3 text-gray-600 text-xs">{{ r.requested_by_name }}</td>
              <td class="px-4 py-3 text-gray-400 text-xs">{{ fmtDate(r.created_at) }}</td>
              <td class="px-4 py-3 text-right">
                <div class="flex items-center justify-end gap-2">
                  @if (r.status === 'pending') {
                    <button (click)="process(r.id)" [disabled]="acting()"
                      class="px-3 py-1.5 text-xs bg-sage-600 text-white rounded-lg hover:bg-sage-700 disabled:opacity-50">
                      Process
                    </button>
                    <button (click)="openReject(r)" [disabled]="acting()"
                      class="px-3 py-1.5 text-xs border border-red-200 text-red-600 rounded-lg hover:bg-red-50 disabled:opacity-50">
                      Reject
                    </button>
                  }
                  @if (r.download_url) {
                    <a [href]="r.download_url" target="_blank"
                      class="px-3 py-1.5 text-xs bg-blue-50 text-blue-700 rounded-lg hover:bg-blue-100">
                      Download
                    </a>
                  }
                </div>
              </td>
            </tr>
          }
        </tbody>
      </table>
    </div>
  }
</div>
}

<!-- Create modal -->
@if (showCreate()) {
<div class="fixed inset-0 bg-black/40 z-50 flex items-center justify-center px-4">
  <div class="bg-white rounded-2xl shadow-xl w-full max-w-md p-6">
    <h3 class="font-semibold text-gray-800 mb-4">New Data Request</h3>

    <div class="space-y-4">
      <div>
        <label class="block text-xs text-gray-500 font-medium mb-1">Request Type <span class="text-red-500">*</span></label>
        <select [(ngModel)]="form.type"
          class="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-sage-500">
          <option value="">Select type…</option>
          <option value="export">Data Export — provide a copy of all stored data</option>
          <option value="erasure">Right to Erasure — permanently anonymise all PII</option>
        </select>
      </div>

      @if (form.type === 'erasure') {
        <div class="p-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-700">
          ⚠ Erasure is irreversible. All personal information will be permanently anonymised.
          Booking history and financial records are preserved but PII is removed.
        </div>
      }

      <div>
        <label class="block text-xs text-gray-500 font-medium mb-1">Subject Type <span class="text-red-500">*</span></label>
        <select [(ngModel)]="form.subject_type"
          class="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-sage-500">
          <option value="">Select subject…</option>
          <option value="guest">Guest</option>
          <option value="employee">Employee</option>
        </select>
      </div>

      <div>
        <label class="block text-xs text-gray-500 font-medium mb-1">
          {{ form.subject_type === 'employee' ? 'Employee' : 'Guest' }} ID <span class="text-red-500">*</span>
        </label>
        <input type="text" [(ngModel)]="form.subject_id"
          [placeholder]="form.subject_type === 'employee' ? 'Employee UUID…' : 'Guest UUID…'"
          class="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-sage-500">
        <p class="text-xs text-gray-400 mt-1">Copy the ID from the Guest or Employee profile page.</p>
      </div>

      <div>
        <label class="block text-xs text-gray-500 font-medium mb-1">Your Name (for audit log)</label>
        <input type="text" [(ngModel)]="form.requested_by_name"
          class="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-sage-500">
      </div>
    </div>

    <div class="flex gap-3 mt-5">
      <button (click)="submitCreate()" [disabled]="creating()"
        class="flex-1 py-2.5 bg-sage-600 text-white text-sm font-medium rounded-xl hover:bg-sage-700 disabled:opacity-60">
        {{ creating() ? 'Submitting…' : 'Submit Request' }}
      </button>
      <button (click)="showCreate.set(false)"
        class="flex-1 py-2.5 border border-gray-200 text-gray-600 text-sm rounded-xl hover:bg-gray-50">
        Cancel
      </button>
    </div>
  </div>
</div>
}

<!-- Reject modal -->
@if (rejectTarget()) {
<div class="fixed inset-0 bg-black/40 z-50 flex items-center justify-center px-4">
  <div class="bg-white rounded-2xl shadow-xl w-full max-w-md p-6">
    <h3 class="font-semibold text-gray-800 mb-1">Reject Request</h3>
    <p class="text-sm text-gray-500 mb-4">For: {{ rejectTarget()!.subject_name }}</p>

    <textarea [(ngModel)]="rejectReason" rows="3"
      placeholder="Reason for rejection…"
      class="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-sage-500 mb-4"></textarea>

    <div class="flex gap-3">
      <button (click)="confirmReject()" [disabled]="acting()"
        class="flex-1 py-2.5 bg-red-600 text-white text-sm font-medium rounded-xl hover:bg-red-700 disabled:opacity-60">
        {{ acting() ? 'Rejecting…' : 'Confirm Rejection' }}
      </button>
      <button (click)="rejectTarget.set(null)"
        class="flex-1 py-2.5 border border-gray-200 text-gray-600 text-sm rounded-xl hover:bg-gray-50">
        Cancel
      </button>
    </div>
  </div>
</div>
}
  `,
})
export class CompliancePage implements OnInit {
  private api     = inject(ApiService);
  private toast   = inject(ToastService);
  private propSvc = inject(ActivePropertyService);

  loading      = signal(true);
  acting       = signal(false);
  creating     = signal(false);
  showCreate   = signal(false);
  rejectTarget = signal<DataRequest | null>(null);

  requests = signal<DataRequest[]>([]);
  total    = signal(0);

  filterStatus = '';
  rejectReason = '';

  form = {
    type: '',
    subject_type: '',
    subject_id: '',
    requested_by_name: '',
  };

  statusTabs = [
    { key: '',           label: 'All' },
    { key: 'pending',    label: 'Pending' },
    { key: 'processing', label: 'Processing' },
    { key: 'complete',   label: 'Complete' },
    { key: 'rejected',   label: 'Rejected' },
  ];

  ngOnInit() { this.load(); }

  load(): void {
    this.loading.set(true);
    const params: any = { per_page: 50 };
    if (this.filterStatus) params['status'] = this.filterStatus;

    this.api.get('/compliance/data-requests', params).subscribe({
      next: (r: any) => {
        this.requests.set(r.data ?? []);
        this.total.set(r.meta?.total ?? 0);
        this.loading.set(false);
      },
      error: () => { this.toast.error('Failed to load compliance requests'); this.loading.set(false); },
    });
  }

  openCreate(): void {
    this.form = { type: '', subject_type: '', subject_id: '', requested_by_name: '' };
    this.showCreate.set(true);
  }

  submitCreate(): void {
    if (!this.form.type || !this.form.subject_type || !this.form.subject_id.trim()) {
      this.toast.error('Please fill in all required fields');
      return;
    }
    if (this.form.type === 'erasure' && !confirm(
      `⚠ Right to Erasure — this will permanently anonymise all PII for ${this.form.subject_type} ${this.form.subject_id}.\n\nThis cannot be undone. Continue?`
    )) return;

    this.creating.set(true);
    this.api.post('/compliance/data-requests', {
      ...this.form,
      property_id: this.propSvc.propertyId(),
    }).subscribe({
      next: () => {
        this.toast.success('Request submitted');
        this.creating.set(false);
        this.showCreate.set(false);
        this.load();
      },
      error: (e: any) => { this.toast.error(e.error?.message ?? 'Failed to submit'); this.creating.set(false); },
    });
  }

  process(id: string): void {
    if (!confirm('Process this request now?')) return;
    this.acting.set(true);
    this.api.post(`/compliance/data-requests/${id}/process`, {}).subscribe({
      next: (r: any) => {
        this.acting.set(false);
        const req = r.data as DataRequest;
        if (req.status === 'complete' && req.download_url) {
          this.toast.success('Export ready — click Download to retrieve the file');
        } else if (req.status === 'complete') {
          this.toast.success('Erasure completed — PII has been anonymised');
        } else {
          this.toast.error('Processing failed: ' + (req.rejection_reason ?? 'Unknown error'));
        }
        this.load();
      },
      error: (e: any) => { this.toast.error(e.error?.message ?? 'Failed'); this.acting.set(false); },
    });
  }

  openReject(r: DataRequest): void {
    this.rejectReason = '';
    this.rejectTarget.set(r);
  }

  confirmReject(): void {
    if (!this.rejectReason.trim()) { this.toast.error('Reason is required'); return; }
    this.acting.set(true);
    this.api.post(`/compliance/data-requests/${this.rejectTarget()!.id}/reject`, { reason: this.rejectReason }).subscribe({
      next: () => {
        this.toast.success('Request rejected');
        this.acting.set(false);
        this.rejectTarget.set(null);
        this.load();
      },
      error: (e: any) => { this.toast.error(e.error?.message ?? 'Failed'); this.acting.set(false); },
    });
  }

  fmtDate(d: string): string {
    return new Date(d).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
  }

  typeClass(type: string): string {
    return type === 'export'
      ? 'px-2 py-0.5 text-xs rounded-lg bg-blue-50 text-blue-700 font-medium'
      : 'px-2 py-0.5 text-xs rounded-lg bg-red-50 text-red-700 font-medium';
  }

  statusClass(color: string): string {
    const map: Record<string, string> = {
      amber: 'px-2 py-0.5 text-xs rounded-lg bg-amber-100 text-amber-700',
      blue:  'px-2 py-0.5 text-xs rounded-lg bg-blue-100 text-blue-700',
      green: 'px-2 py-0.5 text-xs rounded-lg bg-green-100 text-green-700',
      red:   'px-2 py-0.5 text-xs rounded-lg bg-red-100 text-red-700',
    };
    return map[color] ?? 'px-2 py-0.5 text-xs rounded-lg bg-gray-100 text-gray-600';
  }
}

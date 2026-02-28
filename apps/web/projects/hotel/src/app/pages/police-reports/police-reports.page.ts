import { Component, inject, OnInit, signal } from '@angular/core';
import { ApiService, PageHeaderComponent, LoadingSpinnerComponent, ToastService, ActivePropertyService, ConfirmDialogService, ConfirmDialogComponent } from '@lodgik/shared';

@Component({
  selector: 'app-police-reports',
  standalone: true,
  imports: [PageHeaderComponent, LoadingSpinnerComponent, ConfirmDialogComponent],
  template: `
    <ui-confirm-dialog/>
    <ui-page-header title="Police Reports" subtitle="Nigeria Form C — Auto-generated on guest check-in">
      <button (click)="exportAll()" class="px-4 py-2 bg-gray-600 text-white text-sm rounded-lg hover:bg-gray-700">📋 Export All</button>
    </ui-page-header>
    <ui-loading [loading]="loading()"></ui-loading>

    @if (!loading()) {
      <div class="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <div class="bg-white rounded-lg border p-4"><p class="text-xs text-gray-500">Total Reports</p><p class="text-2xl font-bold">{{reports().length}}</p></div>
        <div class="bg-white rounded-lg border p-4"><p class="text-xs text-gray-500">Pending Submission</p><p class="text-2xl font-bold text-yellow-600">{{pendingCount()}}</p></div>
        <div class="bg-white rounded-lg border p-4"><p class="text-xs text-gray-500">Submitted</p><p class="text-2xl font-bold text-green-600">{{submittedCount()}}</p></div>
        <div class="bg-white rounded-lg border p-4"><p class="text-xs text-gray-500">Nigerians</p><p class="text-2xl font-bold text-sage-600">{{nigerianCount()}}</p></div>
      </div>

      <div class="bg-white rounded-lg border overflow-x-auto">
        <table class="w-full text-sm">
          <thead class="bg-gray-50"><tr>
            <th class="px-4 py-3 text-left font-medium text-gray-600">Guest</th>
            <th class="px-4 py-3 text-left font-medium text-gray-600">Nationality</th>
            <th class="px-4 py-3 text-left font-medium text-gray-600">Passport/NIN</th>
            <th class="px-4 py-3 text-left font-medium text-gray-600">Room</th>
            <th class="px-4 py-3 text-left font-medium text-gray-600">Arrival</th>
            <th class="px-4 py-3 text-center font-medium text-gray-600">Status</th>
            <th class="px-4 py-3 text-center font-medium text-gray-600">Actions</th>
          </tr></thead>
          <tbody>
            @for (r of reports(); track r.id) {
              <tr class="border-t hover:bg-gray-50">
                <td class="px-4 py-3 font-medium">{{r.guest_name}}</td>
                <td class="px-4 py-3">{{r.nationality || '—'}}</td>
                <td class="px-4 py-3 font-mono text-xs">{{r.passport_number || r.nin || r.id_number || '—'}}</td>
                <td class="px-4 py-3">{{r.room_number || '—'}}</td>
                <td class="px-4 py-3">{{r.arrival_date}}</td>
                <td class="px-4 py-3 text-center">
                  <span [class]="'px-2 py-1 rounded-full text-xs font-medium ' + (r.status === 'submitted' ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800')">
                    {{r.status}}
                  </span>
                </td>
                <td class="px-4 py-3 text-center">
                  @if (r.status === 'pending') {
                    <button (click)="submit(r)" class="text-sage-600 hover:underline text-xs font-medium">Submit</button>
                  }
                </td>
              </tr>
            } @empty {
              <tr><td colspan="7" class="px-4 py-8 text-center text-gray-400">No police reports found</td></tr>
            }
          </tbody>
        </table>
      </div>
    }
  `
})
export default class PoliceReportsPage implements OnInit {
  private api = inject(ApiService);
  private toast = inject(ToastService);
  private confirm = inject(ConfirmDialogService);
  private activeProperty = inject(ActivePropertyService);

  loading = signal(true);
  reports = signal<any[]>([]);

  get pid() { return this.activeProperty.propertyId(); }

  pendingCount()   { return this.reports().filter(r => r.status === 'pending').length; }
  submittedCount() { return this.reports().filter(r => r.status === 'submitted').length; }
  nigerianCount()  { return this.reports().filter(r => r.nationality?.toLowerCase().includes('nigerian')).length; }

  ngOnInit() { this.load(); }

  load() {
    this.loading.set(true);
    this.api.get('/police-reports', { property_id: this.pid }).subscribe({
      next: (r: any) => { this.reports.set(r?.data || []); this.loading.set(false); },
      error: () => { this.loading.set(false); this.toast.error('Failed to load police reports'); },
    });
  }

  async submit(report: any) {
    const ok = await this.confirm.confirm({
      title: 'Submit Police Report',
      message: `Submit the police report for ${report.guest_name}? This will mark it as officially submitted.`,
      confirmLabel: 'Submit',
      variant: 'info',
    });
    if (!ok) return;
    this.api.post(`/police-reports/${report.id}/submit`, {}).subscribe({
      next: () => { this.toast.success('Report submitted'); this.load(); },
      error: () => this.toast.error('Submission failed'),
    });
  }

  exportAll() {
    const rows = this.reports().map(r => [
      r.guest_name, r.nationality, r.id_number, r.room_number, r.arrival_date, r.departure_date, r.status
    ]);
    const csv = ['Guest,Nationality,ID Number,Room,Arrival,Departure,Status', ...rows.map(r => r.join(','))].join('\n');
    const a = document.createElement('a');
    a.href = 'data:text/csv;charset=utf-8,' + encodeURIComponent(csv);
    a.download = `police_reports_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
  }
}

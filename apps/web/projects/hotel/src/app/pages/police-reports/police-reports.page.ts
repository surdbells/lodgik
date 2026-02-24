import { Component, inject, OnInit, signal } from '@angular/core';
import { ApiService, PageHeaderComponent, LoadingSpinnerComponent } from '@lodgik/shared';

@Component({
  selector: 'app-police-reports',
  standalone: true,
  imports: [PageHeaderComponent, LoadingSpinnerComponent],
  template: `
    <ui-page-header title="Police Reports" subtitle="Nigeria Form C — Auto-generated on guest check-in">
      <button (click)="exportAll()" class="px-4 py-2 bg-gray-600 text-white text-sm rounded-lg hover:bg-gray-700">📋 Export All</button>
    </ui-page-header>
    <ui-loading [loading]="loading()"></ui-loading>

    <div class="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
      <div class="bg-white rounded-lg border p-4"><p class="text-xs text-gray-500">Total Reports</p><p class="text-2xl font-bold">{{reports().length}}</p></div>
      <div class="bg-white rounded-lg border p-4"><p class="text-xs text-gray-500">Pending Submission</p><p class="text-2xl font-bold text-yellow-600">{{pendingCount()}}</p></div>
      <div class="bg-white rounded-lg border p-4"><p class="text-xs text-gray-500">Submitted</p><p class="text-2xl font-bold text-green-600">{{submittedCount()}}</p></div>
      <div class="bg-white rounded-lg border p-4"><p class="text-xs text-gray-500">Nigerians</p><p class="text-2xl font-bold text-sage-600">{{nigerianCount()}}</p></div>
    </div>

    <div class="bg-white rounded-lg border overflow-x-auto">
      <table class="w-full text-sm">
        <thead class="bg-gray-50"><tr>
          <th class="px-4 py-3 text-left font-medium text-gray-600">Guest</th><th class="px-4 py-3 text-left font-medium text-gray-600">Nationality</th>
          <th class="px-4 py-3 text-left font-medium text-gray-600">Passport/NIN</th><th class="px-4 py-3 text-left font-medium text-gray-600">Room</th>
          <th class="px-4 py-3 text-left font-medium text-gray-600">Arrival</th><th class="px-4 py-3 text-center font-medium text-gray-600">Status</th>
          <th class="px-4 py-3 text-center font-medium text-gray-600">Actions</th>
        </tr></thead>
        <tbody>
          @for (r of reports(); track r.id) {
            <tr class="border-t hover:bg-gray-50">
              <td class="px-4 py-3 font-medium">{{r.guest_name}}</td><td class="px-4 py-3">{{r.nationality}}</td>
              <td class="px-4 py-3 font-mono text-xs">{{r.passport_number || r.nin || '-'}}</td><td class="px-4 py-3">{{r.room_number}}</td>
              <td class="px-4 py-3">{{r.arrival_date}}</td>
              <td class="px-4 py-3 text-center"><span [class]="'px-2 py-1 rounded-full text-xs font-medium ' + (r.status === 'submitted' ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800')">{{r.status}}</span></td>
              <td class="px-4 py-3 text-center">@if (r.status === 'pending') { <button (click)="submit(r.id)" class="text-sage-600 hover:underline text-xs">Submit</button> }</td>
            </tr>
          } @empty { <tr><td colspan="7" class="px-4 py-8 text-center text-gray-400">No police reports found</td></tr> }
        </tbody>
      </table>
    </div>
  `
})
export default class PoliceReportsPage implements OnInit {
  private api = inject(ApiService);
  loading = signal(true); reports = signal<any[]>([]);
  pendingCount() { return this.reports().filter(r => r.status === 'pending').length; }
  submittedCount() { return this.reports().filter(r => r.status === 'submitted').length; }
  nigerianCount() { return this.reports().filter(r => r.nationality === 'Nigerian').length; }
  ngOnInit() { this.api.get('/police-reports').subscribe((r: any) => { this.reports.set(r?.data || []); this.loading.set(false); }); }
  submit(id: string) { this.api.post(`/police-reports/${id}/submit`, {}).subscribe(() => this.ngOnInit()); }
  exportAll() { /* trigger CSV/PDF export */ }
}

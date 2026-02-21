import { Component, inject, OnInit, signal } from '@angular/core';
import { ApiService, PageHeaderComponent, LoadingSpinnerComponent } from '@lodgik/shared';

@Component({
  selector: 'app-night-audit',
  standalone: true,
  imports: [PageHeaderComponent, LoadingSpinnerComponent],
  template: `
    <ui-page-header title="Night Audit" subtitle="Close the day's operations and generate reports">
      <button (click)="runAudit()" [disabled]="running()" class="px-4 py-2 bg-indigo-600 text-white text-sm rounded-lg hover:bg-indigo-700 disabled:opacity-50">
        {{ running() ? 'Running...' : '▶ Run Night Audit' }}
      </button>
    </ui-page-header>
    <ui-loading [loading]="loading()"></ui-loading>

    @if (lastAudit()) {
      <div class="bg-white rounded-lg border p-6 mb-6">
        <h3 class="text-lg font-semibold mb-4">Last Audit — {{lastAudit().audit_date}}</h3>
        <div class="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div class="p-3 bg-blue-50 rounded-lg"><p class="text-xs text-gray-500">Occupancy</p><p class="text-xl font-bold text-blue-700">{{lastAudit().occupancy_rate}}%</p><p class="text-xs text-gray-400">{{lastAudit().rooms_occupied}}/{{lastAudit().total_rooms}} rooms</p></div>
          <div class="p-3 bg-green-50 rounded-lg"><p class="text-xs text-gray-500">Room Revenue</p><p class="text-xl font-bold text-green-700">₦{{(lastAudit().room_revenue / 100).toLocaleString()}}</p></div>
          <div class="p-3 bg-purple-50 rounded-lg"><p class="text-xs text-gray-500">F&B Revenue</p><p class="text-xl font-bold text-purple-700">₦{{(lastAudit().fnb_revenue / 100).toLocaleString()}}</p></div>
          <div class="p-3 bg-orange-50 rounded-lg"><p class="text-xs text-gray-500">Total Revenue</p><p class="text-xl font-bold text-orange-700">₦{{(lastAudit().total_revenue / 100).toLocaleString()}}</p></div>
          <div class="p-3 bg-cyan-50 rounded-lg"><p class="text-xs text-gray-500">ADR</p><p class="text-xl font-bold text-cyan-700">₦{{(lastAudit().adr / 100).toLocaleString()}}</p></div>
          <div class="p-3 bg-amber-50 rounded-lg"><p class="text-xs text-gray-500">RevPAR</p><p class="text-xl font-bold text-amber-700">₦{{(lastAudit().revpar / 100).toLocaleString()}}</p></div>
          <div class="p-3 bg-red-50 rounded-lg"><p class="text-xs text-gray-500">Discrepancies</p><p class="text-xl font-bold text-red-700">{{lastAudit().discrepancies?.length || 0}}</p></div>
          <div class="p-3 bg-gray-50 rounded-lg"><p class="text-xs text-gray-500">Auditor</p><p class="text-lg font-bold text-gray-700">{{lastAudit().auditor_name || 'System'}}</p></div>
        </div>
      </div>
    }

    <div class="bg-white rounded-lg border">
      <h3 class="px-4 py-3 font-semibold border-b">Audit History</h3>
      <table class="w-full text-sm">
        <thead class="bg-gray-50"><tr>
          <th class="px-4 py-3 text-left font-medium text-gray-600">Date</th><th class="px-4 py-3 text-right font-medium text-gray-600">Occupancy</th>
          <th class="px-4 py-3 text-right font-medium text-gray-600">Revenue</th><th class="px-4 py-3 text-right font-medium text-gray-600">ADR</th>
          <th class="px-4 py-3 text-center font-medium text-gray-600">Status</th>
        </tr></thead>
        <tbody>
          @for (a of audits(); track a.id) {
            <tr class="border-t hover:bg-gray-50">
              <td class="px-4 py-3 font-medium">{{a.audit_date}}</td><td class="px-4 py-3 text-right">{{a.occupancy_rate}}%</td>
              <td class="px-4 py-3 text-right">₦{{(a.total_revenue / 100).toLocaleString()}}</td><td class="px-4 py-3 text-right">₦{{(a.adr / 100).toLocaleString()}}</td>
              <td class="px-4 py-3 text-center"><span class="px-2 py-1 bg-green-100 text-green-800 rounded-full text-xs">{{a.status}}</span></td>
            </tr>
          } @empty { <tr><td colspan="5" class="px-4 py-8 text-center text-gray-400">No audits yet</td></tr> }
        </tbody>
      </table>
    </div>
  `
})
export default class NightAuditPage implements OnInit {
  private api = inject(ApiService);
  loading = signal(true); running = signal(false); audits = signal<any[]>([]); lastAudit = signal<any>(null);
  ngOnInit() { this.load(); }
  load() { this.api.get('/finance/night-audits').subscribe((r: any) => { const d = r?.data || []; this.audits.set(d); if (d.length) this.lastAudit.set(d[0]); this.loading.set(false); }); }
  runAudit() { this.running.set(true); this.api.post('/finance/night-audit/run', {}).subscribe({ next: () => { this.running.set(false); this.load(); }, error: () => this.running.set(false) }); }
}

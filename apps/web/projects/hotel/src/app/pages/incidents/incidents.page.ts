import { Component, inject, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ApiService, PageHeaderComponent, LoadingSpinnerComponent } from '@lodgik/shared';
@Component({
  selector: 'app-incidents', standalone: true, imports: [FormsModule, PageHeaderComponent, LoadingSpinnerComponent],
  template: `
    <ui-page-header title="Asset Incidents" subtitle="Report and track equipment breakdowns and issues">
      <button (click)="showForm = !showForm" class="px-4 py-2 bg-red-600 text-white text-sm rounded-lg hover:bg-red-700">🚨 Report Incident</button>
    </ui-page-header>
    <ui-loading [loading]="loading()"></ui-loading>
    @if (showForm) {
      <div class="bg-white rounded-lg border p-6 mb-6">
        <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div><label class="block text-sm font-medium mb-1">Asset QR / ID</label><input type="text" [(ngModel)]="form.asset_id" class="w-full border rounded-lg px-3 py-2 text-sm"></div>
          <div><label class="block text-sm font-medium mb-1">Type</label>
            <select [(ngModel)]="form.incident_type" class="w-full border rounded-lg px-3 py-2 text-sm"><option value="breakdown">Breakdown</option><option value="leakage">Leakage</option><option value="noise">Noise</option><option value="electrical">Electrical</option><option value="fire">Fire</option><option value="safety">Safety</option><option value="other">Other</option></select></div>
          <div class="md:col-span-1"><label class="block text-sm font-medium mb-1">Description</label><input type="text" [(ngModel)]="form.description" class="w-full border rounded-lg px-3 py-2 text-sm"></div>
        </div>
        <div class="flex gap-2 mt-4"><button (click)="report()" class="px-4 py-2 bg-red-600 text-white text-sm rounded-lg">Report</button><button (click)="showForm = false" class="px-4 py-2 bg-gray-200 text-sm rounded-lg">Cancel</button></div>
      </div>
    }
    <div class="bg-white rounded-lg border overflow-x-auto">
      <table class="w-full text-sm"><thead class="bg-gray-50"><tr>
        <th class="px-4 py-3 text-left font-medium text-gray-600">Asset</th><th class="px-4 py-3 text-left font-medium text-gray-600">Type</th><th class="px-4 py-3 text-left font-medium text-gray-600">Description</th>
        <th class="px-4 py-3 text-left font-medium text-gray-600">Assigned To</th><th class="px-4 py-3 text-center font-medium text-gray-600">Priority</th><th class="px-4 py-3 text-center font-medium text-gray-600">Status</th>
        <th class="px-4 py-3 text-center font-medium text-gray-600">Actions</th>
      </tr></thead><tbody>
        @for (i of incidents(); track i.id) {
          <tr class="border-t hover:bg-gray-50">
            <td class="px-4 py-3 font-medium">{{i.asset_name}}</td><td class="px-4 py-3">{{i.incident_type}}</td><td class="px-4 py-3 text-gray-600 max-w-xs truncate">{{i.description}}</td>
            <td class="px-4 py-3">{{i.assigned_engineer_name || 'Unassigned'}}</td>
            <td class="px-4 py-3 text-center"><span [class]="'px-2 py-0.5 rounded text-xs font-medium ' + critClass(i.priority)">{{i.priority}}</span></td>
            <td class="px-4 py-3 text-center"><span [class]="'px-2 py-0.5 rounded text-xs font-medium ' + statClass(i.status)">{{i.status}}</span></td>
            <td class="px-4 py-3 text-center flex gap-1 justify-center">
              @if (i.status === 'new') { <button (click)="assign(i.id)" class="text-blue-600 text-xs hover:underline">Assign</button> }
              @if (i.status === 'assigned') { <button (click)="startProgress(i.id)" class="text-blue-600 text-xs hover:underline">Start</button> }
              @if (i.status === 'in_progress') { <button (click)="resolve(i.id)" class="text-green-600 text-xs hover:underline">Resolve</button> }
            </td>
          </tr>
        } @empty { <tr><td colspan="7" class="px-4 py-8 text-center text-gray-400">No incidents</td></tr> }
      </tbody></table>
    </div>
  `
})
export default class IncidentsPage implements OnInit {
  private api = inject(ApiService); loading = signal(true); incidents = signal<any[]>([]); showForm = false;
  form: any = { asset_id: '', incident_type: 'breakdown', description: '' };
  ngOnInit() { this.api.get('/asset-incidents').subscribe((r: any) => { this.incidents.set(r?.data || []); this.loading.set(false); }); }
  report() { this.api.post('/asset-incidents', this.form).subscribe(() => { this.showForm = false; this.ngOnInit(); }); }
  assign(id: string) { this.api.post(`/asset-incidents/${id}/assign`, {}).subscribe(() => this.ngOnInit()); }
  startProgress(id: string) { this.api.post(`/asset-incidents/${id}/start`, {}).subscribe(() => this.ngOnInit()); }
  resolve(id: string) { this.api.post(`/asset-incidents/${id}/resolve`, { resolution_notes: 'Resolved' }).subscribe(() => this.ngOnInit()); }
  critClass(c: string): string { return { low: 'bg-gray-100 text-gray-700', medium: 'bg-yellow-100 text-yellow-700', high: 'bg-orange-100 text-orange-700', critical: 'bg-red-100 text-red-700' }[c] || ''; }
  statClass(s: string): string { return { new: 'bg-blue-100 text-blue-700', assigned: 'bg-yellow-100 text-yellow-700', in_progress: 'bg-purple-100 text-purple-700', resolved: 'bg-green-100 text-green-700', closed: 'bg-gray-100 text-gray-700' }[s] || ''; }
}

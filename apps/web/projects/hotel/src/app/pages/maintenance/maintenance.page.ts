import { Component, inject, OnInit, signal } from '@angular/core';
import { ApiService, PageHeaderComponent, LoadingSpinnerComponent } from '@lodgik/shared';
@Component({
  selector: 'app-maintenance', standalone: true, imports: [PageHeaderComponent, LoadingSpinnerComponent],
  template: `
    <ui-page-header title="Preventive Maintenance" subtitle="Scheduled maintenance and service logs">
      <div class="flex gap-2">
        <button (click)="tab = 'pm'" [class]="tab === 'pm' ? 'bg-sage-600 text-white' : 'bg-gray-200 text-gray-700'" class="px-3 py-2 text-sm rounded-lg">Schedules</button>
        <button (click)="tab = 'logs'" [class]="tab === 'logs' ? 'bg-sage-600 text-white' : 'bg-gray-200 text-gray-700'" class="px-3 py-2 text-sm rounded-lg">Logs</button>
        <button (click)="tab = 'overdue'" [class]="tab === 'overdue' ? 'bg-red-600 text-white' : 'bg-gray-200 text-gray-700'" class="px-3 py-2 text-sm rounded-lg">Overdue ({{overdue().length}})</button>
      </div>
    </ui-page-header>
    <ui-loading [loading]="loading()"></ui-loading>

    @if (tab === 'pm') {
      <div class="bg-white rounded-lg border overflow-x-auto"><table class="w-full text-sm"><thead class="bg-gray-50"><tr>
        <th class="px-4 py-3 text-left">Asset</th><th class="px-4 py-3 text-left">Schedule</th><th class="px-4 py-3 text-left">Assigned</th>
        <th class="px-4 py-3 text-left">Next Due</th><th class="px-4 py-3 text-center">Status</th><th class="px-4 py-3 text-center">Actions</th>
      </tr></thead><tbody>
        @for (p of pmSchedules(); track p.id) {
          <tr class="border-t hover:bg-gray-50"><td class="px-4 py-3 font-medium">{{p.asset_name}}</td><td class="px-4 py-3">{{p.schedule_type}}</td>
            <td class="px-4 py-3">{{p.assigned_engineer_name || '-'}}</td><td class="px-4 py-3" [class.text-red-600]="p.status === 'overdue'">{{p.next_due}}</td>
            <td class="px-4 py-3 text-center"><span [class]="p.status === 'overdue' ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'" class="px-2 py-0.5 rounded text-xs font-medium">{{p.status}}</span></td>
            <td class="px-4 py-3 text-center"><button (click)="completePM(p.id)" class="text-green-600 text-xs hover:underline">Complete</button></td></tr>
        } @empty { <tr><td colspan="6" class="px-4 py-8 text-center text-gray-400">No schedules</td></tr> }
      </tbody></table></div>
    }
    @if (tab === 'logs') {
      <div class="bg-white rounded-lg border overflow-x-auto"><table class="w-full text-sm"><thead class="bg-gray-50"><tr>
        <th class="px-4 py-3 text-left">Date</th><th class="px-4 py-3 text-left">Engineer</th><th class="px-4 py-3 text-left">Action</th>
        <th class="px-4 py-3 text-left">Parts</th><th class="px-4 py-3 text-right">Cost</th>
      </tr></thead><tbody>
        @for (l of logs(); track l.id) {
          <tr class="border-t"><td class="px-4 py-3">{{l.log_date}}</td><td class="px-4 py-3">{{l.engineer_name}}</td><td class="px-4 py-3">{{l.action_taken}}</td>
            <td class="px-4 py-3">{{l.parts_replaced || '-'}}</td><td class="px-4 py-3 text-right">₦{{((l.cost || 0) / 100).toLocaleString()}}</td></tr>
        } @empty { <tr><td colspan="5" class="px-4 py-8 text-center text-gray-400">No logs</td></tr> }
      </tbody></table></div>
    }
    @if (tab === 'overdue') {
      <div class="space-y-3">
        @for (p of overdue(); track p.id) {
          <div class="bg-red-50 border border-red-200 rounded-lg p-4 flex items-center justify-between">
            <div><p class="font-medium text-red-800">{{p.asset_name}}</p><p class="text-sm text-red-600">Due: {{p.next_due}} • {{p.schedule_type}}</p></div>
            <button (click)="completePM(p.id)" class="px-3 py-1 bg-red-600 text-white text-sm rounded-lg">Complete Now</button>
          </div>
        } @empty { <p class="text-center text-gray-400 py-8">No overdue maintenance — great job!</p> }
      </div>
    }
  `
})
export default class MaintenancePage implements OnInit {
  private api = inject(ApiService); loading = signal(true); pmSchedules = signal<any[]>([]); logs = signal<any[]>([]); overdue = signal<any[]>([]); tab = 'pm';
  ngOnInit() { this.api.get('/preventive-maintenance').subscribe((r: any) => { this.pmSchedules.set(r?.data || []); this.loading.set(false); });
    this.api.get('/maintenance-logs').subscribe((r: any) => this.logs.set(r?.data || []));
    this.api.get('/preventive-maintenance/overdue').subscribe((r: any) => this.overdue.set(r?.data || [])); }
  completePM(id: string) { this.api.post(`/preventive-maintenance/${id}/complete`, {}).subscribe(() => this.ngOnInit()); }
}

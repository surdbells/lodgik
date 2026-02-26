import { Component, inject, OnInit, OnDestroy, signal } from '@angular/core';
import { ApiService, PageHeaderComponent, AuthService, ActivePropertyService} from '@lodgik/shared';

@Component({
  selector: 'app-security', standalone: true, imports: [PageHeaderComponent],
  template: `
    <ui-page-header title="Security & Gate Pass" subtitle="Visitor management, gate passes, guest movement tracking"></ui-page-header>
    <div class="grid grid-cols-3 gap-4 mb-4">
      <div class="bg-white border rounded-lg p-4 text-center"><div class="text-2xl font-bold text-sage-600">{{ stats().onPremise }}</div><div class="text-xs text-gray-500">On Premise</div></div>
      <div class="bg-white border rounded-lg p-4 text-center"><div class="text-2xl font-bold text-amber-600">{{ stats().pendingPasses }}</div><div class="text-xs text-gray-500">Pending Passes</div></div>
      <div class="bg-white border rounded-lg p-4 text-center"><div class="text-2xl font-bold text-green-600">{{ stats().todayVisitors }}</div><div class="text-xs text-gray-500">Visitors Today</div></div>
    </div>
    <div class="flex gap-1 mb-4">
      @for (tab of tabs; track tab.key) {
        <button (click)="activeTab = tab.key" [class]="activeTab === tab.key ? 'px-4 py-2 bg-sage-600 text-white rounded-lg text-sm' : 'px-4 py-2 border rounded-lg text-sm hover:bg-gray-50'">{{ tab.label }}</button>
      }
    </div>
    <!-- Gate Passes -->
    @if (activeTab === 'passes') {
      <div class="space-y-2">
        @for (gp of passes(); track gp.id) {
          <div class="bg-white border rounded-lg p-4 flex justify-between items-center">
            <div>
              <div class="font-medium">{{ gp.person_name }} <span class="text-xs text-gray-400">{{ gp.pass_type.replace('_', ' ') }}</span></div>
              <div class="text-sm text-gray-500">Visiting {{ gp.guest_name }} · Room {{ gp.room_number || 'N/A' }}</div>
              <div class="text-xs text-gray-400">{{ gp.purpose || '' }} · Expected {{ gp.expected_at || 'N/A' }}</div>
            </div>
            <div class="flex gap-2 items-center">
              <span [class]="'text-xs font-bold px-2 py-1 rounded ' + statusBadge(gp.status)">{{ gp.status }}</span>
              @if (gp.status === 'pending') { <button (click)="approvePass(gp.id)" class="px-3 py-1 bg-green-600 text-white rounded text-xs">Approve</button> <button (click)="denyPass(gp.id)" class="px-3 py-1 bg-red-500 text-white rounded text-xs">Deny</button> }
              @if (gp.status === 'approved') { <button (click)="passCheckIn(gp.id)" class="px-3 py-1 bg-sage-600 text-white rounded text-xs">Check In</button> }
              @if (gp.status === 'checked_in') { <button (click)="passCheckOut(gp.id)" class="px-3 py-1 bg-orange-500 text-white rounded text-xs">Check Out</button> }
            </div>
          </div>
        }
      </div>
    }
    <!-- Movements -->
    @if (activeTab === 'movements') {
      <div class="space-y-1">
        @for (m of movements(); track m.id) {
          <div class="bg-white border rounded-lg p-3 flex justify-between">
            <div><span [class]="m.direction === 'step_out' ? 'text-orange-500' : 'text-green-600'">{{ m.direction === 'step_out' ? '🚶 Out' : '🏠 In' }}</span> <span class="font-medium ml-2">{{ m.guest_name }}</span> <span class="text-xs text-gray-400 ml-2">Room {{ m.room_number || 'N/A' }}</span></div>
            <div class="text-xs text-gray-400">{{ m.created_at?.substring(11, 16) }} · {{ m.recorded_by }}</div>
          </div>
        }
      </div>
    }
    <!-- On Premise -->
    @if (activeTab === 'onpremise') {
      <div class="space-y-1">
        @for (m of onPremise(); track m.id) {
          <div class="bg-white border rounded-lg p-3 flex justify-between"><div class="font-medium">🟢 {{ m.guest_name }} <span class="text-xs text-gray-400">Room {{ m.room_number || 'N/A' }}</span></div><div class="text-xs text-gray-400">Since {{ m.created_at?.substring(11, 16) }}</div></div>
        }
        @if (onPremise().length === 0) { <div class="text-center text-gray-400 p-8">No tracking data</div> }
      </div>
    }
  `,
})
export class SecurityPage implements OnInit, OnDestroy {
  private api = inject(ApiService); private auth = inject(AuthService);
  private activeProperty = inject(ActivePropertyService);
  passes = signal<any[]>([]); movements = signal<any[]>([]); onPremise = signal<any[]>([]);
  stats = signal({ onPremise: 0, pendingPasses: 0, todayVisitors: 0 });
  activeTab = 'passes';
  tabs = [{ key: 'passes', label: 'Gate Passes' }, { key: 'movements', label: 'Movements' }, { key: 'onpremise', label: 'On Premise' }];
  private timer: any;

  ngOnInit() { this.load(); this.timer = setInterval(() => this.load(), 15000); }
  ngOnDestroy() { clearInterval(this.timer); }

  load() {
    const pid = this.activeProperty.propertyId();
    this.api.get(`/security/gate-passes?property_id=${pid}`).subscribe({ next: (r: any) => { const d = r.data || []; this.passes.set(d); this.stats.update(s => ({ ...s, pendingPasses: d.filter((p: any) => p.status === 'pending').length, todayVisitors: d.filter((p: any) => p.status === 'checked_in' || p.status === 'checked_out').length })); } });
    this.api.get(`/security/movements?property_id=${pid}`).subscribe({ next: (r: any) => this.movements.set(r.data || []) });
    this.api.get(`/security/on-premise?property_id=${pid}`).subscribe({ next: (r: any) => { const d = r.data || []; this.onPremise.set(d); this.stats.update(s => ({ ...s, onPremise: d.length })); } });
  }

  approvePass(id: string) { this.api.post(`/security/gate-passes/${id}/approve`, {}).subscribe({ next: () => this.load() }); }
  denyPass(id: string) { this.api.post(`/security/gate-passes/${id}/deny`, { notes: '' }).subscribe({ next: () => this.load() }); }
  passCheckIn(id: string) { this.api.post(`/security/gate-passes/${id}/check-in`, {}).subscribe({ next: () => this.load() }); }
  passCheckOut(id: string) { this.api.post(`/security/gate-passes/${id}/check-out`, {}).subscribe({ next: () => this.load() }); }
  statusBadge(s: string): string { return s === 'approved' ? 'bg-green-100 text-green-700' : s === 'checked_in' ? 'bg-sage-100 text-sage-700' : s === 'denied' ? 'bg-red-100 text-red-700' : s === 'checked_out' ? 'bg-gray-100 text-gray-500' : 'bg-amber-100 text-amber-700'; }
}

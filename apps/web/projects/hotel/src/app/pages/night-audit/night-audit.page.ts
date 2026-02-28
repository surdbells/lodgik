import { Component, inject, OnInit, signal } from '@angular/core';
import { ApiService, PageHeaderComponent, LoadingSpinnerComponent, AuthService, ToastService, ActivePropertyService, ConfirmDialogService, ConfirmDialogComponent } from '@lodgik/shared';

@Component({
  selector: 'app-night-audit',
  standalone: true,
  imports: [PageHeaderComponent, LoadingSpinnerComponent, ConfirmDialogComponent],
  template: `
    <ui-confirm-dialog/>
    <ui-page-header title="Night Audit" subtitle="Close the day's operations and generate reports">
      <button (click)="runAudit()" [disabled]="running()"
        class="px-4 py-2 bg-sage-600 text-white text-sm rounded-lg hover:bg-sage-700 disabled:opacity-50">
        {{ running() ? 'Generating...' : '▶ Run Night Audit' }}
      </button>
    </ui-page-header>
    <ui-loading [loading]="loading()"></ui-loading>

    @if (!loading()) {
      @if (lastAudit()) {
        <div class="bg-white rounded-xl border border-gray-100 shadow-card p-6 mb-6">
          <div class="flex items-center justify-between mb-4">
            <h3 class="text-lg font-semibold">Last Audit — {{ lastAudit().audit_date }}</h3>
            <div class="flex items-center gap-2">
              <span [class]="'px-2 py-1 rounded-full text-xs font-medium ' + (lastAudit().status === 'closed' ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800')">
                {{ lastAudit().status }}
              </span>
              @if (lastAudit().status === 'open') {
                <button (click)="closeAudit(lastAudit())"
                  class="px-3 py-1.5 bg-gray-800 text-white text-xs rounded-lg hover:bg-gray-900">
                  ✓ Close Audit
                </button>
              }
            </div>
          </div>
          <div class="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div class="p-3 bg-sage-50 rounded-lg">
              <p class="text-xs text-gray-500">Occupancy</p>
              <p class="text-xl font-bold text-sage-700">{{ lastAudit().occupancy_rate }}%</p>
              <p class="text-xs text-gray-400">{{ lastAudit().rooms_occupied }}/{{ lastAudit().total_rooms }} rooms</p>
            </div>
            <div class="p-3 bg-green-50 rounded-lg">
              <p class="text-xs text-gray-500">Room Revenue</p>
              <p class="text-xl font-bold text-green-700">₦{{ (lastAudit().room_revenue / 100).toLocaleString() }}</p>
            </div>
            <div class="p-3 bg-purple-50 rounded-lg">
              <p class="text-xs text-gray-500">F&B Revenue</p>
              <p class="text-xl font-bold text-purple-700">₦{{ (lastAudit().fnb_revenue / 100).toLocaleString() }}</p>
            </div>
            <div class="p-3 bg-orange-50 rounded-lg">
              <p class="text-xs text-gray-500">Total Revenue</p>
              <p class="text-xl font-bold text-orange-700">₦{{ (lastAudit().total_revenue / 100).toLocaleString() }}</p>
            </div>
            <div class="p-3 bg-cyan-50 rounded-lg">
              <p class="text-xs text-gray-500">ADR</p>
              <p class="text-xl font-bold text-cyan-700">₦{{ (+lastAudit().adr).toLocaleString() }}</p>
            </div>
            <div class="p-3 bg-amber-50 rounded-lg">
              <p class="text-xs text-gray-500">RevPAR</p>
              <p class="text-xl font-bold text-amber-700">₦{{ (+lastAudit().revpar).toLocaleString() }}</p>
            </div>
            <div class="p-3 bg-blue-50 rounded-lg">
              <p class="text-xs text-gray-500">Check-ins / Outs</p>
              <p class="text-xl font-bold text-blue-700">{{ lastAudit().check_ins }} / {{ lastAudit().check_outs }}</p>
            </div>
            <div class="p-3 bg-red-50 rounded-lg">
              <p class="text-xs text-gray-500">Discrepancies</p>
              <p class="text-xl font-bold text-red-700">{{ lastAudit().discrepancies?.length || 0 }}</p>
            </div>
          </div>
          @if (lastAudit().closed_by_name) {
            <p class="mt-3 text-xs text-gray-400">Closed by {{ lastAudit().closed_by_name }} at {{ lastAudit().closed_at }}</p>
          }
        </div>
      }

      <div class="bg-white rounded-lg border">
        <h3 class="px-4 py-3 font-semibold border-b">Audit History</h3>
        <table class="w-full text-sm">
          <thead class="bg-gray-50"><tr>
            <th class="px-4 py-3 text-left font-medium text-gray-600">Date</th>
            <th class="px-4 py-3 text-right font-medium text-gray-600">Occupancy</th>
            <th class="px-4 py-3 text-right font-medium text-gray-600">Revenue</th>
            <th class="px-4 py-3 text-right font-medium text-gray-600">ADR</th>
            <th class="px-4 py-3 text-right font-medium text-gray-600">Check-ins</th>
            <th class="px-4 py-3 text-center font-medium text-gray-600">Status</th>
          </tr></thead>
          <tbody>
            @for (a of audits(); track a.id) {
              <tr class="border-t hover:bg-gray-50">
                <td class="px-4 py-3 font-medium">{{ a.audit_date }}</td>
                <td class="px-4 py-3 text-right">{{ a.occupancy_rate }}%</td>
                <td class="px-4 py-3 text-right">₦{{ (a.total_revenue / 100).toLocaleString() }}</td>
                <td class="px-4 py-3 text-right">₦{{ (+a.adr).toLocaleString() }}</td>
                <td class="px-4 py-3 text-right">{{ a.check_ins }}</td>
                <td class="px-4 py-3 text-center">
                  <span [class]="'px-2 py-1 rounded-full text-xs ' + (a.status === 'closed' ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800')">
                    {{ a.status }}
                  </span>
                </td>
              </tr>
            } @empty {
              <tr><td colspan="6" class="px-4 py-8 text-center text-gray-400">No audits yet — run your first night audit above</td></tr>
            }
          </tbody>
        </table>
      </div>
    }
  `
})
export default class NightAuditPage implements OnInit {
  private api = inject(ApiService);
  private auth = inject(AuthService);
  private toast = inject(ToastService);
  private activeProperty = inject(ActivePropertyService);
  private confirm = inject(ConfirmDialogService);

  loading = signal(true);
  running = signal(false);
  audits = signal<any[]>([]);
  lastAudit = signal<any>(null);

  get pid() { return this.activeProperty.propertyId(); }

  ngOnInit() { this.load(); }

  load() {
    this.api.get('/night-audit', { property_id: this.pid }).subscribe({
      next: (r: any) => {
        const d = r?.data || [];
        this.audits.set(d);
        if (d.length) this.lastAudit.set(d[0]);
        this.loading.set(false);
      },
      error: () => { this.loading.set(false); this.toast.error('Failed to load audit history'); },
    });
  }

  async runAudit() {
    const ok = await this.confirm.confirm({
      title: 'Run Night Audit',
      message: `Generate the night audit for today (${new Date().toLocaleDateString()})? This will calculate revenue, occupancy, and check-in/out data.`,
      confirmLabel: 'Run Audit',
      variant: 'info',
    });
    if (!ok) return;

    this.running.set(true);
    this.api.post('/night-audit/generate', { property_id: this.pid, date: new Date().toISOString().split('T')[0] }).subscribe({
      next: (r: any) => {
        this.running.set(false);
        if (r.success) { this.toast.success('Night audit generated successfully'); this.load(); }
        else this.toast.error(r.message || 'Audit failed');
      },
      error: () => { this.running.set(false); this.toast.error('Audit generation failed'); },
    });
  }

  async closeAudit(audit: any) {
    const ok = await this.confirm.confirm({
      title: 'Close Night Audit',
      message: `Close the audit for ${audit.audit_date}? Once closed, no further changes can be made.`,
      confirmLabel: 'Close Audit',
      variant: 'warning',
    });
    if (!ok) return;

    const user = this.auth.currentUser;
    const name = user ? `${user.first_name} ${user.last_name}`.trim() : 'System';
    this.api.post(`/night-audit/${audit.id}/close`, { closer_name: name }).subscribe({
      next: () => { this.toast.success('Audit closed'); this.load(); },
      error: () => this.toast.error('Failed to close audit'),
    });
  }
}

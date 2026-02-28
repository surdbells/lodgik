import { Component, inject, OnInit, OnDestroy, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ApiService, PageHeaderComponent, StatsCardComponent, AuthService, ActivePropertyService, ToastService } from '@lodgik/shared';

@Component({
  selector: 'app-security',
  standalone: true,
  imports: [FormsModule, PageHeaderComponent, StatsCardComponent],
  template: `
    <ui-page-header title="Security & Gate Pass" icon="shield" [breadcrumbs]="['Operations', 'Security']"
      subtitle="Visitor management, gate passes, and guest movement tracking">
      <div class="flex gap-2">
        @if (activeTab === 'passes') {
          <button (click)="openCreatePass()" class="px-4 py-2 bg-sage-600 text-white text-sm font-medium rounded-lg hover:bg-sage-700">+ Gate Pass</button>
        }
        @if (activeTab === 'movements') {
          <button (click)="openRecordMovement()" class="px-4 py-2 bg-sage-600 text-white text-sm font-medium rounded-lg hover:bg-sage-700">+ Record Movement</button>
        }
        @if (activeTab === 'codes') {
          <button (click)="openCreateCode()" class="px-4 py-2 bg-sage-600 text-white text-sm font-medium rounded-lg hover:bg-sage-700">+ Visitor Code</button>
        }
      </div>
    </ui-page-header>

    <!-- ── Create Gate Pass Modal ─────────────────────────── -->
    @if (showPassForm) {
      <div class="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50" (click)="showPassForm = false">
        <div class="bg-white rounded-2xl shadow-2xl w-full max-w-lg p-6" (click)="$event.stopPropagation()">
          <div class="flex justify-between items-center mb-4">
            <h3 class="text-base font-semibold text-gray-800">Create Gate Pass</h3>
            <button (click)="showPassForm = false" class="text-gray-400 hover:text-gray-600 text-xl">&times;</button>
          </div>
          <div class="grid grid-cols-2 gap-3">
            <div>
              <label class="text-xs font-medium text-gray-500 mb-1 block">Visitor Name *</label>
              <input [(ngModel)]="passForm.person_name" placeholder="Full name" class="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm bg-gray-50">
            </div>
            <div>
              <label class="text-xs font-medium text-gray-500 mb-1 block">Phone</label>
              <input [(ngModel)]="passForm.person_phone" placeholder="Phone number" class="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm bg-gray-50">
            </div>
            <div>
              <label class="text-xs font-medium text-gray-500 mb-1 block">Pass Type</label>
              <select [(ngModel)]="passForm.pass_type" class="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm bg-gray-50">
                <option value="visitor">Visitor</option>
                <option value="delivery">Delivery</option>
                <option value="contractor">Contractor</option>
                <option value="emergency">Emergency</option>
              </select>
            </div>
            <div>
              <label class="text-xs font-medium text-gray-500 mb-1 block">Guest Name / Room</label>
              <input [(ngModel)]="passForm.guest_name" placeholder="Who are they visiting?" class="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm bg-gray-50">
            </div>
            <div>
              <label class="text-xs font-medium text-gray-500 mb-1 block">Room Number</label>
              <input [(ngModel)]="passForm.room_number" placeholder="e.g. 204" class="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm bg-gray-50">
            </div>
            <div>
              <label class="text-xs font-medium text-gray-500 mb-1 block">Expected Arrival</label>
              <input type="datetime-local" [(ngModel)]="passForm.expected_at" class="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm bg-gray-50">
            </div>
            <div class="col-span-2">
              <label class="text-xs font-medium text-gray-500 mb-1 block">Purpose</label>
              <input [(ngModel)]="passForm.purpose" placeholder="Purpose of visit" class="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm bg-gray-50">
            </div>
          </div>
          <div class="flex gap-2 mt-4">
            <button (click)="savePass()" [disabled]="savingPass" class="px-5 py-2 bg-sage-600 text-white text-sm font-medium rounded-xl hover:bg-sage-700 disabled:opacity-50">
              {{ savingPass ? 'Creating...' : 'Create Gate Pass' }}
            </button>
            <button (click)="showPassForm = false" class="px-4 py-2 text-sm text-gray-500 border border-gray-200 rounded-xl hover:bg-gray-50">Cancel</button>
          </div>
        </div>
      </div>
    }

    <!-- ── Record Movement Modal ──────────────────────────── -->
    @if (showMovementForm) {
      <div class="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50" (click)="showMovementForm = false">
        <div class="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6" (click)="$event.stopPropagation()">
          <div class="flex justify-between items-center mb-4">
            <h3 class="text-base font-semibold text-gray-800">Record Movement</h3>
            <button (click)="showMovementForm = false" class="text-gray-400 hover:text-gray-600 text-xl">&times;</button>
          </div>
          <div class="space-y-3">
            <div>
              <label class="text-xs font-medium text-gray-500 mb-1 block">Guest Name *</label>
              <input [(ngModel)]="movForm.guest_name" placeholder="Guest name" class="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm bg-gray-50">
            </div>
            <div>
              <label class="text-xs font-medium text-gray-500 mb-1 block">Room Number</label>
              <input [(ngModel)]="movForm.room_number" placeholder="e.g. 204" class="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm bg-gray-50">
            </div>
            <div>
              <label class="text-xs font-medium text-gray-500 mb-1 block">Direction</label>
              <div class="grid grid-cols-2 gap-2">
                <button (click)="movForm.direction = 'step_out'"
                  [class]="movForm.direction === 'step_out' ? 'py-2 rounded-xl text-sm font-medium bg-orange-100 text-orange-700 border border-orange-200' : 'py-2 rounded-xl text-sm border border-gray-200 text-gray-600 hover:bg-gray-50'">
                  🚶 Stepping Out
                </button>
                <button (click)="movForm.direction = 'return'"
                  [class]="movForm.direction === 'return' ? 'py-2 rounded-xl text-sm font-medium bg-green-100 text-green-700 border border-green-200' : 'py-2 rounded-xl text-sm border border-gray-200 text-gray-600 hover:bg-gray-50'">
                  🏠 Returning
                </button>
              </div>
            </div>
          </div>
          <div class="flex gap-2 mt-4">
            <button (click)="saveMovement()" [disabled]="savingMovement || !movForm.guest_name" class="flex-1 py-2 bg-sage-600 text-white text-sm font-medium rounded-xl hover:bg-sage-700 disabled:opacity-50">
              {{ savingMovement ? 'Recording...' : 'Record' }}
            </button>
            <button (click)="showMovementForm = false" class="px-4 py-2 text-sm text-gray-500 border border-gray-200 rounded-xl hover:bg-gray-50">Cancel</button>
          </div>
        </div>
      </div>
    }

    <!-- ── Create Visitor Code Modal ──────────────────────── -->
    @if (showCodeForm) {
      <div class="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50" (click)="showCodeForm = false">
        <div class="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6" (click)="$event.stopPropagation()">
          <div class="flex justify-between items-center mb-4">
            <h3 class="text-base font-semibold text-gray-800">Create Visitor Code</h3>
            <button (click)="showCodeForm = false" class="text-gray-400 hover:text-gray-600 text-xl">&times;</button>
          </div>
          <div class="space-y-3">
            <div>
              <label class="text-xs font-medium text-gray-500 mb-1 block">Booking ID *</label>
              <input [(ngModel)]="codeForm.booking_id" placeholder="Booking ID" class="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm bg-gray-50">
            </div>
            <div>
              <label class="text-xs font-medium text-gray-500 mb-1 block">Guest ID *</label>
              <input [(ngModel)]="codeForm.guest_id" placeholder="Guest ID" class="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm bg-gray-50">
            </div>
            <div>
              <label class="text-xs font-medium text-gray-500 mb-1 block">Room Number</label>
              <input [(ngModel)]="codeForm.room_number" placeholder="e.g. 204" class="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm bg-gray-50">
            </div>
            <div>
              <label class="text-xs font-medium text-gray-500 mb-1 block">Expires At</label>
              <input type="datetime-local" [(ngModel)]="codeForm.expires_at" class="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm bg-gray-50">
            </div>
          </div>
          <div class="flex gap-2 mt-4">
            <button (click)="saveCode()" [disabled]="savingCode" class="flex-1 py-2 bg-sage-600 text-white text-sm font-medium rounded-xl hover:bg-sage-700 disabled:opacity-50">
              {{ savingCode ? 'Creating...' : 'Create Code' }}
            </button>
            <button (click)="showCodeForm = false" class="px-4 py-2 text-sm text-gray-500 border border-gray-200 rounded-xl hover:bg-gray-50">Cancel</button>
          </div>
        </div>
      </div>
    }

    <!-- Stats -->
    <div class="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
      <ui-stats-card label="On Premise" [value]="stats().onPremise" icon="users"></ui-stats-card>
      <ui-stats-card label="Pending Passes" [value]="stats().pendingPasses" icon="clock"></ui-stats-card>
      <ui-stats-card label="Visitors Today" [value]="stats().todayVisitors" icon="user-check"></ui-stats-card>
      <ui-stats-card label="Active Codes" [value]="stats().activeCodes" icon="key"></ui-stats-card>
    </div>

    <!-- Tabs -->
    <div class="flex gap-2 mb-4 flex-wrap">
      @for (tab of tabs; track tab.key) {
        <button (click)="activeTab = tab.key; onTabChange()"
          [class]="activeTab === tab.key ? 'px-4 py-2 bg-sage-600 text-white rounded-lg text-sm font-medium' : 'px-4 py-2 bg-white border border-gray-200 rounded-lg text-sm text-gray-600 hover:bg-gray-50'">
          {{ tab.label }}
        </button>
      }
    </div>

    <!-- ── Gate Passes ──────────────────────────────────────── -->
    @if (activeTab === 'passes') {
      <!-- Status filter -->
      <div class="flex gap-2 mb-3 flex-wrap">
        @for (f of passFilters; track f.value) {
          <button (click)="passFilter = f.value; applyPassFilter()"
            [class]="passFilter === f.value ? 'px-3 py-1 text-xs font-medium bg-gray-800 text-white rounded-lg' : 'px-3 py-1 text-xs bg-white border border-gray-200 text-gray-500 rounded-lg hover:bg-gray-50'">
            {{ f.label }}
          </button>
        }
      </div>
      <div class="space-y-2">
        @for (gp of filteredPasses(); track gp.id) {
          <div class="bg-white border border-gray-100 rounded-xl p-4 shadow-sm">
            <div class="flex items-start justify-between gap-3">
              <div class="min-w-0">
                <div class="flex items-center gap-2 flex-wrap">
                  <span class="font-semibold text-gray-800">{{ gp.person_name }}</span>
                  <span class="text-xs bg-gray-100 text-gray-500 rounded-full px-2 py-0.5">{{ gp.pass_type }}</span>
                </div>
                <div class="text-sm text-gray-500 mt-0.5">
                  Visiting {{ gp.guest_name || '—' }}
                  @if (gp.room_number) { · Room {{ gp.room_number }} }
                </div>
                <div class="text-xs text-gray-400 mt-0.5">
                  {{ gp.purpose || '' }}
                  @if (gp.expected_at) { · Expected {{ formatTime(gp.expected_at) }} }
                  @if (gp.person_phone) { · {{ gp.person_phone }} }
                </div>
              </div>
              <div class="flex flex-col items-end gap-2 shrink-0">
                <span class="text-xs font-semibold px-2.5 py-1 rounded-full" [class]="statusBadge(gp.status)">{{ gp.status }}</span>
                <div class="flex gap-1">
                  @if (gp.status === 'pending') {
                    <button (click)="approvePass(gp.id)" class="text-xs px-2.5 py-1 bg-green-100 text-green-700 rounded-lg font-medium hover:bg-green-200">Approve</button>
                    <button (click)="denyPass(gp.id)" class="text-xs px-2.5 py-1 bg-red-100 text-red-600 rounded-lg font-medium hover:bg-red-200">Deny</button>
                  }
                  @if (gp.status === 'approved') {
                    <button (click)="passCheckIn(gp.id)" class="text-xs px-2.5 py-1 bg-sage-100 text-sage-700 rounded-lg font-medium hover:bg-sage-200">Check In</button>
                  }
                  @if (gp.status === 'checked_in') {
                    <button (click)="passCheckOut(gp.id)" class="text-xs px-2.5 py-1 bg-orange-100 text-orange-700 rounded-lg font-medium hover:bg-orange-200">Check Out</button>
                  }
                </div>
              </div>
            </div>
          </div>
        } @empty {
          <div class="text-center py-12 text-gray-400">
            <div class="text-3xl mb-2">🔒</div>
            <p class="text-sm font-medium">No gate passes {{ passFilter ? 'with status: ' + passFilter : '' }}</p>
          </div>
        }
      </div>
    }

    <!-- ── Movements ──────────────────────────────────────── -->
    @if (activeTab === 'movements') {
      <div class="space-y-1">
        @for (m of movements(); track m.id) {
          <div class="bg-white border border-gray-100 rounded-xl p-3 flex justify-between items-center shadow-sm">
            <div class="flex items-center gap-3">
              <span class="text-xl">{{ m.direction === 'step_out' ? '🚶' : '🏠' }}</span>
              <div>
                <span class="font-medium text-gray-800">{{ m.guest_name }}</span>
                @if (m.room_number) { <span class="text-xs text-gray-400 ml-2">Room {{ m.room_number }}</span> }
                <div class="text-xs mt-0.5" [class]="m.direction === 'step_out' ? 'text-orange-500' : 'text-green-600'">
                  {{ m.direction === 'step_out' ? 'Stepped Out' : 'Returned' }}
                </div>
              </div>
            </div>
            <div class="text-xs text-gray-400 text-right">
              <div>{{ m.created_at?.substring(11, 16) }}</div>
              @if (m.recorded_by) { <div>{{ m.recorded_by }}</div> }
            </div>
          </div>
        } @empty {
          <div class="text-center py-12 text-gray-400">
            <div class="text-3xl mb-2">🚶</div>
            <p class="text-sm font-medium">No movements recorded today</p>
          </div>
        }
      </div>
    }

    <!-- ── On Premise ─────────────────────────────────────── -->
    @if (activeTab === 'onpremise') {
      <div class="space-y-1">
        @for (m of onPremise(); track m.id) {
          <div class="bg-white border border-gray-100 rounded-xl p-3 flex justify-between items-center shadow-sm">
            <div class="flex items-center gap-3">
              <div class="w-2 h-2 rounded-full bg-green-400 shrink-0"></div>
              <div>
                <span class="font-medium text-gray-800">{{ m.guest_name }}</span>
                @if (m.room_number) { <span class="text-xs text-gray-400 ml-2">Room {{ m.room_number }}</span> }
              </div>
            </div>
            <div class="text-xs text-gray-400">Since {{ m.created_at?.substring(11, 16) }}</div>
          </div>
        } @empty {
          <div class="text-center py-12 text-gray-400">
            <div class="text-3xl mb-2">🟢</div>
            <p class="text-sm font-medium">No tracking data available</p>
          </div>
        }
      </div>
    }

    <!-- ── Visitor Codes ──────────────────────────────────── -->
    @if (activeTab === 'codes') {
      <div class="space-y-2">
        @for (c of visitorCodes(); track c.id) {
          <div class="bg-white border border-gray-100 rounded-xl p-4 shadow-sm flex justify-between items-center">
            <div>
              <div class="flex items-center gap-2">
                <span class="font-mono font-bold text-sage-600 text-lg tracking-widest">{{ c.code }}</span>
                <span class="text-xs px-2 py-0.5 rounded-full" [class]="c.is_active && !isExpired(c.expires_at) ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-400'">
                  {{ c.is_active && !isExpired(c.expires_at) ? 'Active' : 'Inactive' }}
                </span>
              </div>
              <div class="text-xs text-gray-400 mt-1">
                Room {{ c.room_number || '—' }}
                @if (c.expires_at) { · Expires {{ formatTime(c.expires_at) }} }
                @if (c.used_at) { · Used {{ formatTime(c.used_at) }} }
              </div>
            </div>
            @if (c.is_active && !isExpired(c.expires_at)) {
              <button (click)="revokeCode(c.id)" class="text-xs px-2.5 py-1 border border-red-200 text-red-500 rounded-lg hover:bg-red-50">Revoke</button>
            }
          </div>
        } @empty {
          <div class="text-center py-12 text-gray-400">
            <div class="text-3xl mb-2">🔑</div>
            <p class="text-sm font-medium">No visitor codes issued</p>
          </div>
        }
      </div>
    }
  `,
})
export class SecurityPage implements OnInit, OnDestroy {
  private api = inject(ApiService);
  private auth = inject(AuthService);
  private activeProperty = inject(ActivePropertyService);
  private toast = inject(ToastService);

  passes = signal<any[]>([]);
  movements = signal<any[]>([]);
  onPremise = signal<any[]>([]);
  visitorCodes = signal<any[]>([]);
  stats = signal({ onPremise: 0, pendingPasses: 0, todayVisitors: 0, activeCodes: 0 });

  activeTab = 'passes';
  passFilter = '';
  private timer: any;

  showPassForm = false;
  showMovementForm = false;
  showCodeForm = false;
  savingPass = false;
  savingMovement = false;
  savingCode = false;

  passForm: any = { person_name: '', person_phone: '', pass_type: 'visitor', guest_name: '', room_number: '', expected_at: '', purpose: '' };
  movForm: any = { guest_name: '', room_number: '', direction: 'step_out' };
  codeForm: any = { booking_id: '', guest_id: '', room_number: '', expires_at: '' };

  tabs = [
    { key: 'passes', label: '🎫 Gate Passes' },
    { key: 'movements', label: '🚶 Movements' },
    { key: 'onpremise', label: '🟢 On Premise' },
    { key: 'codes', label: '🔑 Visitor Codes' },
  ];
  passFilters = [
    { label: 'All', value: '' },
    { label: 'Pending', value: 'pending' },
    { label: 'Approved', value: 'approved' },
    { label: 'Checked In', value: 'checked_in' },
    { label: 'Checked Out', value: 'checked_out' },
    { label: 'Denied', value: 'denied' },
  ];

  filteredPasses = signal<any[]>([]);

  ngOnInit() { this.load(); this.timer = setInterval(() => this.load(), 15000); }
  ngOnDestroy() { clearInterval(this.timer); }

  onTabChange() {
    if (this.activeTab === 'codes') this.loadCodes();
  }

  load() {
    const pid = this.activeProperty.propertyId();
    this.api.get(`/security/gate-passes?property_id=${pid}`).subscribe({
      next: (r: any) => {
        const d = r.data || [];
        this.passes.set(d);
        this.applyPassFilter();
        this.stats.update(s => ({
          ...s,
          pendingPasses: d.filter((p: any) => p.status === 'pending').length,
          todayVisitors: d.filter((p: any) => p.status === 'checked_in' || p.status === 'checked_out').length,
        }));
      },
    });
    this.api.get(`/security/movements?property_id=${pid}`).subscribe({
      next: (r: any) => this.movements.set(r.data || []),
    });
    this.api.get(`/security/on-premise?property_id=${pid}`).subscribe({
      next: (r: any) => {
        const d = r.data || [];
        this.onPremise.set(d);
        this.stats.update(s => ({ ...s, onPremise: d.length }));
      },
    });
  }

  loadCodes() {
    const pid = this.activeProperty.propertyId();
    this.api.get(`/security/visitor-codes?property_id=${pid}`).subscribe({
      next: (r: any) => {
        const d = r.data || [];
        this.visitorCodes.set(d);
        this.stats.update(s => ({ ...s, activeCodes: d.filter((c: any) => c.is_active && !this.isExpired(c.expires_at)).length }));
      },
    });
  }

  applyPassFilter() {
    const all = this.passes();
    this.filteredPasses.set(this.passFilter ? all.filter(p => p.status === this.passFilter) : all);
  }

  // Gate Pass
  openCreatePass() {
    this.passForm = { person_name: '', person_phone: '', pass_type: 'visitor', guest_name: '', room_number: '', expected_at: '', purpose: '' };
    this.showPassForm = true;
  }

  savePass() {
    if (!this.passForm.person_name) { this.toast.error('Visitor name is required'); return; }
    this.savingPass = true;
    const pid = this.activeProperty.propertyId();
    const body: any = { ...this.passForm, property_id: pid };
    if (!body.expected_at) delete body.expected_at;
    if (!body.room_number) delete body.room_number;
    if (!body.person_phone) delete body.person_phone;
    this.api.post('/security/gate-passes', body).subscribe({
      next: (r: any) => {
        this.savingPass = false;
        if (r.success) { this.toast.success('Gate pass created'); this.showPassForm = false; this.load(); }
        else { this.toast.error(r.message || 'Failed to create gate pass'); }
      },
      error: () => { this.savingPass = false; this.toast.error('Failed to create gate pass'); },
    });
  }

  approvePass(id: string) {
    this.api.post(`/security/gate-passes/${id}/approve`, {}).subscribe({
      next: (r: any) => { if (r.success) { this.toast.success('Pass approved'); this.load(); } else { this.toast.error(r.message || 'Failed'); } },
      error: () => this.toast.error('Failed to approve pass'),
    });
  }

  denyPass(id: string) {
    this.api.post(`/security/gate-passes/${id}/deny`, { notes: '' }).subscribe({
      next: (r: any) => { if (r.success) { this.toast.success('Pass denied'); this.load(); } else { this.toast.error(r.message || 'Failed'); } },
      error: () => this.toast.error('Failed to deny pass'),
    });
  }

  passCheckIn(id: string) {
    this.api.post(`/security/gate-passes/${id}/check-in`, {}).subscribe({
      next: (r: any) => { if (r.success) { this.toast.success('Visitor checked in'); this.load(); } else { this.toast.error(r.message || 'Failed'); } },
      error: () => this.toast.error('Failed'),
    });
  }

  passCheckOut(id: string) {
    this.api.post(`/security/gate-passes/${id}/check-out`, {}).subscribe({
      next: (r: any) => { if (r.success) { this.toast.success('Visitor checked out'); this.load(); } else { this.toast.error(r.message || 'Failed'); } },
      error: () => this.toast.error('Failed'),
    });
  }

  // Movement
  openRecordMovement() {
    this.movForm = { guest_name: '', room_number: '', direction: 'step_out' };
    this.showMovementForm = true;
  }

  saveMovement() {
    if (!this.movForm.guest_name) { this.toast.error('Guest name is required'); return; }
    this.savingMovement = true;
    const user = this.auth.currentUser;
    const body = {
      ...this.movForm,
      property_id: this.activeProperty.propertyId(),
      recorded_by: [user?.first_name, user?.last_name].filter(Boolean).join(' ') || 'Security',
    };
    this.api.post('/security/movements', body).subscribe({
      next: (r: any) => {
        this.savingMovement = false;
        if (r.success) { this.toast.success('Movement recorded'); this.showMovementForm = false; this.load(); }
        else { this.toast.error(r.message || 'Failed to record'); }
      },
      error: () => { this.savingMovement = false; this.toast.error('Failed to record movement'); },
    });
  }

  // Visitor Codes
  openCreateCode() {
    this.codeForm = { booking_id: '', guest_id: '', room_number: '', expires_at: '' };
    this.showCodeForm = true;
  }

  saveCode() {
    if (!this.codeForm.booking_id || !this.codeForm.guest_id) { this.toast.error('Booking ID and Guest ID are required'); return; }
    this.savingCode = true;
    const body: any = { ...this.codeForm, property_id: this.activeProperty.propertyId() };
    if (!body.expires_at) delete body.expires_at;
    if (!body.room_number) delete body.room_number;
    this.api.post('/security/visitor-codes', body).subscribe({
      next: (r: any) => {
        this.savingCode = false;
        if (r.success) { this.toast.success('Visitor code created'); this.showCodeForm = false; this.loadCodes(); }
        else { this.toast.error(r.message || 'Failed to create code'); }
      },
      error: () => { this.savingCode = false; this.toast.error('Failed to create visitor code'); },
    });
  }

  revokeCode(id: string) {
    this.api.post(`/security/visitor-codes/${id}/revoke`, {}).subscribe({
      next: (r: any) => { if (r.success) { this.toast.success('Code revoked'); this.loadCodes(); } else { this.toast.error(r.message || 'Failed'); } },
      error: () => this.toast.error('Failed to revoke code'),
    });
  }

  // Helpers
  isExpired(dt: string | null): boolean {
    if (!dt) return false;
    return new Date(dt) < new Date();
  }

  statusBadge(s: string): string {
    const map: Record<string, string> = {
      approved: 'bg-green-100 text-green-700', checked_in: 'bg-sage-100 text-sage-700',
      denied: 'bg-red-100 text-red-700', checked_out: 'bg-gray-100 text-gray-500',
      pending: 'bg-amber-100 text-amber-700',
    };
    return map[s] || 'bg-gray-100 text-gray-500';
  }

  formatTime(dt: string): string {
    if (!dt) return '';
    try { return new Date(dt).toLocaleString('en-GB', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' }); }
    catch { return dt; }
  }
}

import {
  Component,
  OnInit,
  inject,
  signal,
  computed,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import {
  ApiService,
  PageHeaderComponent,
  LoadingSpinnerComponent,
  ToastService,
  TokenService,
} from '@lodgik/shared';

// ── Types ──────────────────────────────────────────────────────────────────

interface PermItem {
  id:          string;
  key:         string;   // e.g. 'bookings.check_in'
  action:      string;
  label:       string;
  description: string | null;
  sortOrder:   number;
}

interface ModuleGroup {
  moduleKey:   string;
  permissions: PermItem[];
  expanded:    boolean;
}

// Merged matrix entry per role
type PermMap = Record<string, boolean>; // 'module.action' → granted

interface RoleMatrix {
  role:        string;
  permissions: PermMap;
}

// Working copy for a single role — tracks unsaved changes
interface RoleState {
  role:     string;
  current:  PermMap;   // what's saved on server (snapshot at load)
  draft:    PermMap;   // live edits — bound to toggles
  dirty:    boolean;
  saving:   boolean;
  resetting: boolean;
}

// ── Role display metadata ──────────────────────────────────────────────────

const ROLE_META: Record<string, { label: string; icon: string; desc: string; color: string }> = {
  manager:      { label: 'Manager',      icon: '👔', desc: 'Hotel operations manager',          color: 'bg-blue-50   border-blue-200   text-blue-700'   },
  front_desk:   { label: 'Front Desk',   icon: '🛎️', desc: 'Reception and check-in staff',      color: 'bg-violet-50 border-violet-200 text-violet-700' },
  accountant:   { label: 'Accountant',   icon: '🧾', desc: 'Finance and billing staff',         color: 'bg-emerald-50 border-emerald-200 text-emerald-700' },
  concierge:    { label: 'Concierge',    icon: '🔑', desc: 'Guest services and coordination',   color: 'bg-amber-50  border-amber-200  text-amber-700'  },
  housekeeping: { label: 'Housekeeping', icon: '🧹', desc: 'Cleaning and room maintenance',     color: 'bg-teal-50  border-teal-200   text-teal-700'   },
  security:     { label: 'Security',     icon: '🛡️', desc: 'Security and access control',      color: 'bg-red-50   border-red-200    text-red-700'    },
  bar:          { label: 'Bar',          icon: '🍸', desc: 'Bar and beverage staff',            color: 'bg-orange-50 border-orange-200 text-orange-700' },
  kitchen:      { label: 'Kitchen',      icon: '👨‍🍳', desc: 'Kitchen and prep staff',            color: 'bg-lime-50  border-lime-200   text-lime-700'   },
  restaurant:   { label: 'Restaurant',   icon: '🍽️', desc: 'Restaurant floor staff',            color: 'bg-pink-50  border-pink-200   text-pink-700'   },
  maintenance:  { label: 'Maintenance',  icon: '🔧', desc: 'Facilities and maintenance',        color: 'bg-gray-100 border-gray-300   text-gray-700'   },
};

const MODULE_META: Record<string, { label: string; icon: string }> = {
  dashboard:        { label: 'Dashboard',              icon: '📊' },
  bookings:         { label: 'Bookings',               icon: '📅' },
  rooms:            { label: 'Rooms',                  icon: '🛏️' },
  guests:           { label: 'Guests',                 icon: '👤' },
  folios:           { label: 'Folios & Charges',       icon: '📂' },
  invoices:         { label: 'Invoices',               icon: '🧾' },
  housekeeping:     { label: 'Housekeeping',           icon: '🧹' },
  staff:            { label: 'Staff & HR',             icon: '👥' },
  payroll:          { label: 'Payroll',                icon: '💰' },
  pos:              { label: 'POS / Bar & Restaurant', icon: '🍽️' },
  inventory:        { label: 'Inventory',              icon: '📦' },
  security:         { label: 'Security & Compliance',  icon: '🛡️' },
  events:           { label: 'Events & Banquets',      icon: '🎉' },
  corporate:        { label: 'Corporate Profiles',     icon: '🏢' },
  analytics:        { label: 'Analytics & Reports',    icon: '📈' },
  settings:         { label: 'Settings',               icon: '⚙️' },
  service_requests: { label: 'Service Requests',       icon: '🔔' },
  ota:              { label: 'OTA Channels',           icon: '🌐' },
  gym:              { label: 'Gym & Fitness',          icon: '💪' },
};

// ── Component ─────────────────────────────────────────────────────────────

@Component({
  selector: 'app-rbac',
  standalone: true,
  imports: [PageHeaderComponent, LoadingSpinnerComponent, FormsModule],
  template: `
    <ui-page-header
      title="Role Permissions"
      icon="shield-check"
      [breadcrumbs]="['System', 'Role Permissions']"
      subtitle="Control exactly what each staff role can see and do in your hotel.">
    </ui-page-header>

    <ui-loading [loading]="loading()"></ui-loading>

    @if (!loading()) {

      <!-- ── Info Banner ─────────────────────────────────────────────── -->
      <div class="mb-5 flex items-start gap-3 bg-blue-50 border border-blue-100 rounded-xl px-4 py-3 text-sm text-blue-800">
        <span class="text-base mt-0.5 shrink-0">ℹ️</span>
        <div>
          <strong>Property Admin</strong> always has full access to all features — this cannot be changed.
          Use this page to customise access for all other roles.
          Changes apply immediately to all staff with that role at this property.
        </div>
      </div>

      <!-- ── Main Layout ─────────────────────────────────────────────── -->
      <div class="flex gap-5 items-start">

        <!-- Left: Role Selector ──────────────────────────────────────── -->
        <aside class="w-52 shrink-0 bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
          <div class="px-3 py-2.5 border-b border-gray-100 bg-gray-50">
            <p class="text-xs font-semibold text-gray-500 uppercase tracking-wide">Staff Roles</p>
          </div>
          <div class="py-1">
            @for (r of roleStates(); track r.role) {
              <button
                (click)="selectRole(r.role)"
                class="w-full text-left px-3 py-2.5 flex items-center gap-2.5 transition-colors duration-100 group"
                [class.bg-blue-50]="activeRole() === r.role"
                [class.border-l-2]="activeRole() === r.role"
                [class.border-blue-500]="activeRole() === r.role"
                [class.hover:bg-gray-50]="activeRole() !== r.role">
                <span class="text-base leading-none">{{ roleMeta(r.role).icon }}</span>
                <div class="flex-1 min-w-0">
                  <div class="text-xs font-semibold truncate"
                       [class.text-blue-700]="activeRole() === r.role"
                       [class.text-gray-700]="activeRole() !== r.role">
                    {{ roleMeta(r.role).label }}
                  </div>
                  <div class="text-[10px] text-gray-400 truncate leading-tight mt-0.5">
                    {{ grantedCount(r) }}/{{ totalPermsCount() }} granted
                  </div>
                </div>
                @if (r.dirty) {
                  <span class="w-1.5 h-1.5 rounded-full bg-amber-400 shrink-0"></span>
                }
              </button>
            }
          </div>
        </aside>

        <!-- Right: Permission Matrix ──────────────────────────────────── -->
        <div class="flex-1 min-w-0">
          @if (activeRoleState(); as rs) {
            <!-- Role Header -->
            <div class="bg-white rounded-xl border border-gray-100 shadow-sm mb-4 p-4 flex items-center gap-4">
              <div class="w-11 h-11 rounded-xl flex items-center justify-center text-xl shrink-0"
                   [class]="'border ' + roleMeta(rs.role).color">
                {{ roleMeta(rs.role).icon }}
              </div>
              <div class="flex-1 min-w-0">
                <h2 class="text-sm font-bold text-gray-900">{{ roleMeta(rs.role).label }}</h2>
                <p class="text-xs text-gray-500 mt-0.5">{{ roleMeta(rs.role).desc }}</p>
              </div>

              <!-- Granted counter pill -->
              <div class="shrink-0 flex items-center gap-2">
                <div class="text-center">
                  <div class="text-lg font-bold leading-none"
                       [class.text-emerald-600]="grantedPercent(rs) >= 60"
                       [class.text-amber-600]="grantedPercent(rs) >= 30 && grantedPercent(rs) < 60"
                       [class.text-red-500]="grantedPercent(rs) < 30">
                    {{ grantedCount(rs) }}
                  </div>
                  <div class="text-[10px] text-gray-400">/ {{ totalPermsCount() }} granted</div>
                </div>

                <!-- Progress arc (simple bar) -->
                <div class="w-24 h-2 bg-gray-100 rounded-full overflow-hidden">
                  <div class="h-full rounded-full transition-all duration-300"
                       [style.width.%]="grantedPercent(rs)"
                       [class.bg-emerald-500]="grantedPercent(rs) >= 60"
                       [class.bg-amber-400]="grantedPercent(rs) >= 30 && grantedPercent(rs) < 60"
                       [class.bg-red-400]="grantedPercent(rs) < 30">
                  </div>
                </div>
              </div>

              <!-- Action Buttons -->
              <div class="shrink-0 flex items-center gap-2">
                <button
                  (click)="grantAll(rs)"
                  class="px-3 py-1.5 text-xs font-medium text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-lg hover:bg-emerald-100 transition-colors">
                  Grant All
                </button>
                <button
                  (click)="revokeAll(rs)"
                  class="px-3 py-1.5 text-xs font-medium text-red-600 bg-red-50 border border-red-200 rounded-lg hover:bg-red-100 transition-colors">
                  Revoke All
                </button>
                <button
                  (click)="resetRole(rs)"
                  [disabled]="rs.resetting"
                  class="px-3 py-1.5 text-xs font-medium text-gray-600 bg-gray-50 border border-gray-200 rounded-lg hover:bg-gray-100 transition-colors disabled:opacity-40">
                  @if (rs.resetting) { Resetting… } @else { Reset to Default }
                </button>
                <button
                  (click)="saveRole(rs)"
                  [disabled]="!rs.dirty || rs.saving"
                  class="px-4 py-1.5 text-xs font-semibold text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-1.5">
                  @if (rs.saving) {
                    <svg class="w-3 h-3 animate-spin" viewBox="0 0 24 24" fill="none" stroke="currentColor"><circle cx="12" cy="12" r="10" stroke-width="4" class="opacity-25"/><path d="M4 12a8 8 0 018-8" stroke-width="4" class="opacity-75"/></svg>
                    Saving…
                  } @else {
                    Save Changes
                    @if (rs.dirty) { <span class="w-1.5 h-1.5 rounded-full bg-amber-300"></span> }
                  }
                </button>
              </div>
            </div>

            <!-- Module Accordions -->
            <div class="space-y-2">
              @for (mod of moduleGroups(); track mod.moduleKey) {
                @if (hasAnyPermForModule(rs, mod.moduleKey)) {
                  <div class="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">

                    <!-- Module Header -->
                    <button
                      (click)="toggleModule(mod)"
                      class="w-full flex items-center gap-3 px-4 py-3 hover:bg-gray-50 transition-colors">
                      <span class="text-base leading-none">{{ moduleMeta(mod.moduleKey).icon }}</span>
                      <span class="flex-1 text-left text-sm font-semibold text-gray-800">
                        {{ moduleMeta(mod.moduleKey).label }}
                      </span>

                      <!-- Module granted pills -->
                      <span class="text-xs font-medium px-2 py-0.5 rounded-full"
                            [class]="moduleGrantedClass(rs, mod.moduleKey)">
                        {{ moduleGrantedCount(rs, mod.moduleKey) }}/{{ mod.permissions.length }}
                      </span>

                      <!-- Quick-toggle: grant/revoke whole module -->
                      <div class="flex items-center gap-1.5 mr-2" (click)="$event.stopPropagation()">
                        <button
                          (click)="grantModule(rs, mod.moduleKey)"
                          class="text-[10px] px-1.5 py-0.5 rounded bg-emerald-50 text-emerald-600 border border-emerald-200 hover:bg-emerald-100 transition-colors">
                          All
                        </button>
                        <button
                          (click)="revokeModule(rs, mod.moduleKey)"
                          class="text-[10px] px-1.5 py-0.5 rounded bg-red-50 text-red-500 border border-red-200 hover:bg-red-100 transition-colors">
                          None
                        </button>
                      </div>

                      <!-- Chevron -->
                      <svg class="w-4 h-4 text-gray-400 transition-transform duration-200 shrink-0"
                           [class.rotate-180]="mod.expanded"
                           viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <polyline points="6 9 12 15 18 9"></polyline>
                      </svg>
                    </button>

                    <!-- Permission Rows -->
                    @if (mod.expanded) {
                      <div class="border-t border-gray-100 divide-y divide-gray-50">
                        @for (perm of mod.permissions; track perm.key) {
                          <div class="flex items-center gap-3 px-4 py-2.5 hover:bg-gray-50 transition-colors">
                            <!-- Toggle Switch -->
                            <button
                              type="button"
                              role="switch"
                              [attr.aria-checked]="rs.draft[perm.key]"
                              (click)="toggle(rs, perm.key)"
                              class="relative inline-flex h-5 w-9 items-center rounded-full transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-1 shrink-0"
                              [class.bg-blue-600]="rs.draft[perm.key]"
                              [class.bg-gray-200]="!rs.draft[perm.key]">
                              <span
                                class="inline-block h-3.5 w-3.5 transform rounded-full bg-white shadow transition-transform duration-200"
                                [class.translate-x-4]="rs.draft[perm.key]"
                                [class.translate-x-1]="!rs.draft[perm.key]">
                              </span>
                            </button>

                            <!-- Label + Description -->
                            <div class="flex-1 min-w-0">
                              <div class="text-xs font-medium text-gray-800 leading-tight">
                                {{ perm.label }}
                              </div>
                              @if (perm.description) {
                                <div class="text-[10px] text-gray-400 leading-tight mt-0.5 truncate">
                                  {{ perm.description }}
                                </div>
                              }
                            </div>

                            <!-- Permission key badge -->
                            <code class="text-[9px] font-mono text-gray-300 shrink-0 hidden lg:block">
                              {{ perm.key }}
                            </code>

                            <!-- Changed indicator -->
                            @if (rs.draft[perm.key] !== rs.current[perm.key]) {
                              <span class="text-[9px] px-1.5 py-0.5 rounded bg-amber-50 text-amber-600 border border-amber-200 shrink-0 font-medium">
                                Changed
                              </span>
                            }
                          </div>
                        }
                      </div>
                    }
                  </div>
                }
              }
            </div>
          }
        </div>
      </div>
    }
  `,
})
export class RbacPage implements OnInit {
  private api   = inject(ApiService);
  private toast = inject(ToastService);
  private token = inject(TokenService);

  loading     = signal(true);
  propertyId  = '';

  // All permission modules from catalogue endpoint
  moduleGroups  = signal<ModuleGroup[]>([]);
  // Per-role working states
  roleStates    = signal<RoleState[]>([]);
  // Active role tab
  activeRole    = signal<string>('manager');

  // Derived: active RoleState
  activeRoleState = computed(() =>
    this.roleStates().find(r => r.role === this.activeRole()) ?? null
  );

  // Total permission count (across all modules)
  totalPermsCount = computed(() =>
    this.moduleGroups().reduce((s, m) => s + m.permissions.length, 0)
  );

  // ── Lifecycle ─────────────────────────────────────────────────────────

  ngOnInit(): void {
    const user = this.token.user();
    if (user?.property_id) this.propertyId = user.property_id;
    this.load();
  }

  private load(): void {
    this.loading.set(true);

    // Load catalogue and matrix in parallel
    let catalogueDone = false;
    let matrixDone    = false;
    let catalogue: ModuleGroup[] = [];
    let serverMatrix: RoleMatrix[] = [];

    const tryFinalize = () => {
      if (!catalogueDone || !matrixDone) return;
      this.buildState(catalogue, serverMatrix);
      this.loading.set(false);
    };

    this.api.get<any>('/rbac/permissions').subscribe({
      next: res => {
        if (res.success && Array.isArray(res.data)) {
          catalogue = (res.data as any[]).map(m => ({
            moduleKey:   m.moduleKey,
            permissions: m.permissions,
            expanded:    false,
          }));
          // Auto-expand first 3 modules
          catalogue.slice(0, 3).forEach(m => m.expanded = true);
        }
        catalogueDone = true;
        tryFinalize();
      },
      error: () => { catalogueDone = true; tryFinalize(); },
    });

    this.api.get<any>('/rbac/matrix', { property_id: this.propertyId }).subscribe({
      next: res => {
        if (res.success && Array.isArray(res.data)) {
          serverMatrix = res.data;
        }
        matrixDone = true;
        tryFinalize();
      },
      error: () => { matrixDone = true; tryFinalize(); },
    });
  }

  private buildState(catalogue: ModuleGroup[], serverMatrix: RoleMatrix[]): void {
    this.moduleGroups.set(catalogue);

    const states: RoleState[] = Object.keys(ROLE_META).map(role => {
      const serverEntry = serverMatrix.find(r => r.role === role);
      const perms: PermMap = serverEntry?.permissions ?? {};

      // Deep-clone for draft so draft !== current
      return {
        role,
        current:   { ...perms },
        draft:     { ...perms },
        dirty:     false,
        saving:    false,
        resetting: false,
      };
    });

    this.roleStates.set(states);
  }

  // ── Interactions ──────────────────────────────────────────────────────

  selectRole(role: string): void {
    this.activeRole.set(role);
  }

  toggle(rs: RoleState, key: string): void {
    rs.draft[key] = !rs.draft[key];
    rs.dirty = this.isDirty(rs);
    this.roleStates.update(s => [...s]); // trigger signal
  }

  grantAll(rs: RoleState): void {
    this.moduleGroups().forEach(m =>
      m.permissions.forEach(p => rs.draft[p.key] = true)
    );
    rs.dirty = this.isDirty(rs);
    this.roleStates.update(s => [...s]);
  }

  revokeAll(rs: RoleState): void {
    Object.keys(rs.draft).forEach(k => rs.draft[k] = false);
    rs.dirty = this.isDirty(rs);
    this.roleStates.update(s => [...s]);
  }

  grantModule(rs: RoleState, moduleKey: string): void {
    const mod = this.moduleGroups().find(m => m.moduleKey === moduleKey);
    mod?.permissions.forEach(p => rs.draft[p.key] = true);
    rs.dirty = this.isDirty(rs);
    this.roleStates.update(s => [...s]);
  }

  revokeModule(rs: RoleState, moduleKey: string): void {
    const mod = this.moduleGroups().find(m => m.moduleKey === moduleKey);
    mod?.permissions.forEach(p => rs.draft[p.key] = false);
    rs.dirty = this.isDirty(rs);
    this.roleStates.update(s => [...s]);
  }

  toggleModule(mod: ModuleGroup): void {
    mod.expanded = !mod.expanded;
    this.moduleGroups.update(s => [...s]);
  }

  saveRole(rs: RoleState): void {
    if (!rs.dirty || rs.saving) return;

    rs.saving = true;
    this.roleStates.update(s => [...s]);

    const payload = {
      property_id: this.propertyId,
      matrix: [{ role: rs.role, permissions: { ...rs.draft } }],
    };

    this.api.put<any>('/rbac/matrix', payload).subscribe({
      next: res => {
        if (res.success) {
          rs.current = { ...rs.draft };
          rs.dirty   = false;
          this.toast.success(`Permissions saved for ${this.roleMeta(rs.role).label}.`);
        } else {
          this.toast.error(res.message ?? 'Failed to save permissions.');
        }
        rs.saving = false;
        this.roleStates.update(s => [...s]);
      },
      error: () => {
        this.toast.error('Network error — permissions not saved.');
        rs.saving = false;
        this.roleStates.update(s => [...s]);
      },
    });
  }

  resetRole(rs: RoleState): void {
    if (rs.resetting) return;
    rs.resetting = true;
    this.roleStates.update(s => [...s]);

    this.api.post<any>('/rbac/reset', {
      property_id: this.propertyId,
      role:        rs.role,
    }).subscribe({
      next: res => {
        if (res.success) {
          this.toast.success(`${this.roleMeta(rs.role).label} reset to system defaults.`);
          // Reload matrix to get fresh defaults
          this.reloadMatrix();
        } else {
          this.toast.error(res.message ?? 'Reset failed.');
          rs.resetting = false;
          this.roleStates.update(s => [...s]);
        }
      },
      error: () => {
        this.toast.error('Network error — reset failed.');
        rs.resetting = false;
        this.roleStates.update(s => [...s]);
      },
    });
  }

  private reloadMatrix(): void {
    this.api.get<any>('/rbac/matrix', { property_id: this.propertyId }).subscribe({
      next: res => {
        if (res.success && Array.isArray(res.data)) {
          const serverMatrix: RoleMatrix[] = res.data;
          this.roleStates.update(states =>
            states.map(rs => {
              const fresh = serverMatrix.find(r => r.role === rs.role);
              const perms = fresh?.permissions ?? {};
              return {
                ...rs,
                current:   { ...perms },
                draft:     { ...perms },
                dirty:     false,
                saving:    false,
                resetting: false,
              };
            })
          );
        }
      },
    });
  }

  // ── Helpers ───────────────────────────────────────────────────────────

  private isDirty(rs: RoleState): boolean {
    return Object.keys(rs.draft).some(k => rs.draft[k] !== rs.current[k]);
  }

  roleMeta(role: string) {
    return ROLE_META[role] ?? { label: role, icon: '👤', desc: '', color: 'bg-gray-50 border-gray-200 text-gray-700' };
  }

  moduleMeta(moduleKey: string) {
    return MODULE_META[moduleKey] ?? { label: moduleKey, icon: '📦' };
  }

  grantedCount(rs: RoleState): number {
    return Object.values(rs.draft).filter(Boolean).length;
  }

  grantedPercent(rs: RoleState): number {
    const total = this.totalPermsCount();
    return total ? Math.round((this.grantedCount(rs) / total) * 100) : 0;
  }

  moduleGrantedCount(rs: RoleState, moduleKey: string): number {
    const mod = this.moduleGroups().find(m => m.moduleKey === moduleKey);
    if (!mod) return 0;
    return mod.permissions.filter(p => rs.draft[p.key]).length;
  }

  moduleGrantedClass(rs: RoleState, moduleKey: string): string {
    const mod = this.moduleGroups().find(m => m.moduleKey === moduleKey);
    if (!mod) return 'bg-gray-100 text-gray-500';
    const count = mod.permissions.filter(p => rs.draft[p.key]).length;
    const total = mod.permissions.length;
    if (count === total)   return 'bg-emerald-100 text-emerald-700';
    if (count === 0)       return 'bg-red-50 text-red-500';
    return 'bg-amber-50 text-amber-600';
  }

  hasAnyPermForModule(rs: RoleState, moduleKey: string): boolean {
    // Always show the module if it exists in catalogue — even if all denied
    return this.moduleGroups().some(m => m.moduleKey === moduleKey);
  }
}

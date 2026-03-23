import { PAGE_TOURS } from '../../services/page-tours';
import { Component, inject, OnInit, signal, computed } from '@angular/core';
import { ApiService, PageHeaderComponent, LoadingSpinnerComponent, TokenService , TourService} from '@lodgik/shared';

@Component({
  selector: 'app-features',
  standalone: true,
  imports: [PageHeaderComponent, LoadingSpinnerComponent],
  template: `
    <ui-page-header title="Features & Modules" icon="puzzle"
      subtitle="Enable or disable modules for your property. Core modules cannot be turned off."
      tourKey="features" (tourClick)="startTour()">
    </ui-page-header>
    <ui-loading [loading]="loading()"></ui-loading>

    @if (!loading()) {
      <!-- Summary bar -->
      <div class="flex flex-wrap items-center justify-between gap-3 mb-5">
        <p class="text-sm text-gray-500">
          <span class="font-semibold text-gray-900">{{ enabledCount() }}</span> of
          <span class="font-semibold text-gray-900">{{ totalCount() }}</span> modules active
        </p>
        <!-- Category filter -->
        <div class="flex flex-wrap gap-1.5">
          <button (click)="activeCategory.set('')"
            class="px-3 py-1 rounded-full text-xs font-semibold transition-all"
            [class]="!activeCategory() ? 'bg-sage-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'">
            All
          </button>
          @for (cat of categories(); track cat) {
            <button (click)="activeCategory.set(cat)"
              class="px-3 py-1 rounded-full text-xs font-semibold transition-all"
              [class]="activeCategory() === cat ? 'bg-sage-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'">
              {{ cat }}
            </button>
          }
        </div>
      </div>

      <!-- Toast notification -->
      @if (toast()) {
        <div class="mb-4 px-4 py-3 rounded-xl text-sm font-medium transition-all"
          [class]="toastType() === 'success' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                  : toastType() === 'error' ? 'bg-red-50 text-red-700 border border-red-200'
                  : 'bg-amber-50 text-amber-700 border border-amber-200'">
          {{ toast() }}
        </div>
      }

      <!-- Dependency cascade warning -->
      @if (cascadeWarning()) {
        <div class="mb-4 px-4 py-3 rounded-xl text-sm bg-amber-50 border border-amber-200">
          <p class="font-semibold text-amber-800 mb-1">{{ cascadeWarning()!.title }}</p>
          <p class="text-amber-700 text-xs">{{ cascadeWarning()!.message }}</p>
          <div class="flex gap-2 mt-3">
            <button (click)="confirmCascade()" [disabled]="toggling()"
              class="px-3 py-1.5 bg-amber-500 text-white text-xs font-semibold rounded-lg hover:bg-amber-600 disabled:opacity-50">
              {{ toggling() ? 'Applying…' : 'Confirm' }}
            </button>
            <button (click)="cascadeWarning.set(null)"
              class="px-3 py-1.5 border border-amber-300 text-amber-700 text-xs font-semibold rounded-lg hover:bg-amber-100">
              Cancel
            </button>
          </div>
        </div>
      }

      <!-- Module grid -->
      <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        @for (m of filteredModules(); track m.module_key) {
          <div class="bg-white rounded-xl border p-4 transition-all"
               [class]="m.is_enabled ? 'border-sage-200 shadow-sm' : 'border-gray-100 opacity-70'">
            <div class="flex items-start gap-3">
              <span class="text-2xl mt-0.5">{{ iconEmoji(m.icon) }}</span>
              <div class="flex-1 min-w-0">
                <div class="flex items-center justify-between gap-2 mb-0.5">
                  <p class="text-sm font-semibold text-gray-900 truncate">{{ m.name }}</p>
                  <!-- Toggle -->
                  @if (m.is_core) {
                    <span class="flex-shrink-0 text-[10px] font-bold px-2 py-0.5 bg-sage-100 text-sage-700 rounded-full">Core</span>
                  } @else if (isAdmin()) {
                    <button
                      (click)="toggle(m)"
                      [disabled]="toggling()"
                      class="relative flex-shrink-0 w-11 h-6 rounded-full transition-all focus:outline-none disabled:opacity-50"
                      [class]="m.is_enabled ? 'bg-sage-500' : 'bg-gray-300'"
                      [title]="m.is_enabled ? 'Disable module' : 'Enable module'">
                      <span class="absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform"
                            [class]="m.is_enabled ? 'translate-x-5' : 'translate-x-0'"></span>
                    </button>
                  } @else {
                    <span class="flex-shrink-0 text-[10px] font-bold px-2 py-0.5 rounded-full"
                      [class]="m.is_enabled ? 'bg-emerald-100 text-emerald-700' : 'bg-gray-100 text-gray-500'">
                      {{ m.is_enabled ? 'ON' : 'OFF' }}
                    </span>
                  }
                </div>
                <p class="text-xs text-gray-500">{{ m.category }}</p>
                @if (m.dependencies?.length) {
                  <p class="text-[11px] text-gray-400 mt-1">Requires: {{ m.dependencies.join(', ') }}</p>
                }
              </div>
            </div>
          </div>
        }
      </div>

      @if (filteredModules().length === 0) {
        <p class="text-center py-12 text-sm text-gray-400">No modules in this category.</p>
      }
    }
  `,
})
export class FeaturesPage implements OnInit {
  private tour = inject(TourService);
  private api  = inject(ApiService);
  private tok  = inject(TokenService);

  loading        = signal(true);
  modules        = signal<any[]>([]);
  enabledCount   = signal(0);
  totalCount     = signal(0);
  activeCategory = signal('');
  toggling       = signal(false);
  toast          = signal('');
  toastType      = signal<'success'|'error'|'warning'>('success');
  cascadeWarning = signal<{ title: string; message: string; action: () => void } | null>(null);

  isAdmin = computed(() => this.tok.role() === 'property_admin');

  categories = computed(() => {
    const cats = [...new Set(this.modules().map(m => m.category))].filter(Boolean);
    return cats.sort();
  });

  filteredModules = computed(() => {
    const cat = this.activeCategory();
    return cat ? this.modules().filter(m => m.category === cat) : this.modules();
  });

  private iconMap: Record<string, string> = {
    'hotel':'🏨','bed-double':'🛏️','clipboard-list':'📋','spray-can':'🧹',
    'utensils':'🍽️','concierge-bell':'🔔','message-circle':'💬','gift':'🎁',
    'heart':'❤️','shield':'🛡️','dumbbell':'💪','bath':'🛁',
    'folder-open':'📂','file-text':'📄','receipt':'🧾','trending-up':'📈',
    'users':'👥','user-round-cog':'⚙️','clock':'⏰','hand-coins':'💰',
    'star':'⭐','briefcase':'💼','package':'📦','wrench':'🔧',
    'globe':'🌐','smartphone':'📱','wifi':'📶','building':'🏢',
    'zap':'⚡','credit-card':'💳','settings':'⚙️','moon':'🌙',
    'tag':'🏷️','calendar-days':'📅','chart-bar':'📊','hard-hat':'👷',
    'tree-palm':'🌴','puzzle':'🧩','door-open':'🚪','bell':'🔔',
  };

  iconEmoji(icon: string): string { return this.iconMap[icon] || '📦'; }

  ngOnInit(): void { this.load(); }

  private load(): void {
    this.api.get('/features/tenant').subscribe({
      next: r => {
        if (r.success) {
          this.modules.set(r.data.modules || []);
          this.enabledCount.set(r.data.enabled_count || 0);
          this.totalCount.set(r.data.total_modules || 0);
        }
        this.loading.set(false);
      },
      error: () => this.loading.set(false),
    });
  }

  private showToast(msg: string, type: 'success'|'error'|'warning' = 'success'): void {
    this.toast.set(msg);
    this.toastType.set(type);
    setTimeout(() => this.toast.set(''), 4000);
  }

  toggle(m: any): void {
    if (m.is_core) return;
    if (!this.isAdmin()) return;

    if (m.is_enabled) {
      // Check if anything depends on this module
      const dependents = this.modules().filter(x =>
        x.is_enabled && x.dependencies?.includes(m.module_key)
      );
      if (dependents.length > 0) {
        this.cascadeWarning.set({
          title: `Disabling "${m.name}" will also disable:`,
          message: dependents.map(d => d.name).join(', '),
          action: () => this.callDisable(m),
        });
        return;
      }
      this.callDisable(m);
    } else {
      // Check if enabling will auto-enable dependencies
      const missing = (m.dependencies || []).filter((dep: string) =>
        !this.modules().find(x => x.module_key === dep && x.is_enabled)
      );
      if (missing.length > 0) {
        const depNames = missing.map((dep: string) => {
          const d = this.modules().find(x => x.module_key === dep);
          return d?.name || dep;
        });
        this.cascadeWarning.set({
          title: `Enabling "${m.name}" also requires:`,
          message: depNames.join(', ') + ' — these will be enabled automatically.',
          action: () => this.callEnable(m),
        });
        return;
      }
      this.callEnable(m);
    }
  }

  confirmCascade(): void {
    this.cascadeWarning()?.action();
    this.cascadeWarning.set(null);
  }

  private callEnable(m: any): void {
    this.toggling.set(true);
    this.api.post(`/features/tenant/enable/${m.module_key}`).subscribe({
      next: (r: any) => {
        if (r.success) {
          const also: string[] = r.data?.also_enabled || [];
          this.modules.update(mods => mods.map(x =>
            x.module_key === m.module_key || also.includes(x.module_key)
              ? { ...x, is_enabled: true } : x
          ));
          this.enabledCount.update(n => n + 1 + also.length);
          this.showToast(
            also.length ? `"${m.name}" enabled (+ ${also.length} dependency modules)` : `"${m.name}" enabled`,
            'success'
          );
        } else {
          this.showToast(r.message || 'Failed to enable', 'error');
        }
        this.toggling.set(false);
      },
      error: (e: any) => {
        this.showToast(e?.error?.message || 'Failed to enable module', 'error');
        this.toggling.set(false);
      },
    });
  }

  private callDisable(m: any): void {
    this.toggling.set(true);
    this.api.post(`/features/tenant/disable/${m.module_key}`).subscribe({
      next: (r: any) => {
        if (r.success) {
          const also: string[] = r.data?.also_disabled || [];
          this.modules.update(mods => mods.map(x =>
            x.module_key === m.module_key || also.includes(x.module_key)
              ? { ...x, is_enabled: false } : x
          ));
          this.enabledCount.update(n => n - 1 - also.length);
          this.showToast(
            also.length ? `"${m.name}" disabled (+ ${also.length} dependent modules)` : `"${m.name}" disabled`,
            'warning'
          );
        } else {
          this.showToast(r.message || 'Failed to disable', 'error');
        }
        this.toggling.set(false);
      },
      error: (e: any) => {
        this.showToast(e?.error?.message || 'Failed to disable module', 'error');
        this.toggling.set(false);
      },
    });
  }

  startTour(): void {
    this.tour.start(PAGE_TOURS['features'] ?? [], 'features');
  }
}

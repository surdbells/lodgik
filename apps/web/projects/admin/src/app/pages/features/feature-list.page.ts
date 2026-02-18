import { Component, inject, OnInit, signal } from '@angular/core';
import { ApiService, PageHeaderComponent, LoadingSpinnerComponent, BadgeComponent } from '@lodgik/shared';

@Component({
  selector: 'app-feature-list',
  standalone: true,
  imports: [PageHeaderComponent, LoadingSpinnerComponent, BadgeComponent],
  template: `
    <ui-page-header title="Feature Modules" subtitle="45 modules across all categories"></ui-page-header>
    <ui-loading [loading]="loading()"></ui-loading>
    @if (!loading()) {
      @for (cat of categories(); track cat.name) {
        <div class="mb-6">
          <h3 class="text-sm font-semibold text-gray-700 mb-2">{{ cat.name }} <span class="text-gray-400">({{ cat.modules.length }})</span></h3>
          <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            @for (m of cat.modules; track m.module_key) {
              <div class="bg-white rounded-lg border border-gray-200 p-4 flex items-start gap-3">
                <span class="text-xl">{{ m.icon || '📦' }}</span>
                <div class="flex-1 min-w-0">
                  <div class="flex items-center gap-2">
                    <span class="text-sm font-medium text-gray-800">{{ m.name }}</span>
                    @if (m.is_core) { <ui-badge variant="primary">Core</ui-badge> }
                  </div>
                  <p class="text-xs text-gray-500 mt-0.5">{{ m.description || m.module_key }}</p>
                  <div class="flex items-center gap-2 mt-1">
                    <ui-badge [variant]="$any(tierVariant(m.min_tier))">{{ m.min_tier }}</ui-badge>
                    @if (m.dependencies?.length) {
                      <span class="text-xs text-gray-400">deps: {{ m.dependencies.join(', ') }}</span>
                    }
                  </div>
                </div>
              </div>
            }
          </div>
        </div>
      }
    }
  `,
})
export class FeatureListPage implements OnInit {
  private api = inject(ApiService);
  loading = signal(true);
  categories = signal<any[]>([]);

  ngOnInit(): void {
    this.api.get('/features').subscribe({
      next: res => {
        if (res.success) {
          const byCategory: Record<string, any[]> = {};
          for (const m of res.data || []) {
            const cat = m.category || 'Other';
            (byCategory[cat] = byCategory[cat] || []).push(m);
          }
          this.categories.set(Object.entries(byCategory).map(([name, modules]) => ({ name, modules })));
        }
        this.loading.set(false);
      },
      error: () => this.loading.set(false),
    });
  }

  tierVariant(tier: string): string {
    const m: Record<string, string> = { starter: 'success', professional: 'info', business: 'warning', enterprise: 'primary' };
    return m[tier] || 'neutral';
  }
}

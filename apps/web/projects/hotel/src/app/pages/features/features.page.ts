import { Component, inject, OnInit, signal } from '@angular/core';
import { ApiService, PageHeaderComponent, LoadingSpinnerComponent, BadgeComponent } from '@lodgik/shared';

@Component({
  selector: 'app-features',
  standalone: true,
  imports: [PageHeaderComponent, LoadingSpinnerComponent, BadgeComponent],
  template: `
    <ui-page-header title="Features" subtitle="Modules enabled for your hotel"></ui-page-header>
    <ui-loading [loading]="loading()"></ui-loading>
    @if (!loading()) {
      <div class="mb-4 text-sm text-gray-600">
        {{ enabledCount() }} of {{ totalCount() }} modules enabled
      </div>
      <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        @for (m of modules(); track m.module_key) {
          <div class="bg-white rounded-lg border p-4 flex items-center gap-3"
               [class.border-emerald-200]="m.is_enabled" [class.border-gray-200]="!m.is_enabled"
               [class.opacity-50]="!m.is_enabled">
            <span class="text-xl">{{ iconEmoji(m.icon) }}</span>
            <div class="flex-1 min-w-0">
              <div class="text-sm font-medium text-gray-800">{{ m.name }}</div>
              <div class="text-xs text-gray-500">{{ m.category }}</div>
            </div>
            <ui-badge [variant]="m.is_enabled ? 'success' : 'neutral'">{{ m.is_enabled ? 'ON' : 'OFF' }}</ui-badge>
          </div>
        }
      </div>
    }
  `,
})
export class FeaturesPage implements OnInit {
  private api = inject(ApiService);
  loading = signal(true); modules = signal<any[]>([]);
  enabledCount = signal(0); totalCount = signal(0);

  private iconMap: Record<string, string> = {
    'hotel': '🏨', 'bed-double': '🛏️', 'clipboard-list': '📋', 'spray-can': '🧹',
    'utensils': '🍽️', 'concierge-bell': '🔔', 'message-circle': '💬', 'gift': '🎁',
    'heart': '❤️', 'shield': '🛡️', 'dumbbell': '💪', 'bath': '🛁',
    'folder-open': '📂', 'file-text': '📄', 'receipt': '🧾', 'trending-up': '📈',
    'users': '👥', 'user-round-cog': '⚙️', 'clock': '⏰', 'hand-coins': '💰',
    'star': '⭐', 'briefcase': '💼', 'package': '📦', 'wrench': '🔧',
    'globe': '🌐', 'smartphone': '📱', 'wifi': '📶', 'building': '🏢',
    'zap': '⚡', 'credit-card': '💳', 'settings': '⚙️', 'moon': '🌙',
    'tag': '🏷️', 'calendar-days': '📅', 'chart-bar': '📊', 'hard-hat': '👷',
    'tree-palm': '🌴', 'puzzle': '🧩', 'door-open': '🚪', 'bell': '🔔',
  };

  iconEmoji(icon: string): string { return this.iconMap[icon] || '📦'; }

  ngOnInit(): void {
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
}

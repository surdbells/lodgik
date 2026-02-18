import { Component, Input } from '@angular/core';

@Component({
  selector: 'ui-stats-card',
  standalone: true,
  template: `
    <div class="bg-white rounded-lg border border-gray-200 p-5 hover:shadow-sm transition-shadow"
         [class.cursor-pointer]="clickable">
      <div class="flex items-start justify-between">
        <div class="min-w-0">
          <p class="text-sm font-medium text-gray-500 truncate">{{ label }}</p>
          <p class="mt-1 text-2xl font-bold text-gray-900">{{ value }}</p>
          @if (subtitle) {
            <p class="mt-0.5 text-xs text-gray-400">{{ subtitle }}</p>
          }
        </div>
        <div class="flex flex-col items-end gap-1.5">
          @if (icon) {
            <span class="text-2xl">{{ icon }}</span>
          }
          @if (trend !== undefined) {
            <span class="inline-flex items-center gap-0.5 text-xs font-medium px-1.5 py-0.5 rounded-full"
                  [class]="trend >= 0 ? 'text-emerald-700 bg-emerald-50' : 'text-red-700 bg-red-50'">
              {{ trend >= 0 ? '↑' : '↓' }} {{ absTrend }}%
            </span>
          }
        </div>
      </div>
      <!-- Sparkline slot -->
      <div class="mt-3">
        <ng-content></ng-content>
      </div>
    </div>
  `,
})
export class StatsCardComponent {
  @Input() label = '';
  @Input() value: string | number = '';
  @Input() subtitle?: string;
  @Input() icon?: string;
  @Input() trend?: number;
  @Input() clickable = false;

  get absTrend(): string {
    return Math.abs(this.trend ?? 0).toFixed(1);
  }
}

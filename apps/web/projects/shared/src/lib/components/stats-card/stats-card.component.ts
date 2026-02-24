import { Component, Input } from '@angular/core';
import { LucideAngularModule, LUCIDE_ICONS, LucideIconProvider } from 'lucide-angular';
import { LODGIK_ICONS } from '../../icons';

@Component({
  selector: 'ui-stats-card',
  standalone: true,
  imports: [LucideAngularModule],
  providers: [{ provide: LUCIDE_ICONS, multi: true, useValue: new LucideIconProvider(LODGIK_ICONS) }],
  template: `
    @if (variant === 'gradient') {
      <!-- Gradient Card -->
      <div class="stat-card-gradient" [style.background]="gradient">
        <div class="relative z-10">
          <div class="flex items-start justify-between">
            <span class="w-10 h-10 rounded-lg bg-white/15 flex items-center justify-center backdrop-blur-sm">
              @if (isLucide) {
                <lucide-icon [name]="icon!" [size]="20" [strokeWidth]="1.75" class="text-white"></lucide-icon>
              } @else {
                <span class="text-lg">{{ icon }}</span>
              }
            </span>
            @if (trend !== undefined) {
              <span class="flex items-center gap-0.5 text-xs font-semibold px-2 py-0.5 rounded-full"
                    [class]="trend >= 0 ? 'bg-white/20 text-white' : 'bg-red-400/30 text-red-100'">
                {{ trend >= 0 ? '↑' : '↓' }}{{ absTrend }}%
              </span>
            }
          </div>
          <p class="mt-4 text-sm font-medium text-white/70">{{ label }}</p>
          <p class="mt-1 text-2xl font-bold text-white font-heading">{{ value }}</p>
          @if (subtitle) {
            <p class="mt-0.5 text-xs text-white/50">{{ subtitle }}</p>
          }
        </div>
        <div class="relative z-10 mt-2">
          <ng-content></ng-content>
        </div>
      </div>
    } @else {
      <!-- Standard Card -->
      <div class="bg-white rounded-xl border border-gray-100 p-5 shadow-card hover:shadow-card-hover transition-shadow"
           [class.cursor-pointer]="clickable">
        <div class="flex items-start justify-between">
          <div class="min-w-0">
            <p class="text-sm font-medium text-gray-500">{{ label }}</p>
            <p class="mt-1.5 text-2xl font-bold text-gray-900 font-heading">{{ value }}</p>
            @if (subtitle) {
              <p class="mt-0.5 text-xs text-gray-400">{{ subtitle }}</p>
            }
          </div>
          <div class="flex flex-col items-end gap-1.5">
            @if (icon) {
              <span class="w-10 h-10 rounded-lg bg-sage-50 flex items-center justify-center">
                @if (isLucide) {
                  <lucide-icon [name]="icon!" [size]="20" [strokeWidth]="1.75" class="text-sage-600"></lucide-icon>
                } @else {
                  <span class="text-lg">{{ icon }}</span>
                }
              </span>
            }
            @if (trend !== undefined) {
              <span class="inline-flex items-center gap-0.5 text-xs font-semibold px-2 py-0.5 rounded-full"
                    [class]="trend >= 0 ? 'text-emerald-700 bg-emerald-50' : 'text-red-700 bg-red-50'">
                {{ trend >= 0 ? '↑' : '↓' }} {{ absTrend }}%
              </span>
            }
          </div>
        </div>
        <div class="mt-3">
          <ng-content></ng-content>
        </div>
      </div>
    }
  `,
})
export class StatsCardComponent {
  @Input() label = '';
  @Input() value: string | number = '';
  @Input() subtitle?: string;
  @Input() icon?: string;
  @Input() trend?: number;
  @Input() clickable = false;
  @Input() variant: 'default' | 'gradient' = 'default';
  @Input() gradient = 'linear-gradient(135deg, #3a543a 0%, #5a825a 50%, #7a9e7a 100%)';

  get isLucide(): boolean {
    return !!this.icon && /^[a-z][a-z0-9-]*$/.test(this.icon);
  }

  get absTrend(): string {
    return Math.abs(this.trend ?? 0).toFixed(1);
  }
}

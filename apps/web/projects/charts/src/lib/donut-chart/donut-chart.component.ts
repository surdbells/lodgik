import { Component, Input, computed, signal } from '@angular/core';
import { DecimalPipe } from '@angular/common';
import { ChartDataPoint, getColor } from '../chart-utils';

@Component({
  selector: 'chart-donut',
  standalone: true,
  imports: [DecimalPipe],
  template: `
    <div class="flex items-center gap-4" [style.height.px]="height">
      <svg [attr.viewBox]="'-1.3 -1.3 2.6 2.6'" [style.width.px]="height" [style.height.px]="height"
           class="shrink-0">
        <!-- Background ring -->
        <circle cx="0" cy="0" [attr.r]="radius" fill="none" stroke="#f3f4f6" [attr.stroke-width]="thickness" />

        <!-- Segments -->
        @for (seg of segments(); track seg.label; let i = $index) {
          <circle cx="0" cy="0" [attr.r]="radius" fill="none"
                  [attr.stroke]="seg.color" [attr.stroke-width]="thickness"
                  [attr.stroke-dasharray]="seg.dashArray"
                  [attr.stroke-dashoffset]="seg.dashOffset"
                  stroke-linecap="round"
                  class="cursor-pointer transition-opacity"
                  [class.opacity-60]="hovered() >= 0 && hovered() !== i"
                  (mouseenter)="hovered.set(i)"
                  (mouseleave)="hovered.set(-1)"
                  transform="rotate(-90)" />
        }

        <!-- Center text -->
        @if (hovered() >= 0 && segments()[hovered()]; as seg) {
          <text x="0" y="-0.08" text-anchor="middle" fill="#374151" font-size="0.28" font-weight="700">
            {{ seg.percent.toFixed(0) }}%
          </text>
          <text x="0" y="0.18" text-anchor="middle" fill="#9ca3af" font-size="0.14">
            {{ seg.label }}
          </text>
        } @else {
          <text x="0" y="-0.08" text-anchor="middle" fill="#374151" font-size="0.28" font-weight="700">
            {{ centerValue }}
          </text>
          <text x="0" y="0.18" text-anchor="middle" fill="#9ca3af" font-size="0.14">
            {{ centerLabel }}
          </text>
        }
      </svg>

      <!-- Legend -->
      @if (showLegend) {
        <div class="flex flex-col gap-1.5 text-sm">
          @for (seg of segments(); track seg.label; let i = $index) {
            <div class="flex items-center gap-2 cursor-pointer"
                 (mouseenter)="hovered.set(i)" (mouseleave)="hovered.set(-1)">
              <span class="w-2.5 h-2.5 rounded-full shrink-0" [style.background]="seg.color"></span>
              <span class="text-gray-700">{{ seg.label }}</span>
              <span class="text-gray-400 ml-auto pl-3">{{ seg.value | number }}</span>
            </div>
          }
        </div>
      }
    </div>
  `,
})
export class DonutChartComponent {
  @Input() data: ChartDataPoint[] = [];
  @Input() height = 200;
  @Input() centerValue = '';
  @Input() centerLabel = '';
  @Input() showLegend = true;

  radius = 0.85;
  thickness = 0.25;
  hovered = signal(-1);

  segments = computed(() => {
    const total = this.data.reduce((sum, d) => sum + d.value, 0);
    if (total === 0) return [];

    const circumference = 2 * Math.PI * this.radius;
    let offset = 0;

    return this.data.map((d, i) => {
      const percent = (d.value / total) * 100;
      const length = (d.value / total) * circumference;
      const gap = 0.02 * circumference;
      const seg = {
        label: d.label,
        value: d.value,
        percent,
        color: getColor(i, d.color),
        dashArray: `${Math.max(0, length - gap)} ${circumference - length + gap}`,
        dashOffset: `${-offset}`,
      };
      offset += length;
      return seg;
    });
  });
}

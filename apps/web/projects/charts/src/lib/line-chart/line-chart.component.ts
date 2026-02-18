import { Component, Input, computed, signal } from '@angular/core';
import { DecimalPipe } from '@angular/common';
import { ChartSeries, getColor, scale, smoothPath, shortNumber } from '../chart-utils';

@Component({
  selector: 'chart-line',
  standalone: true,
  imports: [DecimalPipe],
  template: `
    <div class="relative" [style.height.px]="height">
      <svg [attr.viewBox]="'0 0 ' + width + ' ' + height" class="w-full h-full" preserveAspectRatio="xMidYMid meet">
        <!-- Grid lines -->
        @for (tick of yTicks(); track tick) {
          <line [attr.x1]="pad.left" [attr.y1]="tick.y" [attr.x2]="width - pad.right" [attr.y2]="tick.y"
                stroke="#e5e7eb" stroke-width="1" stroke-dasharray="4,4" />
          <text [attr.x]="pad.left - 8" [attr.y]="tick.y + 4" text-anchor="end"
                fill="#9ca3af" font-size="11">{{ tick.label }}</text>
        }

        <!-- X axis labels -->
        @for (tick of xTicks(); track tick.label) {
          <text [attr.x]="tick.x" [attr.y]="height - pad.bottom + 18" text-anchor="middle"
                fill="#9ca3af" font-size="11">{{ tick.label }}</text>
        }

        <!-- Series -->
        @for (s of computed_series(); track s.name; let i = $index) {
          <!-- Area fill -->
          @if (showArea) {
            <path [attr.d]="s.areaPath" [attr.fill]="s.color" opacity="0.08" />
          }
          <!-- Line -->
          <path [attr.d]="s.linePath" [attr.stroke]="s.color" stroke-width="2.5" fill="none"
                stroke-linecap="round" stroke-linejoin="round" />
          <!-- Dots -->
          @for (pt of s.points; track pt.x) {
            <circle [attr.cx]="pt.x" [attr.cy]="pt.y" r="3.5" [attr.fill]="s.color"
                    stroke="white" stroke-width="2" class="cursor-pointer"
                    (mouseenter)="tooltip.set({x: pt.x, y: pt.y, label: pt.label, value: pt.value, series: s.name, color: s.color})"
                    (mouseleave)="tooltip.set(null)" />
          }
        }

        <!-- Tooltip -->
        @if (tooltip(); as tip) {
          <g>
            <rect [attr.x]="tip.x - 45" [attr.y]="tip.y - 40" width="90" height="30"
                  rx="4" fill="white" stroke="#e5e7eb" />
            <text [attr.x]="tip.x" [attr.y]="tip.y - 21" text-anchor="middle"
                  fill="#374151" font-size="12" font-weight="600">{{ tip.value | number }}</text>
          </g>
        }
      </svg>

      <!-- Legend -->
      @if (series.length > 1) {
        <div class="flex gap-4 justify-center mt-2">
          @for (s of series; track s.name; let i = $index) {
            <div class="flex items-center gap-1.5 text-xs text-gray-600">
              <span class="w-3 h-0.5 rounded" [style.background]="getColor(i, s.color)"></span>
              {{ s.name }}
            </div>
          }
        </div>
      }
    </div>
  `,
})
export class LineChartComponent {
  @Input() series: ChartSeries[] = [];
  @Input() labels: string[] = [];
  @Input() width = 600;
  @Input() height = 300;
  @Input() showArea = true;
  @Input() smooth = true;

  pad = { top: 20, right: 20, bottom: 35, left: 50 };
  tooltip = signal<any>(null);
  getColor = getColor;

  computed_series = computed(() => {
    const { min, max } = this.dataRange();
    const chartW = this.width - this.pad.left - this.pad.right;
    const chartH = this.height - this.pad.top - this.pad.bottom;

    return this.series.map((s, si) => {
      const color = getColor(si, s.color);
      const points = s.data.map((v, i) => {
        const x = this.pad.left + (s.data.length > 1 ? (i / (s.data.length - 1)) * chartW : chartW / 2);
        const y = this.pad.top + chartH - scale(v, min, max, 0, chartH);
        return { x, y, value: v, label: this.labels[i] ?? `${i}` };
      });

      const coords: [number, number][] = points.map(p => [p.x, p.y]);
      const linePath = this.smooth ? smoothPath(coords) : coords.map((c, i) => `${i === 0 ? 'M' : 'L'} ${c[0]},${c[1]}`).join(' ');

      const bottom = this.pad.top + chartH;
      const areaPath = linePath
        + ` L ${points[points.length - 1]?.x ?? 0},${bottom}`
        + ` L ${points[0]?.x ?? 0},${bottom} Z`;

      return { name: s.name, color, points, linePath, areaPath };
    });
  });

  yTicks = computed(() => {
    const { min, max } = this.dataRange();
    const chartH = this.height - this.pad.top - this.pad.bottom;
    const count = 5;
    const ticks = [];
    for (let i = 0; i <= count; i++) {
      const value = min + (max - min) * (i / count);
      const y = this.pad.top + chartH - (i / count) * chartH;
      ticks.push({ y, label: shortNumber(value) });
    }
    return ticks;
  });

  xTicks = computed(() => {
    const chartW = this.width - this.pad.left - this.pad.right;
    const maxTicks = Math.min(this.labels.length, 8);
    const step = Math.max(1, Math.floor(this.labels.length / maxTicks));
    return this.labels.filter((_, i) => i % step === 0).map((label, i) => ({
      label,
      x: this.pad.left + (i * step / Math.max(1, this.labels.length - 1)) * chartW,
    }));
  });

  private dataRange(): { min: number; max: number } {
    const allValues = this.series.flatMap(s => s.data);
    if (allValues.length === 0) return { min: 0, max: 100 };
    const min = Math.min(0, ...allValues);
    const max = Math.max(...allValues) * 1.1;
    return { min, max: max || 100 };
  }
}

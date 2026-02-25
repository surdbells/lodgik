import { Component, Input, OnChanges, signal } from '@angular/core';
import { DecimalPipe } from '@angular/common';
import { ChartDataPoint, getColor, shortNumber } from '../chart-utils';

@Component({
  selector: 'chart-bar',
  standalone: true,
  imports: [DecimalPipe],
  template: `
    <div class="relative" [style.height.px]="height">
      <svg [attr.viewBox]="'0 0 ' + width + ' ' + height" class="w-full h-full" preserveAspectRatio="xMidYMid meet">
        <!-- Y-axis grid -->
        @for (tick of yTicks(); track tick.label) {
          <line [attr.x1]="pad.left" [attr.y1]="tick.y" [attr.x2]="width - pad.right" [attr.y2]="tick.y"
                stroke="#f3f4f6" stroke-width="1" />
          <text [attr.x]="pad.left - 8" [attr.y]="tick.y + 4" text-anchor="end"
                fill="#9ca3af" font-size="11">{{ tick.label }}</text>
        }

        <!-- Bars -->
        @for (bar of bars(); track bar.label; let i = $index) {
          <rect [attr.x]="bar.x" [attr.y]="bar.y" [attr.width]="bar.w" [attr.height]="bar.h"
                [attr.fill]="bar.color" rx="3" class="cursor-pointer transition-opacity hover:opacity-80"
                (mouseenter)="tooltip.set(bar)"
                (mouseleave)="tooltip.set(null)" />
          <!-- X labels -->
          <text [attr.x]="bar.x + bar.w / 2" [attr.y]="height - pad.bottom + 16" text-anchor="middle"
                fill="#6b7280" font-size="11">{{ bar.label }}</text>
          <!-- Value on top -->
          @if (showValues) {
            <text [attr.x]="bar.x + bar.w / 2" [attr.y]="bar.y - 6" text-anchor="middle"
                  fill="#6b7280" font-size="10">{{ bar.shortValue }}</text>
          }
        }

        <!-- Tooltip -->
        @if (tooltip(); as tip) {
          <g>
            <rect [attr.x]="tip.x + tip.w / 2 - 40" [attr.y]="tip.y - 32" width="80" height="24"
                  rx="4" fill="#1f2937" />
            <text [attr.x]="tip.x + tip.w / 2" [attr.y]="tip.y - 16" text-anchor="middle"
                  fill="white" font-size="12" font-weight="500">{{ tip.value | number }}</text>
          </g>
        }
      </svg>
    </div>
  `,
})
export class BarChartComponent implements OnChanges {
  @Input() data: ChartDataPoint[] = [];
  @Input() width = 600;
  @Input() height = 300;
  @Input() showValues = false;
  @Input() barColor?: string;

  pad = { top: 25, right: 20, bottom: 35, left: 50 };
  tooltip = signal<any>(null);
  bars = signal<any[]>([]);
  yTicks = signal<any[]>([]);

  ngOnChanges(): void {
    this.buildBars();
  }

  private buildBars(): void {
    if (!this.data.length) { this.bars.set([]); this.yTicks.set([]); return; }
    const chartW = this.width - this.pad.left - this.pad.right;
    const chartH = this.height - this.pad.top - this.pad.bottom;
    const max = Math.max(...this.data.map(d => d.value), 1) * 1.1;
    const gap = 8;
    const barW = Math.max(12, (chartW - gap * (this.data.length - 1)) / this.data.length);

    this.bars.set(this.data.map((d, i) => {
      const h = (d.value / max) * chartH;
      return {
        x: this.pad.left + i * (barW + gap), y: this.pad.top + chartH - h,
        w: barW, h: Math.max(1, h), value: d.value, label: d.label,
        shortValue: shortNumber(d.value), color: d.color || this.barColor || getColor(i),
      };
    }));

    const count = 4;
    this.yTicks.set(Array.from({ length: count + 1 }, (_, i) => {
      const value = (max / count) * i;
      const y = this.pad.top + chartH - (i / count) * chartH;
      return { y, label: shortNumber(value) };
    }));
  }
}

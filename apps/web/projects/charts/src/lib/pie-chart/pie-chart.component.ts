import { Component, Input, computed, signal } from '@angular/core';
import { ChartDataPoint, getColor } from '../chart-utils';

interface Slice {
  path: string;
  color: string;
  label: string;
  value: number;
  percent: number;
  midAngle: number;
  labelX: number;
  labelY: number;
}

@Component({
  selector: 'chart-pie',
  standalone: true,
  template: `
    <div class="flex items-center gap-4" [style.height.px]="height">
      <svg [attr.viewBox]="'-1.2 -1.2 2.4 2.4'" [style.width.px]="height" [style.height.px]="height"
           class="shrink-0">
        @for (s of slices(); track s.label; let i = $index) {
          <path [attr.d]="s.path" [attr.fill]="s.color" stroke="white" stroke-width="0.03"
                class="cursor-pointer transition-transform origin-center"
                [class.scale-105]="hovered() === i"
                (mouseenter)="hovered.set(i)"
                (mouseleave)="hovered.set(-1)" />
        }
        <!-- Center label on hover -->
        @if (hovered() >= 0 && slices()[hovered()]; as s) {
          <text x="0" y="-0.05" text-anchor="middle" fill="#374151" font-size="0.18" font-weight="700">
            {{ s.percent.toFixed(1) }}%
          </text>
          <text x="0" y="0.15" text-anchor="middle" fill="#6b7280" font-size="0.12">
            {{ s.label }}
          </text>
        }
      </svg>

      <!-- Legend -->
      @if (showLegend) {
        <div class="flex flex-col gap-1.5 text-sm min-w-0">
          @for (s of slices(); track s.label; let i = $index) {
            <div class="flex items-center gap-2 cursor-pointer"
                 (mouseenter)="hovered.set(i)" (mouseleave)="hovered.set(-1)"
                 [class.opacity-50]="hovered() >= 0 && hovered() !== i">
              <span class="w-2.5 h-2.5 rounded-sm shrink-0" [style.background]="s.color"></span>
              <span class="text-gray-700 truncate">{{ s.label }}</span>
              <span class="text-gray-400 ml-auto pl-2">{{ s.percent.toFixed(0) }}%</span>
            </div>
          }
        </div>
      }
    </div>
  `,
})
export class PieChartComponent {
  @Input() data: ChartDataPoint[] = [];
  @Input() height = 240;
  @Input() showLegend = true;

  hovered = signal(-1);

  slices = computed((): Slice[] => {
    const total = this.data.reduce((sum, d) => sum + d.value, 0);
    if (total === 0) return [];

    let angle = -Math.PI / 2;
    return this.data.map((d, i) => {
      const percent = (d.value / total) * 100;
      const sliceAngle = (d.value / total) * Math.PI * 2;
      const startAngle = angle;
      angle += sliceAngle;
      const endAngle = angle;
      const midAngle = (startAngle + endAngle) / 2;

      const large = sliceAngle > Math.PI ? 1 : 0;
      const x1 = Math.cos(startAngle), y1 = Math.sin(startAngle);
      const x2 = Math.cos(endAngle), y2 = Math.sin(endAngle);

      const path = this.data.length === 1
        ? 'M 0,-1 A 1,1 0 1,1 -0.0001,-1 Z'
        : `M 0,0 L ${x1},${y1} A 1,1 0 ${large},1 ${x2},${y2} Z`;

      return {
        path,
        color: getColor(i, d.color),
        label: d.label,
        value: d.value,
        percent,
        midAngle,
        labelX: Math.cos(midAngle) * 0.65,
        labelY: Math.sin(midAngle) * 0.65,
      };
    });
  });
}

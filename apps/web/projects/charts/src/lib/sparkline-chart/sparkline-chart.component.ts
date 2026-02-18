import { Component, Input, computed } from '@angular/core';
import { smoothPath } from '../chart-utils';

@Component({
  selector: 'chart-sparkline',
  standalone: true,
  template: `
    <svg [attr.viewBox]="'0 0 ' + width + ' ' + height" [style.width.px]="width" [style.height.px]="height"
         class="overflow-visible">
      <!-- Area fill -->
      @if (showArea) {
        <path [attr.d]="areaPath()" [attr.fill]="color" opacity="0.1" />
      }
      <!-- Line -->
      <path [attr.d]="linePath()" [attr.stroke]="color" stroke-width="2" fill="none"
            stroke-linecap="round" stroke-linejoin="round" />
      <!-- End dot -->
      @if (data.length > 0) {
        <circle [attr.cx]="endPoint().x" [attr.cy]="endPoint().y" r="3"
                [attr.fill]="color" stroke="white" stroke-width="1.5" />
      }
    </svg>
  `,
})
export class SparklineChartComponent {
  @Input() data: number[] = [];
  @Input() width = 120;
  @Input() height = 40;
  @Input() color = '#3b82f6';
  @Input() showArea = true;

  private pad = 4;

  private points = computed((): [number, number][] => {
    if (this.data.length < 2) return [];
    const min = Math.min(...this.data);
    const max = Math.max(...this.data);
    const range = max - min || 1;
    const w = this.width - this.pad * 2;
    const h = this.height - this.pad * 2;

    return this.data.map((v, i) => [
      this.pad + (i / (this.data.length - 1)) * w,
      this.pad + h - ((v - min) / range) * h,
    ]);
  });

  linePath = computed(() => smoothPath(this.points()));

  areaPath = computed(() => {
    const pts = this.points();
    if (pts.length < 2) return '';
    const line = smoothPath(pts);
    const last = pts[pts.length - 1];
    const first = pts[0];
    return `${line} L ${last[0]},${this.height - this.pad} L ${first[0]},${this.height - this.pad} Z`;
  });

  endPoint = computed(() => {
    const pts = this.points();
    const last = pts[pts.length - 1] ?? [0, 0];
    return { x: last[0], y: last[1] };
  });
}

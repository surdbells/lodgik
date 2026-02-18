import { Component, Input, computed } from '@angular/core';
import { lerpColor } from '../chart-utils';

@Component({
  selector: 'chart-gauge',
  standalone: true,
  template: `
    <div class="flex flex-col items-center" [style.height.px]="height">
      <svg [attr.viewBox]="'-1.3 -1.1 2.6 1.5'" [style.width.px]="width" class="w-full">
        <!-- Background arc -->
        <path [attr.d]="bgArc" fill="none" stroke="#e5e7eb" [attr.stroke-width]="thickness" stroke-linecap="round" />

        <!-- Value arc -->
        <path [attr.d]="valueArc()" fill="none" [attr.stroke]="gaugeColor()" [attr.stroke-width]="thickness"
              stroke-linecap="round" />

        <!-- Tick marks -->
        @for (tick of ticks; track tick.angle) {
          <line [attr.x1]="tick.x1" [attr.y1]="tick.y1" [attr.x2]="tick.x2" [attr.y2]="tick.y2"
                stroke="#d1d5db" stroke-width="0.02" />
        }

        <!-- Needle -->
        <line x1="0" y1="0"
              [attr.x2]="needleX()" [attr.y2]="needleY()"
              stroke="#374151" stroke-width="0.04" stroke-linecap="round" />
        <circle cx="0" cy="0" r="0.07" fill="#374151" />

        <!-- Value text -->
        <text x="0" y="-0.2" text-anchor="middle" fill="#374151" font-size="0.32" font-weight="700">
          {{ displayValue() }}
        </text>
        <text x="0" y="0.05" text-anchor="middle" fill="#9ca3af" font-size="0.14">
          {{ label }}
        </text>

        <!-- Min/Max labels -->
        <text x="-1.05" y="0.2" text-anchor="middle" fill="#9ca3af" font-size="0.12">{{ min }}</text>
        <text x="1.05" y="0.2" text-anchor="middle" fill="#9ca3af" font-size="0.12">{{ max }}</text>
      </svg>
    </div>
  `,
})
export class GaugeChartComponent {
  @Input() value = 0;
  @Input() min = 0;
  @Input() max = 100;
  @Input() label = '';
  @Input() width = 240;
  @Input() height = 160;
  @Input() suffix = '%';
  @Input() lowColor = '#10b981';
  @Input() highColor = '#ef4444';

  thickness = 0.18;
  radius = 0.95;

  bgArc = this.describeArc(0, 0, this.radius, -180, 0);

  ticks = Array.from({ length: 11 }, (_, i) => {
    const angle = (-180 + i * 18) * (Math.PI / 180);
    const r1 = this.radius + 0.12;
    const r2 = this.radius + 0.17;
    return {
      angle,
      x1: Math.cos(angle) * r1,
      y1: Math.sin(angle) * r1,
      x2: Math.cos(angle) * r2,
      y2: Math.sin(angle) * r2,
    };
  });

  percent = computed(() => {
    return Math.min(1, Math.max(0, (this.value - this.min) / (this.max - this.min || 1)));
  });

  gaugeColor = computed(() => lerpColor(this.lowColor, this.highColor, this.percent()));

  displayValue = computed(() => `${this.value}${this.suffix}`);

  valueArc = computed(() => {
    const endAngle = -180 + this.percent() * 180;
    return this.describeArc(0, 0, this.radius, -180, endAngle);
  });

  needleX = computed(() => {
    const angle = (-180 + this.percent() * 180) * (Math.PI / 180);
    return Math.cos(angle) * 0.7;
  });

  needleY = computed(() => {
    const angle = (-180 + this.percent() * 180) * (Math.PI / 180);
    return Math.sin(angle) * 0.7;
  });

  private describeArc(cx: number, cy: number, r: number, startDeg: number, endDeg: number): string {
    const startRad = (startDeg * Math.PI) / 180;
    const endRad = (endDeg * Math.PI) / 180;
    const x1 = cx + r * Math.cos(startRad);
    const y1 = cy + r * Math.sin(startRad);
    const x2 = cx + r * Math.cos(endRad);
    const y2 = cy + r * Math.sin(endRad);
    const large = endDeg - startDeg > 180 ? 1 : 0;
    return `M ${x1} ${y1} A ${r} ${r} 0 ${large} 1 ${x2} ${y2}`;
  }
}

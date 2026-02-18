import { Component, Input, computed, signal } from '@angular/core';
import { lerpColor } from '../chart-utils';

export interface HeatmapData {
  rows: string[];
  cols: string[];
  values: number[][];  // values[row][col]
}

@Component({
  selector: 'chart-heatmap',
  standalone: true,
  template: `
    <div class="relative overflow-x-auto" [style.min-height.px]="height">
      <svg [attr.viewBox]="'0 0 ' + svgWidth() + ' ' + svgHeight()" class="w-full" preserveAspectRatio="xMinYMin meet">
        <!-- Column headers -->
        @for (col of data.cols; track col; let j = $index) {
          <text [attr.x]="labelW + j * cellSize + cellSize / 2" [attr.y]="14" text-anchor="middle"
                fill="#6b7280" font-size="11">{{ col }}</text>
        }

        <!-- Row headers + cells -->
        @for (row of data.rows; track row; let i = $index) {
          <text [attr.x]="labelW - 6" [attr.y]="headerH + i * cellSize + cellSize / 2 + 4"
                text-anchor="end" fill="#6b7280" font-size="11">{{ row }}</text>

          @for (col of data.cols; track col; let j = $index) {
            <rect [attr.x]="labelW + j * cellSize + 1" [attr.y]="headerH + i * cellSize + 1"
                  [attr.width]="cellSize - 2" [attr.height]="cellSize - 2"
                  [attr.fill]="cellColor(i, j)" rx="3"
                  class="cursor-pointer"
                  (mouseenter)="hovered.set({row: i, col: j, value: getValue(i, j), rowLabel: row, colLabel: col})"
                  (mouseleave)="hovered.set(null)" />

            @if (showValues && cellSize >= 32) {
              <text [attr.x]="labelW + j * cellSize + cellSize / 2" [attr.y]="headerH + i * cellSize + cellSize / 2 + 4"
                    text-anchor="middle" [attr.fill]="textColor(i, j)" font-size="10">
                {{ getValue(i, j) }}
              </text>
            }
          }
        }

        <!-- Tooltip -->
        @if (hovered(); as h) {
          <g>
            <rect [attr.x]="labelW + h.col * cellSize + cellSize / 2 - 50"
                  [attr.y]="headerH + h.row * cellSize - 28"
                  width="100" height="22" rx="4" fill="#1f2937" />
            <text [attr.x]="labelW + h.col * cellSize + cellSize / 2"
                  [attr.y]="headerH + h.row * cellSize - 13"
                  text-anchor="middle" fill="white" font-size="11">
              {{ h.rowLabel }} × {{ h.colLabel }}: {{ h.value }}
            </text>
          </g>
        }
      </svg>

      <!-- Color scale legend -->
      @if (showLegend) {
        <div class="flex items-center gap-2 mt-2 text-xs text-gray-500 justify-center">
          <span>{{ minVal() }}</span>
          <div class="flex h-3 rounded overflow-hidden">
            @for (step of legendSteps; track step) {
              <div class="w-5" [style.background]="lerpColor(lowColor, highColor, step)"></div>
            }
          </div>
          <span>{{ maxVal() }}</span>
        </div>
      }
    </div>
  `,
})
export class HeatmapChartComponent {
  @Input() data: HeatmapData = { rows: [], cols: [], values: [] };
  @Input() height = 300;
  @Input() cellSize = 40;
  @Input() showValues = true;
  @Input() showLegend = true;
  @Input() lowColor = '#dbeafe';
  @Input() highColor = '#1d4ed8';

  labelW = 70;
  headerH = 22;
  lerpColor = lerpColor;
  legendSteps = [0, 0.2, 0.4, 0.6, 0.8, 1.0];

  hovered = signal<any>(null);

  svgWidth = computed(() => this.labelW + this.data.cols.length * this.cellSize + 10);
  svgHeight = computed(() => this.headerH + this.data.rows.length * this.cellSize + 10);

  minVal = computed(() => {
    const all = this.data.values.flat();
    return all.length ? Math.min(...all) : 0;
  });

  maxVal = computed(() => {
    const all = this.data.values.flat();
    return all.length ? Math.max(...all) : 0;
  });

  getValue(row: number, col: number): number {
    return this.data.values[row]?.[col] ?? 0;
  }

  cellColor(row: number, col: number): string {
    const val = this.getValue(row, col);
    const min = this.minVal();
    const max = this.maxVal();
    const t = max === min ? 0.5 : (val - min) / (max - min);
    return lerpColor(this.lowColor, this.highColor, t);
  }

  textColor(row: number, col: number): string {
    const val = this.getValue(row, col);
    const min = this.minVal();
    const max = this.maxVal();
    const t = max === min ? 0.5 : (val - min) / (max - min);
    return t > 0.55 ? '#ffffff' : '#374151';
  }
}

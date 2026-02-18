/** Shared data types for all chart components */

export interface ChartDataPoint {
  label: string;
  value: number;
  color?: string;
}

export interface ChartSeries {
  name: string;
  data: number[];
  color?: string;
}

export interface HeatmapCell {
  row: number;
  col: number;
  value: number;
  label?: string;
}

/** Default color palette — 12 harmonious colors */
export const CHART_COLORS = [
  '#3b82f6', // blue
  '#10b981', // emerald
  '#f59e0b', // amber
  '#ef4444', // red
  '#8b5cf6', // violet
  '#06b6d4', // cyan
  '#f97316', // orange
  '#ec4899', // pink
  '#14b8a6', // teal
  '#6366f1', // indigo
  '#84cc16', // lime
  '#a855f7', // purple
];

export function getColor(index: number, custom?: string): string {
  return custom || CHART_COLORS[index % CHART_COLORS.length];
}

/** Scale a value to SVG coordinate space */
export function scale(value: number, min: number, max: number, rangeMin: number, rangeMax: number): number {
  if (max === min) return (rangeMin + rangeMax) / 2;
  return rangeMin + ((value - min) / (max - min)) * (rangeMax - rangeMin);
}

/** Format large numbers (1200 → 1.2K) */
export function shortNumber(n: number): string {
  if (Math.abs(n) >= 1_000_000) return (n / 1_000_000).toFixed(1).replace(/\.0$/, '') + 'M';
  if (Math.abs(n) >= 1_000) return (n / 1_000).toFixed(1).replace(/\.0$/, '') + 'K';
  return n.toFixed(n % 1 === 0 ? 0 : 1);
}

/** Generate SVG path for a smooth curve through points */
export function smoothPath(points: [number, number][]): string {
  if (points.length < 2) return '';
  let d = `M ${points[0][0]},${points[0][1]}`;
  for (let i = 1; i < points.length; i++) {
    const [px, py] = points[i - 1];
    const [cx, cy] = points[i];
    const cpx = (px + cx) / 2;
    d += ` C ${cpx},${py} ${cpx},${cy} ${cx},${cy}`;
  }
  return d;
}

/** Generate SVG path for a straight polyline */
export function linePath(points: [number, number][]): string {
  if (points.length === 0) return '';
  return points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p[0]},${p[1]}`).join(' ');
}

/** Interpolate between two hex colors */
export function lerpColor(a: string, b: string, t: number): string {
  const parse = (h: string) => [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)];
  const [r1, g1, b1] = parse(a);
  const [r2, g2, b2] = parse(b);
  const r = Math.round(r1 + (r2 - r1) * t);
  const g = Math.round(g1 + (g2 - g1) * t);
  const bl = Math.round(b1 + (b2 - b1) * t);
  return `#${[r, g, bl].map(v => v.toString(16).padStart(2, '0')).join('')}`;
}

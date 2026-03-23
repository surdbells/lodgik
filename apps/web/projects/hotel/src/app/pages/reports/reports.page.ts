import {
  Component, inject, OnInit, signal, computed, ChangeDetectionStrategy,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { DatePipe, DecimalPipe, NgTemplateOutlet } from '@angular/common';
import {
  ApiService, PageHeaderComponent, LoadingSpinnerComponent,
  ToastService, ActivePropertyService, FeatureService,
} from '@lodgik/shared';
import { forkJoin, of, catchError } from 'rxjs';

// ─── Number helpers ────────────────────────────────────────────────────────────

const CURRENCY_KEYS = new Set([
  'total','amount','revenue','balance','payment','subtotal','tax','grand',
  'collected','outstanding','charges','cost','adr','revpar','paid','price',
  'fee','sum','earning','income','expense','rate','value','cash','transfer',
  'pos','room','bar','restaurant','service','laundry','other','ancillary',
  'lost','refund','discount','deposit','naira',
]);

function looksLikeMoney(key: string, val: unknown): boolean {
  if (typeof val !== 'number' && typeof val !== 'string') return false;
  const n = Number(val);
  if (isNaN(n)) return false;
  const k = key.toLowerCase().replace(/[^a-z_]/g, '');
  return k.split('_').some(part => CURRENCY_KEYS.has(part));
}

function fmtMoney(v: unknown): string {
  const n = Number(v);
  if (isNaN(n)) return String(v);
  return '₦' + n.toLocaleString('en-NG', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function fmtNum(v: unknown): string {
  const n = Number(v);
  if (isNaN(n)) return String(v ?? '—');
  return n.toLocaleString('en-NG');
}

// ─── SVG chart math ────────────────────────────────────────────────────────────

const CHART_W = 580, CHART_H = 200;
const PAD = { t: 20, r: 20, b: 44, l: 56 };
const PW = CHART_W - PAD.l - PAD.r;  // 504
const PH = CHART_H - PAD.t - PAD.b;  // 136

const PALETTE = [
  '#4A7A4A','#2563EB','#D97706','#DC2626','#7C3AED',
  '#059669','#DB2777','#0891B2','#65A30D','#9333EA',
];

interface Pt { x: number; y: number; label: string; value: number }

function clamp(v: number, lo: number, hi: number) { return Math.max(lo, Math.min(hi, v)); }

function linePath(pts: Pt[]): string {
  if (pts.length < 2) return '';
  return 'M' + pts.map(p => `${p.x.toFixed(1)},${p.y.toFixed(1)}`).join('L');
}

function areaPath(pts: Pt[], baseline: number): string {
  if (pts.length < 2) return '';
  const line = linePath(pts);
  const last = pts[pts.length - 1];
  const first = pts[0];
  return `${line}L${last.x.toFixed(1)},${baseline}L${first.x.toFixed(1)},${baseline}Z`;
}

function buildPoints(items: any[], xKey: string, yKey: string): Pt[] {
  const vals = items.map(r => Number(r[yKey] ?? 0));
  const maxV  = Math.max(...vals, 0.01);
  const n     = items.length;
  return items.map((r, i) => ({
    x: PAD.l + (n < 2 ? PW / 2 : (i / (n - 1)) * PW),
    y: PAD.t + PH - (vals[i] / maxV) * PH,
    label: String(r[xKey] ?? i),
    value: vals[i],
  }));
}

function buildBars(items: any[], xKey: string, yKey: string, color = PALETTE[0]) {
  const vals  = items.map(r => Number(r[yKey] ?? 0));
  const maxV  = Math.max(...vals, 0.01);
  const n     = items.length;
  const gapPct = 0.25;
  const totalW = PW / Math.max(n, 1);
  const bw     = totalW * (1 - gapPct);
  return items.map((r, i) => {
    const h = (vals[i] / maxV) * PH;
    return {
      x: PAD.l + i * totalW + totalW * gapPct / 2,
      y: PAD.t + PH - h,
      w: bw, h,
      label: String(r[xKey] ?? i),
      value: vals[i],
      color,
    };
  });
}

function buildStackedBars(items: any[], xKey: string, yKeys: string[], colors: string[]) {
  const n = items.length;
  const rowTotals = items.map(r => yKeys.reduce((s, k) => s + Number(r[k] ?? 0), 0));
  const maxV = Math.max(...rowTotals, 0.01);
  const totalW = PW / Math.max(n, 1);
  const gapPct = 0.25;
  const bw = totalW * (1 - gapPct);
  return items.map((r, i) => {
    let cumH = 0;
    const segs = yKeys.map((k, ki) => {
      const v = Number(r[k] ?? 0);
      const h = (v / maxV) * PH;
      const seg = { y: PAD.t + PH - cumH - h, h, color: colors[ki] ?? PALETTE[ki], value: v, key: k };
      cumH += h;
      return seg;
    }).filter(s => s.h > 0);
    return {
      x: PAD.l + i * totalW + totalW * gapPct / 2,
      w: bw,
      label: String(r[xKey] ?? i),
      segs,
      total: rowTotals[i],
    };
  });
}

interface DonutSlice {
  d: string; color: string; label: string; value: number; pct: number;
  midX: number; midY: number;
}

function buildDonut(groups: { label: string; value: number }[], cx = 130, cy = 100, ro = 85, ri = 50): DonutSlice[] {
  const total = groups.reduce((s, g) => s + g.value, 0) || 1;
  let angle = -Math.PI / 2;
  return groups.map((g, i) => {
    const span = (g.value / total) * 2 * Math.PI;
    const a1 = angle, a2 = angle + span;
    angle += span;
    const cos1 = Math.cos(a1), sin1 = Math.sin(a1);
    const cos2 = Math.cos(a2), sin2 = Math.sin(a2);
    const large = span > Math.PI ? 1 : 0;
    // Outer arc
    const ox1 = cx + ro * cos1, oy1 = cy + ro * sin1;
    const ox2 = cx + ro * cos2, oy2 = cy + ro * sin2;
    // Inner arc
    const ix1 = cx + ri * cos2, iy1 = cy + ri * sin2;
    const ix2 = cx + ri * cos1, iy2 = cy + ri * sin1;
    const d = `M${ox1},${oy1} A${ro},${ro},0,${large},1,${ox2},${oy2}
               L${ix1},${iy1} A${ri},${ri},0,${large},0,${ix2},${iy2}Z`;
    const midA = a1 + span / 2;
    const mr = (ro + ri) / 2;
    return {
      d: d.replace(/\n\s+/g, ' '),
      color: PALETTE[i % PALETTE.length],
      label: g.label,
      value: g.value,
      pct: Math.round((g.value / total) * 100),
      midX: cx + mr * Math.cos(midA),
      midY: cy + mr * Math.sin(midA),
    };
  });
}

function groupByKey(items: any[], groupKey: string, valueKey: string) {
  const map = new Map<string, number>();
  for (const r of items) {
    const k = String(r[groupKey] ?? 'Unknown');
    map.set(k, (map.get(k) ?? 0) + Number(r[valueKey] ?? 0));
  }
  return [...map.entries()]
    .map(([label, value]) => ({ label, value }))
    .sort((a, b) => b.value - a.value)
    .slice(0, 10);
}

function yAxisLabels(items: any[], yKey: string, n = 5): string[] {
  const vals = items.map(r => Number(r[yKey] ?? 0));
  const max = Math.max(...vals, 0.01);
  return Array.from({ length: n }, (_, i) => {
    const v = (max * (n - 1 - i)) / (n - 1);
    return v >= 1000 ? (v / 1000).toFixed(1) + 'k' : v.toFixed(0);
  });
}

function truncLabel(s: string, max = 8): string {
  if (!s) return '';
  const d = s.split('T')[0];
  if (/^\d{4}-\d{2}-\d{2}$/.test(d)) {
    const [, m, day] = d.split('-');
    return `${day}/${m}`;
  }
  return s.length > max ? s.slice(0, max - 1) + '…' : s;
}

function showEvery(n: number, total: number): boolean {
  if (total <= 10) return true;
  if (total <= 20) return n % 2 === 0;
  if (total <= 40) return n % 4 === 0;
  return n % Math.ceil(total / 10) === 0;
}

// ─── Report definitions ────────────────────────────────────────────────────────

interface ChartCfg {
  type: 'line' | 'bar' | 'stacked-bar' | 'donut' | 'grouped-bar';
  title: string;
  xKey?: string;
  yKeys: string[];
  yLabels?: string[];
  colors?: string[];
  groupBy?: string;
  valueKey?: string;
  formatY?: 'currency' | 'percent' | 'number';
  secondChart?: ChartCfg;
}

interface ReportDef {
  key: string; label: string; icon: string; group: string; endpoint: string;
  columns: { key: string; label: string; currency?: boolean; date?: boolean; numeric?: boolean }[];
  params: ('date' | 'date_range' | 'guest_id')[];
  hasPage: boolean; featureKey: string; featureTier: string;
  chart?: ChartCfg;
}

const REPORTS: ReportDef[] = [
  {
    key: 'arrivals', label: 'Daily Arrivals', icon: '🛬', group: 'Front Office',
    endpoint: '/reports/arrivals',
    columns: [
      { key: 'booking_ref', label: 'Ref' },
      { key: 'guest_name', label: 'Guest' },
      { key: 'guest_phone', label: 'Phone' },
      { key: 'guest_nationality', label: 'Nationality' },
      { key: 'room_number', label: 'Room' },
      { key: 'room_type', label: 'Type' },
      { key: 'check_in', label: 'Check-in', date: true },
      { key: 'check_out', label: 'Check-out', date: true },
      { key: 'adults', label: 'Adults', numeric: true },
      { key: 'total_amount', label: 'Amount', currency: true },
      { key: 'status', label: 'Status' },
    ],
    params: ['date'], hasPage: true,
    featureKey: 'basic_analytics', featureTier: 'All plans',
    chart: {
      type: 'donut', title: 'Bookings by Room Type',
      yKeys: ['total_amount'], groupBy: 'room_type', valueKey: 'total_amount', formatY: 'currency',
    },
  },
  {
    key: 'departures', label: 'Daily Departures', icon: '🛫', group: 'Front Office',
    endpoint: '/reports/departures',
    columns: [
      { key: 'booking_ref', label: 'Ref' },
      { key: 'guest_name', label: 'Guest' },
      { key: 'guest_phone', label: 'Phone' },
      { key: 'room_number', label: 'Room' },
      { key: 'room_type', label: 'Type' },
      { key: 'check_in', label: 'Check-in', date: true },
      { key: 'check_out', label: 'Check-out', date: true },
      { key: 'total_amount', label: 'Amount', currency: true },
      { key: 'outstanding_balance', label: 'Balance', currency: true },
      { key: 'status', label: 'Status' },
    ],
    params: ['date'], hasPage: true,
    featureKey: 'basic_analytics', featureTier: 'All plans',
    chart: {
      type: 'bar', title: 'Revenue by Room Type',
      xKey: 'room_type', yKeys: ['total_amount'], formatY: 'currency',
    },
  },
  {
    key: 'in-house', label: 'In-House Guests', icon: '🏨', group: 'Front Office',
    endpoint: '/reports/in-house',
    columns: [
      { key: 'booking_ref', label: 'Ref' },
      { key: 'guest_name', label: 'Guest' },
      { key: 'guest_phone', label: 'Phone' },
      { key: 'guest_nationality', label: 'Nationality' },
      { key: 'room_number', label: 'Room' },
      { key: 'room_type', label: 'Type' },
      { key: 'check_in', label: 'Check-in', date: true },
      { key: 'check_out', label: 'Check-out', date: true },
      { key: 'nights_remaining', label: 'Nights Left', numeric: true },
      { key: 'adults', label: 'Adults', numeric: true },
      { key: 'outstanding_balance', label: 'Balance', currency: true },
    ],
    params: [], hasPage: true,
    featureKey: 'basic_analytics', featureTier: 'All plans',
    chart: {
      type: 'donut', title: 'Room Type Distribution',
      yKeys: [], groupBy: 'room_type', valueKey: 'outstanding_balance', formatY: 'currency',
    },
  },
  {
    key: 'no-shows', label: 'No-Shows', icon: '❌', group: 'Front Office',
    endpoint: '/reports/no-shows',
    columns: [
      { key: 'booking_ref', label: 'Ref' },
      { key: 'guest_name', label: 'Guest' },
      { key: 'guest_phone', label: 'Phone' },
      { key: 'room_number', label: 'Room' },
      { key: 'room_type', label: 'Type' },
      { key: 'check_in', label: 'Check-in', date: true },
      { key: 'total_amount', label: 'Lost Revenue', currency: true },
      { key: 'source', label: 'Source' },
    ],
    params: ['date_range'], hasPage: true,
    featureKey: 'basic_analytics', featureTier: 'All plans',
    chart: {
      type: 'bar', title: 'Lost Revenue by Date',
      xKey: 'check_in', yKeys: ['total_amount'], formatY: 'currency',
    },
  },
  {
    key: 'room-status', label: 'Room Status', icon: '🛏️', group: 'Rooms',
    endpoint: '/reports/room-status',
    columns: [
      { key: 'room_number', label: 'Room' },
      { key: 'floor', label: 'Floor', numeric: true },
      { key: 'room_type', label: 'Type' },
      { key: 'status', label: 'Status' },
      { key: 'base_rate', label: 'Rate', currency: true },
      { key: 'notes', label: 'Notes' },
    ],
    params: [], hasPage: false,
    featureKey: 'basic_analytics', featureTier: 'All plans',
    chart: {
      type: 'donut', title: 'Status Distribution',
      yKeys: [], groupBy: 'status', valueKey: 'base_rate', formatY: 'number',
    },
  },
  {
    key: 'room-availability', label: 'Room Availability', icon: '✅', group: 'Rooms',
    endpoint: '/reports/room-availability',
    columns: [
      { key: 'room_number', label: 'Room' },
      { key: 'floor', label: 'Floor', numeric: true },
      { key: 'room_type', label: 'Type' },
      { key: 'status', label: 'Status' },
      { key: 'rate_per_night', label: 'Rate/Night', currency: true },
      { key: 'max_occupancy', label: 'Max Occ.', numeric: true },
    ],
    params: ['date_range'], hasPage: false,
    featureKey: 'basic_analytics', featureTier: 'All plans',
    chart: {
      type: 'donut', title: 'Availability by Room Type',
      yKeys: [], groupBy: 'room_type', valueKey: 'rate_per_night', formatY: 'currency',
    },
  },
  {
    key: 'occupancy', label: 'Occupancy Report', icon: '📊', group: 'Rooms',
    endpoint: '/reports/occupancy',
    columns: [
      { key: 'date', label: 'Date', date: true },
      { key: 'occupied_rooms', label: 'Occupied', numeric: true },
      { key: 'total_rooms', label: 'Total Rooms', numeric: true },
      { key: 'occupancy_pct', label: 'Occupancy %' },
      { key: 'revenue', label: 'Revenue', currency: true },
      { key: 'adr', label: 'ADR', currency: true },
      { key: 'revpar', label: 'RevPAR', currency: true },
    ],
    params: ['date_range'], hasPage: false,
    featureKey: 'advanced_analytics', featureTier: 'Business+',
    chart: {
      type: 'line', title: 'Occupancy % Over Time',
      xKey: 'date', yKeys: ['occupancy_pct'], yLabels: ['Occupancy %'],
      colors: [PALETTE[0]], formatY: 'percent',
      secondChart: {
        type: 'bar', title: 'Revenue & RevPAR',
        xKey: 'date', yKeys: ['revenue', 'revpar'],
        yLabels: ['Revenue', 'RevPAR'], colors: [PALETTE[0], PALETTE[1]], formatY: 'currency',
      },
    },
  },
  {
    key: 'daily-revenue', label: 'Daily Revenue', icon: '💰', group: 'Financial',
    endpoint: '/reports/daily-revenue',
    columns: [
      { key: 'date', label: 'Date', date: true },
      { key: 'room', label: 'Room', currency: true },
      { key: 'bar', label: 'Bar', currency: true },
      { key: 'restaurant', label: 'Restaurant', currency: true },
      { key: 'service', label: 'Service', currency: true },
      { key: 'laundry', label: 'Laundry', currency: true },
      { key: 'other', label: 'Other', currency: true },
      { key: 'total', label: 'Total', currency: true },
      { key: 'payments_received', label: 'Payments', currency: true },
    ],
    params: ['date_range'], hasPage: false,
    featureKey: 'advanced_analytics', featureTier: 'Business+',
    chart: {
      type: 'stacked-bar', title: 'Revenue by Category (Daily)',
      xKey: 'date',
      yKeys: ['room', 'bar', 'restaurant', 'service', 'laundry', 'other'],
      yLabels: ['Room', 'Bar', 'Restaurant', 'Service', 'Laundry', 'Other'],
      colors: PALETTE.slice(0, 6), formatY: 'currency',
      secondChart: {
        type: 'line', title: 'Total Revenue vs Payments Received',
        xKey: 'date', yKeys: ['total', 'payments_received'],
        yLabels: ['Total Revenue', 'Payments Received'],
        colors: [PALETTE[0], PALETTE[2]], formatY: 'currency',
      },
    },
  },
  {
    key: 'payment-collection', label: 'Payment Collection', icon: '💳', group: 'Financial',
    endpoint: '/reports/payment-collection',
    columns: [
      { key: 'payment_date', label: 'Date', date: true },
      { key: 'booking_ref', label: 'Booking' },
      { key: 'folio_number', label: 'Folio' },
      { key: 'guest_name', label: 'Guest' },
      { key: 'room_number', label: 'Room' },
      { key: 'payment_method', label: 'Method' },
      { key: 'amount', label: 'Amount', currency: true },
      { key: 'sender_name', label: 'Sender' },
      { key: 'transfer_reference', label: 'Reference' },
    ],
    params: ['date_range'], hasPage: true,
    featureKey: 'advanced_analytics', featureTier: 'Business+',
    chart: {
      type: 'donut', title: 'Payments by Method',
      yKeys: ['amount'], groupBy: 'payment_method', valueKey: 'amount', formatY: 'currency',
      secondChart: {
        type: 'bar', title: 'Daily Collection Volume',
        xKey: 'payment_date', yKeys: ['amount'],
        yLabels: ['Amount'], colors: [PALETTE[0]], formatY: 'currency',
      },
    },
  },
  {
    key: 'outstanding-balances', label: 'Outstanding Balances', icon: '⚠️', group: 'Financial',
    endpoint: '/reports/outstanding-balances',
    columns: [
      { key: 'folio_number', label: 'Folio' },
      { key: 'booking_ref', label: 'Booking' },
      { key: 'guest_name', label: 'Guest' },
      { key: 'guest_phone', label: 'Phone' },
      { key: 'room_number', label: 'Room' },
      { key: 'check_in', label: 'Check-in', date: true },
      { key: 'check_out', label: 'Check-out', date: true },
      { key: 'total_charges', label: 'Charges', currency: true },
      { key: 'total_payments', label: 'Paid', currency: true },
      { key: 'balance', label: 'Balance', currency: true },
      { key: 'booking_status', label: 'Status' },
    ],
    params: [], hasPage: true,
    featureKey: 'advanced_analytics', featureTier: 'Business+',
    chart: {
      type: 'bar', title: 'Outstanding Balance by Guest',
      xKey: 'guest_name', yKeys: ['balance'],
      yLabels: ['Balance'], colors: ['#DC2626'], formatY: 'currency',
    },
  },
  {
    key: 'housekeeping-status', label: 'Housekeeping Status', icon: '🧹', group: 'Housekeeping',
    endpoint: '/reports/housekeeping-status',
    columns: [
      { key: 'room_number', label: 'Room' },
      { key: 'floor', label: 'Floor', numeric: true },
      { key: 'task_type', label: 'Task' },
      { key: 'status', label: 'Status' },
      { key: 'priority', label: 'Priority' },
      { key: 'assigned_to_name', label: 'Assigned To' },
      { key: 'started_at', label: 'Started', date: true },
      { key: 'completed_at', label: 'Completed', date: true },
      { key: 'notes', label: 'Notes' },
    ],
    params: ['date'], hasPage: false,
    featureKey: 'custom_reports', featureTier: 'Enterprise',
    chart: {
      type: 'donut', title: 'Task Status Breakdown',
      yKeys: [], groupBy: 'status', valueKey: 'room_number', formatY: 'number',
      secondChart: {
        type: 'donut', title: 'By Task Type',
        yKeys: [], groupBy: 'task_type', valueKey: 'room_number', formatY: 'number',
      },
    },
  },
  {
    key: 'guest-history', label: 'Guest History', icon: '👤', group: 'Guest',
    endpoint: '/reports/guest-history',
    columns: [
      { key: 'booking_ref', label: 'Ref' },
      { key: 'guest_name', label: 'Guest' },
      { key: 'guest_email', label: 'Email' },
      { key: 'guest_nationality', label: 'Nationality' },
      { key: 'room_number', label: 'Room' },
      { key: 'room_type', label: 'Type' },
      { key: 'check_in', label: 'Check-in', date: true },
      { key: 'check_out', label: 'Check-out', date: true },
      { key: 'adults', label: 'Adults', numeric: true },
      { key: 'total_amount', label: 'Amount', currency: true },
      { key: 'balance', label: 'Balance', currency: true },
      { key: 'source', label: 'Source' },
      { key: 'status', label: 'Status' },
    ],
    params: ['date_range', 'guest_id'], hasPage: true,
    featureKey: 'custom_reports', featureTier: 'Enterprise',
    chart: {
      type: 'bar', title: 'Revenue per Stay',
      xKey: 'check_in', yKeys: ['total_amount'],
      yLabels: ['Amount'], colors: [PALETTE[0]], formatY: 'currency',
    },
  },
  {
    key: 'cancellations', label: 'Cancellations', icon: '🚫', group: 'Bookings',
    endpoint: '/reports/cancellations',
    columns: [
      { key: 'booking_ref', label: 'Ref' },
      { key: 'guest_name', label: 'Guest' },
      { key: 'guest_phone', label: 'Phone' },
      { key: 'room_number', label: 'Room' },
      { key: 'room_type', label: 'Type' },
      { key: 'booking_type', label: 'Booking Type' },
      { key: 'check_in', label: 'Check-in', date: true },
      { key: 'check_out', label: 'Check-out', date: true },
      { key: 'total_amount', label: 'Lost Revenue', currency: true },
      { key: 'source', label: 'Source' },
      { key: 'cancelled_at', label: 'Cancelled', date: true },
    ],
    params: ['date_range'], hasPage: true,
    featureKey: 'custom_reports', featureTier: 'Enterprise',
    chart: {
      type: 'bar', title: 'Lost Revenue by Date',
      xKey: 'cancelled_at', yKeys: ['total_amount'],
      yLabels: ['Lost Revenue'], colors: ['#DC2626'], formatY: 'currency',
      secondChart: {
        type: 'donut', title: 'Cancellations by Source',
        yKeys: [], groupBy: 'source', valueKey: 'total_amount', formatY: 'currency',
      },
    },
  },
  {
    key: 'walk-ins', label: 'Walk-ins', icon: '🚶', group: 'Bookings',
    endpoint: '/reports/walk-ins',
    columns: [
      { key: 'booking_ref', label: 'Ref' },
      { key: 'guest_name', label: 'Guest' },
      { key: 'guest_phone', label: 'Phone' },
      { key: 'guest_nationality', label: 'Nationality' },
      { key: 'room_number', label: 'Room' },
      { key: 'room_type', label: 'Type' },
      { key: 'check_in', label: 'Check-in', date: true },
      { key: 'check_out', label: 'Check-out', date: true },
      { key: 'adults', label: 'Adults', numeric: true },
      { key: 'total_amount', label: 'Amount', currency: true },
      { key: 'status', label: 'Status' },
    ],
    params: ['date_range'], hasPage: true,
    featureKey: 'custom_reports', featureTier: 'Enterprise',
    chart: {
      type: 'bar', title: 'Walk-in Revenue by Date',
      xKey: 'check_in', yKeys: ['total_amount'],
      colors: [PALETTE[0]], formatY: 'currency',
    },
  },
  {
    key: 'revenue-by-room-type', label: 'Revenue by Room Type', icon: '🏷️', group: 'Financial',
    endpoint: '/reports/revenue-by-room-type',
    columns: [
      { key: 'room_type', label: 'Room Type' },
      { key: 'bookings_count', label: 'Bookings', numeric: true },
      { key: 'room_revenue', label: 'Room Revenue', currency: true },
      { key: 'ancillary_revenue', label: 'Ancillary', currency: true },
      { key: 'total_revenue', label: 'Total Revenue', currency: true },
      { key: 'revenue_pct', label: '% of Total' },
    ],
    params: ['date_range'], hasPage: false,
    featureKey: 'advanced_analytics', featureTier: 'Business+',
    chart: {
      type: 'donut', title: 'Revenue Share by Room Type',
      yKeys: ['total_revenue'], groupBy: 'room_type', valueKey: 'total_revenue', formatY: 'currency',
      secondChart: {
        type: 'grouped-bar', title: 'Room vs Ancillary Revenue',
        xKey: 'room_type', yKeys: ['room_revenue', 'ancillary_revenue'],
        yLabels: ['Room Revenue', 'Ancillary'],
        colors: [PALETTE[0], PALETTE[1]], formatY: 'currency',
      },
    },
  },
  {
    key: 'tax', label: 'Tax / VAT Report', icon: '🧾', group: 'Financial',
    endpoint: '/reports/tax',
    columns: [
      { key: 'invoice_date', label: 'Date', date: true },
      { key: 'invoice_number', label: 'Invoice #' },
      { key: 'booking_ref', label: 'Booking' },
      { key: 'guest_name', label: 'Guest' },
      { key: 'subtotal', label: 'Subtotal', currency: true },
      { key: 'tax_total', label: 'Tax (VAT)', currency: true },
      { key: 'discount_total', label: 'Discount', currency: true },
      { key: 'grand_total', label: 'Grand Total', currency: true },
      { key: 'amount_paid', label: 'Paid', currency: true },
      { key: 'status', label: 'Status' },
    ],
    params: ['date_range'], hasPage: true,
    featureKey: 'custom_reports', featureTier: 'Enterprise',
    chart: {
      type: 'stacked-bar', title: 'Subtotal vs VAT by Invoice',
      xKey: 'invoice_date',
      yKeys: ['subtotal', 'tax_total'],
      yLabels: ['Subtotal', 'VAT'],
      colors: [PALETTE[0], PALETTE[2]], formatY: 'currency',
      secondChart: {
        type: 'line', title: 'Grand Total Trend',
        xKey: 'invoice_date', yKeys: ['grand_total'],
        yLabels: ['Grand Total'], colors: [PALETTE[1]], formatY: 'currency',
      },
    },
  },
  {
    key: 'monthly-revenue', label: 'Monthly Revenue', icon: '📅', group: 'Financial',
    endpoint: '/reports/monthly-revenue',
    columns: [
      { key: 'month_label', label: 'Month' },
      { key: 'room', label: 'Room', currency: true },
      { key: 'bar', label: 'Bar', currency: true },
      { key: 'restaurant', label: 'Restaurant', currency: true },
      { key: 'service', label: 'Service', currency: true },
      { key: 'laundry', label: 'Laundry', currency: true },
      { key: 'other', label: 'Other', currency: true },
      { key: 'total', label: 'Total', currency: true },
      { key: 'bookings_count', label: 'Bookings', numeric: true },
    ],
    params: ['date_range'], hasPage: false,
    featureKey: 'advanced_analytics', featureTier: 'Business+',
    chart: {
      type: 'stacked-bar', title: 'Revenue by Category (Monthly)',
      xKey: 'month_label',
      yKeys: ['room', 'bar', 'restaurant', 'service', 'laundry', 'other'],
      yLabels: ['Room', 'Bar', 'Restaurant', 'Service', 'Laundry', 'Other'],
      colors: PALETTE.slice(0, 6), formatY: 'currency',
      secondChart: {
        type: 'line', title: 'Total Revenue Trend',
        xKey: 'month_label', yKeys: ['total'],
        yLabels: ['Total Revenue'], colors: [PALETTE[0]], formatY: 'currency',
      },
    },
  },
  {
    key: 'daily-manager', label: "Daily Manager's Report", icon: '📋', group: 'Management',
    endpoint: '/reports/daily-manager',
    columns: [
      { key: 'section', label: 'Section' },
      { key: 'metric', label: 'Metric' },
      { key: 'value', label: 'Value' },
    ],
    params: ['date'], hasPage: false,
    featureKey: 'advanced_analytics', featureTier: 'Business+',
  },
  {
    key: 'pos-sales', label: 'POS Sales', icon: '🍽️', group: 'POS',
    endpoint: '/reports/pos-sales',
    columns: [
      { key: 'paid_at', label: 'Time', date: true },
      { key: 'order_number', label: 'Order #' },
      { key: 'order_type', label: 'Type' },
      { key: 'table_number', label: 'Table' },
      { key: 'guest_name', label: 'Guest' },
      { key: 'room_number', label: 'Room' },
      { key: 'item_count', label: 'Items', numeric: true },
      { key: 'total_naira', label: 'Total', currency: true },
      { key: 'payment_method', label: 'Payment' },
      { key: 'served_by_name', label: 'Served By' },
    ],
    params: ['date_range'], hasPage: true,
    featureKey: 'custom_reports', featureTier: 'Enterprise',
    chart: {
      type: 'donut', title: 'Sales by Payment Method',
      yKeys: ['total_naira'], groupBy: 'payment_method', valueKey: 'total_naira', formatY: 'currency',
      secondChart: {
        type: 'bar', title: 'Sales by Order Type',
        xKey: 'order_type', yKeys: ['total_naira'],
        yLabels: ['Revenue'], colors: [PALETTE[0]], formatY: 'currency',
      },
    },
  },
];

const GROUPS = ['Front Office','Rooms','Financial','Housekeeping','Guest','Bookings','Management','POS'];

function statusClass(val: string): string {
  const v = (val || '').toLowerCase();
  if (['checked_in','occupied','confirmed','completed','inspected','active','paid'].some(s => v.includes(s)))
    return 'bg-emerald-50 text-emerald-700';
  if (['checked_out','vacant_clean'].some(s => v.includes(s)))
    return 'bg-gray-100 text-gray-600';
  if (['pending','reserved','vacant_dirty','assigned','in_progress','needs_rework','partial'].some(s => v.includes(s)))
    return 'bg-amber-50 text-amber-700';
  if (['no_show','cancelled','out_of_order','maintenance','void'].some(s => v.includes(s)))
    return 'bg-red-50 text-red-700';
  return 'bg-gray-100 text-gray-600';
}
@Component({
  selector: 'app-reports',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [FormsModule, DatePipe, DecimalPipe, NgTemplateOutlet, RouterLink, PageHeaderComponent, LoadingSpinnerComponent],
  template: `
<!-- ═══ PAGE HEADER ══════════════════════════════════════════════════════════ -->
<ui-page-header
  title="Reports"
  subtitle="Operational and financial reports"
  [breadcrumbs]="['Reports']"
  tourKey="reports"
  (tourClick)="startTour()">
  @if (activeReport()) {
    <div class="flex items-center gap-2">
      <!-- Column visibility -->
      <div class="relative" #colPickerRef>
        <button (click)="showColPicker.set(!showColPicker())"
          class="px-3 py-2 border border-gray-200 text-gray-600 text-sm rounded-xl hover:bg-gray-50 flex items-center gap-1.5 transition-colors">
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
              d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"/>
          </svg>
          Columns
          <span class="text-xs bg-sage-100 text-sage-700 px-1.5 py-0.5 rounded-full font-medium">
            {{ visibleCount() }}/{{ activeReport()!.columns.length }}
          </span>
        </button>
        @if (showColPicker()) {
          <div class="absolute right-0 top-full mt-1 z-50 bg-white rounded-xl border border-gray-200 shadow-lg w-56 py-2">
            <div class="flex items-center justify-between px-3 pb-2 border-b border-gray-100">
              <span class="text-xs font-semibold text-gray-500">Toggle Columns</span>
              <div class="flex gap-2">
                <button (click)="setAllCols(true)"
                  class="text-xs text-sage-600 hover:text-sage-800 font-medium">All</button>
                <span class="text-gray-300">|</span>
                <button (click)="setAllCols(false)"
                  class="text-xs text-red-500 hover:text-red-700 font-medium">None</button>
              </div>
            </div>
            @for (col of activeReport()!.columns; track col.key) {
              <label class="flex items-center gap-2.5 px-3 py-1.5 hover:bg-gray-50 cursor-pointer">
                <input type="checkbox"
                  [checked]="isColVisible(col.key)"
                  (change)="toggleCol(col.key)"
                  class="w-3.5 h-3.5 rounded text-sage-600 border-gray-300">
                <span class="text-sm text-gray-700">{{ col.label }}</span>
                @if (col.currency) {
                  <span class="ml-auto text-[10px] text-gray-400">₦</span>
                }
              </label>
            }
          </div>
        }
      </div>
      <!-- Export -->
      <button (click)="exportCsv()"
        class="px-4 py-2 bg-sage-600 text-white text-sm font-medium rounded-xl hover:bg-sage-700 flex items-center gap-2">
        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
            d="M12 10v6m0 0l-3-3m3 3l3-3M3 17V7a2 2 0 012-2h6l2 2h6a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2z"/>
        </svg>
        Export CSV
      </button>
    </div>
  }
</ui-page-header>

<div class="flex gap-5">
<!-- ═══ SIDEBAR ══════════════════════════════════════════════════════════════ -->
  <aside class="w-56 flex-shrink-0" data-tour="reports-sidebar">
    @for (group of groups(); track group) {
      <div class="mb-4">
        <p class="text-[11px] font-semibold uppercase tracking-widest text-gray-400 px-3 mb-1">{{ group }}</p>
        @for (r of reportsByGroup(group); track r.key) {
          <button (click)="selectReport(r)"
            class="w-full text-left px-3 py-2 rounded-lg text-sm transition-colors flex items-center gap-2"
            [class]="activeReport()?.key === r.key
              ? 'bg-sage-50 text-sage-700 font-medium border border-sage-100'
              : 'text-gray-600 hover:bg-gray-50'">
            <span class="text-base leading-none">{{ r.icon }}</span>{{ r.label }}
          </button>
        }
        @for (r of lockedReportsByGroup(group); track r.key) {
          <button (click)="selectLockedReport(r)"
            class="w-full text-left px-3 py-2 rounded-lg text-sm flex items-center gap-2 transition-colors"
            [class]="lockedReportKey() === r.key
              ? 'bg-amber-50 border border-amber-200 text-amber-800'
              : 'text-gray-400 hover:bg-gray-50'">
            <span class="text-base leading-none">🔒</span>
            <span>{{ r.label }}</span>
            <span class="ml-auto text-[10px] bg-amber-100 text-amber-600 px-1.5 py-0.5 rounded-full font-medium">{{ r.featureTier }}</span>
          </button>
        }
      </div>
    }
  </aside>

<!-- ═══ MAIN ══════════════════════════════════════════════════════════════════ -->
  <div class="flex-1 min-w-0">

    <!-- Landing grid -->
    @if (!activeReport() && !lockedReportKey()) {
      <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        @for (r of availableReports(); track r.key) {
          <button (click)="selectReport(r)"
            class="bg-white rounded-xl border border-gray-100 shadow-card p-5 text-left hover:border-sage-200 hover:shadow-md transition-all group">
            <div class="text-3xl mb-3">{{ r.icon }}</div>
            <p class="text-sm font-semibold text-gray-800 group-hover:text-sage-700">{{ r.label }}</p>
            <p class="text-xs text-gray-400 mt-0.5">{{ r.group }}</p>
            @if (r.chart) {
              <span class="inline-flex items-center gap-1 mt-2 text-[10px] text-sage-600 bg-sage-50 px-1.5 py-0.5 rounded-full">
                <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"/>
                </svg>
                Charts included
              </span>
            }
          </button>
        }
        @for (r of lockedReports(); track r.key) {
          <div class="bg-gray-50 rounded-xl border border-dashed border-gray-200 p-5 opacity-60 cursor-not-allowed">
            <div class="text-3xl mb-3 grayscale">🔒</div>
            <p class="text-sm font-semibold text-gray-500">{{ r.label }}</p>
            <p class="text-xs text-gray-400 mt-0.5">{{ r.group }}</p>
            <span class="inline-block mt-2 text-[10px] font-medium bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full">Requires {{ r.featureTier }}</span>
          </div>
        }
      </div>
    }

    <!-- Locked report upgrade prompt -->
    @if (lockedReportKey(); as lk) {
      @if (!activeReport()) {
        @if (lockedReportDef(); as locked) {
          <div class="bg-white rounded-2xl border border-amber-200 shadow-card p-8 text-center max-w-md mx-auto mt-8">
            <div class="text-5xl mb-4">🔒</div>
            <h3 class="text-lg font-bold text-gray-900 mb-2">{{ locked.icon }} {{ locked.label }}</h3>
            <p class="text-sm text-gray-500 mb-1">This report requires the <strong class="text-amber-700">{{ locked.featureTier }}</strong> plan.</p>
            <div class="bg-amber-50 border border-amber-100 rounded-xl p-4 mb-6 text-left">
              <p class="text-xs font-semibold text-amber-800 mb-2">Columns included:</p>
              <div class="flex flex-wrap gap-1">
                @for (col of locked.columns; track col.key) {
                  <span class="text-[11px] bg-white border border-amber-200 text-amber-700 px-2 py-0.5 rounded-full">{{ col.label }}</span>
                }
              </div>
            </div>
            <a routerLink="/settings/subscription"
              class="inline-block px-6 py-2.5 bg-amber-500 text-white font-semibold text-sm rounded-xl hover:bg-amber-600 transition-colors">
              Upgrade Plan →
            </a>
          </div>
        }
      }
    }

    <!-- ═══ REPORT VIEWER ═══════════════════════════════════════════════════ -->
    @if (activeReport(); as report) {

      <!-- Back + title -->
      <div class="flex items-center gap-3 mb-4">
        <button (click)="clearReport()"
          class="text-gray-400 hover:text-gray-700 p-1 rounded-lg hover:bg-gray-100">
          <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7"/>
          </svg>
        </button>
        <div>
          <h2 class="text-base font-semibold text-gray-800">{{ report.icon }} {{ report.label }}</h2>
          <p class="text-xs text-gray-400">{{ report.group }}</p>
        </div>
      </div>

      <!-- Filter bar -->
      <div class="bg-white rounded-xl border border-gray-100 p-4 shadow-card mb-4" data-tour="reports-filters">
        <div class="flex flex-wrap items-end gap-3">
          @if (report.params.includes('date')) {
            <div>
              <label class="block text-xs text-gray-500 mb-1">Date</label>
              <input [(ngModel)]="filterDate" type="date"
                class="px-3 py-2 border border-gray-200 rounded-lg text-sm bg-gray-50 focus:ring-2 focus:ring-sage-200 outline-none">
            </div>
          }
          @if (report.params.includes('date_range')) {
            <div>
              <label class="block text-xs text-gray-500 mb-1">From</label>
              <input [(ngModel)]="filterDateFrom" type="date"
                class="px-3 py-2 border border-gray-200 rounded-lg text-sm bg-gray-50 focus:ring-2 focus:ring-sage-200 outline-none">
            </div>
            <div>
              <label class="block text-xs text-gray-500 mb-1">To</label>
              <input [(ngModel)]="filterDateTo" type="date"
                class="px-3 py-2 border border-gray-200 rounded-lg text-sm bg-gray-50 focus:ring-2 focus:ring-sage-200 outline-none">
            </div>
          }
          @if (report.params.includes('guest_id')) {
            <div>
              <label class="block text-xs text-gray-500 mb-1">Guest ID (optional)</label>
              <input [(ngModel)]="filterGuestId" placeholder="UUID"
                class="px-3 py-2 border border-gray-200 rounded-lg text-sm bg-gray-50 focus:ring-2 focus:ring-sage-200 outline-none w-48">
            </div>
          }
          @if (report.params.includes('date_range')) {
            <div class="flex gap-1 self-end flex-wrap">
              @for (p of datePresets; track p.label) {
                <button (click)="applyPreset(p)"
                  class="px-2.5 py-2 border border-gray-200 rounded-lg text-xs text-gray-600 hover:bg-gray-50 hover:border-sage-200 transition-colors whitespace-nowrap">
                  {{ p.label }}
                </button>
              }
            </div>
          }
          <button (click)="runReport()"
            [disabled]="loading()"
            class="px-4 py-2 bg-sage-600 text-white text-sm rounded-lg hover:bg-sage-700 disabled:opacity-50 self-end">
            Run Report
          </button>
          <!-- Compare toggle -->
          @if (report.params.includes('date_range')) {
            <button (click)="compareMode.set(!compareMode())"
              class="px-3 py-2 border text-sm rounded-lg self-end transition-colors flex items-center gap-1.5"
              [class]="compareMode()
                ? 'border-purple-300 bg-purple-50 text-purple-700'
                : 'border-gray-200 text-gray-500 hover:bg-gray-50'">
              <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"/>
              </svg>
              Compare
            </button>
          }
        </div>
        <!-- Compare period row -->
        @if (compareMode() && report.params.includes('date_range')) {
          <div class="flex flex-wrap items-end gap-3 mt-3 pt-3 border-t border-gray-100">
            <span class="text-xs text-purple-600 font-medium self-end pb-2">Compare to:</span>
            <div>
              <label class="block text-xs text-gray-500 mb-1">From</label>
              <input [(ngModel)]="compareDateFrom" type="date"
                class="px-3 py-2 border border-purple-200 rounded-lg text-sm bg-purple-50 focus:ring-2 focus:ring-purple-200 outline-none">
            </div>
            <div>
              <label class="block text-xs text-gray-500 mb-1">To</label>
              <input [(ngModel)]="compareDateTo" type="date"
                class="px-3 py-2 border border-purple-200 rounded-lg text-sm bg-purple-50 focus:ring-2 focus:ring-purple-200 outline-none">
            </div>
            <div class="flex gap-1 self-end flex-wrap">
              @for (p of comparePresets; track p.label) {
                <button (click)="applyComparePreset(p)"
                  class="px-2.5 py-2 border border-purple-200 rounded-lg text-xs text-purple-600 hover:bg-purple-50 transition-colors whitespace-nowrap">
                  {{ p.label }}
                </button>
              }
            </div>
          </div>
        }
      </div>

      <ui-loading [loading]="loading()"></ui-loading>

      @if (!loading() && reportData()) {

        <!-- Summary cards -->
        @if (summaryEntries().length) {
          <div class="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 mb-5" data-tour="reports-summary">
            @for (entry of summaryEntries(); track entry.key) {
              <div class="bg-white rounded-xl border border-gray-100 p-4 shadow-card">
                <p class="text-xs text-gray-400 capitalize leading-tight">{{ entry.label }}</p>
                <p class="text-xl font-bold text-gray-900 mt-1 truncate">{{ entry.value }}</p>
                @if (compareMode() && compareData() && compDeltaMap()[entry.key] !== undefined) {
                  @let delta = compDeltaMap()[entry.key];
                  <div class="flex items-center gap-1 mt-1"
                    [class]="delta > 0 ? 'text-emerald-600' : delta < 0 ? 'text-red-500' : 'text-gray-400'">
                    <span class="text-xs font-medium">{{ delta > 0 ? '↑' : delta < 0 ? '↓' : '→' }} {{ (delta | number:'1.1-1') }}%</span>
                    <span class="text-[10px] text-gray-400">vs period</span>
                  </div>
                }
              </div>
            }
          </div>
        }

        <!-- ═══ CHARTS ═══════════════════════════════════════════════════════ -->
        @if (report.chart && reportData()!.items?.length > 1) {
          <div class="grid gap-4 mb-5" [class]="report.chart.secondChart ? 'grid-cols-1 lg:grid-cols-2' : 'grid-cols-1'">

            <!-- Primary chart -->
            <div class="bg-white rounded-xl border border-gray-100 shadow-card p-5" data-tour="reports-chart">
              <h3 class="text-sm font-semibold text-gray-700 mb-4">{{ report.chart.title }}</h3>
              @if (primaryChart(); as ch) {
                @switch (ch.type) {
                  @case ('line') {
                    <ng-container *ngTemplateOutlet="lineTpl; context: { ch: ch }"></ng-container>
                  }
                  @case ('bar') {
                    <ng-container *ngTemplateOutlet="barTpl; context: { ch: ch }"></ng-container>
                  }
                  @case ('stacked-bar') {
                    <ng-container *ngTemplateOutlet="stackedTpl; context: { ch: ch }"></ng-container>
                  }
                  @case ('donut') {
                    <ng-container *ngTemplateOutlet="donutTpl; context: { ch: ch }"></ng-container>
                  }
                  @case ('grouped-bar') {
                    <ng-container *ngTemplateOutlet="groupedBarTpl; context: { ch: ch }"></ng-container>
                  }
                }
              }
            </div>

            <!-- Secondary chart -->
            @if (report.chart.secondChart && secondaryChart()) {
              <div class="bg-white rounded-xl border border-gray-100 shadow-card p-5">
                <h3 class="text-sm font-semibold text-gray-700 mb-4">{{ report.chart.secondChart.title }}</h3>
                @if (secondaryChart(); as ch) {
                  @switch (ch.type) {
                    @case ('line') {
                      <ng-container *ngTemplateOutlet="lineTpl; context: { ch: ch }"></ng-container>
                    }
                    @case ('bar') {
                      <ng-container *ngTemplateOutlet="barTpl; context: { ch: ch }"></ng-container>
                    }
                    @case ('stacked-bar') {
                      <ng-container *ngTemplateOutlet="stackedTpl; context: { ch: ch }"></ng-container>
                    }
                    @case ('donut') {
                      <ng-container *ngTemplateOutlet="donutTpl; context: { ch: ch }"></ng-container>
                    }
                    @case ('grouped-bar') {
                      <ng-container *ngTemplateOutlet="groupedBarTpl; context: { ch: ch }"></ng-container>
                    }
                  }
                }
              </div>
            }
          </div>

          <!-- Comparison overlay chart -->
          @if (compareMode() && compareData() && comparisonChart()) {
            <div class="bg-white rounded-xl border border-purple-100 shadow-card p-5 mb-5">
              <div class="flex items-center gap-2 mb-4">
                <h3 class="text-sm font-semibold text-gray-700">Period Comparison</h3>
                <div class="flex items-center gap-3 ml-auto">
                  <span class="flex items-center gap-1.5 text-xs text-gray-500">
                    <span class="w-3 h-0.5 bg-sage-600 inline-block rounded"></span>Current
                  </span>
                  <span class="flex items-center gap-1.5 text-xs text-gray-500">
                    <span class="w-3 h-0.5 bg-purple-500 inline-block rounded" style="border-top: 2px dashed #7C3AED; height:0"></span>Compare
                  </span>
                </div>
              </div>
              @if (comparisonChart(); as ch) {
                <ng-container *ngTemplateOutlet="compLineTpl; context: { ch: ch }"></ng-container>
              }
            </div>
          }
        }

        <!-- ═══ TABLE ════════════════════════════════════════════════════════ -->
        <div class="bg-white rounded-xl border border-gray-100 shadow-card overflow-hidden">
          <div class="overflow-x-auto">
            <table class="w-full text-sm">
              <thead class="bg-gray-50 text-gray-500 text-xs uppercase tracking-wide">
                <tr>
                  @for (col of visibleColumns(); track col.key) {
                    <th class="px-4 py-3 text-left whitespace-nowrap">{{ col.label }}</th>
                  }
                </tr>
              </thead>
              <tbody class="divide-y divide-gray-50">
                @for (row of reportData()!.items; track $index) {
                  <tr class="hover:bg-gray-50 transition-colors">
                    @for (col of visibleColumns(); track col.key) {
                      <td class="px-4 py-3 whitespace-nowrap">
                        @if (col.currency) {
                          <span class="text-gray-800 font-medium tabular-nums">
                            {{ fmtMoney(row[col.key]) }}
                          </span>
                        } @else if (col.numeric) {
                          <span class="text-gray-700 tabular-nums">{{ fmtNum(row[col.key]) }}</span>
                        } @else if (col.date && row[col.key]) {
                          <span class="text-gray-600 text-xs">{{ row[col.key] | date:'MMM d, y HH:mm' }}</span>
                        } @else if (col.key === 'status') {
                          <span class="px-2 py-0.5 rounded-full text-[11px] font-medium"
                            [class]="statusClass(row[col.key])">
                            {{ formatStatus(row[col.key]) }}
                          </span>
                        } @else {
                          <span class="text-gray-700">{{ row[col.key] ?? '—' }}</span>
                        }
                      </td>
                    }
                  </tr>
                } @empty {
                  <tr>
                    <td [attr.colspan]="visibleColumns().length"
                      class="px-4 py-12 text-center text-gray-400 text-sm">
                      No records found for the selected criteria.
                    </td>
                  </tr>
                }
              </tbody>
            </table>
          </div>
          @if (report.hasPage && reportData()!.meta?.pages > 1) {
            <div class="flex items-center justify-between px-4 py-3 border-t border-gray-100">
              <span class="text-xs text-gray-400">
                Page {{ reportData()!.meta.page }} of {{ reportData()!.meta.pages }}
                · {{ reportData()!.meta.total | number }} records
              </span>
              <div class="flex gap-1">
                <button (click)="goPage(reportData()!.meta.page - 1)"
                  [disabled]="reportData()!.meta.page <= 1"
                  class="px-3 py-1 text-xs border rounded-lg disabled:opacity-40 hover:bg-gray-50">Prev</button>
                <button (click)="goPage(reportData()!.meta.page + 1)"
                  [disabled]="reportData()!.meta.page >= reportData()!.meta.pages"
                  class="px-3 py-1 text-xs border rounded-lg disabled:opacity-40 hover:bg-gray-50">Next</button>
              </div>
            </div>
          }
        </div>
        <p class="text-[11px] text-gray-300 mt-3 text-right">
          Generated {{ reportData()!.generated_at | date:'MMM d, y HH:mm' }}
        </p>
      }
    }
  </div>
</div>

<!-- ════════════════════════ SVG CHART TEMPLATES ════════════════════════════ -->

<!-- Line chart -->
<ng-template #lineTpl let-ch="ch">
  <svg [attr.viewBox]="'0 0 ' + CHART_W + ' ' + CHART_H" class="w-full" style="overflow:visible">
    <!-- Grid lines -->
    @for (i of [0,1,2,3,4]; track i) {
      <line [attr.x1]="PAD_L" [attr.x2]="CHART_W - PAD_R"
        [attr.y1]="PAD_T + (PH * i / 4)" [attr.y2]="PAD_T + (PH * i / 4)"
        stroke="#F3F4F6" stroke-width="1"/>
    }
    <!-- Y axis labels -->
    @for (lbl of ch.yAxisLabels; track $index; let i = $index) {
      <text [attr.x]="PAD_L - 6" [attr.y]="PAD_T + (PH * i / 4) + 4"
        text-anchor="end" font-size="10" fill="#9CA3AF">{{ lbl }}</text>
    }
    <!-- Area fill -->
    @for (series of ch.series; track $index; let si = $index) {
      <path [attr.d]="series.area" [attr.fill]="series.color" fill-opacity="0.1"/>
      <path [attr.d]="series.line" fill="none" [attr.stroke]="series.color"
        stroke-width="2" stroke-linejoin="round" stroke-linecap="round"
        [attr.stroke-dasharray]="si > 0 ? '5,3' : 'none'"/>
      <!-- Dots -->
      @for (pt of series.dots; track $index) {
        <circle [attr.cx]="pt.x" [attr.cy]="pt.y" r="3"
          [attr.fill]="series.color" stroke="white" stroke-width="1.5"/>
      }
    }
    <!-- X labels -->
    @for (lbl of ch.xLabels; track $index; let i = $index) {
      @if (lbl.show) {
        <text [attr.x]="lbl.x" [attr.y]="CHART_H - 4"
          text-anchor="middle" font-size="9" fill="#9CA3AF"
          [attr.transform]="'rotate(-30 ' + lbl.x + ' ' + (CHART_H - 4) + ')'">{{ lbl.text }}</text>
      }
    }
  </svg>
  <!-- Legend -->
  @if (ch.series.length > 1) {
    <div class="flex flex-wrap gap-4 mt-2 justify-center">
      @for (s of ch.series; track $index) {
        <span class="flex items-center gap-1.5 text-xs text-gray-500">
          <span class="w-6 h-0.5 rounded inline-block" [style.background]="s.color"></span>
          {{ s.label }}
        </span>
      }
    </div>
  }
</ng-template>

<!-- Bar chart -->
<ng-template #barTpl let-ch="ch">
  <svg [attr.viewBox]="'0 0 ' + CHART_W + ' ' + CHART_H" class="w-full" style="overflow:visible">
    @for (i of [0,1,2,3,4]; track i) {
      <line [attr.x1]="PAD_L" [attr.x2]="CHART_W - PAD_R"
        [attr.y1]="PAD_T + (PH * i / 4)" [attr.y2]="PAD_T + (PH * i / 4)"
        stroke="#F3F4F6" stroke-width="1"/>
    }
    @for (lbl of ch.yAxisLabels; track $index; let i = $index) {
      <text [attr.x]="PAD_L - 6" [attr.y]="PAD_T + (PH * i / 4) + 4"
        text-anchor="end" font-size="10" fill="#9CA3AF">{{ lbl }}</text>
    }
    @for (bar of ch.bars; track $index) {
      <rect [attr.x]="bar.x" [attr.y]="bar.y" [attr.width]="bar.w" [attr.height]="bar.h"
        [attr.fill]="bar.color" rx="2"/>
      @if (bar.showLabel) {
        <text [attr.x]="bar.x + bar.w / 2" [attr.y]="CHART_H - 4"
          text-anchor="middle" font-size="9" fill="#9CA3AF"
          [attr.transform]="'rotate(-30 ' + (bar.x + bar.w / 2) + ' ' + (CHART_H - 4) + ')'">{{ bar.label }}</text>
      }
    }
  </svg>
</ng-template>

<!-- Stacked bar chart -->
<ng-template #stackedTpl let-ch="ch">
  <svg [attr.viewBox]="'0 0 ' + CHART_W + ' ' + CHART_H" class="w-full" style="overflow:visible">
    @for (i of [0,1,2,3,4]; track i) {
      <line [attr.x1]="PAD_L" [attr.x2]="CHART_W - PAD_R"
        [attr.y1]="PAD_T + (PH * i / 4)" [attr.y2]="PAD_T + (PH * i / 4)"
        stroke="#F3F4F6" stroke-width="1"/>
    }
    @for (lbl of ch.yAxisLabels; track $index; let i = $index) {
      <text [attr.x]="PAD_L - 6" [attr.y]="PAD_T + (PH * i / 4) + 4"
        text-anchor="end" font-size="10" fill="#9CA3AF">{{ lbl }}</text>
    }
    @for (group of ch.groups; track $index; let gi = $index) {
      @for (seg of group.segs; track $index) {
        <rect [attr.x]="group.x" [attr.y]="seg.y" [attr.width]="group.w" [attr.height]="seg.h"
          [attr.fill]="seg.color"/>
      }
      @if (group.showLabel) {
        <text [attr.x]="group.x + group.w / 2" [attr.y]="CHART_H - 4"
          text-anchor="middle" font-size="9" fill="#9CA3AF"
          [attr.transform]="'rotate(-30 ' + (group.x + group.w / 2) + ' ' + (CHART_H - 4) + ')'">{{ group.label }}</text>
      }
    }
  </svg>
  <div class="flex flex-wrap gap-3 mt-3 justify-center">
    @for (lbl of ch.legend; track $index) {
      <span class="flex items-center gap-1.5 text-xs text-gray-500">
        <span class="w-3 h-3 rounded-sm inline-block" [style.background]="lbl.color"></span>{{ lbl.label }}
      </span>
    }
  </div>
</ng-template>

<!-- Donut chart -->
<ng-template #donutTpl let-ch="ch">
  <div class="flex items-center gap-6">
    <svg viewBox="0 0 260 200" class="flex-shrink-0 w-52 h-40">
      @for (s of ch.slices; track $index) {
        <path [attr.d]="s.d" [attr.fill]="s.color" stroke="white" stroke-width="1.5">
          <title>{{ s.label }}: {{ s.value | number:'1.0-0' }} ({{ s.pct }}%)</title>
        </path>
      }
      <text x="130" y="96" text-anchor="middle" font-size="18" font-weight="700" fill="#1E293B">
        {{ ch.total }}
      </text>
      <text x="130" y="112" text-anchor="middle" font-size="10" fill="#9CA3AF">Total</text>
    </svg>
    <div class="flex-1 space-y-1.5 overflow-hidden">
      @for (s of ch.slices; track $index) {
        <div class="flex items-center gap-2">
          <span class="w-2.5 h-2.5 rounded-sm flex-shrink-0" [style.background]="s.color"></span>
          <span class="text-xs text-gray-600 truncate flex-1">{{ s.label }}</span>
          <span class="text-xs font-medium text-gray-800 tabular-nums flex-shrink-0">{{ s.pct }}%</span>
        </div>
      }
    </div>
  </div>
</ng-template>

<!-- Grouped bar chart -->
<ng-template #groupedBarTpl let-ch="ch">
  <svg [attr.viewBox]="'0 0 ' + CHART_W + ' ' + CHART_H" class="w-full" style="overflow:visible">
    @for (i of [0,1,2,3,4]; track i) {
      <line [attr.x1]="PAD_L" [attr.x2]="CHART_W - PAD_R"
        [attr.y1]="PAD_T + (PH * i / 4)" [attr.y2]="PAD_T + (PH * i / 4)"
        stroke="#F3F4F6" stroke-width="1"/>
    }
    @for (lbl of ch.yAxisLabels; track $index; let i = $index) {
      <text [attr.x]="PAD_L - 6" [attr.y]="PAD_T + (PH * i / 4) + 4"
        text-anchor="end" font-size="10" fill="#9CA3AF">{{ lbl }}</text>
    }
    @for (group of ch.groups; track $index) {
      @for (bar of group.bars; track $index) {
        <rect [attr.x]="bar.x" [attr.y]="bar.y" [attr.width]="bar.w" [attr.height]="bar.h"
          [attr.fill]="bar.color" rx="2"/>
      }
      @if (group.showLabel) {
        <text [attr.x]="group.cx" [attr.y]="CHART_H - 4"
          text-anchor="middle" font-size="9" fill="#9CA3AF">{{ group.label }}</text>
      }
    }
  </svg>
  <div class="flex flex-wrap gap-3 mt-3 justify-center">
    @for (lbl of ch.legend; track $index) {
      <span class="flex items-center gap-1.5 text-xs text-gray-500">
        <span class="w-3 h-3 rounded-sm inline-block" [style.background]="lbl.color"></span>{{ lbl.label }}
      </span>
    }
  </div>
</ng-template>

<!-- Comparison line chart (two series with different styles) -->
<ng-template #compLineTpl let-ch="ch">
  <svg [attr.viewBox]="'0 0 ' + CHART_W + ' ' + CHART_H" class="w-full" style="overflow:visible">
    @for (i of [0,1,2,3,4]; track i) {
      <line [attr.x1]="PAD_L" [attr.x2]="CHART_W - PAD_R"
        [attr.y1]="PAD_T + (PH * i / 4)" [attr.y2]="PAD_T + (PH * i / 4)"
        stroke="#F3F4F6" stroke-width="1"/>
    }
    @for (lbl of ch.yAxisLabels; track $index; let i = $index) {
      <text [attr.x]="PAD_L - 6" [attr.y]="PAD_T + (PH * i / 4) + 4"
        text-anchor="end" font-size="10" fill="#9CA3AF">{{ lbl }}</text>
    }
    <path [attr.d]="ch.currentArea" fill="#4A7A4A" fill-opacity="0.08"/>
    <path [attr.d]="ch.currentLine" fill="none" stroke="#4A7A4A" stroke-width="2" stroke-linecap="round"/>
    <path [attr.d]="ch.compareArea" fill="#7C3AED" fill-opacity="0.08"/>
    <path [attr.d]="ch.compareLine" fill="none" stroke="#7C3AED" stroke-width="2" stroke-linecap="round" stroke-dasharray="5,3"/>
    @for (lbl of ch.xLabels; track $index) {
      @if (lbl.show) {
        <text [attr.x]="lbl.x" [attr.y]="CHART_H - 4"
          text-anchor="middle" font-size="9" fill="#9CA3AF">{{ lbl.text }}</text>
      }
    }
  </svg>
</ng-template>
  `,
})
export class ReportsPage implements OnInit {
  private api            = inject(ApiService);
  private toast          = inject(ToastService);
  private activeProperty = inject(ActivePropertyService);
  private featureService = inject(FeatureService);

  // SVG constants exposed to template
  readonly CHART_W = CHART_W;
  readonly CHART_H = CHART_H;
  readonly PAD_L = PAD.l;
  readonly PAD_R = PAD.r;
  readonly PAD_T = PAD.t;
  readonly PAD_B = PAD.b;
  readonly PH = PH;

  // ── Report access ─────────────────────────────────────────────────────────
  readonly availableReports = computed(() => {
    const enabled = this.featureService.enabledModules();
    return REPORTS.filter(r => enabled.includes(r.featureKey));
  });
  readonly lockedReports = computed(() => {
    const enabled = this.featureService.enabledModules();
    return REPORTS.filter(r => !enabled.includes(r.featureKey));
  });
  readonly groups = computed(() =>
    GROUPS.filter(g => REPORTS.some(r => r.group === g))
  );

  // ── State signals ──────────────────────────────────────────────────────────
  loading         = signal(false);
  activeReportKey = signal<string | null>(null);
  lockedReportKey = signal<string | null>(null);
  reportData      = signal<any | null>(null);
  compareData     = signal<any | null>(null);
  compareMode     = signal(false);
  showColPicker   = signal(false);
  hiddenCols      = signal<Set<string>>(new Set());

  // ── Filters ───────────────────────────────────────────────────────────────
  filterDate      = new Date().toISOString().slice(0, 10);
  filterDateFrom  = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().slice(0, 10);
  filterDateTo    = new Date().toISOString().slice(0, 10);
  filterGuestId   = '';
  compareDateFrom = new Date(new Date().getFullYear(), new Date().getMonth() - 1, 1).toISOString().slice(0, 10);
  compareDateTo   = new Date(new Date().getFullYear(), new Date().getMonth(), 0).toISOString().slice(0, 10);
  currentPage     = 1;

  // ── Computed ──────────────────────────────────────────────────────────────
  readonly activeReport = computed(() =>
    REPORTS.find(r => r.key === this.activeReportKey()) ?? null
  );
  readonly lockedReportDef = computed(() =>
    REPORTS.find(r => r.key === this.lockedReportKey()) ?? null
  );

  readonly visibleColumns = computed(() => {
    const report = this.activeReport();
    if (!report) return [];
    const hidden = this.hiddenCols();
    return report.columns.filter(c => !hidden.has(c.key));
  });

  readonly visibleCount = computed(() => this.visibleColumns().length);

  readonly summaryEntries = computed((): { key: string; label: string; value: string }[] => {
    const data = this.reportData();
    if (!data?.summary) return [];
    const skip = new Set(['period_from', 'period_to', 'date']);
    return Object.entries(data.summary)
      .filter(([k, v]) => !skip.has(k) && v !== null && v !== undefined)
      .map(([k, v]) => ({
        key: k,
        label: k.replace(/_/g, ' '),
        value: this.formatSummaryValue(k, v),
      }));
  });

  readonly compDeltaMap = computed((): Record<string, number> => {
    const curr = this.reportData()?.summary;
    const prev = this.compareData()?.summary;
    if (!curr || !prev) return {};
    const map: Record<string, number> = {};
    for (const [k, cv] of Object.entries(curr)) {
      const cn = Number(cv), pn = Number(prev[k]);
      if (!isNaN(cn) && !isNaN(pn) && pn !== 0) {
        map[k] = ((cn - pn) / pn) * 100;
      }
    }
    return map;
  });

  // ── Chart computed signals ─────────────────────────────────────────────────
  readonly primaryChart = computed(() => this.buildChart(this.activeReport()?.chart));
  readonly secondaryChart = computed(() => this.buildChart(this.activeReport()?.chart?.secondChart));

  readonly comparisonChart = computed(() => {
    const report = this.activeReport();
    const curr   = this.reportData();
    const comp   = this.compareData();
    if (!report?.chart || !curr?.items?.length || !comp?.items?.length) return null;
    const cfg = report.chart;
    if (!cfg.xKey || !cfg.yKeys[0]) return null;
    const yKey = cfg.yKeys[0];
    const isCurr = curr.items;
    const isComp = comp.items;
    const allVals = [...isCurr, ...isComp].map((r: any) => Number(r[yKey] ?? 0));
    const maxV = Math.max(...allVals, 0.01);
    const makePs = (items: any[]) => items.map((r: any, i: number) => ({
      x: PAD.l + (items.length < 2 ? PW / 2 : (i / (items.length - 1)) * PW),
      y: PAD.t + PH - (Number(r[yKey] ?? 0) / maxV) * PH,
      label: truncLabel(String(r[cfg.xKey!] ?? i)),
      value: Number(r[yKey] ?? 0),
    }));
    const cPts = makePs(isCurr);
    const pPts = makePs(isComp);
    const baseline = PAD.t + PH;
    const yLbls = yAxisLabels([...isCurr, ...isComp], yKey);
    const xLbls = cPts.map((p, i) => ({
      x: p.x, text: p.label, show: showEvery(i, cPts.length),
    }));
    return {
      currentLine:  linePath(cPts),
      currentArea:  areaPath(cPts, baseline),
      compareLine:  linePath(pPts),
      compareArea:  areaPath(pPts, baseline),
      yAxisLabels:  yLbls,
      xLabels:      xLbls,
    };
  });

  ngOnInit(): void {}

  // ── Chart builder ──────────────────────────────────────────────────────────
  private buildChart(cfg: ChartCfg | undefined): any {
    if (!cfg) return null;
    const items: any[] = this.reportData()?.items ?? [];
    if (!items.length) return null;

    switch (cfg.type) {
      case 'line': return this.buildLineChart(items, cfg);
      case 'bar':  return this.buildBarChart(items, cfg);
      case 'stacked-bar': return this.buildStackedBarChart(items, cfg);
      case 'donut': return this.buildDonutChart(items, cfg);
      case 'grouped-bar': return this.buildGroupedBarChart(items, cfg);
      default: return null;
    }
  }

  private buildLineChart(items: any[], cfg: ChartCfg) {
    const xKey = cfg.xKey ?? 'date';
    const series = cfg.yKeys.map((yKey, si) => {
      const pts = buildPoints(items, xKey, yKey);
      const baseline = PAD.t + PH;
      return {
        color: (cfg.colors ?? PALETTE)[si] ?? PALETTE[si],
        label: cfg.yLabels?.[si] ?? yKey,
        line: linePath(pts),
        area: areaPath(pts, baseline),
        dots: pts.filter((_, i) => items.length <= 30 || showEvery(i, pts.length)),
      };
    });
    const allVals = items.flatMap(r => cfg.yKeys.map(k => Number(r[k] ?? 0)));
    const maxV = Math.max(...allVals, 0.01);
    const yLbls = Array.from({ length: 5 }, (_, i) => {
      const v = maxV * (4 - i) / 4;
      const fmt = cfg.formatY === 'currency' ? fmtMoney : cfg.formatY === 'percent' ? (x: number) => x.toFixed(1) + '%' : fmtNum;
      return fmt(v);
    });
    const pts0 = buildPoints(items, xKey, cfg.yKeys[0]);
    const xLbls = pts0.map((p, i) => ({
      x: p.x, text: truncLabel(p.label), show: showEvery(i, pts0.length),
    }));
    return { type: 'line', series, yAxisLabels: yLbls, xLabels: xLbls };
  }

  private buildBarChart(items: any[], cfg: ChartCfg) {
    const xKey = cfg.xKey ?? 'date';
    const yKey = cfg.yKeys[0];
    const color = cfg.colors?.[0] ?? PALETTE[0];
    let src = items;
    // For bar charts keyed by category, group first
    const isCat = items.length > 0 && isNaN(Number(items[0][xKey]));
    if (isCat && !cfg.xKey?.includes('date')) {
      const grouped = groupByKey(items, xKey, yKey);
      src = grouped.map(g => ({ [xKey]: g.label, [yKey]: g.value }));
    }
    const bars = buildBars(src, xKey, yKey, color).map((b, i) => ({
      ...b, showLabel: showEvery(i, src.length),
    }));
    const vals = src.map(r => Number(r[yKey] ?? 0));
    const maxV = Math.max(...vals, 0.01);
    const fmt = cfg.formatY === 'currency' ? fmtMoney : fmtNum;
    const yLbls = Array.from({ length: 5 }, (_, i) => fmt(maxV * (4 - i) / 4));
    return { type: 'bar', bars, yAxisLabels: yLbls };
  }

  private buildStackedBarChart(items: any[], cfg: ChartCfg) {
    const xKey = cfg.xKey ?? 'date';
    const colors = cfg.colors ?? PALETTE;
    const groups = buildStackedBars(items, xKey, cfg.yKeys, colors).map((g, i) => ({
      ...g, showLabel: showEvery(i, items.length),
    }));
    const rowTotals = items.map(r => cfg.yKeys.reduce((s, k) => s + Number(r[k] ?? 0), 0));
    const maxV = Math.max(...rowTotals, 0.01);
    const fmt = cfg.formatY === 'currency' ? fmtMoney : fmtNum;
    const yLbls = Array.from({ length: 5 }, (_, i) => fmt(maxV * (4 - i) / 4));
    const legend = cfg.yKeys.map((k, i) => ({ label: cfg.yLabels?.[i] ?? k, color: colors[i] ?? PALETTE[i] }));
    return { type: 'stacked-bar', groups, yAxisLabels: yLbls, legend };
  }

  private buildDonutChart(items: any[], cfg: ChartCfg) {
    const groupKey = cfg.groupBy ?? cfg.xKey ?? 'status';
    const valueKey = cfg.valueKey ?? cfg.yKeys[0] ?? 'count';
    const grouped = groupByKey(items, groupKey, valueKey).slice(0, 8);
    if (!grouped.length) return null;
    const total = grouped.reduce((s, g) => s + g.value, 0);
    const slices = buildDonut(grouped);
    const fmt = cfg.formatY === 'currency' ? (v: number) => fmtMoney(v) : (v: number) => fmtNum(v);
    const totalFmt = fmt(total);
    return { type: 'donut', slices, total: totalFmt };
  }

  private buildGroupedBarChart(items: any[], cfg: ChartCfg) {
    const xKey = cfg.xKey ?? 'date';
    const colors = cfg.colors ?? PALETTE;
    const nSeries = cfg.yKeys.length;
    const n = items.length;
    const groupW = PW / Math.max(n, 1);
    const barW = (groupW * 0.7) / nSeries;
    const allVals = items.flatMap(r => cfg.yKeys.map(k => Number(r[k] ?? 0)));
    const maxV = Math.max(...allVals, 0.01);
    const groups = items.map((r, i) => {
      const bars = cfg.yKeys.map((k, ki) => {
        const v = Number(r[k] ?? 0);
        const h = (v / maxV) * PH;
        return {
          x: PAD.l + i * groupW + groupW * 0.15 + ki * barW,
          y: PAD.t + PH - h,
          w: barW - 1, h,
          color: colors[ki] ?? PALETTE[ki],
          value: v,
        };
      });
      return {
        bars,
        cx: PAD.l + i * groupW + groupW / 2,
        label: truncLabel(String(r[xKey] ?? i)),
        showLabel: showEvery(i, n),
      };
    });
    const fmt = cfg.formatY === 'currency' ? fmtMoney : fmtNum;
    const yLbls = Array.from({ length: 5 }, (_, i) => fmt(maxV * (4 - i) / 4));
    const legend = cfg.yKeys.map((k, i) => ({ label: cfg.yLabels?.[i] ?? k, color: colors[i] ?? PALETTE[i] }));
    return { type: 'grouped-bar', groups, yAxisLabels: yLbls, legend };
  }

  // ── Report actions ─────────────────────────────────────────────────────────
  reportsByGroup(group: string): ReportDef[] {
    return this.availableReports().filter(r => r.group === group);
  }
  lockedReportsByGroup(group: string): ReportDef[] {
    return this.lockedReports().filter(r => r.group === group);
  }

  readonly datePresets = [
    { label: 'Today',      unit: 'day'   },
    { label: 'This Week',  unit: 'week'  },
    { label: 'This Month', unit: 'month' },
    { label: 'Last Month', unit: 'lmonth'},
    { label: 'This Year',  unit: 'year'  },
  ];

  readonly comparePresets = [
    { label: 'Prev Month', unit: 'lmonth' },
    { label: 'Same Mo. Last Year', unit: 'lyear' },
  ];

  applyPreset(preset: { label: string; unit: string }): void {
    const [f, t] = this.resolvePresetRange(preset.unit, new Date());
    this.filterDateFrom = f; this.filterDateTo = t;
    this.runReport();
  }

  applyComparePreset(preset: { label: string; unit: string }): void {
    const ref = new Date(this.filterDateFrom);
    const [f, t] = this.resolvePresetRange(preset.unit, ref);
    this.compareDateFrom = f; this.compareDateTo = t;
  }

  private resolvePresetRange(unit: string, ref: Date): [string, string] {
    const iso = (d: Date) => d.toISOString().slice(0, 10);
    const now = ref;
    switch (unit) {
      case 'day':    return [iso(now), iso(now)];
      case 'week': {
        const mon = new Date(now); mon.setDate(now.getDate() - now.getDay() + 1);
        return [iso(mon), iso(now)];
      }
      case 'month':  return [iso(new Date(now.getFullYear(), now.getMonth(), 1)), iso(now)];
      case 'lmonth': return [
        iso(new Date(now.getFullYear(), now.getMonth() - 1, 1)),
        iso(new Date(now.getFullYear(), now.getMonth(), 0)),
      ];
      case 'lyear':  return [
        iso(new Date(now.getFullYear() - 1, now.getMonth(), 1)),
        iso(new Date(now.getFullYear() - 1, now.getMonth() + 1, 0)),
      ];
      case 'year':   return [iso(new Date(now.getFullYear(), 0, 1)), iso(now)];
      default:       return [iso(now), iso(now)];
    }
  }

  selectReport(r: ReportDef): void {
    if (!this.availableReports().some(a => a.key === r.key)) return;
    this.lockedReportKey.set(null);
    this.activeReportKey.set(r.key);
    this.reportData.set(null);
    this.compareData.set(null);
    this.hiddenCols.set(new Set());
    this.showColPicker.set(false);
    this.currentPage = 1;
    this.runReport();
  }

  selectLockedReport(r: ReportDef): void {
    this.activeReportKey.set(null);
    this.reportData.set(null);
    this.lockedReportKey.set(r.key);
  }

  clearReport(): void {
    this.activeReportKey.set(null);
    this.reportData.set(null);
    this.compareData.set(null);
    this.lockedReportKey.set(null);
  }

  runReport(page = 1): void {
    const report     = this.activeReport();
    const propertyId = this.activeProperty.propertyId();
    if (!report || !propertyId) return;

    this.loading.set(true);
    this.currentPage = page;
    const params = this.buildParams(report, propertyId, page, this.filterDateFrom, this.filterDateTo);

    if (this.compareMode() && report.params.includes('date_range')) {
      const cmpParams = this.buildParams(report, propertyId, page, this.compareDateFrom, this.compareDateTo);
      forkJoin({
        main: this.api.get(report.endpoint, params).pipe(catchError(() => of({ success: false }))),
        cmp:  this.api.get(report.endpoint, cmpParams).pipe(catchError(() => of({ success: false }))),
      }).subscribe({
        next: ({ main, cmp }: any) => {
          if (main?.success) this.reportData.set(main.data);
          else this.toast.error('Failed to load report');
          if (cmp?.success) this.compareData.set(cmp.data);
          this.loading.set(false);
        },
        error: () => { this.toast.error('Failed to load report'); this.loading.set(false); },
      });
    } else {
      this.api.get(report.endpoint, params).subscribe({
        next: (r: any) => {
          if (r?.success) this.reportData.set(r.data);
          else this.toast.error(r?.message ?? 'Failed to load report');
          this.loading.set(false);
        },
        error: () => { this.toast.error('Failed to load report'); this.loading.set(false); },
      });
    }
  }

  private buildParams(report: ReportDef, propertyId: string, page: number, dateFrom: string, dateTo: string) {
    const p: any = { property_id: propertyId, page, limit: 50 };
    if (report.params.includes('date'))       p.date      = this.filterDate;
    if (report.params.includes('date_range')) { p.date_from = dateFrom; p.date_to = dateTo; }
    if (report.params.includes('guest_id') && this.filterGuestId.trim()) p.guest_id = this.filterGuestId.trim();
    return p;
  }

  goPage(page: number): void { this.runReport(page); }

  // ── Column visibility ──────────────────────────────────────────────────────
  isColVisible(key: string): boolean { return !this.hiddenCols().has(key); }

  toggleCol(key: string): void {
    const s = new Set(this.hiddenCols());
    s.has(key) ? s.delete(key) : s.add(key);
    this.hiddenCols.set(s);
  }

  setAllCols(visible: boolean): void {
    if (visible) {
      this.hiddenCols.set(new Set());
    } else {
      const report = this.activeReport();
      if (!report) return;
      this.hiddenCols.set(new Set(report.columns.map(c => c.key)));
    }
  }

  // ── Export ─────────────────────────────────────────────────────────────────
  exportCsv(): void {
    const report     = this.activeReport();
    const propertyId = this.activeProperty.propertyId();
    const data       = this.reportData();
    if (!report || !data?.items) return;

    const cols = this.visibleColumns();
    const rows = data.items;

    // Build CSV from visible columns only
    const header = cols.map(c => `"${c.label}"`).join(',');
    const lines  = rows.map((row: any) =>
      cols.map(col => {
        const v = row[col.key];
        if (v === null || v === undefined) return '""';
        if (col.currency) return `"${fmtMoney(v)}"`;
        const s = String(v).replace(/"/g, '""');
        return `"${s}"`;
      }).join(',')
    );

    // Append summary if present
    const summaryLines: string[] = [];
    if (data.summary) {
      summaryLines.push('');
      summaryLines.push('"SUMMARY"');
      for (const [k, v] of Object.entries(data.summary)) {
        const label = k.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
        const val   = this.formatSummaryValue(k, v);
        summaryLines.push(`"${label}","${val}"`);
      }
    }

    const csv  = [header, ...lines, ...summaryLines].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a');
    a.href     = url;
    a.download = `${report.key}-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    this.toast.success(`Exported ${cols.length} columns · ${rows.length} rows`);
  }

  // ── Formatters ─────────────────────────────────────────────────────────────
  readonly fmtMoney = fmtMoney;
  readonly fmtNum   = fmtNum;

  statusClass(val: string): string { return statusClass(val); }

  formatStatus(val: string): string {
    return (val || '').replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
  }

  private formatSummaryValue(key: string, value: unknown): string {
    if (value === null || value === undefined) return '—';
    // Nested objects (e.g. { cash: { count, total } })
    if (typeof value === 'object' && !Array.isArray(value)) {
      const o = value as any;
      if ('total' in o) return fmtMoney(o.total);
      return JSON.stringify(value);
    }
    if (Array.isArray(value)) return String(value.length);
    const n = Number(value);
    if (!isNaN(n)) {
      if (looksLikeMoney(key, value)) return fmtMoney(n);
      if (key.includes('pct') || key.includes('percent') || key.includes('rate') && n < 200)
        return n.toFixed(1) + '%';
      return fmtNum(n);
    }
    return String(value);
  }

  startTour(): void { /* TourService integration */ }
}

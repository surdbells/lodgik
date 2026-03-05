import { Component, inject, OnInit, signal, computed } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { DatePipe, DecimalPipe } from '@angular/common';
import {
  ApiService,
  PageHeaderComponent,
  LoadingSpinnerComponent,
  ToastService,
  ActivePropertyService,
  FeatureService,
} from '@lodgik/shared';

// ─── Report definitions ───────────────────────────────────────────────────────

interface ReportDef {
  key: string;
  label: string;
  icon: string;
  group: string;
  endpoint: string;
  /** Column keys returned by the backend for this report */
  columns: { key: string; label: string; currency?: boolean; date?: boolean }[];
  /** Params this report uses — shown in the filter bar */
  params: ('date' | 'date_range' | 'guest_id')[];
  hasPage: boolean;
  featureKey: string;
  featureTier: string;
}

const REPORTS: ReportDef[] = [
  // ── Front Office ──
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
      { key: 'adults', label: 'Adults' },
      { key: 'total_amount', label: 'Amount', currency: true },
      { key: 'status', label: 'Status' },
    ],
    params: ['date'], hasPage: true,
    featureKey: 'basic_analytics',
    featureTier: 'All plans',
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
    featureKey: 'basic_analytics',
    featureTier: 'All plans',
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
      { key: 'nights_remaining', label: 'Nights Left' },
      { key: 'adults', label: 'Adults' },
      { key: 'outstanding_balance', label: 'Balance', currency: true },
    ],
    params: [], hasPage: true,
    featureKey: 'basic_analytics',
    featureTier: 'All plans',
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
    featureKey: 'basic_analytics',
    featureTier: 'All plans',
  },
  // ── Room ──
  {
    key: 'room-status', label: 'Room Status', icon: '🛏️', group: 'Rooms',
    endpoint: '/reports/room-status',
    columns: [
      { key: 'room_number', label: 'Room' },
      { key: 'floor', label: 'Floor' },
      { key: 'room_type', label: 'Type' },
      { key: 'status', label: 'Status' },
      { key: 'base_rate', label: 'Rate', currency: true },
      { key: 'notes', label: 'Notes' },
    ],
    params: [], hasPage: false,
    featureKey: 'basic_analytics',
    featureTier: 'All plans',
  },
  {
    key: 'room-availability', label: 'Room Availability', icon: '✅', group: 'Rooms',
    endpoint: '/reports/room-availability',
    columns: [
      { key: 'room_number', label: 'Room' },
      { key: 'floor', label: 'Floor' },
      { key: 'room_type', label: 'Type' },
      { key: 'status', label: 'Status' },
      { key: 'rate_per_night', label: 'Rate/Night', currency: true },
      { key: 'max_occupancy', label: 'Max Occ.' },
    ],
    params: ['date_range'], hasPage: false,
    featureKey: 'basic_analytics',
    featureTier: 'All plans',
  },
  {
    key: 'occupancy', label: 'Occupancy Report', icon: '📊', group: 'Rooms',
    endpoint: '/reports/occupancy',
    columns: [
      { key: 'date', label: 'Date', date: true },
      { key: 'occupied_rooms', label: 'Occupied' },
      { key: 'total_rooms', label: 'Total Rooms' },
      { key: 'occupancy_pct', label: 'Occupancy %' },
      { key: 'revenue', label: 'Revenue', currency: true },
      { key: 'adr', label: 'ADR', currency: true },
      { key: 'revpar', label: 'RevPAR', currency: true },
    ],
    params: ['date_range'], hasPage: false,
    featureKey: 'advanced_analytics',
    featureTier: 'Business+',
  },
  // ── Financial ──
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
    featureKey: 'advanced_analytics',
    featureTier: 'Business+',
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
    featureKey: 'advanced_analytics',
    featureTier: 'Business+',
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
    featureKey: 'advanced_analytics',
    featureTier: 'Business+',
  },
  // ── Housekeeping ──
  {
    key: 'housekeeping-status', label: 'Housekeeping Status', icon: '🧹', group: 'Housekeeping',
    endpoint: '/reports/housekeeping-status',
    columns: [
      { key: 'room_number', label: 'Room' },
      { key: 'floor', label: 'Floor' },
      { key: 'task_type', label: 'Task' },
      { key: 'status', label: 'Status' },
      { key: 'priority', label: 'Priority' },
      { key: 'assigned_to_name', label: 'Assigned To' },
      { key: 'started_at', label: 'Started', date: true },
      { key: 'completed_at', label: 'Completed', date: true },
      { key: 'notes', label: 'Notes' },
    ],
    params: ['date'], hasPage: false,
    featureKey: 'custom_reports',
    featureTier: 'Enterprise',
  },
  // ── Guest ──
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
      { key: 'adults', label: 'Adults' },
      { key: 'total_amount', label: 'Amount', currency: true },
      { key: 'balance', label: 'Balance', currency: true },
      { key: 'source', label: 'Source' },
      { key: 'status', label: 'Status' },
    ],
    params: ['date_range', 'guest_id'], hasPage: true,
    featureKey: 'custom_reports',
    featureTier: 'Enterprise',
  },
  // ── Cancellations & Walk-ins ──
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
    featureKey: 'custom_reports',
    featureTier: 'Enterprise',
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
      { key: 'adults', label: 'Adults' },
      { key: 'total_amount', label: 'Amount', currency: true },
      { key: 'status', label: 'Status' },
    ],
    params: ['date_range'], hasPage: true,
    featureKey: 'custom_reports',
    featureTier: 'Enterprise',
  },
  // ── Financial (additional) ──
  {
    key: 'revenue-by-room-type', label: 'Revenue by Room Type', icon: '🏷️', group: 'Financial',
    endpoint: '/reports/revenue-by-room-type',
    columns: [
      { key: 'room_type', label: 'Room Type' },
      { key: 'bookings_count', label: 'Bookings' },
      { key: 'room_revenue', label: 'Room Revenue', currency: true },
      { key: 'ancillary_revenue', label: 'Ancillary', currency: true },
      { key: 'total_revenue', label: 'Total Revenue', currency: true },
      { key: 'revenue_pct', label: '% of Total' },
    ],
    params: ['date_range'], hasPage: false,
    featureKey: 'advanced_analytics',
    featureTier: 'Business+',
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
    featureKey: 'custom_reports',
    featureTier: 'Enterprise',
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
      { key: 'bookings_count', label: 'Bookings' },
    ],
    params: ['date_range'], hasPage: false,
    featureKey: 'advanced_analytics',
    featureTier: 'Business+',
  },
  // ── Management ──
  {
    key: 'daily-manager', label: "Daily Manager's Report", icon: '📋', group: 'Management',
    endpoint: '/reports/daily-manager',
    columns: [
      { key: 'section', label: 'Section' },
      { key: 'metric', label: 'Metric' },
      { key: 'value', label: 'Value' },
    ],
    params: ['date'], hasPage: false,
    featureKey: 'advanced_analytics',
    featureTier: 'Business+',
  },
  // ── POS ──
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
      { key: 'item_count', label: 'Items' },
      { key: 'total_naira', label: 'Total', currency: true },
      { key: 'payment_method', label: 'Payment' },
      { key: 'served_by_name', label: 'Served By' },
    ],
    params: ['date_range'], hasPage: true,
    featureKey: 'custom_reports',
    featureTier: 'Enterprise',
  },
];

const GROUPS = ['Front Office', 'Rooms', 'Financial', 'Housekeeping', 'Guest', 'Bookings', 'Management', 'POS'];

// ─── Status badge styles ───────────────────────────────────────────────────────

function statusClass(val: string): string {
  const v = (val || '').toLowerCase();
  if (['checked_in', 'occupied', 'confirmed', 'completed', 'inspected', 'active'].some(s => v.includes(s)))
    return 'bg-emerald-50 text-emerald-700';
  if (['checked_out', 'vacant_clean'].some(s => v.includes(s)))
    return 'bg-gray-100 text-gray-600';
  if (['pending', 'reserved', 'vacant_dirty', 'assigned', 'in_progress', 'needs_rework'].some(s => v.includes(s)))
    return 'bg-amber-50 text-amber-700';
  if (['no_show', 'cancelled', 'out_of_order', 'maintenance', 'void'].some(s => v.includes(s)))
    return 'bg-red-50 text-red-700';
  return 'bg-gray-100 text-gray-600';
}

@Component({
  selector: 'app-reports',
  standalone: true,
  imports: [FormsModule, DatePipe, DecimalPipe, RouterLink, PageHeaderComponent, LoadingSpinnerComponent],
  template: `
    <ui-page-header
      title="Reports"
      subtitle="Operational and financial reports for your property"
      [breadcrumbs]="['Reports']">
      @if (activeReport()) {
        <button (click)="exportCsv()"
          class="px-4 py-2 bg-sage-600 text-white text-sm font-medium rounded-xl hover:bg-sage-700 flex items-center gap-2">
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 10v6m0 0l-3-3m3 3l3-3M3 17V7a2 2 0 012-2h6l2 2h6a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2z"/>
          </svg>
          Export CSV
        </button>
      }
    </ui-page-header>

    <div class="flex gap-5">
      <!-- Sidebar -->
      <aside class="w-56 flex-shrink-0">
        @for (group of groups(); track group) {
          <div class="mb-4">
            <p class="text-[11px] font-semibold uppercase tracking-widest text-gray-400 px-3 mb-1">{{ group }}</p>
            @for (r of reportsByGroup(group); track r.key) {
              <button
                (click)="selectReport(r)"
                class="w-full text-left px-3 py-2 rounded-lg text-sm transition-colors flex items-center gap-2"
                [class]="activeReport()?.key === r.key
                  ? 'bg-sage-50 text-sage-700 font-medium border border-sage-100'
                  : 'text-gray-600 hover:bg-gray-50'">
                <span class="text-base leading-none">{{ r.icon }}</span>
                {{ r.label }}
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

      <!-- Main area -->
      <div class="flex-1 min-w-0">
        <!-- Landing: report cards -->
        @if (!activeReport()) {
          <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            @for (r of availableReports(); track r.key) {
              <button
                (click)="selectReport(r)"
                class="bg-white rounded-xl border border-gray-100 shadow-card p-5 text-left hover:border-sage-200 hover:shadow-md transition-all group">
                <div class="text-3xl mb-3">{{ r.icon }}</div>
                <p class="text-sm font-semibold text-gray-800 group-hover:text-sage-700">{{ r.label }}</p>
                <p class="text-xs text-gray-400 mt-0.5">{{ r.group }}</p>
              </button>
            }
            @for (r of lockedReports(); track r.key) {
              <div class="bg-gray-50 rounded-xl border border-dashed border-gray-200 p-5 text-left opacity-60 cursor-not-allowed">
                <div class="text-3xl mb-3 grayscale">🔒</div>
                <p class="text-sm font-semibold text-gray-500">{{ r.label }}</p>
                <p class="text-xs text-gray-400 mt-0.5">{{ r.group }}</p>
                <span class="inline-block mt-2 text-[10px] font-medium bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full">Requires {{ r.featureTier }}</span>
              </div>
            }
          </div>
        }

        <!-- Upgrade prompt for locked reports -->
        @if (lockedReportKey(); as lockedKey) {
          @if (!activeReport()) {
            @if (lockedReportDef(); as locked) {
              <div class="bg-white rounded-2xl border border-amber-200 shadow-card p-8 text-center max-w-md mx-auto mt-8">
                <div class="text-5xl mb-4">🔒</div>
                <h3 class="text-lg font-bold text-gray-900 mb-2">{{ locked.icon }} {{ locked.label }}</h3>
                <p class="text-sm text-gray-500 mb-1">This report requires the <strong class="text-amber-700">{{ locked.featureTier }}</strong> plan.</p>
                <p class="text-xs text-gray-400 mb-6">Upgrade your plan to unlock this and all other {{ locked.featureTier }} reports.</p>
                <div class="bg-amber-50 border border-amber-100 rounded-xl p-4 mb-6 text-left">
                  <p class="text-xs font-semibold text-amber-800 mb-2">This report includes:</p>
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

        <!-- Report viewer -->
        @if (activeReport(); as report) {
          <!-- Header row -->
          <div class="flex items-center gap-3 mb-4">
            <button (click)="activeReportKey.set(null)"
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
          <div class="bg-white rounded-xl border border-gray-100 p-4 shadow-card mb-4">
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
              <!-- Quick presets -->
              @if (report.params.includes('date_range')) {
                <div class="flex gap-1 self-end">
                  @for (preset of datePresets; track preset.label) {
                    <button (click)="applyPreset(preset)"
                      class="px-2.5 py-2 border border-gray-200 rounded-lg text-xs text-gray-600 hover:bg-gray-50 hover:border-sage-200 transition-colors whitespace-nowrap">
                      {{ preset.label }}
                    </button>
                  }
                </div>
              }
              <button (click)="runReport()"
                [disabled]="loading()"
                class="px-4 py-2 bg-sage-600 text-white text-sm rounded-lg hover:bg-sage-700 disabled:opacity-50 self-end">
                Run Report
              </button>
            </div>
          </div>

          <ui-loading [loading]="loading()"></ui-loading>

          @if (!loading() && reportData()) {
            <!-- Summary cards -->
            @if (summaryEntries().length) {
              <div class="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
                @for (entry of summaryEntries(); track entry.key) {
                  <div class="bg-white rounded-xl border border-gray-100 p-4 shadow-card">
                    <p class="text-xs text-gray-400 capitalize">{{ entry.label }}</p>
                    <p class="text-xl font-bold text-gray-900 mt-1 truncate">{{ entry.value }}</p>
                  </div>
                }
              </div>
            }

            <!-- Table -->
            <div class="bg-white rounded-xl border border-gray-100 shadow-card overflow-hidden">
              <div class="overflow-x-auto">
                <table class="w-full text-sm">
                  <thead class="bg-gray-50 text-gray-500 text-xs uppercase tracking-wide">
                    <tr>
                      @for (col of report.columns; track col.key) {
                        <th class="px-4 py-3 text-left whitespace-nowrap">{{ col.label }}</th>
                      }
                    </tr>
                  </thead>
                  <tbody class="divide-y divide-gray-50">
                    @for (row of reportData()!.items; track $index) {
                      <tr class="hover:bg-gray-50 transition-colors">
                        @for (col of report.columns; track col.key) {
                          <td class="px-4 py-3 whitespace-nowrap">
                            @if (col.currency) {
                              <span class="text-gray-800 font-medium">
                                ₦{{ row[col.key] | number:'1.2-2' }}
                              </span>
                            } @else if (col.date && row[col.key]) {
                              <span class="text-gray-600 text-xs">
                                {{ row[col.key] | date:'MMM d, y' }}
                              </span>
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
                        <td [attr.colspan]="report.columns.length"
                            class="px-4 py-12 text-center text-gray-400 text-sm">
                          No records found for the selected criteria.
                        </td>
                      </tr>
                    }
                  </tbody>
                </table>
              </div>

              <!-- Pagination -->
              @if (report.hasPage && reportData()!.meta.pages > 1) {
                <div class="flex items-center justify-between px-4 py-3 border-t border-gray-100">
                  <span class="text-xs text-gray-400">
                    Page {{ reportData()!.meta.page }} of {{ reportData()!.meta.pages }}
                    · {{ reportData()!.meta.total }} records
                  </span>
                  <div class="flex gap-1">
                    <button (click)="goPage(reportData()!.meta.page - 1)"
                            [disabled]="reportData()!.meta.page <= 1"
                            class="px-3 py-1 text-xs border rounded-lg disabled:opacity-40 hover:bg-gray-50">
                      Prev
                    </button>
                    <button (click)="goPage(reportData()!.meta.page + 1)"
                            [disabled]="reportData()!.meta.page >= reportData()!.meta.pages"
                            class="px-3 py-1 text-xs border rounded-lg disabled:opacity-40 hover:bg-gray-50">
                      Next
                    </button>
                  </div>
                </div>
              }
            </div>

            <!-- Generated at -->
            <p class="text-[11px] text-gray-300 mt-3 text-right">
              Generated {{ reportData()!.generated_at | date:'MMM d, y HH:mm' }}
            </p>
          }
        }
      </div>
    </div>
  `,
})
export class ReportsPage implements OnInit {
  private api            = inject(ApiService);
  private toast          = inject(ToastService);
  private activeProperty = inject(ActivePropertyService);
  private featureService = inject(FeatureService);

  /** Reports the current tenant is allowed to access based on their plan. */
  readonly availableReports = computed(() => {
    const enabled = this.featureService.enabledModules();
    return REPORTS.filter(r => enabled.includes(r.featureKey));
  });

  /** Reports locked for the current tenant, grouped for the upgrade UI. */
  readonly lockedReports = computed(() => {
    const enabled = this.featureService.enabledModules();
    return REPORTS.filter(r => !enabled.includes(r.featureKey));
  });


  readonly groups = computed(() =>
    GROUPS.filter(g =>
      REPORTS.some(r => r.group === g)
    )
  );
  readonly allReports = REPORTS;

  loading         = signal(false);
  activeReportKey = signal<string | null>(null);
  lockedReportKey = signal<string | null>(null);
  reportData      = signal<any | null>(null);

  // Filter state
  filterDate     = new Date().toISOString().slice(0, 10);
  filterDateFrom = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().slice(0, 10);
  filterDateTo   = new Date().toISOString().slice(0, 10);
  filterGuestId  = '';
  currentPage    = 1;

  // propertyId is always read live: this.activeProperty.propertyId()

  activeReport = computed(() =>
    REPORTS.find(r => r.key === this.activeReportKey()) ?? null,
  );

  lockedReportDef = computed(() =>
    REPORTS.find(r => r.key === this.lockedReportKey()) ?? null,
  );

  summaryEntries = computed((): { key: string; label: string; value: string }[] => {
    const data = this.reportData();
    if (!data?.summary) return [];

    // Keys to skip — these are just date range labels shown in the filter bar already
    const skip = new Set(['period_from', 'period_to', 'date']);

    return Object.entries(data.summary)
      .filter(([k, v]) => !skip.has(k) && v !== null && v !== undefined)
      .map(([k, v]) => ({
        key: k,
        label: k.replace(/_/g, ' '),
        value: this.formatSummaryValue(k, v),
      }));
  });

  ngOnInit(): void {
    // propertyId is always read live from activeProperty signal
  }

  reportsByGroup(group: string): ReportDef[] {
    return this.availableReports().filter(r => r.group === group);
  }

  lockedReportsByGroup(group: string): ReportDef[] {
    return this.lockedReports().filter(r => r.group === group);
  }

  readonly datePresets = [
    { label: 'Today',       days: 0,  unit: 'day'   },
    { label: 'This Week',   days: 7,  unit: 'week'  },
    { label: 'This Month',  days: 30, unit: 'month' },
    { label: 'Last Month',  days: 60, unit: 'lmonth'},
    { label: 'This Year',   days: 365,unit: 'year'  },
  ];

  applyPreset(preset: { label: string; days: number; unit: string }): void {
    const now   = new Date();
    const today = now.toISOString().slice(0, 10);
    if (preset.unit === 'day') {
      this.filterDateFrom = today;
      this.filterDateTo   = today;
    } else if (preset.unit === 'week') {
      const mon = new Date(now); mon.setDate(now.getDate() - now.getDay() + 1);
      this.filterDateFrom = mon.toISOString().slice(0, 10);
      this.filterDateTo   = today;
    } else if (preset.unit === 'month') {
      this.filterDateFrom = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().slice(0, 10);
      this.filterDateTo   = today;
    } else if (preset.unit === 'lmonth') {
      const lm = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      const le = new Date(now.getFullYear(), now.getMonth(), 0);
      this.filterDateFrom = lm.toISOString().slice(0, 10);
      this.filterDateTo   = le.toISOString().slice(0, 10);
    } else if (preset.unit === 'year') {
      this.filterDateFrom = new Date(now.getFullYear(), 0, 1).toISOString().slice(0, 10);
      this.filterDateTo   = today;
    }
    this.runReport();
  }

  selectReport(r: ReportDef): void {
    if (!this.availableReports().some(a => a.key === r.key)) return; // guard: locked
    this.lockedReportKey.set(null);
    this.activeReportKey.set(r.key);
    this.reportData.set(null);
    this.currentPage = 1;
    this.runReport();
  }

  selectLockedReport(r: ReportDef): void {
    this.activeReportKey.set(null);
    this.reportData.set(null);
    this.lockedReportKey.set(r.key);
  }

  runReport(page = 1): void {
    const report = this.activeReport();
    const propertyId = this.activeProperty.propertyId();
    if (!report || !propertyId) return;

    this.loading.set(true);
    this.currentPage = page;

    const params: any = { property_id: propertyId, page, limit: 50 };

    if (report.params.includes('date'))        params.date      = this.filterDate;
    if (report.params.includes('date_range')) {
      params.date_from = this.filterDateFrom;
      params.date_to   = this.filterDateTo;
    }
    if (report.params.includes('guest_id') && this.filterGuestId.trim()) {
      params.guest_id = this.filterGuestId.trim();
    }

    this.api.get(report.endpoint, params).subscribe({
      next: (r: any) => {
        if (r?.success) {
          this.reportData.set(r.data);
        } else {
          this.toast.error(r?.message ?? 'Failed to load report');
        }
        this.loading.set(false);
      },
      error: () => {
        this.toast.error('Failed to load report');
        this.loading.set(false);
      },
    });
  }

  goPage(page: number): void {
    this.runReport(page);
  }

  exportCsv(): void {
    const report = this.activeReport();
    const propertyId = this.activeProperty.propertyId();
    if (!report || !propertyId) return;

    const params: any = { property_id: propertyId, format: 'csv' };
    if (report.params.includes('date'))        params.date      = this.filterDate;
    if (report.params.includes('date_range')) {
      params.date_from = this.filterDateFrom;
      params.date_to   = this.filterDateTo;
    }
    if (report.params.includes('guest_id') && this.filterGuestId.trim()) {
      params.guest_id = this.filterGuestId.trim();
    }

    const qs    = new URLSearchParams(params).toString();
    const token = localStorage.getItem('lodgik_access_token');

    fetch(`/api/reports/${report.key}?${qs}`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then(r => r.blob())
      .then(blob => {
        const url = URL.createObjectURL(blob);
        const a   = document.createElement('a');
        a.href     = url;
        a.download = `${report.key}-${new Date().toISOString().slice(0, 10)}.csv`;
        a.click();
        URL.revokeObjectURL(url);
        this.toast.success('CSV exported');
      })
      .catch(() => this.toast.error('Export failed'));
  }

  statusClass(val: string): string { return statusClass(val); }

  formatStatus(val: string): string {
    return (val || '').replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
  }

  private formatSummaryValue(key: string, value: unknown): string {
    if (value === null || value === undefined) return '—';
    const str = String(value);
    // Currency fields
    if (['total_revenue', 'total_payments', 'total_charges', 'total_outstanding',
         'lost_revenue', 'grand_total', 'room_revenue', 'bar_revenue',
         'restaurant_revenue', 'service_revenue', 'laundry_revenue',
         'avg_adr', 'avg_revpar'].includes(key)) {
      return '₦' + Number(str).toLocaleString('en-NG', { minimumFractionDigits: 2 });
    }
    // Percentage fields
    if (key.includes('pct') || key.includes('percent')) {
      return str + '%';
    }
    // Nested objects (e.g. cash: { count, total })
    if (typeof value === 'object' && value !== null) {
      const o = value as any;
      if ('total' in o) return '₦' + Number(o.total).toLocaleString('en-NG', { minimumFractionDigits: 2 });
      return JSON.stringify(value);
    }
    return str;
  }
}

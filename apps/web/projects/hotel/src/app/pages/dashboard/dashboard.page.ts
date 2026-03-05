import { Component, inject, OnInit, OnDestroy, signal, computed } from '@angular/core';
import { toObservable } from '@angular/core/rxjs-interop';
import { Subscription } from 'rxjs';
import { RouterLink } from '@angular/router';
import { NgTemplateOutlet } from '@angular/common';
import { DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import {
  ApiService,
  PageHeaderComponent,
  StatsCardComponent,
  LoadingSpinnerComponent,
  TokenService,
  LODGIK_ICONS,
  ActivePropertyService,
  FeatureService,
} from '@lodgik/shared';
import { LucideAngularModule, LUCIDE_ICONS, LucideIconProvider } from 'lucide-angular';
import {
  LineChartComponent,
  BarChartComponent,
  DonutChartComponent,
  GaugeChartComponent,
  SparklineChartComponent,
  ChartDataPoint,
  ChartSeries,
} from '@lodgik/charts';
import { AuthService } from '@lodgik/shared';
import { forkJoin, of } from 'rxjs';
import { catchError } from 'rxjs/operators';

// ─── Tab definitions ──────────────────────────────────────────────────────────

type DashTab = 'overview' | 'operations' | 'analytics' | 'finance';

interface Tab {
  id: DashTab;
  label: string;
  icon: string;
  featureKey: string;       // feature module required
  featureTier: string;      // human-readable tier label shown in lock screen
}

const TABS: Tab[] = [
  { id: 'overview',    label: 'Overview',    icon: 'layout-dashboard', featureKey: 'basic_analytics',    featureTier: 'All Plans'  },
  { id: 'operations',  label: 'Operations',  icon: 'activity',          featureKey: 'basic_analytics',    featureTier: 'All Plans'  },
  { id: 'analytics',   label: 'Analytics',   icon: 'bar-chart-2',       featureKey: 'advanced_analytics', featureTier: 'Business+'  },
  { id: 'finance',     label: 'Finance',     icon: 'circle-dollar-sign',featureKey: 'advanced_analytics', featureTier: 'Business+'  },
];

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [
    RouterLink, DatePipe, FormsModule, NgTemplateOutlet,
    PageHeaderComponent, StatsCardComponent, LoadingSpinnerComponent,
    LineChartComponent, BarChartComponent, DonutChartComponent,
    GaugeChartComponent, SparklineChartComponent,
    LucideAngularModule,
  ],
  providers: [{ provide: LUCIDE_ICONS, multi: true, useValue: new LucideIconProvider(LODGIK_ICONS) }],
  template: `
    <div class="fade-in">
      <ui-page-header title="Dashboard" [subtitle]="greeting()">
        <div class="flex items-center gap-3">
          @if (isMultiProperty()) {
            <div class="flex items-center bg-gray-100 rounded-lg p-0.5">
              <button (click)="setScope('single')"
                class="px-3 py-1.5 text-xs font-medium rounded-md transition-all"
                [class.bg-white]="scope() === 'single'" [class.shadow-sm]="scope() === 'single'"
                [class.text-gray-900]="scope() === 'single'" [class.text-gray-500]="scope() !== 'single'">
                {{ currentPropertyName() }}
              </button>
              <button (click)="setScope('all')"
                class="px-3 py-1.5 text-xs font-medium rounded-md transition-all"
                [class.bg-white]="scope() === 'all'" [class.shadow-sm]="scope() === 'all'"
                [class.text-gray-900]="scope() === 'all'" [class.text-gray-500]="scope() !== 'all'">
                All Properties
              </button>
            </div>
          }
          <a routerLink="/bookings/new"
            class="px-4 py-2.5 bg-sage-600 text-white text-sm font-semibold rounded-lg hover:bg-sage-700 transition-colors shadow-sm">
            + New Booking
          </a>
        </div>
      </ui-page-header>

      <!-- Tab bar -->
      <div class="flex gap-1 bg-gray-100 rounded-xl p-1 mb-5 w-fit">
        @for (tab of tabs; track tab.id) {
          <button
            (click)="setTab(tab.id)"
            class="flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium transition-all"
            [class]="activeTab() === tab.id
              ? 'bg-white shadow-sm text-gray-900'
              : !isTabEnabled(tab) ? 'text-gray-300 cursor-not-allowed' : 'text-gray-500 hover:text-gray-700'"
            [disabled]="false">
            <lucide-icon [name]="tab.icon" [size]="14" [strokeWidth]="2"></lucide-icon>
            {{ tab.label }}
            @if (!isTabEnabled(tab)) {
              <span class="text-[9px] bg-amber-100 text-amber-600 px-1 py-0.5 rounded font-semibold">
                {{ tab.featureTier }}
              </span>
            }
          </button>
        }
      </div>

      <ui-loading [loading]="loading()"></ui-loading>

      <!-- ═══════════════════════════════════════════════════════
           TAB: OVERVIEW  (basic_analytics — all plans)
           ═══════════════════════════════════════════════════════ -->
      @if (activeTab() === 'overview' && !loading()) {

        @if (!isTabEnabled(tabs[0])) {
          <ng-container *ngTemplateOutlet="upgradeCta; context: { tab: tabs[0] }"></ng-container>
        } @else {

          <!-- KPI Cards -->
          <div class="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6 stagger-children">
            <ui-stats-card
              [label]="scope() === 'all' ? 'Pending (All)' : 'Pending Bookings'"
              [value]="kpi().pending_bookings || '0'" icon="hotel" variant="gradient"
              gradient="linear-gradient(135deg, #293929 0%, #3a543a 50%, #5a825a 100%)">
            </ui-stats-card>
            <ui-stats-card label="Check-ins Today" [value]="(kpi().today_check_ins || 0) + ''"
              icon="door-open" variant="gradient"
              gradient="linear-gradient(135deg, #3a543a 0%, #5a825a 50%, #7a9e7a 100%)">
              <p class="text-xs text-white/50 mt-1">+ {{ kpi().pending_check_ins || 0 }} pending</p>
            </ui-stats-card>
            <ui-stats-card label="Check-outs Today" [value]="(kpi().today_check_outs || 0) + ''"
              icon="log-out" variant="gradient"
              gradient="linear-gradient(135deg, #5a825a 0%, #7a9e7a 50%, #a3bfa3 100%)">
            </ui-stats-card>
            <ui-stats-card label="Today Revenue"
              [value]="'₦' + (+kpi().today_revenue || 0).toLocaleString()"
              icon="hand-coins" variant="gradient"
              gradient="linear-gradient(135deg, #466846 0%, #5a825a 100%)">
            </ui-stats-card>
          </div>

          <!-- Room status donut + occupancy gauge -->
          <div class="grid grid-cols-1 lg:grid-cols-3 gap-5 mb-5">
            <div class="bg-white rounded-xl border border-gray-100 p-5 shadow-card">
              <h3 class="text-sm font-semibold text-gray-800 mb-1">Occupancy Rate</h3>
              <p class="text-xs text-gray-400 mb-3">Live · {{ kpi().rooms?.occupied || kpi().occupied_rooms || 0 }}
                of {{ kpi().rooms?.total || kpi().total_rooms || 0 }} rooms</p>
              <chart-gauge
                [value]="occupancyPct()"
                [min]="0" [max]="100"
                label="Occupied"
                [height]="160">
              </chart-gauge>
            </div>
            <div class="bg-white rounded-xl border border-gray-100 p-5 shadow-card lg:col-span-2">
              <h3 class="text-sm font-semibold text-gray-800 mb-1">Room Status</h3>
              <p class="text-xs text-gray-400 mb-3">Current distribution</p>
              <chart-donut
                [data]="roomStatusData()"
                [height]="180"
                [showLegend]="true">
              </chart-donut>
            </div>
          </div>

          <!-- Property comparison (all-properties view only) -->
          @if (scope() === 'all' && propertyComparison().length > 1) {
            <div class="bg-white rounded-xl border border-gray-100 p-5 shadow-card mb-5">
              <h3 class="text-base font-bold text-gray-900 font-heading mb-4">Property Comparison</h3>
              <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                @for (p of propertyComparison(); track p.property_id) {
                  <div class="border border-gray-100 rounded-xl p-4 hover:border-sage-200 transition-colors">
                    <div class="flex items-center gap-2 mb-3">
                      <span class="w-8 h-8 rounded-lg bg-sage-100 flex items-center justify-center text-sage-700 text-xs font-bold">
                        {{ p.property_name?.charAt(0) }}
                      </span>
                      <div>
                        <h4 class="text-sm font-semibold text-gray-900">{{ p.property_name }}</h4>
                        @if (p.city) { <p class="text-[11px] text-gray-400">{{ p.city }}</p> }
                      </div>
                    </div>
                    <div class="grid grid-cols-2 gap-2 text-center">
                      <div class="bg-gray-50 rounded-lg p-2">
                        <p class="text-xs text-gray-400">Occupancy</p>
                        <p class="text-sm font-bold text-gray-900">{{ p.occupancy_rate }}%</p>
                      </div>
                      <div class="bg-gray-50 rounded-lg p-2">
                        <p class="text-xs text-gray-400">Revenue</p>
                        <p class="text-sm font-bold text-gray-900">₦{{ (+p.revenue || 0).toLocaleString() }}</p>
                      </div>
                    </div>
                  </div>
                }
              </div>
            </div>
          }

          <!-- Activity feed + quick actions -->
          <div class="grid grid-cols-1 lg:grid-cols-3 gap-5">
            <div class="bg-white rounded-xl border border-gray-100 p-5 shadow-card lg:col-span-2">
              <h3 class="text-base font-bold text-gray-900 font-heading mb-4">Recent Activity</h3>
              @if (activity().length) {
                <div class="space-y-2">
                  @for (item of activity(); track item.booking_ref + item.timestamp) {
                    <div class="flex items-start gap-3 p-2.5 rounded-lg hover:bg-gray-50 transition-colors">
                      <span class="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 text-sm"
                        [class]="activityBg(item.new_status)">
                        <lucide-icon [name]="activityIcon(item.new_status)" [size]="14"></lucide-icon>
                      </span>
                      <div class="flex-1 min-w-0">
                        <p class="text-sm text-gray-700">
                          <span class="font-medium">{{ item.action_label }}</span>
                          @if (item.booking_ref) { · <span class="text-gray-400 font-mono text-xs">{{ item.booking_ref }}</span> }
                        </p>
                        <p class="text-xs text-gray-400">{{ item.timestamp | date:'MMM d, HH:mm' }}</p>
                      </div>
                    </div>
                  }
                </div>
              } @else {
                <p class="text-sm text-gray-400 py-6 text-center">No recent activity.</p>
              }
            </div>
            <div class="bg-white rounded-xl border border-gray-100 p-5 shadow-card">
              <h3 class="text-base font-bold text-gray-900 font-heading mb-4">Quick Actions</h3>
              <div class="grid grid-cols-2 gap-2">
                @for (qa of quickActions; track qa.route) {
                  <a [routerLink]="qa.route"
                    class="flex flex-col items-center gap-2 p-3 rounded-xl border border-gray-100 hover:border-sage-200 hover:bg-sage-50 transition-all group text-center">
                    <span class="w-9 h-9 rounded-lg flex items-center justify-center group-hover:scale-110 transition-transform"
                      [class]="qa.bgClass">
                      <lucide-icon [name]="qa.icon" [size]="18" [strokeWidth]="1.75"></lucide-icon>
                    </span>
                    <p class="text-xs font-medium text-gray-700 leading-tight">{{ qa.label }}</p>
                  </a>
                }
              </div>
            </div>
          </div>

        }
      }

      <!-- ═══════════════════════════════════════════════════════
           TAB: OPERATIONS  (basic_analytics — all plans)
           ═══════════════════════════════════════════════════════ -->
      @if (activeTab() === 'operations' && !loading()) {

        @if (!isTabEnabled(tabs[1])) {
          <ng-container *ngTemplateOutlet="upgradeCta; context: { tab: tabs[1] }"></ng-container>
        } @else {

          <!-- Housekeeping summary -->
          <div class="mb-5">
            <div class="flex items-center justify-between mb-3">
              <h3 class="text-base font-bold text-gray-900">🧹 Housekeeping</h3>
              <a routerLink="/housekeeping" class="text-xs text-sage-600 hover:text-sage-700 font-medium">View all →</a>
            </div>
            @if (loadingOps()) {
              <ui-loading [loading]="true"></ui-loading>
            } @else if (hkSummary()) {
              <div class="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
                <div class="bg-white rounded-xl border border-gray-100 shadow-card p-4 text-center">
                  <p class="text-2xl font-black text-gray-900">{{ hkSummary()!.rooms.dirty }}</p>
                  <p class="text-xs text-gray-400 mt-0.5">Dirty Rooms</p>
                  <div class="w-full bg-gray-100 rounded-full h-1 mt-2">
                    <div class="bg-amber-400 h-1 rounded-full"
                      [style.width.%]="hkSummary()!.rooms.total > 0 ? (hkSummary()!.rooms.dirty / hkSummary()!.rooms.total * 100) : 0">
                    </div>
                  </div>
                </div>
                <div class="bg-white rounded-xl border border-gray-100 shadow-card p-4 text-center">
                  <p class="text-2xl font-black text-emerald-600">{{ hkSummary()!.tasks_today.pending }}</p>
                  <p class="text-xs text-gray-400 mt-0.5">Tasks Pending</p>
                </div>
                <div class="bg-white rounded-xl border border-gray-100 shadow-card p-4 text-center">
                  <p class="text-2xl font-black text-blue-600">{{ hkSummary()!.tasks_today.in_progress }}</p>
                  <p class="text-xs text-gray-400 mt-0.5">In Progress</p>
                </div>
                <div class="bg-white rounded-xl border border-gray-100 shadow-card p-4 text-center">
                  <p class="text-2xl font-black text-gray-900">{{ hkSummary()!.tasks_today.completion_rate }}%</p>
                  <p class="text-xs text-gray-400 mt-0.5">Completion Rate</p>
                  <div class="w-full bg-gray-100 rounded-full h-1 mt-2">
                    <div class="h-1 rounded-full transition-all"
                      [class]="hkSummary()!.tasks_today.completion_rate >= 80 ? 'bg-emerald-400' : hkSummary()!.tasks_today.completion_rate >= 50 ? 'bg-amber-400' : 'bg-red-400'"
                      [style.width.%]="hkSummary()!.tasks_today.completion_rate">
                    </div>
                  </div>
                </div>
              </div>

              <!-- Task breakdown bar -->
              @if (hkSummary()!.tasks_today.total > 0) {
                <div class="bg-white rounded-xl border border-gray-100 shadow-card p-4">
                  <div class="flex items-center justify-between mb-2">
                    <p class="text-xs font-medium text-gray-600">Today's Tasks
                      <span class="text-gray-400 font-normal ml-1">({{ hkSummary()!.tasks_today.total }} total)</span>
                    </p>
                    <p class="text-xs text-gray-400">
                      {{ hkSummary()!.tasks_today.completed }}/{{ hkSummary()!.tasks_today.total }} done
                    </p>
                  </div>
                  <div class="flex h-3 rounded-full overflow-hidden bg-gray-100 gap-px">
                    @if (hkSummary()!.tasks_today.completed > 0) {
                      <div class="bg-emerald-400"
                        [style.flex]="hkSummary()!.tasks_today.completed"
                        title="Completed: {{ hkSummary()!.tasks_today.completed }}"></div>
                    }
                    @if (hkSummary()!.tasks_today.in_progress > 0) {
                      <div class="bg-blue-400"
                        [style.flex]="hkSummary()!.tasks_today.in_progress"
                        title="In Progress: {{ hkSummary()!.tasks_today.in_progress }}"></div>
                    }
                    @if (hkSummary()!.tasks_today.assigned > 0) {
                      <div class="bg-purple-300"
                        [style.flex]="hkSummary()!.tasks_today.assigned"
                        title="Assigned: {{ hkSummary()!.tasks_today.assigned }}"></div>
                    }
                    @if (hkSummary()!.tasks_today.pending > 0) {
                      <div class="bg-amber-300"
                        [style.flex]="hkSummary()!.tasks_today.pending"
                        title="Pending: {{ hkSummary()!.tasks_today.pending }}"></div>
                    }
                    @if (hkSummary()!.tasks_today.needs_rework > 0) {
                      <div class="bg-red-400"
                        [style.flex]="hkSummary()!.tasks_today.needs_rework"
                        title="Needs Rework: {{ hkSummary()!.tasks_today.needs_rework }}"></div>
                    }
                  </div>
                  <div class="flex gap-3 mt-2 flex-wrap">
                    @for (legend of hkLegend(); track legend.label) {
                      <div class="flex items-center gap-1">
                        <span class="w-2 h-2 rounded-full" [class]="legend.colorClass"></span>
                        <span class="text-[11px] text-gray-500">{{ legend.label }} ({{ legend.count }})</span>
                      </div>
                    }
                  </div>
                </div>
              }
            } @else {
              <div class="bg-white rounded-xl border border-gray-100 p-6 text-center text-sm text-gray-400 shadow-card">
                No housekeeping data available.
              </div>
            }
          </div>

          <!-- Service requests summary -->
          <div>
            <div class="flex items-center justify-between mb-3">
              <h3 class="text-base font-bold text-gray-900">🛎️ Service Requests</h3>
              <a routerLink="/service-requests" class="text-xs text-sage-600 hover:text-sage-700 font-medium">View all →</a>
            </div>
            @if (loadingOps()) {
              <ui-loading [loading]="true"></ui-loading>
            } @else if (srSummary()) {
              <div class="grid grid-cols-2 sm:grid-cols-5 gap-3 mb-4">
                <div class="bg-white rounded-xl border border-gray-100 shadow-card p-4 text-center sm:col-span-1">
                  <p class="text-2xl font-black text-gray-900">{{ srSummary()!.total }}</p>
                  <p class="text-xs text-gray-400 mt-0.5">Total Open</p>
                </div>
                <div class="bg-white rounded-xl border border-amber-100 shadow-card p-4 text-center">
                  <p class="text-2xl font-black text-amber-600">{{ srSummary()!.pending }}</p>
                  <p class="text-xs text-gray-400 mt-0.5">Pending</p>
                </div>
                <div class="bg-white rounded-xl border border-blue-100 shadow-card p-4 text-center">
                  <p class="text-2xl font-black text-blue-600">{{ srSummary()!.acknowledged }}</p>
                  <p class="text-xs text-gray-400 mt-0.5">Acknowledged</p>
                </div>
                <div class="bg-white rounded-xl border border-purple-100 shadow-card p-4 text-center">
                  <p class="text-2xl font-black text-purple-600">{{ srSummary()!.in_progress }}</p>
                  <p class="text-xs text-gray-400 mt-0.5">In Progress</p>
                </div>
                <div class="bg-white rounded-xl border border-emerald-100 shadow-card p-4 text-center">
                  <p class="text-2xl font-black text-emerald-600">{{ srSummary()!.completed }}</p>
                  <p class="text-xs text-gray-400 mt-0.5">Completed</p>
                </div>
              </div>

              @if (srSummary()!.by_category?.length) {
                <div class="bg-white rounded-xl border border-gray-100 shadow-card p-4">
                  <p class="text-xs font-medium text-gray-600 mb-3">Today's requests by category
                    <span class="text-gray-400 font-normal ml-1">({{ srSummary()!.today_total }} total)</span>
                  </p>
                  <div class="space-y-2">
                    @for (cat of srSummary()!.by_category; track cat.category) {
                      <div class="flex items-center gap-3">
                        <span class="text-sm w-5 text-center">{{ srCategoryIcon(cat.category) }}</span>
                        <span class="text-xs text-gray-600 capitalize w-24 truncate">{{ cat.category.replace('_', ' ') }}</span>
                        <div class="flex-1 bg-gray-100 rounded-full h-2">
                          <div class="bg-sage-400 h-2 rounded-full transition-all"
                            [style.width.%]="srSummary()!.today_total > 0 ? (cat.count / srSummary()!.today_total * 100) : 0">
                          </div>
                        </div>
                        <span class="text-xs font-semibold text-gray-700 w-4 text-right">{{ cat.count }}</span>
                      </div>
                    }
                  </div>
                </div>
              }
            } @else {
              <div class="bg-white rounded-xl border border-gray-100 p-6 text-center text-sm text-gray-400 shadow-card">
                No service request data available.
              </div>
            }
          </div>

        }
      }

      <!-- ═══════════════════════════════════════════════════════
           TAB: ANALYTICS  (advanced_analytics — business+)
           ═══════════════════════════════════════════════════════ -->
      @if (activeTab() === 'analytics' && !loading()) {

        @if (!isTabEnabled(tabs[2])) {
          <ng-container *ngTemplateOutlet="upgradeCta; context: { tab: tabs[2] }"></ng-container>
        } @else {

          <div class="grid grid-cols-1 lg:grid-cols-3 gap-5 mb-5">
            <!-- ADR / RevPAR KPIs -->
            <div class="bg-white rounded-xl border border-gray-100 shadow-card p-5">
              <h3 class="text-sm font-semibold text-gray-700 mb-4">Key Metrics</h3>
              <div class="space-y-3">
                <div class="flex justify-between items-center">
                  <span class="text-xs text-gray-400">Occupancy Rate</span>
                  <span class="text-sm font-bold text-gray-900">{{ occupancyPct() }}%</span>
                </div>
                <div class="w-full bg-gray-100 rounded-full h-1.5">
                  <div class="bg-sage-400 h-1.5 rounded-full" [style.width.%]="occupancyPct()"></div>
                </div>
                <div class="flex justify-between items-center pt-2">
                  <span class="text-xs text-gray-400">ADR (Avg. Daily Rate)</span>
                  <span class="text-sm font-bold text-gray-900">₦{{ (+kpi().adr || 0).toLocaleString() }}</span>
                </div>
                <div class="flex justify-between items-center">
                  <span class="text-xs text-gray-400">RevPAR</span>
                  <span class="text-sm font-bold text-gray-900">₦{{ (+kpi().revpar || 0).toLocaleString() }}</span>
                </div>
                <div class="flex justify-between items-center">
                  <span class="text-xs text-gray-400">Today's Revenue</span>
                  <span class="text-sm font-bold text-sage-700">₦{{ (+kpi().today_revenue || 0).toLocaleString() }}</span>
                </div>
              </div>
            </div>

            <!-- Revenue breakdown donut -->
            <div class="bg-white rounded-xl border border-gray-100 shadow-card p-5 lg:col-span-2">
              <h3 class="text-sm font-semibold text-gray-700 mb-1">Revenue by Booking Type</h3>
              <p class="text-xs text-gray-400 mb-3">Last 30 days</p>
              @if (revenueBreakdown().length) {
                <chart-donut
                  [data]="revenueBreakdown()"
                  [height]="180"
                  [showLegend]="true"
                  [centerLabel]="'Total'"
                  [centerValue]="'₦' + totalRevenue().toLocaleString()">
                </chart-donut>
              } @else {
                <p class="text-sm text-gray-300 text-center py-8">No revenue data for this period.</p>
              }
            </div>
          </div>

          <!-- Occupancy trends line chart -->
          <div class="bg-white rounded-xl border border-gray-100 shadow-card p-5 mb-5">
            <div class="flex items-center justify-between mb-1">
              <h3 class="text-sm font-semibold text-gray-700">Occupancy Trend</h3>
              <div class="flex gap-1">
                @for (d of [7, 30, 90]; track d) {
                  <button (click)="changeTrendDays(d)"
                    class="px-2 py-1 text-[11px] rounded-md border transition-colors"
                    [class]="trendDays() === d
                      ? 'bg-sage-100 border-sage-200 text-sage-700 font-semibold'
                      : 'border-gray-200 text-gray-400 hover:border-gray-300'">
                    {{ d }}d
                  </button>
                }
              </div>
            </div>
            <p class="text-xs text-gray-400 mb-3">Occupancy % · Rooms sold over {{ trendDays() }} days</p>
            @if (trends().length) {
              <chart-line
                [labels]="trendLabels()"
                [series]="trendSeries()"
                [height]="220"
                [showGrid]="true"
                [animate]="true">
              </chart-line>
            } @else {
              <p class="text-sm text-gray-300 text-center py-12">No trend data yet.</p>
            }
          </div>

          <!-- Property revenue chart (all-properties view only) -->
          @if (scope() === 'all' && propertyComparison().length > 1) {
            <div class="bg-white rounded-xl border border-gray-100 shadow-card p-5">
              <h3 class="text-sm font-semibold text-gray-700 mb-1">Revenue by Property</h3>
              <p class="text-xs text-gray-400 mb-3">Last 30 days</p>
              <chart-bar
                [data]="propertyRevenueChart()"
                [height]="220"
                [showGrid]="true">
              </chart-bar>
            </div>
          }

        }
      }

      <!-- ═══════════════════════════════════════════════════════
           TAB: FINANCE  (advanced_analytics — business+)
           ═══════════════════════════════════════════════════════ -->
      @if (activeTab() === 'finance' && !loading()) {

        @if (!isTabEnabled(tabs[3])) {
          <ng-container *ngTemplateOutlet="upgradeCta; context: { tab: tabs[3] }"></ng-container>
        } @else {

          @if (loadingFinance()) {
            <ui-loading [loading]="true"></ui-loading>
          } @else if (folioSummary()) {
            <!-- Finance KPI cards -->
            <div class="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-5">
              <ui-stats-card
                label="Collected Today"
                [value]="'₦' + (+folioSummary()!.collected_today || 0).toLocaleString()"
                icon="circle-check" variant="gradient"
                gradient="linear-gradient(135deg, #166534 0%, #16a34a 100%)">
              </ui-stats-card>
              <ui-stats-card
                label="Outstanding Balance"
                [value]="'₦' + (+folioSummary()!.outstanding_balance || 0).toLocaleString()"
                icon="alert-circle" variant="gradient"
                gradient="linear-gradient(135deg, #7c2d12 0%, #ea580c 100%)">
              </ui-stats-card>
              <ui-stats-card
                label="Pending Payments"
                [value]="folioSummary()!.pending_payments + ''"
                icon="clock" variant="gradient"
                gradient="linear-gradient(135deg, #713f12 0%, #d97706 100%)">
                <p class="text-xs text-white/60 mt-1">₦{{ (+folioSummary()!.pending_amount || 0).toLocaleString() }} awaiting</p>
              </ui-stats-card>
              <ui-stats-card
                label="Open Folios"
                [value]="folioSummary()!.open_folios + ''"
                icon="file-text" variant="gradient"
                gradient="linear-gradient(135deg, #1e3a5f 0%, #1d4ed8 100%)">
              </ui-stats-card>
            </div>

            <!-- Quick links to finance actions -->
            <div class="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <a routerLink="/folios"
                class="bg-white rounded-xl border border-gray-100 shadow-card p-5 hover:border-sage-200 hover:shadow-md transition-all group">
                <div class="flex items-center gap-3 mb-2">
                  <span class="w-9 h-9 bg-sage-50 rounded-lg flex items-center justify-center group-hover:scale-110 transition-transform">
                    <lucide-icon name="file-text" [size]="18" [strokeWidth]="1.75" class="text-sage-600"></lucide-icon>
                  </span>
                  <h4 class="text-sm font-semibold text-gray-800">Folios</h4>
                </div>
                <p class="text-xs text-gray-400">View all open folios, post charges, and confirm payments.</p>
              </a>
              <a routerLink="/reports" [queryParams]="{ report: 'payment-collection' }"
                class="bg-white rounded-xl border border-gray-100 shadow-card p-5 hover:border-sage-200 hover:shadow-md transition-all group">
                <div class="flex items-center gap-3 mb-2">
                  <span class="w-9 h-9 bg-blue-50 rounded-lg flex items-center justify-center group-hover:scale-110 transition-transform">
                    <lucide-icon name="credit-card" [size]="18" [strokeWidth]="1.75" class="text-blue-600"></lucide-icon>
                  </span>
                  <h4 class="text-sm font-semibold text-gray-800">Payment Collection</h4>
                </div>
                <p class="text-xs text-gray-400">Full payment collection report with method breakdown.</p>
              </a>
              <a routerLink="/reports" [queryParams]="{ report: 'outstanding-balances' }"
                class="bg-white rounded-xl border border-gray-100 shadow-card p-5 hover:border-amber-200 hover:shadow-md transition-all group">
                <div class="flex items-center gap-3 mb-2">
                  <span class="w-9 h-9 bg-amber-50 rounded-lg flex items-center justify-center group-hover:scale-110 transition-transform">
                    <lucide-icon name="alert-triangle" [size]="18" [strokeWidth]="1.75" class="text-amber-600"></lucide-icon>
                  </span>
                  <h4 class="text-sm font-semibold text-gray-800">Outstanding Balances</h4>
                </div>
                <p class="text-xs text-gray-400">Guests with unpaid balances and follow-up actions.</p>
              </a>
            </div>
          } @else {
            <div class="bg-white rounded-xl border border-gray-100 p-8 text-center text-sm text-gray-400 shadow-card">
              Financial summary unavailable. Ensure folios have been created for active bookings.
            </div>
          }

        }
      }

    </div>

    <!-- ═══ UPGRADE CTA TEMPLATE ═══════════════════════════════════ -->
    <ng-template #upgradeCta let-tab="tab">
      <div class="bg-gradient-to-br from-gray-50 to-amber-50 rounded-2xl border border-amber-200 p-10 text-center max-w-md mx-auto mt-4">
        <div class="w-16 h-16 bg-amber-100 rounded-2xl flex items-center justify-center mx-auto mb-5">
          <lucide-icon name="lock" [size]="28" class="text-amber-600"></lucide-icon>
        </div>
        <h3 class="text-xl font-bold text-gray-900 mb-2">{{ tab.label }} Dashboard</h3>
        <p class="text-sm text-gray-500 mb-1">
          Requires the <strong class="text-amber-700">{{ tab.featureTier }}</strong> plan.
        </p>
        <p class="text-xs text-gray-400 mb-6">
          Upgrade to unlock {{ tab.label.toLowerCase() }} insights, trend charts, and detailed metrics.
        </p>
        <a routerLink="/settings/subscription"
          class="inline-block px-6 py-2.5 bg-amber-500 text-white font-semibold text-sm rounded-xl hover:bg-amber-600 transition-colors shadow-sm">
          Upgrade Plan →
        </a>
      </div>
    </ng-template>
  `,
})
export class DashboardPage implements OnInit, OnDestroy {
  private api            = inject(ApiService);
  private auth           = inject(AuthService);
  private activeProperty = inject(ActivePropertyService);
  private featureService = inject(FeatureService);
  protected user         = inject(TokenService).user;

  // ── Core state ──────────────────────────────────────────────
  loading        = signal(true);
  loadingOps     = signal(false);
  loadingFinance = signal(false);

  overview         = signal<any>({});
  trends           = signal<any[]>([]);
  revenueBreakdown = signal<ChartDataPoint[]>([]);
  activity         = signal<any[]>([]);
  propertyComparison = signal<any[]>([]);

  // Operations tab
  hkSummary = signal<any | null>(null);
  srSummary = signal<any | null>(null);

  // Finance tab
  folioSummary = signal<any | null>(null);

  // UI state
  activeTab  = signal<DashTab>('overview');
  scope      = signal<'single' | 'all'>('single');
  trendDays  = signal(30);

  private _manualScope = false;
  private _propertySub?: Subscription;
  private readonly _propertyId$ = toObservable(this.activeProperty.propertyId);

  readonly tabs = TABS;

  isMultiProperty   = this.activeProperty.isMultiProperty;
  currentPropertyName = this.activeProperty.propertyName;

  // ── Computed ─────────────────────────────────────────────────
  kpi = computed(() => {
    if (this.scope() === 'all') {
      const agg = this.overview();
      return agg.totals || agg;
    }
    return this.overview();
  });

  occupancyPct = computed(() => {
    const k = this.kpi();
    if (this.scope() === 'all') return +(k.occupancy_rate || 0);
    return +(k.occupancy_rate || 0);
  });

  greeting = computed(() => {
    const name = this.user()?.first_name || '';
    const hour = new Date().getHours();
    const period = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';
    return `${period}, ${name}`;
  });

  totalRevenue = computed(() =>
    this.revenueBreakdown().reduce((sum, d) => sum + d.value, 0)
  );

  trendLabels = computed(() => this.trends().map((t: any) => t.date?.slice(5) ?? ''));

  trendSeries = computed((): ChartSeries[] => {
    const data = this.trends();
    if (!data.length) return [];
    return [
      { name: 'Occupancy %', data: data.map((t: any) => +t.occupancy_rate || 0), color: '#3a543a' },
      { name: 'Rooms Sold',  data: data.map((t: any) => +t.rooms_sold      || 0), color: '#7a9e7a' },
    ];
  });

  roomStatusData = computed((): ChartDataPoint[] => {
    const k = this.kpi();
    if (this.scope() === 'all') {
      return [
        { label: 'Occupied',  value: k.occupied_rooms  || 0, color: '#3a543a' },
        { label: 'Available', value: k.available_rooms || 0, color: '#7a9e7a' },
        { label: 'Other',     value: Math.max(0, (k.total_rooms || 0) - (k.occupied_rooms || 0) - (k.available_rooms || 0)), color: '#d97706' },
      ].filter(d => d.value > 0);
    }
    const r = k.rooms;
    if (!r) return [];
    return [
      { label: 'Occupied',  value: r.occupied  || 0, color: '#3a543a' },
      { label: 'Available', value: r.available  || 0, color: '#7a9e7a' },
      { label: 'Dirty',     value: r.dirty      || 0, color: '#d97706' },
      { label: 'Reserved',  value: r.reserved   || 0, color: '#6366f1' },
      { label: 'OOO',       value: (r.out_of_order || 0) + (r.maintenance || 0), color: '#ef4444' },
    ].filter(d => d.value > 0);
  });

  propertyRevenueChart = computed((): ChartDataPoint[] => {
    const colors = ['#3a543a', '#5a825a', '#7a9e7a', '#a3bfa3', '#d97706', '#6366f1'];
    return this.propertyComparison().map((p: any, i: number) => ({
      label: p.property_name?.length > 12 ? p.property_name.slice(0, 12) + '…' : p.property_name,
      value: +p.revenue || 0,
      color: colors[i % colors.length],
    }));
  });

  hkLegend = computed(() => {
    const hk = this.hkSummary()?.tasks_today;
    if (!hk) return [];
    return [
      { label: 'Done',        count: hk.completed,   colorClass: 'bg-emerald-400' },
      { label: 'In Progress', count: hk.in_progress,  colorClass: 'bg-blue-400'   },
      { label: 'Assigned',    count: hk.assigned,     colorClass: 'bg-purple-300' },
      { label: 'Pending',     count: hk.pending,      colorClass: 'bg-amber-300'  },
      { label: 'Rework',      count: hk.needs_rework, colorClass: 'bg-red-400'    },
    ].filter(l => l.count > 0);
  });

  readonly quickActions = [
    { label: 'New Booking',  sub: '',  icon: 'clipboard-list', route: '/bookings/new',   bgClass: 'bg-sage-50 text-sage-700'   },
    { label: 'Room Status',  sub: '',  icon: 'hotel',           route: '/rooms',           bgClass: 'bg-emerald-50 text-emerald-700' },
    { label: 'Add Guest',    sub: '',  icon: 'user-round',      route: '/guests',          bgClass: 'bg-blue-50 text-blue-700'  },
    { label: 'Housekeeping', sub: '',  icon: 'spray-can',       route: '/housekeeping',    bgClass: 'bg-amber-50 text-amber-700' },
    { label: 'Folios',       sub: '',  icon: 'file-text',       route: '/folios',          bgClass: 'bg-indigo-50 text-indigo-700' },
    { label: 'Reports',      sub: '',  icon: 'bar-chart-2',     route: '/reports',         bgClass: 'bg-rose-50 text-rose-700'  },
  ];

  // ── Lifecycle ────────────────────────────────────────────────
  ngOnInit(): void {
    this._propertySub = this._propertyId$.subscribe(pid => {
      if (pid) {
        if (!this._manualScope) this.scope.set('single');
      } else {
        if (!this._manualScope) this.scope.set('all');
      }
      this.loading.set(true);
      this.loadCurrentScope();
    });
  }

  ngOnDestroy(): void { this._propertySub?.unsubscribe(); }

  // ── Public actions ───────────────────────────────────────────
  setScope(scope: 'single' | 'all'): void {
    if (this.scope() === scope) return;
    this._manualScope = true;
    this.scope.set(scope);
    this.loading.set(true);
    this.loadCurrentScope();
  }

  setTab(tab: DashTab): void {
    if (!this.isTabEnabled(TABS.find(t => t.id === tab)!)) {
      // Still navigate — locked tab shows upgrade CTA
    }
    this.activeTab.set(tab);
    // Lazy-load tab data if not yet fetched
    const pid = this.activeProperty.propertyId();
    if (tab === 'operations' && pid && !this.hkSummary() && !this.loadingOps()) {
      this.loadOps(pid);
    }
    if (tab === 'finance' && pid && !this.folioSummary() && !this.loadingFinance()) {
      this.loadFinance(pid);
    }
    if ((tab === 'analytics') && pid && !this.trends().length) {
      this.loadTrends(pid, this.trendDays());
    }
  }

  isTabEnabled(tab: Tab): boolean {
    return this.featureService.isEnabled(tab.featureKey);
  }

  changeTrendDays(days: number): void {
    this.trendDays.set(days);
    const pid = this.activeProperty.propertyId();
    if (pid) this.loadTrends(pid, days);
  }

  srCategoryIcon(cat: string): string {
    const icons: Record<string, string> = {
      room_service: '🛎️', housekeeping: '🧹', maintenance: '🔧',
      amenity: '🎁', food: '🍽️', laundry: '👕', transport: '🚗', other: '❓',
    };
    return icons[cat] ?? '❓';
  }

  activityIcon(status: string): string {
    return ({
      confirmed: 'circle-check', checked_in: 'door-open', checked_out: 'log-out',
      cancelled: 'circle-x',    no_show: 'circle-x',      pending: 'clock',
    } as Record<string, string>)[status] ?? 'clipboard-list';
  }

  activityBg(status: string): string {
    return ({
      confirmed: 'bg-emerald-50', checked_in: 'bg-blue-50', checked_out: 'bg-orange-50',
      cancelled: 'bg-red-50',     no_show: 'bg-gray-100',   pending: 'bg-amber-50',
    } as Record<string, string>)[status] ?? 'bg-gray-50';
  }

  // ── Private loaders ──────────────────────────────────────────
  private loadCurrentScope(): void {
    this.scope() === 'all'
      ? this.loadAllProperties()
      : this.loadSingleProperty();
  }

  private loadSingleProperty(): void {
    const pid = this.activeProperty.propertyId();
    if (!pid) { this.loading.set(false); return; }

    this.overview.set({}); this.trends.set([]);
    this.revenueBreakdown.set([]); this.activity.set([]);
    this.hkSummary.set(null); this.srSummary.set(null); this.folioSummary.set(null);

    forkJoin({
      overview: this.api.get('/dashboard/overview',      { property_id: pid }).pipe(catchError(() => of({ success: false, data: {} }))),
      activity: this.api.get('/dashboard/activity-feed', { property_id: pid, limit: 10 }).pipe(catchError(() => of({ success: false, data: [] }))),
    }).subscribe({
      next: ({ overview, activity }) => {
        if ((overview as any).success) this.overview.set((overview as any).data);
        if ((activity as any).success) this.activity.set((activity as any).data ?? []);
        this.loading.set(false);
        // Eager-load the active tab's data
        this.lazyLoadActiveTab(pid);
      },
      error: () => this.loading.set(false),
    });
  }

  private loadAllProperties(): void {
    this.overview.set({}); this.trends.set([]);
    this.revenueBreakdown.set([]); this.propertyComparison.set([]);
    this.hkSummary.set(null); this.srSummary.set(null); this.folioSummary.set(null);

    forkJoin({
      overview:   this.api.get('/dashboard/overview',           { scope: 'all_properties' }).pipe(catchError(() => of({ success: false, data: {} }))),
      comparison: this.api.get('/dashboard/property-comparison',{ days: 30 }).pipe(catchError(() => of({ success: false, data: [] }))),
    }).subscribe({
      next: ({ overview, comparison }) => {
        if ((overview as any).success) this.overview.set((overview as any).data);
        if ((comparison as any).success) this.propertyComparison.set((comparison as any).data ?? []);
        this.loading.set(false);
      },
      error: () => this.loading.set(false),
    });
  }

  private lazyLoadActiveTab(pid: string): void {
    const tab = this.activeTab();
    if (tab === 'operations')             this.loadOps(pid);
    if (tab === 'finance')                this.loadFinance(pid);
    if (tab === 'analytics')              this.loadAnalytics(pid);
  }

  private loadOps(pid: string): void {
    this.loadingOps.set(true);
    forkJoin({
      hk: this.api.get('/dashboard/housekeeping-summary',     { property_id: pid }).pipe(catchError(() => of({ success: false, data: null }))),
      sr: this.api.get('/dashboard/service-requests-summary', { property_id: pid }).pipe(catchError(() => of({ success: false, data: null }))),
    }).subscribe({
      next: ({ hk, sr }) => {
        if ((hk as any).success) this.hkSummary.set((hk as any).data);
        if ((sr as any).success) this.srSummary.set((sr as any).data);
        this.loadingOps.set(false);
      },
      error: () => this.loadingOps.set(false),
    });
  }

  private loadFinance(pid: string): void {
    this.loadingFinance.set(true);
    this.api.get('/dashboard/folio-summary', { property_id: pid })
      .pipe(catchError(() => of({ success: false, data: null })))
      .subscribe({
        next: (r: any) => {
          if (r.success) this.folioSummary.set(r.data);
          this.loadingFinance.set(false);
        },
        error: () => this.loadingFinance.set(false),
      });
  }

  private loadAnalytics(pid: string): void {
    this.loadTrends(pid, this.trendDays());
    this.api.get('/dashboard/revenue-breakdown', { property_id: pid, days: 30 })
      .pipe(catchError(() => of({ success: false, data: [] })))
      .subscribe({
        next: (r: any) => {
          if (r.success) {
            const colors: Record<string, string> = {
              overnight: '#3a543a', short_rest_3hr: '#d97706', short_rest_6hr: '#b45309',
              walk_in: '#7a9e7a', corporate: '#6366f1', half_day: '#0891b2',
            };
            this.revenueBreakdown.set(
              (r.data ?? []).map((d: any) => ({
                label: d.booking_type, value: +d.revenue, color: colors[d.booking_type] || '#6b7280',
              }))
            );
          }
        },
      });
  }

  private loadTrends(pid: string, days: number): void {
    this.api.get('/dashboard/occupancy-trends', { property_id: pid, days })
      .pipe(catchError(() => of({ success: false, data: [] })))
      .subscribe((r: any) => {
        if (r.success) this.trends.set(r.data ?? []);
      });
  }
}

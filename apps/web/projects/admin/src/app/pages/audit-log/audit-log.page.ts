import { Component, inject, OnInit, signal, computed } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { DatePipe, JsonPipe } from '@angular/common';
import { ApiService, PageHeaderComponent, LoadingSpinnerComponent, ToastService } from '@lodgik/shared';

@Component({
  selector: 'app-audit-log',
  standalone: true,
  imports: [FormsModule, DatePipe, JsonPipe, PageHeaderComponent, LoadingSpinnerComponent],
  template: `
    <ui-page-header title="Audit Log" subtitle="Platform-wide activity tracking across all tenants">
      <button (click)="exportCsv()" class="px-4 py-2 bg-sage-600 text-white text-sm font-medium rounded-lg hover:bg-sage-700">
        Export CSV
      </button>
    </ui-page-header>

    <!-- Stats Cards -->
    <div class="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
      <div class="bg-white rounded-xl border border-gray-100 p-4 shadow-card">
        <p class="text-xs text-gray-400">Today</p>
        <p class="text-2xl font-bold text-gray-900 mt-1">{{ stats().today || 0 }}</p>
      </div>
      <div class="bg-white rounded-xl border border-gray-100 p-4 shadow-card">
        <p class="text-xs text-gray-400">This Week</p>
        <p class="text-2xl font-bold text-gray-900 mt-1">{{ stats().this_week || 0 }}</p>
      </div>
      <div class="bg-white rounded-xl border border-gray-100 p-4 shadow-card">
        <p class="text-xs text-gray-400">Total Records</p>
        <p class="text-2xl font-bold text-gray-900 mt-1">{{ stats().total || 0 }}</p>
      </div>
      <div class="bg-white rounded-xl border border-gray-100 p-4 shadow-card">
        <p class="text-xs text-gray-400">Top Action (Week)</p>
        <p class="text-lg font-bold text-gray-900 mt-1">{{ stats().top_actions?.[0]?.action || '—' }}</p>
        <p class="text-xs text-gray-400">{{ stats().top_actions?.[0]?.count || 0 }} events</p>
      </div>
    </div>

    <!-- Filters -->
    <div class="bg-white rounded-xl border border-gray-100 p-4 shadow-card mb-4">
      <div class="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        <input [(ngModel)]="filters.search" placeholder="Search..." (keyup.enter)="load()"
               class="px-3 py-2 border border-gray-200 rounded-lg text-sm bg-gray-50">
        <select [(ngModel)]="filters.action" (change)="load()" class="px-3 py-2 border border-gray-200 rounded-lg text-sm bg-gray-50">
          <option value="">All Actions</option>
          @for (a of uniqueActions(); track a) { <option [value]="a">{{ a }}</option> }
        </select>
        <select [(ngModel)]="filters.entity_type" (change)="load()" class="px-3 py-2 border border-gray-200 rounded-lg text-sm bg-gray-50">
          <option value="">All Entities</option>
          @for (e of uniqueEntities(); track e) { <option [value]="e">{{ e }}</option> }
        </select>
        <select [(ngModel)]="filters.tenant_id" (change)="load()" class="px-3 py-2 border border-gray-200 rounded-lg text-sm bg-gray-50">
          <option value="">All Tenants</option>
          @for (t of stats().top_tenants || []; track t.tenant_id) {
            <option [value]="t.tenant_id">{{ t.business_name || t.tenant_id }}</option>
          }
        </select>
        <input [(ngModel)]="filters.date_from" type="date" (change)="load()"
               class="px-3 py-2 border border-gray-200 rounded-lg text-sm bg-gray-50">
        <input [(ngModel)]="filters.date_to" type="date" (change)="load()"
               class="px-3 py-2 border border-gray-200 rounded-lg text-sm bg-gray-50">
      </div>
      <div class="flex items-center gap-2 mt-2">
        <button (click)="load()" class="px-3 py-1.5 bg-sage-600 text-white text-xs rounded-lg">Apply</button>
        <button (click)="clearFilters()" class="px-3 py-1.5 text-gray-500 text-xs border rounded-lg">Clear</button>
        <span class="text-xs text-gray-400 ml-auto">{{ meta().total || 0 }} results</span>
      </div>
    </div>

    <ui-loading [loading]="loading()"></ui-loading>

    @if (!loading()) {
      <!-- Audit Table -->
      <div class="bg-white rounded-xl border border-gray-100 shadow-card overflow-hidden">
        <div class="overflow-x-auto">
          <table class="w-full text-sm">
            <thead class="bg-gray-50 text-gray-500 text-xs uppercase">
              <tr>
                <th class="px-4 py-3 text-left">Timestamp</th>
                <th class="px-4 py-3 text-left">User</th>
                <th class="px-4 py-3 text-left">Action</th>
                <th class="px-4 py-3 text-left">Entity</th>
                <th class="px-4 py-3 text-left">Description</th>
                <th class="px-4 py-3 text-left">IP</th>
                <th class="px-4 py-3 text-center">Details</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-gray-50">
              @for (log of logs(); track log.id) {
                <tr class="hover:bg-gray-50 transition-colors">
                  <td class="px-4 py-3 text-xs text-gray-500 whitespace-nowrap">{{ log.created_at | date:'MMM d, HH:mm:ss' }}</td>
                  <td class="px-4 py-3">
                    <p class="text-sm font-medium text-gray-800">{{ log.user_name || '—' }}</p>
                    <p class="text-[11px] text-gray-400 truncate max-w-[120px]">{{ log.tenant_id?.slice(0,8) }}</p>
                  </td>
                  <td class="px-4 py-3">
                    <span class="px-2 py-0.5 rounded-full text-[11px] font-medium"
                          [class]="actionClass(log.action)">{{ log.action }}</span>
                  </td>
                  <td class="px-4 py-3">
                    <span class="text-xs text-gray-600">{{ log.entity_type }}</span>
                    @if (log.entity_id) {
                      <p class="text-[11px] text-gray-400 font-mono truncate max-w-[100px]">{{ log.entity_id.slice(0,8) }}…</p>
                    }
                  </td>
                  <td class="px-4 py-3 max-w-[250px]">
                    <p class="text-xs text-gray-600 truncate">{{ log.description || '—' }}</p>
                  </td>
                  <td class="px-4 py-3 text-xs text-gray-400 font-mono">{{ log.ip_address || '—' }}</td>
                  <td class="px-4 py-3 text-center">
                    @if (log.old_values || log.new_values) {
                      <button (click)="toggleExpand(log.id)" class="text-sage-600 hover:underline text-xs">
                        {{ expandedId === log.id ? 'Hide' : 'View' }}
                      </button>
                    }
                  </td>
                </tr>
                @if (expandedId === log.id) {
                  <tr>
                    <td colspan="7" class="px-6 py-4 bg-gray-50">
                      <div class="grid grid-cols-2 gap-4 text-xs">
                        @if (log.old_values) {
                          <div><p class="font-semibold text-gray-500 mb-1">Before</p><pre class="bg-white p-3 rounded-lg border text-[11px] overflow-auto max-h-40">{{ log.old_values | json }}</pre></div>
                        }
                        @if (log.new_values) {
                          <div><p class="font-semibold text-gray-500 mb-1">After</p><pre class="bg-white p-3 rounded-lg border text-[11px] overflow-auto max-h-40">{{ log.new_values | json }}</pre></div>
                        }
                      </div>
                      @if (log.user_agent) {
                        <p class="text-[11px] text-gray-400 mt-2 truncate">UA: {{ log.user_agent }}</p>
                      }
                    </td>
                  </tr>
                }
              } @empty {
                <tr><td colspan="7" class="px-4 py-12 text-center text-gray-400">No audit log entries found</td></tr>
              }
            </tbody>
          </table>
        </div>

        <!-- Pagination -->
        @if (meta().pages > 1) {
          <div class="flex items-center justify-between px-4 py-3 border-t border-gray-100">
            <span class="text-xs text-gray-400">Page {{ meta().page }} of {{ meta().pages }}</span>
            <div class="flex gap-1">
              <button (click)="goPage(meta().page - 1)" [disabled]="meta().page <= 1"
                      class="px-3 py-1 text-xs border rounded-lg disabled:opacity-50">Prev</button>
              <button (click)="goPage(meta().page + 1)" [disabled]="meta().page >= meta().pages"
                      class="px-3 py-1 text-xs border rounded-lg disabled:opacity-50">Next</button>
            </div>
          </div>
        }
      </div>
    }
  `,
})
export class AdminAuditLogPage implements OnInit {
  private api = inject(ApiService);
  private toast = inject(ToastService);

  loading = signal(true);
  logs = signal<any[]>([]);
  meta = signal<any>({});
  stats = signal<any>({});
  expandedId: string | null = null;

  filters: any = { search: '', action: '', entity_type: '', tenant_id: '', date_from: '', date_to: '' };

  uniqueActions = computed(() => {
    const actions = (this.stats().top_actions || []).map((a: any) => a.action);
    return [...new Set(actions)] as string[];
  });

  uniqueEntities = signal<string[]>(['Tenant', 'User', 'Booking', 'Room', 'Subscription', 'Invoice', 'Property']);

  ngOnInit(): void {
    this.loadStats();
    this.load();
  }

  loadStats(): void {
    this.api.get('/admin/audit-logs/stats').subscribe((r: any) => {
      if (r?.success) this.stats.set(r.data);
    });
  }

  load(): void {
    this.loading.set(true);
    const params: any = { page: this.meta().page || 1, limit: 50 };
    if (this.filters.search) params.search = this.filters.search;
    if (this.filters.action) params.action = this.filters.action;
    if (this.filters.entity_type) params.entity_type = this.filters.entity_type;
    if (this.filters.tenant_id) params.tenant_id = this.filters.tenant_id;
    if (this.filters.date_from) params.date_from = this.filters.date_from;
    if (this.filters.date_to) params.date_to = this.filters.date_to;

    this.api.get('/admin/audit-logs', params).subscribe({
      next: (r: any) => {
        if (r?.success) { this.logs.set(r.data.items || []); this.meta.set(r.data.meta || {}); }
        this.loading.set(false);
      },
      error: () => this.loading.set(false),
    });
  }

  goPage(page: number): void {
    this.meta.update(m => ({ ...m, page }));
    this.load();
  }

  clearFilters(): void {
    this.filters = { search: '', action: '', entity_type: '', tenant_id: '', date_from: '', date_to: '' };
    this.meta.set({});
    this.load();
  }

  toggleExpand(id: string): void {
    this.expandedId = this.expandedId === id ? null : id;
  }

  exportCsv(): void {
    const params: any = { format: 'csv' };
    if (this.filters.action) params.action = this.filters.action;
    if (this.filters.tenant_id) params.tenant_id = this.filters.tenant_id;
    if (this.filters.date_from) params.date_from = this.filters.date_from;
    if (this.filters.date_to) params.date_to = this.filters.date_to;

    const qs = Object.entries(params).map(([k, v]) => `${k}=${v}`).join('&');
    // Use direct download via window
    const token = localStorage.getItem('lodgik_access_token');
    fetch(`/api/admin/audit-logs?${qs}`, { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.blob())
      .then(blob => {
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a'); a.href = url; a.download = `audit-log-${new Date().toISOString().slice(0,10)}.csv`;
        a.click(); URL.revokeObjectURL(url);
        this.toast.success('CSV exported');
      })
      .catch(() => this.toast.error('Export failed'));
  }

  actionClass(action: string): string {
    if (action.includes('delete') || action.includes('cancel') || action.includes('suspend')) return 'bg-red-50 text-red-700';
    if (action.includes('create') || action.includes('register') || action.includes('invite')) return 'bg-emerald-50 text-emerald-700';
    if (action.includes('update') || action.includes('activate') || action.includes('reset')) return 'bg-blue-50 text-blue-700';
    if (action.includes('login') || action.includes('auth')) return 'bg-amber-50 text-amber-700';
    return 'bg-gray-100 text-gray-600';
  }
}

import { Component, Input, Output, EventEmitter, computed, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';

export interface TableColumn {
  key: string;
  label: string;
  sortable?: boolean;
  width?: string;
  align?: 'left' | 'center' | 'right';
  render?: (value: any, row: any) => string;
}

export interface TableAction {
  label: string;
  icon?: string;
  color?: 'primary' | 'danger' | 'warning';
  handler: (row: any) => void;
  hidden?: (row: any) => boolean;
}

export interface PageEvent {
  page: number;
  limit: number;
}

export interface SortEvent {
  key: string;
  direction: 'asc' | 'desc';
}

@Component({
  selector: 'ui-data-table',
  standalone: true,
  imports: [FormsModule],
  template: `
    <div class="bg-white rounded-xl border border-gray-100 shadow-card overflow-hidden">
      <!-- Header bar -->
      @if (searchable || headerTemplate) {
        <div class="px-5 py-4 border-b border-gray-100 flex items-center justify-between gap-3">
          @if (searchable) {
            <div class="relative w-72">
              <svg class="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" viewBox="0 0 16 16" fill="none">
                <circle cx="7" cy="7" r="5" stroke="currentColor" stroke-width="1.5"/>
                <path d="M14 14l-3.5-3.5" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
              </svg>
              <input type="text" [ngModel]="searchQuery()" (ngModelChange)="onSearch($event)"
                     [placeholder]="searchPlaceholder"
                     class="w-full pl-10 pr-3 py-2 text-sm bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-sage-200 focus:border-sage-400 focus:bg-white outline-none transition-all">
            </div>
          }
          <div class="flex items-center gap-2">
            <ng-content select="[tableActions]"></ng-content>
          </div>
        </div>
      }

      <!-- Table -->
      <div class="overflow-x-auto">
        <table class="w-full text-sm">
          <thead>
            <tr class="border-b border-gray-100">
              @if (selectable) {
                <th class="px-5 py-3.5 w-10">
                  <input type="checkbox" class="rounded border-gray-300 text-sage-600 focus:ring-sage-500">
                </th>
              }
              @for (col of columns; track col.key) {
                <th class="px-5 py-3.5 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider"
                    [style.width]="col.width" [style.text-align]="col.align ?? 'left'"
                    [class.cursor-pointer]="col.sortable" [class.select-none]="col.sortable"
                    (click)="col.sortable && onSort(col.key)">
                  <span class="inline-flex items-center gap-1.5">
                    {{ col.label }}
                    @if (col.sortable && sortKey() === col.key) {
                      <span class="text-sage-600">{{ sortDir() === 'asc' ? '↑' : '↓' }}</span>
                    }
                  </span>
                </th>
              }
              @if (actions.length) {
                <th class="px-5 py-3.5 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider w-16"></th>
              }
            </tr>
          </thead>
          <tbody class="divide-y divide-gray-50">
            @for (row of displayRows(); track trackBy ? row[trackBy] : $index; let i = $index) {
              <tr class="hover:bg-gray-50/50 transition-colors cursor-pointer" [class.bg-sage-50]="selectedRow === row"
                  (click)="rowClick.emit(row)">
                @if (selectable) {
                  <td class="px-5 py-3.5 w-10" (click)="$event.stopPropagation()">
                    <input type="checkbox" class="rounded border-gray-300 text-sage-600 focus:ring-sage-500">
                  </td>
                }
                @for (col of columns; track col.key) {
                  <td class="px-5 py-3.5 text-gray-700" [style.text-align]="col.align ?? 'left'">
                    @if (col.render) {
                      <span [innerHTML]="col.render(row[col.key], row)"></span>
                    } @else {
                      {{ row[col.key] ?? '—' }}
                    }
                  </td>
                }
                @if (actions.length) {
                  <td class="px-5 py-3.5 text-right" (click)="$event.stopPropagation()">
                    <button class="p-1 rounded-md hover:bg-gray-100 transition-colors text-gray-400 hover:text-gray-600"
                            (click)="toggleRowMenu(row)">
                      <svg class="w-5 h-5" viewBox="0 0 20 20" fill="currentColor">
                        <circle cx="10" cy="4" r="1.5"/><circle cx="10" cy="10" r="1.5"/><circle cx="10" cy="16" r="1.5"/>
                      </svg>
                    </button>
                    @if (openMenuRow === row) {
                      <div class="absolute right-6 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg py-1 z-50 min-w-[140px]">
                        @for (action of actions; track action.label) {
                          @if (!action.hidden || !action.hidden(row)) {
                            <button (click)="action.handler(row); openMenuRow = null"
                                    class="w-full text-left px-3 py-2 text-sm hover:bg-gray-50 transition-colors"
                                    [class]="actionTextClass(action.color)">
                              {{ action.icon ?? '' }} {{ action.label }}
                            </button>
                          }
                        }
                      </div>
                    }
                  </td>
                }
              </tr>
            } @empty {
              <tr>
                <td [attr.colspan]="columns.length + (actions.length ? 1 : 0) + (selectable ? 1 : 0)"
                    class="px-5 py-16 text-center text-gray-400">
                  <div class="flex flex-col items-center gap-2">
                    <span class="text-3xl opacity-40">📭</span>
                    <p class="text-sm font-medium">{{ emptyMessage }}</p>
                  </div>
                </td>
              </tr>
            }
          </tbody>
        </table>
      </div>

      <!-- Pagination -->
      @if (totalItems > limit) {
        <div class="px-5 py-3.5 border-t border-gray-100 flex items-center justify-between">
          <span class="text-sm text-gray-500">
            Showing <span class="font-medium text-gray-700">{{ rangeStart() }}–{{ rangeEnd() }}</span>
            of <span class="font-medium text-gray-700">{{ totalItems }}</span>
          </span>
          <div class="flex items-center gap-1">
            <button (click)="goToPage(page - 1)" [disabled]="page <= 1"
                    class="flex items-center gap-1 px-3 py-1.5 text-sm rounded-lg border border-gray-200 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors">
              ← Previous
            </button>
            @for (p of pageNumbers(); track p) {
              @if (p === -1) {
                <span class="px-2 text-gray-400">…</span>
              } @else {
                <button (click)="goToPage(p)"
                        class="min-w-[36px] h-9 rounded-lg border text-sm font-medium transition-colors"
                        [class]="p === page ? 'bg-sage-600 text-white border-sage-600' : 'border-gray-200 text-gray-600 hover:bg-gray-50'">
                  {{ p }}
                </button>
              }
            }
            <button (click)="goToPage(page + 1)" [disabled]="page >= totalPages()"
                    class="flex items-center gap-1 px-3 py-1.5 text-sm rounded-lg border border-gray-200 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors">
              Next →
            </button>
          </div>
        </div>
      }
    </div>
  `,
})
export class DataTableComponent {
  @Input() columns: TableColumn[] = [];
  @Input() data: any[] = [];
  @Input() actions: TableAction[] = [];
  @Input() totalItems = 0;
  @Input() page = 1;
  @Input() limit = 20;
  @Input() searchable = true;
  @Input() searchPlaceholder = 'Search...';
  @Input() trackBy = 'id';
  @Input() emptyMessage = 'No data found';
  @Input() headerTemplate = false;
  @Input() selectedRow: any = null;
  @Input() serverSide = false;
  @Input() selectable = false;

  @Output() pageChange = new EventEmitter<PageEvent>();
  @Output() sortChange = new EventEmitter<SortEvent>();
  @Output() search = new EventEmitter<string>();
  @Output() rowClick = new EventEmitter<any>();

  searchQuery = signal('');
  sortKey = signal('');
  sortDir = signal<'asc' | 'desc'>('asc');
  openMenuRow: any = null;

  displayRows = computed(() => {
    if (this.serverSide) return this.data;
    let rows = [...this.data];
    const q = this.searchQuery().toLowerCase();
    if (q) {
      rows = rows.filter(row =>
        this.columns.some(col => String(row[col.key] ?? '').toLowerCase().includes(q))
      );
    }
    const key = this.sortKey();
    if (key) {
      const dir = this.sortDir() === 'asc' ? 1 : -1;
      rows.sort((a, b) => {
        const va = a[key] ?? '';
        const vb = b[key] ?? '';
        if (typeof va === 'number') return (va - vb) * dir;
        return String(va).localeCompare(String(vb)) * dir;
      });
    }
    return rows;
  });

  totalPages = computed(() => Math.ceil((this.serverSide ? this.totalItems : this.displayRows().length) / this.limit));
  rangeStart = computed(() => (this.page - 1) * this.limit + 1);
  rangeEnd = computed(() => Math.min(this.page * this.limit, this.totalItems || this.data.length));

  pageNumbers = computed(() => {
    const total = this.totalPages();
    const current = this.page;
    const pages: number[] = [];
    if (total <= 7) {
      for (let i = 1; i <= total; i++) pages.push(i);
    } else {
      pages.push(1);
      if (current > 3) pages.push(-1);
      const start = Math.max(2, current - 1);
      const end = Math.min(total - 1, current + 1);
      for (let i = start; i <= end; i++) pages.push(i);
      if (current < total - 2) pages.push(-1);
      pages.push(total);
    }
    return pages;
  });

  onSearch(query: string): void {
    this.searchQuery.set(query);
    this.search.emit(query);
  }

  onSort(key: string): void {
    if (this.sortKey() === key) {
      this.sortDir.update(d => d === 'asc' ? 'desc' : 'asc');
    } else {
      this.sortKey.set(key);
      this.sortDir.set('asc');
    }
    this.sortChange.emit({ key, direction: this.sortDir() });
  }

  goToPage(p: number): void {
    if (p < 1 || p > this.totalPages()) return;
    this.page = p;
    this.pageChange.emit({ page: p, limit: this.limit });
  }

  toggleRowMenu(row: any): void {
    this.openMenuRow = this.openMenuRow === row ? null : row;
  }

  actionTextClass(color?: string): string {
    switch (color) {
      case 'danger': return 'text-red-600';
      case 'warning': return 'text-amber-600';
      default: return 'text-gray-700';
    }
  }
}

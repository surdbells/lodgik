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
    <div class="bg-white rounded-lg border border-gray-200 overflow-hidden">
      <!-- Header bar -->
      @if (searchable || headerTemplate) {
        <div class="px-4 py-3 border-b border-gray-100 flex items-center justify-between gap-3">
          @if (searchable) {
            <div class="relative w-64">
              <input type="text" [ngModel]="searchQuery()" (ngModelChange)="onSearch($event)"
                     [placeholder]="searchPlaceholder"
                     class="w-full pl-9 pr-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none">
              <span class="absolute left-3 top-2.5 text-gray-400 text-sm">🔍</span>
            </div>
          }
          <ng-content select="[tableActions]"></ng-content>
        </div>
      }

      <!-- Table -->
      <div class="overflow-x-auto">
        <table class="w-full text-sm">
          <thead>
            <tr class="bg-gray-50 border-b border-gray-200">
              @for (col of columns; track col.key) {
                <th class="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider"
                    [style.width]="col.width" [style.text-align]="col.align ?? 'left'"
                    [class.cursor-pointer]="col.sortable" [class.select-none]="col.sortable"
                    (click)="col.sortable && onSort(col.key)">
                  <span class="inline-flex items-center gap-1">
                    {{ col.label }}
                    @if (col.sortable && sortKey() === col.key) {
                      <span class="text-blue-600">{{ sortDir() === 'asc' ? '↑' : '↓' }}</span>
                    }
                  </span>
                </th>
              }
              @if (actions.length) {
                <th class="px-4 py-3 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider w-24">
                  Actions
                </th>
              }
            </tr>
          </thead>
          <tbody class="divide-y divide-gray-100">
            @for (row of displayRows(); track trackBy ? row[trackBy] : $index; let i = $index) {
              <tr class="hover:bg-gray-50 transition-colors" [class.bg-blue-50]="selectedRow === row">
                @for (col of columns; track col.key) {
                  <td class="px-4 py-3 text-gray-700" [style.text-align]="col.align ?? 'left'">
                    @if (col.render) {
                      <span [innerHTML]="col.render(row[col.key], row)"></span>
                    } @else {
                      {{ row[col.key] ?? '—' }}
                    }
                  </td>
                }
                @if (actions.length) {
                  <td class="px-4 py-3 text-right">
                    <div class="flex items-center justify-end gap-1">
                      @for (action of actions; track action.label) {
                        @if (!action.hidden || !action.hidden(row)) {
                          <button (click)="action.handler(row); $event.stopPropagation()"
                                  class="px-2 py-1 text-xs rounded transition-colors"
                                  [class]="actionClass(action.color)">
                            {{ action.icon ?? '' }} {{ action.label }}
                          </button>
                        }
                      }
                    </div>
                  </td>
                }
              </tr>
            } @empty {
              <tr>
                <td [attr.colspan]="columns.length + (actions.length ? 1 : 0)" class="px-4 py-12 text-center text-gray-400">
                  {{ emptyMessage }}
                </td>
              </tr>
            }
          </tbody>
        </table>
      </div>

      <!-- Pagination -->
      @if (totalItems > limit) {
        <div class="px-4 py-3 border-t border-gray-100 flex items-center justify-between text-sm text-gray-600">
          <span>Showing {{ rangeStart() }}–{{ rangeEnd() }} of {{ totalItems }}</span>
          <div class="flex items-center gap-1">
            <button (click)="goToPage(page - 1)" [disabled]="page <= 1"
                    class="px-3 py-1 rounded border border-gray-300 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed">
              ←
            </button>
            @for (p of pageNumbers(); track p) {
              <button (click)="goToPage(p)"
                      class="px-3 py-1 rounded border transition-colors"
                      [class]="p === page ? 'bg-blue-600 text-white border-blue-600' : 'border-gray-300 hover:bg-gray-50'">
                {{ p }}
              </button>
            }
            <button (click)="goToPage(page + 1)" [disabled]="page >= totalPages()"
                    class="px-3 py-1 rounded border border-gray-300 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed">
              →
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

  @Output() pageChange = new EventEmitter<PageEvent>();
  @Output() sortChange = new EventEmitter<SortEvent>();
  @Output() search = new EventEmitter<string>();
  @Output() rowClick = new EventEmitter<any>();

  searchQuery = signal('');
  sortKey = signal('');
  sortDir = signal<'asc' | 'desc'>('asc');

  displayRows = computed(() => {
    if (this.serverSide) return this.data;

    let rows = [...this.data];

    // Client-side search
    const q = this.searchQuery().toLowerCase();
    if (q) {
      rows = rows.filter(row =>
        this.columns.some(col => String(row[col.key] ?? '').toLowerCase().includes(q))
      );
    }

    // Client-side sort
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
    const start = Math.max(1, current - 2);
    const end = Math.min(total, start + 4);
    for (let i = start; i <= end; i++) pages.push(i);
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

  actionClass(color?: string): string {
    switch (color) {
      case 'danger': return 'text-red-600 hover:bg-red-50';
      case 'warning': return 'text-amber-600 hover:bg-amber-50';
      default: return 'text-blue-600 hover:bg-blue-50';
    }
  }
}

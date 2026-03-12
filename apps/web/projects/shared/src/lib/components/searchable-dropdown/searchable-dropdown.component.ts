import {
  Component, Input, Output, EventEmitter, signal, computed,
  HostListener, ElementRef, inject, OnChanges, SimpleChanges,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Subject, debounceTime, distinctUntilChanged, switchMap, of, Observable, catchError } from 'rxjs';
import { NgTemplateOutlet } from '@angular/common';

export interface DropdownOption {
  [key: string]: any;
}

@Component({
  selector: 'ui-searchable-dropdown',
  standalone: true,
  imports: [FormsModule, NgTemplateOutlet],
  template: `
    <div class="relative w-full" #wrapper>

      <!-- Input trigger -->
      <div
        class="flex items-center gap-2 w-full px-3 py-2 border rounded-xl text-sm bg-white cursor-text transition-colors"
        [class.border-sage-500]="isOpen()"
        [class.border-gray-200]="!isOpen()"
        [class.ring-2]="isOpen()"
        [class.ring-sage-100]="isOpen()"
        (click)="openDropdown()"
      >
        <!-- Selected display -->
        @if (selectedItem() && !isOpen()) {
          <span class="flex-1 text-gray-900 truncate">{{ getLabel(selectedItem()) }}</span>
          <button
            type="button"
            class="ml-auto shrink-0 text-gray-400 hover:text-gray-600 leading-none"
            (click)="clear($event)"
            title="Clear selection"
          >
            <svg class="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5">
              <path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12"/>
            </svg>
          </button>
        } @else {
          <input
            #searchInput
            [(ngModel)]="query"
            (ngModelChange)="onQueryChange($event)"
            [placeholder]="placeholder"
            class="flex-1 bg-transparent outline-none text-sm text-gray-700 placeholder:text-gray-400 min-w-0"
            (focus)="onFocus()"
            (blur)="onBlur()"
            autocomplete="off"
          />
          @if (loading()) {
            <svg class="shrink-0 w-4 h-4 text-gray-400 animate-spin" fill="none" viewBox="0 0 24 24">
              <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"/>
              <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"/>
            </svg>
          } @else if (query) {
            <button
              type="button"
              class="shrink-0 text-gray-400 hover:text-gray-600"
              (mousedown)="clearQuery($event)"
            >
              <svg class="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5">
                <path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12"/>
              </svg>
            </button>
          } @else {
            <svg class="shrink-0 w-4 h-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
              <path stroke-linecap="round" stroke-linejoin="round" d="M21 21l-4.35-4.35M17 11A6 6 0 111 11a6 6 0 0116 0z"/>
            </svg>
          }
        }
      </div>

      <!-- Dropdown panel -->
      @if (isOpen()) {
        <div
          class="absolute z-50 mt-1 w-full bg-white border border-gray-200 rounded-xl shadow-lg overflow-hidden"
          style="max-height: 280px; overflow-y: auto;"
        >
          @if (loading()) {
            <div class="px-4 py-3 text-sm text-gray-400 flex items-center gap-2">
              <svg class="w-4 h-4 animate-spin text-sage-500" fill="none" viewBox="0 0 24 24">
                <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"/>
                <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"/>
              </svg>
              Searching…
            </div>
          } @else if (results().length === 0 && query.length >= 1) {
            <div class="px-4 py-3 text-sm text-gray-400">
              {{ noResultsText }}
            </div>
          } @else if (results().length === 0 && query.length === 0) {
            <div class="px-4 py-3 text-sm text-gray-400">
              {{ emptyText }}
            </div>
          } @else {
            @for (item of results(); track getItemKey(item)) {
              <button
                type="button"
                class="w-full text-left px-4 py-2.5 text-sm hover:bg-sage-50 transition-colors border-b border-gray-50 last:border-0"
                [class.bg-sage-50]="isSelected(item)"
                (mousedown)="select(item)"
              >
                <ng-container *ngTemplateOutlet="itemTpl || defaultItemTpl; context: { $implicit: item }"></ng-container>
                <ng-template #defaultItemTpl>
                  <span class="font-medium text-gray-900">{{ getLabel(item) }}</span>
                  @if (sublabelKey && item[sublabelKey]) {
                    <span class="ml-2 text-xs text-gray-400">{{ item[sublabelKey] }}</span>
                  }
                </ng-template>
              </button>
            }
          }
        </div>
      }
    </div>
  `,
})
export class SearchableDropdownComponent implements OnChanges {
  private el = inject(ElementRef);

  /** The async search function — receives query string, returns Observable<any[]> */
  @Input() searchFn!: (query: string) => Observable<any[]>;

  /** Key in the option object to display as label */
  @Input() labelKey = 'name';

  /** Key in the option object used for identity comparison */
  @Input() valueKey = 'id';

  /** Secondary label key shown smaller beside main label */
  @Input() sublabelKey = '';

  /** Placeholder text shown in empty input */
  @Input() placeholder = 'Search…';

  /** Message when no results found */
  @Input() noResultsText = 'No results found';

  /** Message when nothing typed yet and dropdown is open */
  @Input() emptyText = 'Start typing to search…';

  /** Pre-selected value (full object) */
  @Input() value: any = null;

  /** Custom item template (optional) */
  @Input() itemTpl: any = null;

  /** Minimum chars before triggering search (0 = search on open) */
  @Input() minChars = 1;

  @Output() selected = new EventEmitter<any>();
  @Output() cleared = new EventEmitter<void>();

  isOpen = signal(false);
  loading = signal(false);
  results = signal<any[]>([]);
  selectedItem = signal<any>(null);

  query = '';
  private search$ = new Subject<string>();
  private lastQuery = '';

  constructor() {
    this.search$
      .pipe(
        debounceTime(280),
        distinctUntilChanged(),
        switchMap(q => {
          if (q.length < this.minChars) {
            this.results.set([]);
            this.loading.set(false);
            return of([]);
          }
          this.loading.set(true);
          return this.searchFn(q).pipe(catchError(() => of([])));
        }),
      )
      .subscribe(items => {
        this.results.set(items);
        this.loading.set(false);
      });
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['value']) {
      this.selectedItem.set(changes['value'].currentValue ?? null);
    }
  }

  getLabel(item: any): string {
    return item?.[this.labelKey] ?? '';
  }

  getItemKey(item: any): string {
    return item?.[this.valueKey] ?? JSON.stringify(item);
  }

  isSelected(item: any): boolean {
    return this.selectedItem()?.[this.valueKey] === item[this.valueKey];
  }

  onQueryChange(q: string): void {
    this.lastQuery = q;
    this.search$.next(q);
  }

  onFocus(): void {
    this.isOpen.set(true);
    if (this.query.length === 0 && this.minChars === 0) {
      this.triggerSearch('');
    }
  }

  onBlur(): void {
    // Do nothing — let mousedown on option fire first
  }

  openDropdown(): void {
    if (this.selectedItem()) {
      // Re-open to change selection
      this.selectedItem.set(null);
      this.query = '';
      this.results.set([]);
    }
    this.isOpen.set(true);
    setTimeout(() => {
      const input = this.el.nativeElement.querySelector('input');
      input?.focus();
    }, 10);
  }

  select(item: any): void {
    this.selectedItem.set(item);
    this.query = '';
    this.results.set([]);
    this.isOpen.set(false);
    this.selected.emit(item);
  }

  clear(e: Event): void {
    e.stopPropagation();
    this.selectedItem.set(null);
    this.query = '';
    this.results.set([]);
    this.cleared.emit();
    this.selected.emit(null);
  }

  clearQuery(e: Event): void {
    e.preventDefault();
    this.query = '';
    this.results.set([]);
    this.search$.next('');
  }

  private triggerSearch(q: string): void {
    this.loading.set(true);
    this.searchFn(q).pipe(catchError(() => of([]))).subscribe(items => {
      this.results.set(items);
      this.loading.set(false);
    });
  }

  @HostListener('document:mousedown', ['$event'])
  onOutsideClick(e: MouseEvent): void {
    if (!this.el.nativeElement.contains(e.target)) {
      this.isOpen.set(false);
    }
  }
}

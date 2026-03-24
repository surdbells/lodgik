import {
  Component, EventEmitter, Input, OnDestroy, OnInit, Output, inject, signal,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ApiService, ActivePropertyService } from '../services';

export interface EmployeeOption {
  user_id:         string;
  employee_id:     string | null;
  full_name:       string;
  job_title:       string;
  staff_id:        string | null;
  email:           string;
  employment_type: string | null;
}

@Component({
  selector: 'ui-employee-picker',
  standalone: true,
  imports: [FormsModule],
  template: `
    <div class="relative">
      <!-- Selected display / search input -->
      <div class="relative">
        <input
          [(ngModel)]="query"
          (input)="onInput()"
          (focus)="open()"
          [placeholder]="placeholder"
          [class]="inputClass"
          autocomplete="off"
        />
        @if (selected()) {
          <button
            type="button"
            (click)="clear()"
            class="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-700 p-0.5 rounded"
          >
            <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
            </svg>
          </button>
        }
      </div>

      <!-- Dropdown -->
      @if (showDropdown() && (options().length > 0 || loading())) {
        <div class="absolute z-50 mt-1 w-full bg-white border border-gray-200 rounded-xl shadow-lg max-h-56 overflow-y-auto">
          @if (loading()) {
            <div class="px-4 py-3 text-xs text-gray-400 text-center">Searching...</div>
          }
          @for (opt of options(); track opt.user_id) {
            <button
              type="button"
              (click)="select(opt)"
              class="w-full text-left px-4 py-2.5 hover:bg-sage-50 flex items-center gap-3 transition-colors"
            >
              <div class="w-7 h-7 rounded-full bg-sage-100 flex items-center justify-center text-sage-700 text-xs font-bold flex-shrink-0">
                {{ opt.full_name.charAt(0) }}
              </div>
              <div class="flex-1 min-w-0">
                <p class="text-sm font-medium text-gray-800 truncate">{{ opt.full_name }}</p>
                <p class="text-xs text-gray-400 truncate">{{ opt.job_title }}{{ opt.staff_id ? ' · ' + opt.staff_id : '' }}</p>
              </div>
              @if (!opt.employee_id) {
                <span class="text-[10px] bg-amber-50 text-amber-600 px-1.5 py-0.5 rounded-full flex-shrink-0">No HR record</span>
              }
            </button>
          } @empty {
            @if (!loading()) {
              <div class="px-4 py-3 text-xs text-gray-400 text-center">No staff found</div>
            }
          }
        </div>
      }
    </div>
  `,
})
export class EmployeePickerComponent implements OnInit, OnDestroy {
  private api            = inject(ApiService);
  private activeProperty = inject(ActivePropertyService);

  @Input() placeholder  = 'Search staff member...';
  @Input() inputClass   = 'w-full border border-gray-200 rounded-xl px-3 py-2 text-sm bg-gray-50';
  @Input() requireEmployee = false;  // if true, only show staff with an employee record
  @Input() initialValue: EmployeeOption | null = null;

  /** Emits the selected option, or null when cleared */
  @Output() employeeSelected = new EventEmitter<EmployeeOption | null>();

  query        = '';
  selected     = signal<EmployeeOption | null>(null);
  options      = signal<EmployeeOption[]>([]);
  showDropdown = signal(false);
  loading      = signal(false);

  private allOptions: EmployeeOption[] = [];
  private closeTimer: ReturnType<typeof setTimeout> | null = null;

  ngOnInit() {
    if (this.initialValue) {
      this.selected.set(this.initialValue);
      this.query = this.initialValue.full_name;
    }
    this.loadAll();
  }

  ngOnDestroy() {
    if (this.closeTimer) clearTimeout(this.closeTimer);
  }

  private loadAll() {
    this.loading.set(true);
    const pid = this.activeProperty.propertyId();
    this.api.get('/employees/directory', { property_id: pid }).subscribe({
      next: (r: any) => {
        let items: EmployeeOption[] = r.data ?? [];
        if (this.requireEmployee) items = items.filter(i => !!i.employee_id);
        this.allOptions = items;
        this.loading.set(false);
      },
      error: () => this.loading.set(false),
    });
  }

  onInput() {
    this.selected.set(null);
    this.employeeSelected.emit(null);
    this.filter();
    this.showDropdown.set(true);
  }

  open() {
    this.filter();
    this.showDropdown.set(true);
  }

  private filter() {
    const q = this.query.trim().toLowerCase();
    if (!q) {
      this.options.set(this.allOptions.slice(0, 20));
    } else {
      this.options.set(
        this.allOptions.filter(o =>
          o.full_name.toLowerCase().includes(q) ||
          o.email.toLowerCase().includes(q) ||
          (o.staff_id ?? '').toLowerCase().includes(q) ||
          o.job_title.toLowerCase().includes(q)
        ).slice(0, 20)
      );
    }
  }

  select(opt: EmployeeOption) {
    this.selected.set(opt);
    this.query = opt.full_name;
    this.showDropdown.set(false);
    this.employeeSelected.emit(opt);
  }

  clear() {
    this.selected.set(null);
    this.query = '';
    this.options.set(this.allOptions.slice(0, 20));
    this.employeeSelected.emit(null);
  }
}

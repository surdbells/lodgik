import { Component, inject, OnInit, signal, computed } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { DatePipe } from '@angular/common';
import {
  ApiService, PageHeaderComponent, LoadingSpinnerComponent,
  StatsCardComponent, ToastService, ActivePropertyService,
} from '@lodgik/shared';

@Component({
  selector: 'app-reviews',
  standalone: true,
  imports: [FormsModule, DatePipe, PageHeaderComponent, LoadingSpinnerComponent, StatsCardComponent],
  template: `
    <ui-page-header title="Performance Reviews" icon="star" subtitle="Staff evaluations and ratings"
      [breadcrumbs]="['Human Resources', 'Performance Reviews']">
      <button (click)="openCreate()"
        class="px-4 py-2 bg-sage-600 text-white text-sm font-medium rounded-xl hover:bg-sage-700">
        + New Review
      </button>
    </ui-page-header>

    <ui-loading [loading]="loading()"></ui-loading>

    @if (!loading()) {
      <!-- Stats -->
      <div class="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <ui-stats-card label="Total Reviews"  [value]="reviews().length"                          icon="clipboard-list"></ui-stats-card>
        <ui-stats-card label="Draft"           [value]="countByStatus('draft')"                   icon="pencil"></ui-stats-card>
        <ui-stats-card label="Submitted"       [value]="countByStatus('submitted')"               icon="send"></ui-stats-card>
        <ui-stats-card label="Acknowledged"    [value]="countByStatus('acknowledged')"            icon="circle-check"></ui-stats-card>
      </div>

      <!-- Filters -->
      <div class="bg-white rounded-xl border border-gray-100 shadow-card p-4 mb-4 flex flex-wrap gap-3 items-end">
        <div>
          <label class="block text-xs text-gray-500 mb-1">Employee</label>
          <select [(ngModel)]="filterEmp" (change)="load()"
            class="px-3 py-2 border border-gray-200 rounded-xl text-sm bg-gray-50 min-w-[160px]">
            <option value="">All employees</option>
            @for (e of employees(); track (e.employee_id ?? e.user_id)) {
              <option [value]="e.employee_id ?? e.user_id">{{ e.full_name ?? e.name }}</option>
            }
          </select>
        </div>
        <div>
          <label class="block text-xs text-gray-500 mb-1">Status</label>
          <select [(ngModel)]="filterStatus" (change)="applyFilter()"
            class="px-3 py-2 border border-gray-200 rounded-xl text-sm bg-gray-50">
            <option value="">All statuses</option>
            <option value="draft">Draft</option>
            <option value="submitted">Submitted</option>
            <option value="acknowledged">Acknowledged</option>
          </select>
        </div>
        <div>
          <label class="block text-xs text-gray-500 mb-1">Year</label>
          <select [(ngModel)]="filterYear" (change)="applyFilter()"
            class="px-3 py-2 border border-gray-200 rounded-xl text-sm bg-gray-50">
            <option value="">All years</option>
            @for (y of years; track y) { <option [value]="y">{{ y }}</option> }
          </select>
        </div>
      </div>

      <!-- Table -->
      <div class="bg-white rounded-xl border border-gray-100 shadow-card overflow-hidden">
        <table class="w-full text-sm">
          <thead class="bg-gray-50">
            <tr>
              <th class="px-4 py-3 text-left text-xs font-semibold text-gray-500">Employee</th>
              <th class="px-4 py-3 text-left text-xs font-semibold text-gray-500">Reviewer</th>
              <th class="px-4 py-3 text-left text-xs font-semibold text-gray-500">Period</th>
              <th class="px-4 py-3 text-center text-xs font-semibold text-gray-500">Year</th>
              <th class="px-4 py-3 text-center text-xs font-semibold text-gray-500">Rating</th>
              <th class="px-4 py-3 text-center text-xs font-semibold text-gray-500">Status</th>
              <th class="px-4 py-3 text-left text-xs font-semibold text-gray-500">Actions</th>
            </tr>
          </thead>
          <tbody>
            @for (r of filtered(); track r.id) {
              <tr class="border-t border-gray-50 hover:bg-gray-50 cursor-pointer" (click)="openDetail(r)">
                <td class="px-4 py-3 font-medium text-gray-900">{{ r.employee_name }}</td>
                <td class="px-4 py-3 text-gray-600">{{ r.reviewer_name }}</td>
                <td class="px-4 py-3">{{ r.period }}</td>
                <td class="px-4 py-3 text-center">{{ r.year }}</td>
                <td class="px-4 py-3 text-center">
                  <span class="text-amber-400 text-base tracking-tight">
                    {{ '★'.repeat(r.overall_rating) }}{{ '☆'.repeat(5 - r.overall_rating) }}
                  </span>
                  <span class="text-xs text-gray-400 ml-1">{{ r.overall_rating }}/5</span>
                </td>
                <td class="px-4 py-3 text-center">
                  <span class="px-2 py-1 rounded-full text-xs font-medium"
                    [class]="statusClass(r.status)">{{ r.status }}</span>
                </td>
                <td class="px-4 py-3" (click)="$event.stopPropagation()">
                  @if (r.status === 'draft') {
                    <button (click)="submit(r.id)" class="text-blue-600 hover:underline text-xs mr-2">Submit</button>
                  }
                  @if (r.status === 'submitted') {
                    <button (click)="acknowledge(r.id)" class="text-emerald-600 hover:underline text-xs">Acknowledge</button>
                  }
                </td>
              </tr>
            } @empty {
              <tr>
                <td colspan="7" class="px-4 py-10 text-center text-gray-400">
                  No performance reviews found. Create one to get started.
                </td>
              </tr>
            }
          </tbody>
        </table>
      </div>
    }

    <!-- Create Dialog -->
    @if (showCreate) {
      <div class="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4"
           (click)="showCreate = false">
        <div class="bg-white rounded-2xl shadow-2xl p-6 w-full max-w-lg max-h-[90vh] overflow-y-auto"
             (click)="$event.stopPropagation()">
          <h3 class="text-base font-semibold text-gray-900 mb-4">New Performance Review</h3>
          <div class="space-y-3">
            <div>
              <label class="block text-xs text-gray-500 mb-1">Employee <span class="text-red-500">*</span></label>
              <select [(ngModel)]="form.employee_id" (change)="onEmpChange()"
                class="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm bg-gray-50">
                <option value="">Select employee…</option>
                @for (e of employees(); track (e.employee_id ?? e.user_id)) {
                  <option [value]="e.id">{{ e.name }} — {{ e.staff_id }}</option>
                }
              </select>
            </div>
            <div class="grid grid-cols-2 gap-3">
              <div>
                <label class="block text-xs text-gray-500 mb-1">Period <span class="text-red-500">*</span></label>
                <select [(ngModel)]="form.period"
                  class="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm bg-gray-50">
                  <option value="Q1">Q1</option><option value="Q2">Q2</option>
                  <option value="Q3">Q3</option><option value="Q4">Q4</option>
                  <option value="H1">H1</option><option value="H2">H2</option>
                  <option value="Annual">Annual</option>
                </select>
              </div>
              <div>
                <label class="block text-xs text-gray-500 mb-1">Year <span class="text-red-500">*</span></label>
                <input [(ngModel)]="form.year" type="number" [min]="2020" [max]="2030"
                  class="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm bg-gray-50">
              </div>
            </div>
            <div>
              <label class="block text-xs text-gray-500 mb-1">Overall Rating (1–5) <span class="text-red-500">*</span></label>
              <div class="flex gap-2">
                @for (n of [1,2,3,4,5]; track n) {
                  <button type="button" (click)="form.overall_rating = n"
                    class="w-10 h-10 rounded-full border text-lg transition-colors"
                    [class]="form.overall_rating >= n
                      ? 'bg-amber-400 border-amber-400 text-white'
                      : 'border-gray-200 text-gray-300 hover:border-amber-300'">
                    ★
                  </button>
                }
              </div>
            </div>
            <div>
              <label class="block text-xs text-gray-500 mb-1">Strengths</label>
              <textarea [(ngModel)]="form.strengths" rows="2"
                class="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm bg-gray-50 resize-none"
                placeholder="Key strengths observed…"></textarea>
            </div>
            <div>
              <label class="block text-xs text-gray-500 mb-1">Areas for Improvement</label>
              <textarea [(ngModel)]="form.improvements" rows="2"
                class="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm bg-gray-50 resize-none"
                placeholder="Areas to develop…"></textarea>
            </div>
            <div>
              <label class="block text-xs text-gray-500 mb-1">Goals for Next Period</label>
              <textarea [(ngModel)]="form.action_items" rows="2"
                class="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm bg-gray-50 resize-none"
                placeholder="Goals and action items…"></textarea>
            </div>
          </div>
          <div class="flex gap-2 mt-5">
            <button (click)="showCreate = false"
              class="flex-1 px-4 py-2 border border-gray-200 rounded-xl text-sm hover:bg-gray-50">Cancel</button>
            <button (click)="create()" [disabled]="!form.employee_id || !form.period || !form.overall_rating || saving()"
              class="flex-1 px-4 py-2 bg-sage-600 text-white rounded-xl text-sm hover:bg-sage-700 disabled:opacity-50">
              {{ saving() ? 'Saving…' : 'Create Review' }}
            </button>
          </div>
        </div>
      </div>
    }

    <!-- Detail Modal -->
    @if (detailReview()) {
      <div class="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4"
           (click)="detailReview.set(null)">
        <div class="bg-white rounded-2xl shadow-2xl p-6 w-full max-w-lg max-h-[90vh] overflow-y-auto"
             (click)="$event.stopPropagation()">
          <div class="flex items-start justify-between mb-4">
            <div>
              <h3 class="text-base font-semibold text-gray-900">{{ detailReview()!.employee_name }}</h3>
              <p class="text-xs text-gray-400">{{ detailReview()!.period }} {{ detailReview()!.year }}</p>
            </div>
            <span class="px-2 py-1 rounded-full text-xs font-medium" [class]="statusClass(detailReview()!.status)">
              {{ detailReview()!.status }}
            </span>
          </div>
          <div class="mb-4">
            <p class="text-xs text-gray-500 mb-1">Overall Rating</p>
            <span class="text-amber-400 text-xl tracking-wide">
              {{ '★'.repeat(detailReview()!.overall_rating) }}{{ '☆'.repeat(5 - detailReview()!.overall_rating) }}
            </span>
          </div>
          @if (detailReview()!.strengths) {
            <div class="mb-3">
              <p class="text-xs font-semibold text-gray-500 uppercase mb-1">Strengths</p>
              <p class="text-sm text-gray-700 whitespace-pre-line">{{ detailReview()!.strengths }}</p>
            </div>
          }
          @if (detailReview()!.improvements) {
            <div class="mb-3">
              <p class="text-xs font-semibold text-gray-500 uppercase mb-1">Areas for Improvement</p>
              <p class="text-sm text-gray-700 whitespace-pre-line">{{ detailReview()!.improvements }}</p>
            </div>
          }
          @if (detailReview()!.action_items) {
            <div class="mb-3">
              <p class="text-xs font-semibold text-gray-500 uppercase mb-1">Goals / Action Items</p>
              <p class="text-sm text-gray-700 whitespace-pre-line">{{ detailReview()!.action_items }}</p>
            </div>
          }
          <div class="flex gap-2 mt-5">
            <button (click)="detailReview.set(null)"
              class="flex-1 px-4 py-2 border border-gray-200 rounded-xl text-sm hover:bg-gray-50">Close</button>
            @if (detailReview()!.status === 'draft') {
              <button (click)="submit(detailReview()!.id); detailReview.set(null)"
                class="flex-1 px-4 py-2 bg-blue-600 text-white rounded-xl text-sm hover:bg-blue-700">Submit Review</button>
            }
            @if (detailReview()!.status === 'submitted') {
              <button (click)="acknowledge(detailReview()!.id); detailReview.set(null)"
                class="flex-1 px-4 py-2 bg-emerald-600 text-white rounded-xl text-sm hover:bg-emerald-700">Acknowledge</button>
            }
          </div>
        </div>
      </div>
    }
  `,
})
export default class ReviewsPage implements OnInit {
  private api            = inject(ApiService);
  private toast          = inject(ToastService);
  private activeProperty = inject(ActivePropertyService);

  loading      = signal(true);
  saving       = signal(false);
  reviews      = signal<any[]>([]);
  employees    = signal<any[]>([]);
  detailReview = signal<any | null>(null);
  showCreate   = false;

  filterEmp    = '';
  filterStatus = '';
  filterYear   = '';

  readonly years = Array.from({ length: 6 }, (_, i) => new Date().getFullYear() - i);

  form = this.emptyForm();

  readonly filtered = computed(() => {
    let list = this.reviews();
    if (this.filterStatus) list = list.filter(r => r.status === this.filterStatus);
    if (this.filterYear)   list = list.filter(r => String(r.year) === this.filterYear);
    return list;
  });

  ngOnInit(): void {
    this.load();
    this.api.get('/employees/directory', {
      property_id: this.activeProperty.propertyId(),
    }).subscribe({ next: (r: any) => this.employees.set(r.data ?? []) });
  }

  load(): void {
    this.loading.set(true);
    const params: any = { property_id: this.activeProperty.propertyId() };
    if (this.filterEmp) params.employee_id = this.filterEmp;
    this.api.get<any>('/performance-reviews', params).subscribe({
      next: r => { this.reviews.set(r.data ?? []); this.loading.set(false); },
      error: () => this.loading.set(false),
    });
  }

  applyFilter(): void { /* computed() reactive — no explicit call needed */ }

  openCreate(): void { this.form = this.emptyForm(); this.showCreate = true; }

  openDetail(r: any): void { this.detailReview.set(r); }

  onEmpChange(): void {
    const emp = this.employees().find(e => (e.employee_id ?? e.user_id) === this.form.employee_id);
    if (emp) this.form.employee_name = emp.full_name ?? emp.name ?? '';
  }

  create(): void {
    if (!this.form.employee_id || !this.form.period || !this.form.overall_rating) return;
    this.saving.set(true);
    this.api.post<any>('/performance-reviews', {
      property_id:    this.activeProperty.propertyId(),
      employee_id:    this.form.employee_id,
      employee_name:  this.form.employee_name,
      reviewer_name:  'Manager',
      period:         this.form.period,
      year:           this.form.year,
      overall_rating: this.form.overall_rating,
      strengths:      this.form.strengths,
      improvements:   this.form.improvements,
      action_items:   this.form.action_items,
    }).subscribe({
      next: r => {
        this.saving.set(false);
        if (r.success) {
          this.showCreate = false;
          this.toast.success('Review created');
          this.load();
        }
      },
      error: err => {
        this.saving.set(false);
        this.toast.error(err?.error?.error?.message ?? 'Failed to create review');
      },
    });
  }

  submit(id: string): void {
    this.api.post<any>(`/performance-reviews/${id}/submit`, {}).subscribe({
      next: r => { if (r.success) { this.toast.success('Review submitted'); this.load(); } },
      error: () => this.toast.error('Failed to submit review'),
    });
  }

  acknowledge(id: string): void {
    this.api.post<any>(`/performance-reviews/${id}/acknowledge`, {}).subscribe({
      next: r => { if (r.success) { this.toast.success('Review acknowledged'); this.load(); } },
      error: () => this.toast.error('Failed to acknowledge review'),
    });
  }

  countByStatus(s: string): number {
    return this.reviews().filter(r => r.status === s).length;
  }

  statusClass(status: string): string {
    const map: Record<string, string> = {
      draft:        'bg-gray-100 text-gray-600',
      submitted:    'bg-blue-100 text-blue-700',
      acknowledged: 'bg-emerald-100 text-emerald-700',
    };
    return map[status] ?? 'bg-gray-100 text-gray-500';
  }

  private emptyForm() {
    return {
      employee_id:    '',
      employee_name:  '',
      period:         'Q1',
      year:           new Date().getFullYear(),
      overall_rating: 0,
      strengths:      '',
      improvements:   '',
      action_items:   '',
    };
  }
}

import { Component, inject, OnInit, signal, computed } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { DatePipe } from '@angular/common';
import { ApiService, PageHeaderComponent, LoadingSpinnerComponent, ToastService, StatsCardComponent, ActivePropertyService, EmployeePickerComponent } from '@lodgik/shared';
import type { EmployeeOption } from '@lodgik/shared';

@Component({
  selector: 'app-performance-reviews',
  standalone: true,
  imports: [FormsModule, DatePipe, PageHeaderComponent, LoadingSpinnerComponent, StatsCardComponent, EmployeePickerComponent],
  template: `
<ui-page-header title="Performance & Goals" icon="star" subtitle="Reviews, KRAs and employee objectives" [breadcrumbs]="['HR', 'Performance']">
  <button (click)="showAddReview=true" class="px-4 py-2 bg-sage-600 text-white text-sm font-medium rounded-xl hover:bg-sage-700">+ New Review</button>
</ui-page-header>

<div class="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-5">
  <ui-stats-card label="Reviews This Year" [value]="reviews().length" icon="star"></ui-stats-card>
  <ui-stats-card label="Average Rating"    [value]="avgRating()" icon="trending-up"></ui-stats-card>
  <ui-stats-card label="Active Goals"      [value]="activeGoalsCount()" icon="clipboard-list"></ui-stats-card>
  <ui-stats-card label="Achieved Goals"    [value]="achievedGoalsCount()" icon="circle-check"></ui-stats-card>
</div>

<!-- Tabs -->
<div class="flex border-b mb-5">
  @for (tab of tabs; track tab) {
    <button (click)="activeTab=tab" class="px-4 py-2.5 text-sm font-medium border-b-2 -mb-px transition-colors"
      [class]="activeTab===tab ? 'border-sage-600 text-sage-700' : 'border-transparent text-gray-500 hover:text-gray-700'">{{ tab }}</button>
  }
</div>

<ui-loading [loading]="loading()"></ui-loading>

@if (!loading()) {
  @if (activeTab === 'Reviews') {
    <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
      @for (r of reviews(); track r.id) {
        <div class="bg-white rounded-xl border border-gray-100 shadow-card p-5">
          <div class="flex items-start justify-between mb-3">
            <div>
              <p class="text-sm font-semibold text-gray-800">{{ r.employee_name }}</p>
              <p class="text-xs text-gray-400">{{ r.reviewer_name }}</p>
            </div>
            <span class="text-lg font-bold" [class]="ratingColor(r.overall_rating)">{{ r.overall_rating }}/5</span>
          </div>
          <div class="flex gap-1 mb-3">
            @for (star of [1,2,3,4,5]; track star) {
              <span [class]="star <= r.overall_rating ? 'text-amber-400' : 'text-gray-200'" class="text-base">★</span>
            }
          </div>
          <p class="text-xs text-gray-500">{{ r.period }} {{ r.year }}</p>
          @if (r.strengths) { <p class="text-xs text-gray-600 mt-2 line-clamp-2">{{ r.strengths }}</p> }
        </div>
      } @empty {
        <div class="col-span-3 text-center py-10 text-gray-400"><p class="text-sm">No reviews yet</p></div>
      }
    </div>
  }

  @if (activeTab === 'Goals') {
    <div class="space-y-3">
      @for (g of goals(); track g.id) {
        <div class="bg-white rounded-xl border border-gray-100 shadow-card p-4 flex items-center gap-4">
          <div class="flex-1 min-w-0">
            <div class="flex items-center gap-2">
              <p class="text-sm font-medium text-gray-800 truncate">{{ g.title }}</p>
              <span class="text-[10px] px-1.5 py-0.5 rounded-full"
                [class]="g.status==='achieved'?'bg-emerald-50 text-emerald-700':g.status==='missed'?'bg-red-50 text-red-600':'bg-blue-50 text-blue-700'">
                {{ g.status }}</span>
            </div>
            <p class="text-xs text-gray-400 mt-0.5">{{ g.category }} · Weight {{ g.weight }}% · Due {{ g.due_date | date:"dd MMM" }}</p>
          </div>
          @if (g.progress_pct !== null) {
            <div class="w-24 flex-shrink-0">
              <div class="text-xs text-gray-400 text-right mb-1">{{ g.progress_pct }}%</div>
              <div class="h-2 bg-gray-100 rounded-full overflow-hidden">
                <div class="h-full rounded-full transition-all"
                  [style.width]="g.progress_pct + '%'"
                  [class]="g.progress_pct>=100?'bg-emerald-500':g.progress_pct>=60?'bg-amber-400':'bg-sage-500'"></div>
              </div>
            </div>
          }
        </div>
      } @empty {
        <div class="text-center py-10 text-gray-400"><p class="text-sm">No goals set</p></div>
      }
    </div>
  }
}

<!-- Add Review Modal -->
@if (showAddReview) {
  <div class="fixed inset-0 bg-black/50 flex items-center justify-center z-50" (click)="showAddReview=false">
    <div class="bg-white rounded-2xl shadow-2xl w-full max-w-md p-5" (click)="$event.stopPropagation()">
      <h3 class="text-base font-semibold mb-4">New Performance Review</h3>
      <div class="space-y-3">
        <div class="col-span-2">
          <label class="text-xs text-gray-500 mb-1 block">Employee *</label>
          <ui-employee-picker (employeeSelected)="onEmployeePicked($event)" placeholder="Search staff member..."></ui-employee-picker>
          @if (reviewForm.employee_name) {
            <p class="text-xs text-sage-600 mt-1">✓ {{ reviewForm.employee_name }}</p>
          }
        </div>
        <div class="grid grid-cols-2 gap-3">
          <div><label class="text-xs text-gray-500 mb-1 block">Period</label>
            <select [(ngModel)]="reviewForm.period" class="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm bg-gray-50">
              <option value="Q1">Q1</option><option value="Q2">Q2</option>
              <option value="Q3">Q3</option><option value="Q4">Q4</option><option value="Annual">Annual</option>
            </select></div>
          <div><label class="text-xs text-gray-500 mb-1 block">Year</label>
            <input [(ngModel)]="reviewForm.year" type="number" class="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm bg-gray-50"></div>
        </div>
        <div><label class="text-xs text-gray-500 mb-1 block">Overall Rating (1–5)</label>
          <input [(ngModel)]="reviewForm.overall_rating" type="number" min="1" max="5" class="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm bg-gray-50"></div>
        <div><label class="text-xs text-gray-500 mb-1 block">Strengths</label>
          <textarea [(ngModel)]="reviewForm.strengths" rows="2" class="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm bg-gray-50"></textarea></div>
        <div><label class="text-xs text-gray-500 mb-1 block">Areas for Improvement</label>
          <textarea [(ngModel)]="reviewForm.areas_for_improvement" rows="2" class="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm bg-gray-50"></textarea></div>
      </div>
      <div class="flex justify-end gap-2 mt-4">
        <button (click)="showAddReview=false" class="px-4 py-2 text-sm border border-gray-200 rounded-xl text-gray-600 hover:bg-gray-50">Cancel</button>
        <button (click)="submitReview()" class="px-4 py-2 text-sm bg-sage-600 text-white rounded-xl hover:bg-sage-700">Save</button>
      </div>
    </div>
  </div>
}
  `,
})
export class PerformanceReviewsPage implements OnInit {
  private api = inject(ApiService); private toast = inject(ToastService);
  private activeProperty = inject(ActivePropertyService);
  loading = signal(true); reviews = signal<any[]>([]); goals = signal<any[]>([]);
  activeTab = 'Reviews';
  readonly activeGoalsCount   = computed(() => this.goals().filter(g => g.status === 'active').length);
  readonly achievedGoalsCount = computed(() => this.goals().filter(g => g.status === 'achieved').length); tabs = ['Reviews', 'Goals'];
  showAddReview = false;
  reviewForm: any = { employee_id:'', employee_name:'', period:'Q4', year:new Date().getFullYear(), overall_rating:3, strengths:'', areas_for_improvement:'' };
  onEmployeePicked(opt: EmployeeOption | null) {
    this.reviewForm.employee_id   = opt?.employee_id ?? opt?.user_id ?? '';
    this.reviewForm.employee_name = opt?.full_name ?? '';
  }
  ngOnInit() { this.load(); }
  load() {
    this.loading.set(true);
    const pid = this.activeProperty.propertyId();
    this.api.get('/performance-reviews', { property_id: pid }).subscribe({ next:(r:any)=>{ this.reviews.set(r.data??[]); this.loading.set(false); }, error:()=>this.loading.set(false) });
  }
  avgRating(): string {
    const rs = this.reviews(); if (!rs.length) return '—';
    return (rs.reduce((s,r)=>s+r.overall_rating,0)/rs.length).toFixed(1);
  }
  ratingColor = (r: number) => r >= 4 ? 'text-emerald-600' : r >= 3 ? 'text-amber-500' : 'text-red-500';
  submitReview() {
    const pid = this.activeProperty.propertyId();
    const data = { ...this.reviewForm, property_id: pid, reviewer_id:'', reviewer_name:'Manager' };
    this.api.post('/performance-reviews', data).subscribe((r:any)=>{ if(r.success){this.toast.success('Review saved');this.showAddReview=false;this.load();}else this.toast.error(r.message||'Failed'); });
  }
}

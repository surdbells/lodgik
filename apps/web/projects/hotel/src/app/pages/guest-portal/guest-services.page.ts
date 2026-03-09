import { Component, signal, inject, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { DatePipe } from '@angular/common';
import { RouterLink } from '@angular/router';
import { LucideAngularModule, ArrowLeft, Sparkles, Send, RotateCcw } from 'lucide-angular';
import { GuestApiService } from '../../services/guest-api.service';
import { GuestThemeService } from '../../services/guest-theme.service';

const CATEGORIES = [
  { value: 'housekeeping', label: 'Housekeeping',    icon: '🧹' },
  { value: 'food',         label: 'Food & Beverage', icon: '🍽️' },
  { value: 'maintenance',  label: 'Maintenance',     icon: '🔧' },
  { value: 'transport',    label: 'Transport',       icon: '🚗' },
  { value: 'amenity',      label: 'Amenity',         icon: '🎁' },
  { value: 'laundry',      label: 'Laundry',         icon: '👔' },
  { value: 'other',        label: 'Other',           icon: '📋' },
];

const STATUS_META: Record<string, { label: string; color: string }> = {
  pending:     { label: 'Pending',     color: '#f59e0b' },
  assigned:    { label: 'Assigned',    color: '#3b82f6' },
  in_progress: { label: 'In Progress', color: '#8b5cf6' },
  completed:   { label: 'Done',        color: '#10b981' },
  cancelled:   { label: 'Cancelled',   color: '#6b7280' },
};

@Component({
  selector: 'app-guest-services',
  standalone: true,
  imports: [FormsModule, DatePipe, RouterLink, LucideAngularModule],
  template: `
    <div class="px-4 py-6 max-w-md mx-auto">

      <!-- Header -->
      <div class="flex items-center gap-3 mb-5">
        <a routerLink="/guest/home" class="transition-colors" [class]="th.backBtn()">
          <lucide-icon [img]="ArrowLeftIcon" class="w-5 h-5"></lucide-icon>
        </a>
        <div class="flex items-center gap-2">
          <lucide-icon [img]="SparklesIcon" class="w-5 h-5 text-amber-400"></lucide-icon>
          <h2 class="text-lg font-bold" [class]="th.text()">Room Services</h2>
        </div>
      </div>

      <!-- Category picker -->
      @if (!showForm() && !submitted()) {
        <p class="text-sm mb-4" [class]="th.muted()">What do you need?</p>
        <div class="grid grid-cols-2 gap-3 mb-6">
          @for (cat of categories; track cat.value) {
            <button (click)="selectCategory(cat)"
              class="rounded-2xl p-4 flex flex-col items-center gap-2 transition-all active:scale-95 text-center"
              [class]="th.cardHover()">
              <span class="text-3xl">{{ cat.icon }}</span>
              <span class="text-xs font-medium" [class]="th.muted()">{{ cat.label }}</span>
            </button>
          }
        </div>

        <!-- Past requests -->
        @if (requests().length) {
          <div class="mt-2">
            <h3 class="text-xs font-semibold uppercase tracking-wide mb-3" [class]="th.subtle()">My Requests</h3>
            <div class="space-y-2">
              @for (r of requests(); track r.id) {
                <div class="rounded-xl p-3 flex items-start justify-between" [class]="th.card()">
                  <div class="flex-1 min-w-0 pr-2">
                    <p class="text-sm truncate" [class]="th.text()">
                      {{ getCatIcon(r.category) }} {{ r.title }}
                    </p>
                    <p class="text-[11px] mt-0.5" [class]="th.subtle()">
                      {{ r.created_at | date:'dd MMM HH:mm' }}
                    </p>
                  </div>
                  <span class="text-[10px] px-2 py-0.5 rounded-full font-medium shrink-0 mt-0.5"
                    [style.background-color]="getStatusColor(r.status) + '33'"
                    [style.color]="getStatusColor(r.status)">
                    {{ getStatusLabel(r.status) }}
                  </span>
                </div>
              }
            </div>
          </div>
        }
      }

      <!-- Request form -->
      @if (showForm() && !submitted()) {
        <div>
          <button (click)="showForm.set(false)"
            class="flex items-center gap-1.5 text-sm mb-4 transition-colors" [class]="th.muted()">
            <lucide-icon [img]="ArrowLeftIcon" class="w-4 h-4"></lucide-icon>
            Back
          </button>

          <div class="rounded-2xl p-4 mb-4 flex items-center gap-3" [class]="th.card()">
            <span class="text-3xl">{{ selectedCategory()!.icon }}</span>
            <div>
              <p class="text-sm font-semibold" [class]="th.text()">{{ selectedCategory()!.label }}</p>
              <p class="text-[11px]" [class]="th.subtle()">Describe what you need below</p>
            </div>
          </div>

          <div class="space-y-3 mb-5">
            <div>
              <label class="block mb-1.5" [class]="th.inputLabel()">Request title *</label>
              <input [(ngModel)]="form.title" type="text"
                placeholder="e.g. Extra towels, Fix AC, Ice bucket…"
                class="w-full px-4 py-3 rounded-xl text-sm" [class]="th.input()">
            </div>
            <div>
              <label class="block mb-1.5" [class]="th.inputLabel()">Additional details</label>
              <textarea [(ngModel)]="form.description" rows="3"
                placeholder="Any extra information for our team…"
                class="w-full px-4 py-3 rounded-xl text-sm resize-none" [class]="th.input()">
              </textarea>
            </div>
            <div>
              <label class="block mb-1.5" [class]="th.inputLabel()">Priority</label>
              <div class="flex gap-2">
                @for (p of priorities; track p.value) {
                  <button type="button" (click)="form.priority = p.value"
                    class="flex-1 py-2 rounded-xl text-xs font-medium border transition-colors"
                    [class]="form.priority === p.value
                      ? 'bg-amber-400 border-amber-400 text-slate-900'
                      : (th.isDark() ? 'border-white/20 text-white/50 hover:border-white/40' : 'border-gray-300 text-gray-500 hover:border-gray-400')">
                    {{ p.label }}
                  </button>
                }
              </div>
            </div>
          </div>

          @if (error()) {
            <p class="text-red-400 text-xs mb-3 px-1">{{ error() }}</p>
          }

          <button (click)="submit()" [disabled]="!form.title.trim() || submitting()"
            class="w-full py-3.5 bg-amber-400 text-slate-900 font-semibold rounded-2xl
                   disabled:opacity-40 disabled:cursor-not-allowed transition-colors
                   flex items-center justify-center gap-2">
            <lucide-icon [img]="SendIcon" class="w-4 h-4"></lucide-icon>
            {{ submitting() ? 'Sending…' : 'Submit Request' }}
          </button>
        </div>
      }

      <!-- Success -->
      @if (submitted()) {
        <div class="text-center py-16">
          <div class="w-16 h-16 bg-emerald-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
            <lucide-icon [img]="SparklesIcon" class="w-8 h-8 text-emerald-400"></lucide-icon>
          </div>
          <h3 class="text-xl font-bold mb-2" [class]="th.text()">Request Sent!</h3>
          <p class="text-sm mb-6" [class]="th.muted()">Our team has been notified and will attend to you shortly.</p>
          <button (click)="reset()"
            class="flex items-center gap-2 px-6 py-3 rounded-2xl text-sm mx-auto transition-colors"
            [class]="th.cardHover()">
            <lucide-icon [img]="RotateCcwIcon" class="w-4 h-4" [class]="th.muted()"></lucide-icon>
            <span [class]="th.muted()">Make another request</span>
          </button>
        </div>
      }
    </div>
  `,
})
export default class GuestServicesPage implements OnInit {
  private guestApi = inject(GuestApiService);
  readonly th      = inject(GuestThemeService);

  readonly ArrowLeftIcon = ArrowLeft;
  readonly SparklesIcon  = Sparkles;
  readonly SendIcon      = Send;
  readonly RotateCcwIcon = RotateCcw;

  loading          = signal(true);
  requests         = signal<any[]>([]);
  showForm         = signal(false);
  submitted        = signal(false);
  submitting       = signal(false);
  error            = signal<string | null>(null);
  selectedCategory = signal<typeof CATEGORIES[0] | null>(null);

  readonly categories = CATEGORIES;
  readonly priorities = [
    { value: 1, label: 'Low'    },
    { value: 2, label: 'Normal' },
    { value: 3, label: 'High'   },
  ];

  form = { title: '', description: '', priority: 2 };

  ngOnInit(): void { this.loadRequests(); }

  selectCategory(cat: typeof CATEGORIES[0]): void {
    this.selectedCategory.set(cat);
    this.form = { title: '', description: '', priority: 2 };
    this.error.set(null);
    this.showForm.set(true);
  }

  submit(): void {
    if (!this.form.title.trim()) return;
    this.error.set(null);
    this.submitting.set(true);
    this.guestApi.post<any>('/guest/service-requests', {
      category:    this.selectedCategory()!.value,
      title:       this.form.title.trim(),
      description: this.form.description.trim() || null,
      priority:    this.form.priority,
    }).subscribe({
      next: (r: any) => {
        this.submitting.set(false);
        if (r.success) { this.showForm.set(false); this.submitted.set(true); this.loadRequests(); }
        else { this.error.set(r.message ?? 'Failed to submit'); }
      },
      error: (err: any) => {
        this.submitting.set(false);
        this.error.set(err?.error?.error?.message ?? 'Failed to submit request');
      },
    });
  }

  reset(): void { this.submitted.set(false); this.showForm.set(false); }
  getCatIcon(val: string): string { return CATEGORIES.find(c => c.value === val)?.icon ?? '📋'; }
  getStatusLabel(s: string): string { return STATUS_META[s]?.label ?? s; }
  getStatusColor(s: string): string { return STATUS_META[s]?.color ?? '#6b7280'; }

  private loadRequests(): void {
    this.guestApi.get<any>('/guest/service-requests').subscribe({
      next: (r: any) => { this.requests.set(r.data ?? []); this.loading.set(false); },
      error: () => this.loading.set(false),
    });
  }
}

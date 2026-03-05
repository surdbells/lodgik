import { Component, signal, inject, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { DatePipe } from '@angular/common';
import { RouterLink } from '@angular/router';
import { HttpClient, HttpHeaders } from '@angular/common/http';

const CATEGORIES = [
  { value: 'housekeeping',  label: 'Housekeeping',    icon: '🧹' },
  { value: 'food_beverage', label: 'Food & Beverage', icon: '🍽️' },
  { value: 'maintenance',   label: 'Maintenance',     icon: '🔧' },
  { value: 'transport',     label: 'Transport',       icon: '🚗' },
  { value: 'concierge',     label: 'Concierge',       icon: '🎩' },
  { value: 'amenity',       label: 'Amenity',         icon: '🎁' },
  { value: 'other',         label: 'Other',           icon: '❓' },
];

@Component({
  selector: 'app-guest-services',
  standalone: true,
  imports: [FormsModule, DatePipe, RouterLink],
  template: `
    <div class="px-4 py-6 max-w-md mx-auto">
      <div class="flex items-center gap-3 mb-5">
        <a routerLink="/guest/home" class="text-white/50 hover:text-white text-xl">←</a>
        <h2 class="text-lg font-bold text-white">Room Services</h2>
      </div>

      <!-- Category picker -->
      @if (!showForm()) {
        <p class="text-sm text-white/50 mb-4">What do you need?</p>
        <div class="grid grid-cols-2 gap-3 mb-6">
          @for (cat of categories; track cat.value) {
            <button (click)="selectCategory(cat)"
              class="bg-white/8 hover:bg-white/14 border border-white/10 rounded-2xl p-4 flex flex-col items-center gap-2
                     transition-all active:scale-95 text-center">
              <span class="text-3xl">{{ cat.icon }}</span>
              <span class="text-xs font-medium text-white/70">{{ cat.label }}</span>
            </button>
          }
        </div>

        <!-- Past requests -->
        @if (requests().length) {
          <div class="mt-4">
            <h3 class="text-xs font-semibold text-white/40 uppercase tracking-wide mb-3">My Requests</h3>
            <div class="space-y-2">
              @for (r of requests(); track r.id) {
                <div class="bg-white/5 border border-white/10 rounded-xl p-3 flex items-start justify-between">
                  <div>
                    <p class="text-sm text-white/80">{{ r.category_icon }} {{ r.title }}</p>
                    <p class="text-[11px] text-white/40 mt-0.5">{{ r.created_at | date:'dd MMM HH:mm' }}</p>
                  </div>
                  <span class="text-[10px] px-2 py-0.5 rounded-full font-medium mt-0.5"
                    [style.background-color]="r.status_color + '33'"
                    [style.color]="r.status_color">
                    {{ r.status_label }}
                  </span>
                </div>
              }
            </div>
          </div>
        }
      }

      <!-- Request form -->
      @if (showForm()) {
        <div>
          <button (click)="showForm.set(false)" class="flex items-center gap-2 text-white/50 hover:text-white text-sm mb-4">
            ← Back
          </button>

          <div class="bg-white/8 border border-white/10 rounded-2xl p-4 mb-4 flex items-center gap-3">
            <span class="text-3xl">{{ selectedCategory()!.icon }}</span>
            <div>
              <p class="text-sm font-semibold text-white">{{ selectedCategory()!.label }}</p>
              <p class="text-[11px] text-white/40">Describe what you need below</p>
            </div>
          </div>

          <div class="space-y-3 mb-5">
            <div>
              <label class="block text-xs text-white/50 mb-1.5">Request title <span class="text-red-400">*</span></label>
              <input [(ngModel)]="form.title" type="text" placeholder="e.g. Extra towels, Fix AC, Ice bucket…"
                class="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-xl text-white text-sm
                       placeholder-white/30 focus:outline-none focus:ring-2 focus:ring-amber-400 focus:border-transparent">
            </div>
            <div>
              <label class="block text-xs text-white/50 mb-1.5">Additional details</label>
              <textarea [(ngModel)]="form.description" rows="3"
                placeholder="Any extra information for our team…"
                class="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-xl text-white text-sm
                       placeholder-white/30 focus:outline-none focus:ring-2 focus:ring-amber-400 resize-none">
              </textarea>
            </div>
            <div>
              <label class="block text-xs text-white/50 mb-1.5">Priority</label>
              <div class="flex gap-2">
                @for (p of priorities; track p.value) {
                  <button type="button" (click)="form.priority = p.value"
                    class="flex-1 py-2 rounded-xl text-xs font-medium border transition-colors"
                    [class]="form.priority === p.value
                      ? 'bg-amber-400 border-amber-400 text-slate-900'
                      : 'border-white/20 text-white/50 hover:border-white/40'">
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
            class="w-full py-3.5 bg-amber-400 text-slate-900 font-semibold rounded-2xl hover:bg-amber-300
                   disabled:opacity-40 disabled:cursor-not-allowed transition-colors">
            {{ submitting() ? 'Sending…' : '🛎️ Submit Request' }}
          </button>
        </div>
      }

      <!-- Success state -->
      @if (submitted()) {
        <div class="text-center py-16">
          <p class="text-5xl mb-4">✅</p>
          <h3 class="text-xl font-bold text-white mb-2">Request Sent!</h3>
          <p class="text-white/50 text-sm mb-6">Our team has been notified and will attend to you shortly.</p>
          <button (click)="reset()"
            class="px-6 py-3 bg-white/10 border border-white/20 rounded-2xl text-white text-sm hover:bg-white/15">
            Make another request
          </button>
        </div>
      }
    </div>
  `,
})
export default class GuestServicesPage implements OnInit {
  private http = inject(HttpClient);

  loading    = signal(true);
  requests   = signal<any[]>([]);
  showForm   = signal(false);
  submitted  = signal(false);
  submitting = signal(false);
  error      = signal<string | null>(null);
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

    const headers = this.guestHeaders();
    const baseUrl = (window as any).__LODGIK_API_URL__ ?? '';

    this.http.post<any>(`${baseUrl}/api/guest/service-requests`, {
      category:    this.selectedCategory()!.value,
      title:       this.form.title.trim(),
      description: this.form.description.trim() || null,
      priority:    this.form.priority,
    }, { headers }).subscribe({
      next: r => {
        this.submitting.set(false);
        if (r.success) {
          this.showForm.set(false);
          this.submitted.set(true);
          this.loadRequests();
        } else {
          this.error.set(r.message ?? 'Failed to submit');
        }
      },
      error: err => {
        this.submitting.set(false);
        this.error.set(err?.error?.error?.message ?? 'Failed to submit request');
      },
    });
  }

  reset(): void { this.submitted.set(false); this.showForm.set(false); }

  private loadRequests(): void {
    const headers = this.guestHeaders();
    const baseUrl = (window as any).__LODGIK_API_URL__ ?? '';

    this.http.get<any>(`${baseUrl}/api/guest/service-requests`, { headers }).subscribe({
      next: r => { this.requests.set(r.data ?? []); this.loading.set(false); },
      error: () => this.loading.set(false),
    });
  }

  private guestHeaders(): HttpHeaders {
    const token = localStorage.getItem('guest_token') ?? '';
    return new HttpHeaders({ Authorization: `Bearer ${token}` });
  }
}

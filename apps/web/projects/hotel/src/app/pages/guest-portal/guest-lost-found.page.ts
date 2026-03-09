import { Component, signal, inject, OnInit } from '@angular/core';
import { RouterLink } from '@angular/router';
import { DatePipe } from '@angular/common';
import { LucideAngularModule, ArrowLeft, SearchX, Plus, CheckCircle2, Clock } from 'lucide-angular';
import { GuestApiService } from '../../services/guest-api.service';
import { GuestThemeService } from '../../services/guest-theme.service';

@Component({
  selector: 'app-guest-lost-found',
  standalone: true,
  imports: [RouterLink, DatePipe, LucideAngularModule],
  template: `
    <div class="px-4 py-6 max-w-md mx-auto">

      <!-- Header -->
      <div class="flex items-center gap-3 mb-5">
        <a routerLink="/guest/home" class="transition-colors" [class]="th.backBtn()">
          <lucide-icon [img]="ArrowLeftIcon" class="w-5 h-5"></lucide-icon>
        </a>
        <div class="flex-1">
          <h2 class="text-lg font-bold" [class]="th.text()">Lost & Found</h2>
          <p class="text-xs" [class]="th.muted()">Report a lost item and we'll help you find it</p>
        </div>
        @if (!showForm()) {
          <button (click)="showForm.set(true)"
            class="flex items-center gap-1.5 bg-amber-400 text-slate-900 text-xs font-bold px-3 py-2 rounded-xl active:scale-95 transition-all">
            <lucide-icon [img]="PlusIcon" class="w-3.5 h-3.5"></lucide-icon>
            Report
          </button>
        }
      </div>

      <!-- Form -->
      @if (showForm()) {
        <div class="rounded-2xl p-5 mb-5" [class]="th.card()">
          <h3 class="text-sm font-bold mb-4" [class]="th.text()">Report Lost Item</h3>
          <div class="space-y-3">
            <div>
              <label class="block mb-1" [class]="th.inputLabel()">Item Description *</label>
              <input type="text"
                (input)="setField('item_description', $any($event.target).value)"
                placeholder="e.g. Black leather wallet, iPhone charger…"
                class="w-full rounded-xl px-3 py-2.5 text-sm" [class]="th.input()">
            </div>
            <div>
              <label class="block mb-1" [class]="th.inputLabel()">Where did you last see it?</label>
              <input type="text"
                (input)="setField('last_seen_location', $any($event.target).value)"
                placeholder="e.g. Restaurant, gym, room 204…"
                class="w-full rounded-xl px-3 py-2.5 text-sm" [class]="th.input()">
            </div>
            <div>
              <label class="block mb-1" [class]="th.inputLabel()">Additional Details</label>
              <textarea rows="2"
                (input)="setField('additional_details', $any($event.target).value)"
                placeholder="Any other details that might help us locate it…"
                class="w-full rounded-xl px-3 py-2.5 text-sm resize-none" [class]="th.input()">
              </textarea>
            </div>
          </div>

          @if (formError()) {
            <div class="mt-3 rounded-xl px-3 py-2.5 text-xs" [class]="th.danger()">{{ formError() }}</div>
          }

          <div class="flex gap-2 mt-4">
            <button (click)="showForm.set(false); formError.set('')"
              class="flex-1 rounded-xl py-2.5 text-sm font-medium transition-all" [class]="th.badge()">
              Cancel
            </button>
            <button (click)="submit()" [disabled]="submitting()"
              class="flex-1 bg-amber-400 text-slate-900 rounded-xl py-2.5 text-sm font-bold
                     transition-all active:scale-95 disabled:opacity-60">
              @if (submitting()) {
                <span class="flex items-center justify-center gap-2">
                  <span class="w-4 h-4 border-2 border-slate-900 border-t-transparent rounded-full animate-spin"></span>
                  Submitting…
                </span>
              } @else {
                Submit Report
              }
            </button>
          </div>
        </div>
      }

      <!-- Loading -->
      @if (loading()) {
        <div class="flex justify-center py-16">
          <div class="w-7 h-7 border-2 rounded-full animate-spin" [class]="th.spinner()"></div>
        </div>
      }

      <!-- List -->
      @if (!loading()) {
        @if (reports().length === 0 && !showForm()) {
          <div class="text-center py-16">
            <div class="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-3" [class]="th.iconCircle()">
              <lucide-icon [img]="SearchXIcon" class="w-7 h-7" [class]="th.subtle()"></lucide-icon>
            </div>
            <p class="text-sm font-medium" [class]="th.muted()">No reports submitted</p>
            <p class="text-xs mt-1" [class]="th.subtle()">Tap "Report" to tell us about a lost item</p>
          </div>
        }

        @for (r of reports(); track r.id) {
          <div class="rounded-2xl p-4 mb-3" [class]="th.card()">
            <div class="flex items-start justify-between mb-2">
              <p class="text-sm font-semibold flex-1 pr-3" [class]="th.text()">{{ r.title }}</p>
              <span class="text-[11px] font-medium px-2 py-0.5 rounded-full shrink-0"
                [class]="r.status === 'pending' ? (th.isDark() ? 'bg-amber-500/20 text-amber-300' : 'bg-amber-100 text-amber-700')
                        : (th.isDark() ? 'bg-emerald-500/20 text-emerald-300' : 'bg-emerald-100 text-emerald-700')">
                {{ r.status | titlecase }}
              </span>
            </div>
            @if (r.description) {
              <p class="text-xs mb-2" [class]="th.muted()">{{ r.description }}</p>
            }
            <div class="flex items-center gap-1.5 text-xs" [class]="th.subtle()">
              <lucide-icon [img]="ClockIcon" class="w-3.5 h-3.5"></lucide-icon>
              <span>{{ r.created_at | date:'dd MMM, h:mm a' }}</span>
            </div>
          </div>
        }
      }

    </div>
  `,
})
export default class GuestLostFoundPage implements OnInit {
  private api = inject(GuestApiService);
  readonly th = inject(GuestThemeService);

  readonly ArrowLeftIcon   = ArrowLeft;
  readonly SearchXIcon     = SearchX;
  readonly PlusIcon        = Plus;
  readonly CheckCircle2Icon = CheckCircle2;
  readonly ClockIcon       = Clock;

  reports   = signal<any[]>([]);
  loading   = signal(true);
  showForm  = signal(false);
  submitting = signal(false);
  formError  = signal('');
  form       = signal<Record<string,string>>({ item_description: '', last_seen_location: '', additional_details: '' });

  ngOnInit(): void { this.load(); }

  setField(key: string, v: string): void { this.form.update(f => ({ ...f, [key]: v })); }

  load(): void {
    this.api.get<any>('/guest/lost-and-found').subscribe({
      next: (r: any) => { this.reports.set(r.data ?? []); this.loading.set(false); },
      error: () => this.loading.set(false),
    });
  }

  submit(): void {
    const f = this.form();
    if (!f['item_description']?.trim()) { this.formError.set('Item description is required'); return; }
    this.submitting.set(true);
    this.formError.set('');
    this.api.post('/guest/lost-and-found', {
      item_description:   f['item_description'].trim(),
      last_seen_location: f['last_seen_location']?.trim() || null,
      additional_details: f['additional_details']?.trim() || null,
    }).subscribe({
      next: (r: any) => {
        this.reports.update(list => [r.data, ...list]);
        this.submitting.set(false);
        this.showForm.set(false);
        this.form.set({ item_description: '', last_seen_location: '', additional_details: '' });
      },
      error: (e: any) => {
        this.submitting.set(false);
        this.formError.set(e?.error?.error?.message ?? 'Failed to submit');
      },
    });
  }
}

import { Component, signal, inject, OnInit, computed } from '@angular/core';
import { RouterLink } from '@angular/router';
import { DatePipe } from '@angular/common';
import { LucideAngularModule, ArrowLeft, CalendarPlus, CheckCircle2 } from 'lucide-angular';
import { GuestApiService } from '../../services/guest-api.service';
import { GuestThemeService } from '../../services/guest-theme.service';

@Component({
  selector: 'app-guest-stay-extension',
  standalone: true,
  imports: [RouterLink, DatePipe, LucideAngularModule],
  template: `
    <div class="px-4 py-6 max-w-md mx-auto">

      <!-- Header -->
      <div class="flex items-center gap-3 mb-5">
        <a routerLink="/guest/home" class="transition-colors" [class]="th.backBtn()">
          <lucide-icon [img]="ArrowLeftIcon" class="w-5 h-5"></lucide-icon>
        </a>
        <div>
          <h2 class="text-lg font-bold" [class]="th.text()">Extend Stay</h2>
          <p class="text-xs" [class]="th.muted()">Request a later check-out date</p>
        </div>
      </div>

      <!-- Success state -->
      @if (submitted()) {
        <div class="text-center py-12">
          <div class="w-16 h-16 bg-emerald-400/20 rounded-full flex items-center justify-center mx-auto mb-4">
            <lucide-icon [img]="CheckCircle2Icon" class="w-8 h-8 text-emerald-400"></lucide-icon>
          </div>
          <h3 class="text-base font-bold mb-2" [class]="th.text()">Request Submitted!</h3>
          <p class="text-sm mb-6" [class]="th.muted()">
            Our team will review your extension request and confirm via chat shortly.
          </p>
          <a routerLink="/guest/home"
            class="inline-block bg-amber-400 text-slate-900 font-bold text-sm px-6 py-3 rounded-xl">
            Back to Home
          </a>
        </div>
      }

      @if (!submitted()) {
        <!-- Current booking info -->
        @if (session()) {
          <div class="rounded-2xl p-4 mb-5" [class]="th.accentBg()">
            <p class="text-xs font-semibold mb-1" [class]="th.accentText()">Current Check-out</p>
            <p class="text-base font-bold" [class]="th.text()">
              {{ session()?.booking?.check_out | date:'EEEE, d MMMM yyyy' }}
            </p>
          </div>
        }

        <!-- Form -->
        <div class="rounded-2xl p-5" [class]="th.card()">
          <div class="space-y-4">
            <div>
              <label class="block mb-1.5" [class]="th.inputLabel()">Requested New Check-out Date *</label>
              <input type="date"
                (input)="checkout.set($any($event.target).value)"
                [value]="checkout()"
                [min]="minDate()"
                class="w-full rounded-xl px-3 py-2.5 text-sm" [class]="th.input()">
            </div>
            <div>
              <label class="block mb-1.5" [class]="th.inputLabel()">Reason (optional)</label>
              <textarea rows="3"
                (input)="reason.set($any($event.target).value)"
                placeholder="Let us know why you'd like to extend your stay…"
                class="w-full rounded-xl px-3 py-2.5 text-sm resize-none" [class]="th.input()"></textarea>
            </div>
          </div>

          @if (error()) {
            <div class="mt-3 rounded-xl px-3 py-2.5 text-xs" [class]="th.danger()">{{ error() }}</div>
          }

          <button (click)="submit()" [disabled]="submitting() || !checkout()"
            class="w-full mt-4 bg-amber-400 text-slate-900 font-bold rounded-xl py-3 text-sm
                   transition-all active:scale-95 disabled:opacity-60 flex items-center justify-center gap-2">
            @if (submitting()) {
              <span class="w-4 h-4 border-2 border-slate-900 border-t-transparent rounded-full animate-spin"></span>
              Submitting…
            } @else {
              <lucide-icon [img]="CalendarPlusIcon" class="w-4 h-4"></lucide-icon>
              Request Extension
            }
          </button>
        </div>

        <p class="text-center text-xs mt-4" [class]="th.subtle()">
          Extension requests are subject to room availability and may affect your billing.
        </p>
      }

    </div>
  `,
})
export default class GuestStayExtensionPage implements OnInit {
  private api = inject(GuestApiService);
  readonly th = inject(GuestThemeService);

  readonly ArrowLeftIcon   = ArrowLeft;
  readonly CalendarPlusIcon = CalendarPlus;
  readonly CheckCircle2Icon = CheckCircle2;

  session   = signal<any | null>(null);
  checkout  = signal('');
  reason    = signal('');
  submitting = signal(false);
  submitted  = signal(false);
  error      = signal('');

  readonly minDate = computed(() => {
    const d = this.session()?.booking?.check_out;
    if (!d) return '';
    const dt = new Date(d);
    dt.setDate(dt.getDate() + 1);
    return dt.toISOString().split('T')[0];
  });

  ngOnInit(): void {
    const s = localStorage.getItem('guest_session');
    if (s) { try { this.session.set(JSON.parse(s)); } catch {} }
  }

  submit(): void {
    if (!this.checkout()) { this.error.set('Please select a new check-out date'); return; }
    this.submitting.set(true);
    this.error.set('');
    this.api.post('/guest/stay-extension', {
      requested_checkout: this.checkout(),
      reason: this.reason().trim() || null,
    }).subscribe({
      next: () => { this.submitting.set(false); this.submitted.set(true); },
      error: (e: any) => {
        this.submitting.set(false);
        this.error.set(e?.error?.error?.message ?? 'Failed to submit request');
      },
    });
  }
}

import { Component, signal, inject, OnInit } from '@angular/core';
import { RouterLink } from '@angular/router';
import { DatePipe, TitleCasePipe } from '@angular/common';
import {
  LucideAngularModule,
  ArrowLeft, Users, Plus, Trash2, QrCode, Clock, CheckCircle2,
  XCircle, AlertCircle, Phone,
} from 'lucide-angular';
import { GuestApiService } from '../../services/guest-api.service';
import { GuestThemeService } from '../../services/guest-theme.service';

@Component({
  selector: 'app-guest-visitor-codes',
  standalone: true,
  imports: [RouterLink, DatePipe, TitleCasePipe, LucideAngularModule],
  template: `
    <div class="px-4 py-6 max-w-md mx-auto">

      <!-- Header -->
      <div class="flex items-center gap-3 mb-5">
        <a routerLink="/guest/home" class="transition-colors" [class]="th.backBtn()">
          <lucide-icon [img]="ArrowLeftIcon" class="w-5 h-5"></lucide-icon>
        </a>
        <div class="flex-1">
          <h2 class="text-lg font-bold" [class]="th.text()">Visitor Codes</h2>
          <p class="text-xs" [class]="th.muted()">Generate one-time entry codes for your visitors</p>
        </div>
        <button (click)="showForm.set(true)"
          class="flex items-center gap-1.5 bg-amber-400 text-slate-900 text-xs font-bold px-3 py-2 rounded-xl active:scale-95 transition-all">
          <lucide-icon [img]="PlusIcon" class="w-3.5 h-3.5"></lucide-icon>
          New
        </button>
      </div>

      <!-- Create form -->
      @if (showForm()) {
        <div class="rounded-2xl p-5 mb-5" [class]="th.card()">
          <h3 class="text-sm font-bold mb-3" [class]="th.text()">New Visitor Code</h3>
          @if (checkoutDisplay()) {
            <div class="mb-3 px-3 py-2 rounded-xl text-xs" [class]="th.badge()">
              ⏰ Your stay ends {{ checkoutDisplay() }}
            </div>
          }

          <div class="space-y-3">
            <div>
              <label class="block mb-1" [class]="th.inputLabel()">Visitor Name *</label>
              <input type="text" [(value)]="form().visitor_name"
                (input)="setField('visitor_name', $any($event.target).value)"
                placeholder="Full name" class="w-full rounded-xl px-3 py-2.5 text-sm" [class]="th.input()">
            </div>
            <div>
              <label class="block mb-1" [class]="th.inputLabel()">Visitor Phone</label>
              <input type="tel" [(value)]="form().visitor_phone"
                (input)="setField('visitor_phone', $any($event.target).value)"
                placeholder="+234..." class="w-full rounded-xl px-3 py-2.5 text-sm" [class]="th.input()">
              <p class="text-[11px] mt-1" [class]="th.subtle()">They'll receive the code via SMS if provided</p>
            </div>
            <!-- Validity window — auto-filled from booking, editable -->
            <div>
              <label class="block mb-1" [class]="th.inputLabel()">Valid From</label>
              <input type="datetime-local" [value]="form().valid_from"
                (input)="setField('valid_from', $any($event.target).value)"
                class="w-full rounded-xl px-3 py-2.5 text-sm" [class]="th.input()">
              <p class="text-[11px] mt-1" [class]="th.subtle()">Defaults to now</p>
            </div>
            <div>
              <label class="block mb-1" [class]="th.inputLabel()">Valid Until</label>
              <input type="datetime-local" [value]="form().valid_until"
                (input)="setField('valid_until', $any($event.target).value)"
                class="w-full rounded-xl px-3 py-2.5 text-sm" [class]="th.input()">
              <p class="text-[11px] mt-1" [class]="th.subtle()">Defaults to your checkout time</p>
            </div>
            <div>
              <label class="block mb-1" [class]="th.inputLabel()">Purpose (optional)</label>
              <input type="text"
                (input)="setField('purpose', $any($event.target).value)"
                placeholder="e.g. Family visit" class="w-full rounded-xl px-3 py-2.5 text-sm" [class]="th.input()">
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
            <button (click)="createCode()" [disabled]="creating()"
              class="flex-1 bg-amber-400 text-slate-900 rounded-xl py-2.5 text-sm font-bold transition-all active:scale-95 disabled:opacity-60">
              @if (creating()) {
                <span class="flex items-center justify-center gap-2">
                  <span class="w-4 h-4 border-2 border-slate-900 border-t-transparent rounded-full animate-spin"></span>
                  Generating…
                </span>
              } @else {
                Generate Code
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
        @if (codes().length === 0) {
          <div class="text-center py-16">
            <div class="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-3" [class]="th.iconCircle()">
              <lucide-icon [img]="UsersIcon" class="w-7 h-7" [class]="th.subtle()"></lucide-icon>
            </div>
            <p class="text-sm font-medium" [class]="th.muted()">No visitor codes yet</p>
            <p class="text-xs mt-1" [class]="th.subtle()">Tap "New" to generate a code for a visitor</p>
          </div>
        }

        @for (code of codes(); track code.id) {
          <div class="rounded-2xl p-4 mb-3" [class]="th.card()">
            <!-- Code + status -->
            <div class="flex items-start justify-between mb-3">
              <div>
                <div class="text-2xl font-black font-mono tracking-widest text-amber-400">
                  {{ code.code }}
                </div>
                <p class="text-sm font-semibold mt-0.5" [class]="th.text()">{{ code.visitor_name }}</p>
              </div>
              <div class="flex items-center gap-1.5">
                <span class="text-[11px] font-medium px-2 py-0.5 rounded-full"
                  [class]="statusClass(code.status)">
                  {{ code.status | titlecase }}
                </span>
                @if (code.status === 'active') {
                  <button (click)="revoke(code.id)"
                    class="w-7 h-7 flex items-center justify-center rounded-full transition-colors"
                    [class]="th.danger()">
                    <lucide-icon [img]="Trash2Icon" class="w-3.5 h-3.5"></lucide-icon>
                  </button>
                }
              </div>
            </div>

            <!-- Details -->
            <div class="space-y-1.5">
              @if (code.visitor_phone) {
                <div class="flex items-center gap-2 text-xs" [class]="th.muted()">
                  <lucide-icon [img]="PhoneIcon" class="w-3.5 h-3.5 shrink-0"></lucide-icon>
                  <span>{{ code.visitor_phone }}</span>
                </div>
              }
              <div class="flex items-center gap-2 text-xs" [class]="th.muted()">
                <lucide-icon [img]="ClockIcon" class="w-3.5 h-3.5 shrink-0"></lucide-icon>
                <span>{{ code.valid_from | date:'dd MMM, h:mm a' }} – {{ code.valid_until | date:'dd MMM, h:mm a' }}</span>
              </div>
              @if (code.purpose) {
                <p class="text-xs" [class]="th.subtle()">{{ code.purpose }}</p>
              }
              @if (code.checked_in_at) {
                <div class="flex items-center gap-1.5 text-xs text-emerald-400">
                  <lucide-icon [img]="CheckCircle2Icon" class="w-3.5 h-3.5"></lucide-icon>
                  <span>Arrived {{ code.checked_in_at | date:'h:mm a' }}</span>
                </div>
              }
            </div>
          </div>
        }
      }

    </div>
  `,
})
export default class GuestVisitorCodesPage implements OnInit {
  private api    = inject(GuestApiService);
  readonly th    = inject(GuestThemeService);

  readonly ArrowLeftIcon   = ArrowLeft;
  readonly UsersIcon       = Users;
  readonly PlusIcon        = Plus;
  readonly Trash2Icon      = Trash2;
  readonly QrCodeIcon      = QrCode;
  readonly ClockIcon       = Clock;
  readonly CheckCircle2Icon = CheckCircle2;
  readonly XCircleIcon     = XCircle;
  readonly AlertCircleIcon = AlertCircle;
  readonly PhoneIcon       = Phone;

  codes      = signal<any[]>([]);
  loading    = signal(true);
  showForm   = signal(false);
  creating   = signal(false);
  formError  = signal('');
  form       = signal({ visitor_name: '', visitor_phone: '', valid_from: '', valid_until: '', purpose: '' });

  ngOnInit(): void {
    this.load();
    // Pre-fill form dates from booking stored in session
    const session = this.getSession();
    const now     = this.toLocal(new Date());
    const checkout = session?.booking?.check_out;
    const coStr   = checkout
      ? this.toLocal(new Date(checkout))
      : this.toLocal(new Date(Date.now() + 6 * 3600 * 1000));
    this.form.update(f => ({ ...f, valid_from: now, valid_until: coStr }));
  }

  checkoutDisplay(): string {
    const co = this.getSession()?.booking?.check_out;
    if (!co) return '';
    return new Date(co).toLocaleDateString('en-NG', { weekday:'short', day:'numeric', month:'short', hour:'2-digit', minute:'2-digit', hour12:true });
  }

  private getSession(): any {
    try { return JSON.parse(localStorage.getItem('guest_session') ?? 'null'); } catch { return null; }
  }

  private toLocal(d: Date): string {
    const pad = (n: number) => String(n).padStart(2, '0');
    return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate())
         + 'T' + pad(d.getHours()) + ':' + pad(d.getMinutes());
  }

  setField(key: string, value: string): void {
    this.form.update(f => ({ ...f, [key]: value }));
  }

  load(): void {
    this.loading.set(true);
    this.api.get<any>('/guest/visitor-codes').subscribe({
      next: (r: any) => { this.codes.set(r.data ?? []); this.loading.set(false); },
      error: () => this.loading.set(false),
    });
  }

  createCode(): void {
    const f = this.form();
    if (!f.visitor_name.trim()) { this.formError.set('Visitor name is required'); return; }
    if (!f.valid_from) { this.formError.set('Valid from date is required'); return; }
    if (!f.valid_until) { this.formError.set('Valid until date is required'); return; }
    if (new Date(f.valid_until) <= new Date(f.valid_from)) {
      this.formError.set('"Valid until" must be after "Valid from"'); return;
    }

    this.creating.set(true);
    this.formError.set('');
    this.api.post('/guest/visitor-codes', {
      visitor_name:  f.visitor_name.trim(),
      visitor_phone: f.visitor_phone.trim() || null,
      valid_from:    f.valid_from,
      valid_until:   f.valid_until,
      purpose:       f.purpose.trim() || null,
    }).subscribe({
      next: (r: any) => {
        this.codes.update(c => [r.data, ...c]);
        this.showForm.set(false);
        this.creating.set(false);
        this.form.set({ visitor_name: '', visitor_phone: '', valid_from: '', valid_until: '', purpose: '' });
      },
      error: (e: any) => {
        this.creating.set(false);
        this.formError.set(e?.error?.error?.message ?? 'Failed to generate code');
      },
    });
  }

  revoke(id: string): void {
    this.api.delete(`/guest/visitor-codes/${id}`).subscribe({
      next: () => this.codes.update(c => c.map(x => x.id === id ? { ...x, status: 'revoked' } : x)),
      error: () => {},
    });
  }

  statusClass(status: string): string {
    if (this.th.isDark()) {
      return status === 'active'    ? 'bg-emerald-500/20 text-emerald-300'
           : status === 'checked_in' ? 'bg-blue-500/20 text-blue-300'
           : 'bg-white/10 text-white/40';
    }
    return status === 'active'    ? 'bg-emerald-100 text-emerald-700'
         : status === 'checked_in' ? 'bg-blue-100 text-blue-700'
         : 'bg-gray-100 text-gray-500';
  }
}

import { Component, signal, inject, OnInit } from '@angular/core';
import { TitleCasePipe } from '@angular/common';
import { RouterLink } from '@angular/router';
import {
  LucideAngularModule,
  ArrowLeft, BellOff, BedDouble, Wrench, CheckCircle2, AlertTriangle, Send, RotateCcw,
} from 'lucide-angular';
import { GuestApiService } from '../../services/guest-api.service';
import { GuestThemeService } from '../../services/guest-theme.service';

@Component({
  selector: 'app-guest-room-controls',
  standalone: true,
  imports: [TitleCasePipe, RouterLink, LucideAngularModule],
  template: `
    <div class="px-4 py-6 max-w-md mx-auto">

      <!-- Header -->
      <div class="flex items-center gap-3 mb-6">
        <a routerLink="/guest/home" class="transition-colors" [class]="th.backBtn()">
          <lucide-icon [img]="ArrowLeftIcon" class="w-5 h-5"></lucide-icon>
        </a>
        <div>
          <h2 class="text-lg font-bold" [class]="th.text()">Room Controls</h2>
          <p class="text-xs" [class]="th.muted()">Manage your room preferences</p>
        </div>
      </div>

      @if (loading()) {
        <div class="flex justify-center py-16">
          <div class="w-7 h-7 border-2 rounded-full animate-spin" [class]="th.spinner()"></div>
        </div>
      }

      @if (!loading()) {

        <!-- DND -->
        <div class="rounded-2xl p-5 mb-4" [class]="th.card()">
          <div class="flex items-center justify-between">
            <div class="flex items-center gap-3">
              <div class="w-10 h-10 rounded-xl flex items-center justify-center"
                [class]="status().dnd ? 'bg-red-500/20' : th.iconCircle()">
                <lucide-icon [img]="BellOffIcon" class="w-5 h-5"
                  [class]="status().dnd ? 'text-red-400' : th.muted()"></lucide-icon>
              </div>
              <div>
                <p class="text-sm font-semibold" [class]="th.text()">Do Not Disturb</p>
                <p class="text-xs" [class]="th.muted()">{{ status().dnd ? 'Active — staff will not knock' : 'Off' }}</p>
              </div>
            </div>
            <button (click)="toggleDnd()" [disabled]="togglingDnd()"
              class="relative inline-flex w-12 h-6 rounded-full transition-colors duration-200 focus:outline-none"
              [class]="status().dnd ? 'bg-red-500' : (th.isDark() ? 'bg-white/20' : 'bg-gray-300')">
              <span class="inline-block w-5 h-5 bg-white rounded-full shadow transform transition-transform duration-200 mt-0.5"
                [class]="status().dnd ? 'translate-x-6 ml-0.5' : 'translate-x-0.5'">
              </span>
            </button>
          </div>
        </div>

        <!-- Make-up room -->
        <div class="rounded-2xl p-5 mb-4" [class]="th.card()">
          <div class="flex items-center justify-between">
            <div class="flex items-center gap-3">
              <div class="w-10 h-10 rounded-xl flex items-center justify-center"
                [class]="status().make_up_room ? 'bg-emerald-500/20' : th.iconCircle()">
                <lucide-icon [img]="BedDoubleIcon" class="w-5 h-5"
                  [class]="status().make_up_room ? 'text-emerald-400' : th.muted()"></lucide-icon>
              </div>
              <div>
                <p class="text-sm font-semibold" [class]="th.text()">Make Up Room</p>
                <p class="text-xs" [class]="th.muted()">{{ status().make_up_room ? 'Requested — housekeeping notified' : 'Not requested' }}</p>
              </div>
            </div>
            <button (click)="toggleMakeUp()" [disabled]="togglingMakeUp()"
              class="relative inline-flex w-12 h-6 rounded-full transition-colors duration-200 focus:outline-none"
              [class]="status().make_up_room ? 'bg-emerald-500' : (th.isDark() ? 'bg-white/20' : 'bg-gray-300')">
              <span class="inline-block w-5 h-5 bg-white rounded-full shadow transform transition-transform duration-200 mt-0.5"
                [class]="status().make_up_room ? 'translate-x-6 ml-0.5' : 'translate-x-0.5'">
              </span>
            </button>
          </div>
        </div>

        <!-- Maintenance -->
        <div class="rounded-2xl p-5 mb-4" [class]="th.card()">
          <div class="flex items-center gap-3 mb-4">
            <div class="w-10 h-10 rounded-xl flex items-center justify-center" [class]="th.iconCircle()">
              <lucide-icon [img]="WrenchIcon" class="w-5 h-5" [class]="th.muted()"></lucide-icon>
            </div>
            <div>
              <p class="text-sm font-semibold" [class]="th.text()">Report Issue</p>
              <p class="text-xs" [class]="th.muted()">Broken fixture, AC, plumbing…</p>
            </div>
          </div>

          @if (maintenanceSuccess()) {
            <div class="flex items-center gap-2 rounded-xl px-3 py-2.5 text-xs mb-3" [class]="th.success()">
              <lucide-icon [img]="CheckCircle2Icon" class="w-4 h-4 shrink-0"></lucide-icon>
              Maintenance team notified. We'll attend to this shortly.
            </div>
            <button (click)="maintenanceSuccess.set(false); maintenanceDesc.set('')"
              class="flex items-center gap-1.5 text-xs font-medium transition-colors" [class]="th.muted()">
              <lucide-icon [img]="RotateCcwIcon" class="w-3.5 h-3.5"></lucide-icon>
              Report another issue
            </button>
          } @else {
            <textarea rows="3"
              [value]="maintenanceDesc()"
              (input)="maintenanceDesc.set($any($event.target).value)"
              placeholder="Describe the issue (e.g. AC not cooling, bathroom tap dripping)…"
              class="w-full rounded-xl px-3 py-2.5 text-sm resize-none mb-3" [class]="th.input()">
            </textarea>
            @if (maintenanceError()) {
              <div class="rounded-xl px-3 py-2 text-xs mb-3" [class]="th.danger()">{{ maintenanceError() }}</div>
            }
            <button (click)="reportMaintenance()" [disabled]="reportingMaintenance() || !maintenanceDesc().trim()"
              class="w-full bg-amber-400 text-slate-900 font-bold rounded-xl py-2.5 text-sm
                     transition-all active:scale-95 disabled:opacity-60 flex items-center justify-center gap-2">
              @if (reportingMaintenance()) {
                <span class="w-4 h-4 border-2 border-slate-900 border-t-transparent rounded-full animate-spin"></span>
                Submitting…
              } @else {
                <lucide-icon [img]="SendIcon" class="w-4 h-4"></lucide-icon>
                Submit Report
              }
            </button>
          }
        </div>

        <!-- Active maintenance requests -->
        @if (status().maintenance?.length > 0) {
          <p class="text-xs font-semibold mb-2" [class]="th.muted()">Active Maintenance Requests</p>
          @for (m of status().maintenance; track m.id) {
            <div class="rounded-xl px-4 py-3 mb-2 flex items-start gap-3" [class]="th.cardSubtle()">
              <lucide-icon [img]="AlertTriangleIcon" class="w-4 h-4 mt-0.5 text-amber-400 shrink-0"></lucide-icon>
              <div>
                <p class="text-xs font-medium" [class]="th.text()">{{ m.description }}</p>
                <p class="text-[11px] mt-0.5" [class]="th.subtle()">Status: {{ m.status | titlecase }}</p>
              </div>
            </div>
          }
        }

      }
    </div>
  `,
})
export default class GuestRoomControlsPage implements OnInit {
  private api = inject(GuestApiService);
  readonly th = inject(GuestThemeService);

  readonly ArrowLeftIcon     = ArrowLeft;
  readonly BellOffIcon       = BellOff;
  readonly BedDoubleIcon     = BedDouble;
  readonly WrenchIcon        = Wrench;
  readonly CheckCircle2Icon  = CheckCircle2;
  readonly AlertTriangleIcon = AlertTriangle;
  readonly SendIcon          = Send;
  readonly RotateCcwIcon     = RotateCcw;

  loading           = signal(true);
  status            = signal<any>({ dnd: false, make_up_room: false, maintenance: [] });
  togglingDnd       = signal(false);
  togglingMakeUp    = signal(false);
  maintenanceDesc   = signal('');
  reportingMaintenance = signal(false);
  maintenanceSuccess   = signal(false);
  maintenanceError     = signal('');

  ngOnInit(): void {
    this.api.get<any>('/guest/room-controls/status').subscribe({
      next: (r: any) => { this.status.set(r.data ?? { dnd: false, make_up_room: false, maintenance: [] }); this.loading.set(false); },
      error: () => this.loading.set(false),
    });
  }

  toggleDnd(): void {
    const next = !this.status().dnd;
    this.togglingDnd.set(true);
    this.api.post('/guest/room-controls/dnd', { active: next }).subscribe({
      next: () => { this.status.update(s => ({ ...s, dnd: next })); this.togglingDnd.set(false); },
      error: () => this.togglingDnd.set(false),
    });
  }

  toggleMakeUp(): void {
    const next = !this.status().make_up_room;
    this.togglingMakeUp.set(true);
    this.api.post('/guest/room-controls/make-up', { active: next }).subscribe({
      next: () => { this.status.update(s => ({ ...s, make_up_room: next })); this.togglingMakeUp.set(false); },
      error: () => this.togglingMakeUp.set(false),
    });
  }

  reportMaintenance(): void {
    if (!this.maintenanceDesc().trim()) return;
    this.reportingMaintenance.set(true);
    this.maintenanceError.set('');
    this.api.post('/guest/room-controls/maintenance', { description: this.maintenanceDesc().trim() }).subscribe({
      next: (r: any) => {
        this.status.update(s => ({ ...s, maintenance: [...(s.maintenance ?? []), r.data] }));
        this.reportingMaintenance.set(false);
        this.maintenanceSuccess.set(true);
      },
      error: (e: any) => {
        this.reportingMaintenance.set(false);
        this.maintenanceError.set(e?.error?.error?.message ?? 'Failed to submit');
      },
    });
  }
}

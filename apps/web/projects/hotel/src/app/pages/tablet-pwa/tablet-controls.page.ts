import { Component, inject, signal, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { GuestApiService } from '../../services/guest-api.service';

@Component({ selector: 'app-tablet-controls', standalone: true, imports: [],
  template: `
    <div class="h-screen w-screen bg-slate-950 flex flex-col overflow-hidden">
      <div class="flex items-center gap-4 px-6 py-4 border-b border-slate-800 flex-shrink-0">
        <button (click)="router.navigate(['/tablet/home'])" class="w-10 h-10 rounded-xl bg-slate-800 text-white flex items-center justify-center text-lg">←</button>
        <h1 class="text-white font-bold text-xl flex-1">Room Controls</h1>
      </div>

      <div class="flex-1 overflow-y-auto p-6">
        <!-- DND + Clean -->
        <div class="grid grid-cols-2 gap-4 mb-6">
          <button (click)="toggleDnd()"
            class="p-6 rounded-3xl flex flex-col items-center gap-3 border-2 transition-all active:scale-95"
            [class]="dnd() ? 'bg-red-900/30 border-red-600' : 'bg-slate-900 border-slate-800'">
            <span class="text-5xl">🚫</span>
            <p class="text-white font-bold">Do Not Disturb</p>
            <span class="text-sm font-medium px-3 py-1 rounded-full"
                  [class]="dnd() ? 'bg-red-700 text-white' : 'bg-slate-700 text-slate-400'">
              {{ dnd() ? 'ON' : 'OFF' }}
            </span>
          </button>
          <button (click)="requestClean()"
            class="p-6 rounded-3xl flex flex-col items-center gap-3 bg-slate-900 border-2 border-slate-800 active:scale-95 transition-all">
            <span class="text-5xl">🧹</span>
            <p class="text-white font-bold">Clean My Room</p>
            <span class="text-sm text-slate-400">Request housekeeping</span>
          </button>
        </div>

        <!-- Make-up room -->
        <div class="bg-slate-900 border border-slate-800 rounded-3xl p-6 mb-4">
          <div class="flex items-center justify-between">
            <div class="flex items-center gap-3">
              <span class="text-3xl">🛏</span>
              <div>
                <p class="text-white font-bold">Room Make-Up</p>
                <p class="text-slate-400 text-sm">Request fresh towels & linens</p>
              </div>
            </div>
            <button (click)="requestMakeUp()"
              class="px-5 py-2.5 bg-violet-600 text-white rounded-xl font-semibold text-sm active:scale-95 transition-all">
              Request
            </button>
          </div>
        </div>

        <!-- Maintenance -->
        <div class="bg-slate-900 border border-slate-800 rounded-3xl p-6">
          <div class="flex items-center justify-between">
            <div class="flex items-center gap-3">
              <span class="text-3xl">🔧</span>
              <div>
                <p class="text-white font-bold">Report Issue</p>
                <p class="text-slate-400 text-sm">Maintenance request</p>
              </div>
            </div>
            <button (click)="reportMaintenance()"
              class="px-5 py-2.5 bg-amber-600 text-white rounded-xl font-semibold text-sm active:scale-95 transition-all">
              Report
            </button>
          </div>
        </div>

        @if (toast()) {
          <div class="fixed bottom-8 left-1/2 -translate-x-1/2 bg-slate-700 text-white px-6 py-3 rounded-xl text-sm font-medium shadow-xl z-50">
            {{ toast() }}
          </div>
        }
      </div>
    </div>
  `,
})
export class TabletControlsPage implements OnInit {
  readonly router = inject(Router);
  private svc     = inject(GuestApiService);

  dnd   = signal(false);
  toast = signal('');

  ngOnInit(): void {
    this.svc.get('/guest/room-controls/status').subscribe({
      next: (r: any) => { if (r.success) this.dnd.set(r.data?.dnd_active ?? false); },
      error: () => {},
    });
  }

  toggleDnd(): void {
    const val = !this.dnd();
    this.dnd.set(val);
    this.svc.post('/guest/room-controls/dnd', { active: val }).subscribe({
      next: () => this.flash(`Do Not Disturb ${val ? 'enabled' : 'disabled'}`),
      error: () => { this.dnd.set(!val); this.flash('Failed to update'); },
    });
  }

  requestClean(): void {
    this.svc.post('/guest/service-requests', {
      category: 'housekeeping',
      title: 'Room Cleaning',
      description: 'Guest requested room cleaning from in-room tablet',
    }).subscribe({
      next: () => this.flash('🧹 Housekeeping has been notified'),
      error: () => this.flash('Request sent'),
    });
  }

  requestMakeUp(): void {
    this.svc.post('/guest/room-controls/make-up', {}).subscribe({
      next: () => this.flash('🛏 Room make-up request sent'),
      error: () => this.flash('Request sent'),
    });
  }

  reportMaintenance(): void {
    this.svc.post('/guest/room-controls/maintenance', { description: 'Reported from in-room tablet' }).subscribe({
      next: () => this.flash('🔧 Maintenance team has been notified'),
      error: () => this.flash('Request sent'),
    });
  }

  private flash(msg: string): void {
    this.toast.set(msg);
    setTimeout(() => this.toast.set(''), 3000);
  }
}

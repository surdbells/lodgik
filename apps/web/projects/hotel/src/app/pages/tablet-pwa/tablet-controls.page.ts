import { Component, inject, signal, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { TabletService } from './tablet.service';

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
          <button (click)="toggle('dnd')"
            class="p-6 rounded-3xl flex flex-col items-center gap-3 border-2 transition-all active:scale-95"
            [class]="controls().dnd ? 'bg-red-900/30 border-red-600' : 'bg-slate-900 border-slate-800'">
            <span class="text-5xl">🚫</span>
            <p class="text-white font-bold">Do Not Disturb</p>
            <span class="text-sm font-medium px-3 py-1 rounded-full"
                  [class]="controls().dnd ? 'bg-red-700 text-white' : 'bg-slate-700 text-slate-400'">
              {{ controls().dnd ? 'ON' : 'OFF' }}
            </span>
          </button>
          <button (click)="requestClean()"
            class="p-6 rounded-3xl flex flex-col items-center gap-3 bg-slate-900 border-2 border-slate-800 active:scale-95 transition-all">
            <span class="text-5xl">🧹</span>
            <p class="text-white font-bold">Clean My Room</p>
            <span class="text-sm text-slate-400">Request housekeeping</span>
          </button>
        </div>

        <!-- Thermostat -->
        <div class="bg-slate-900 border border-slate-800 rounded-3xl p-6 mb-4">
          <div class="flex items-center justify-between mb-4">
            <div class="flex items-center gap-2">
              <span class="text-3xl">🌡️</span>
              <p class="text-white font-bold text-lg">Temperature</p>
            </div>
            <p class="text-violet-400 font-black text-3xl">{{ controls().temperature }}°C</p>
          </div>
          <div class="flex items-center gap-4">
            <button (click)="adj('temperature', -1)" class="w-12 h-12 rounded-full bg-slate-700 text-white text-2xl font-bold flex items-center justify-center active:scale-90 transition-all">−</button>
            <div class="flex-1 h-2 bg-slate-700 rounded-full overflow-hidden">
              <div class="h-full bg-gradient-to-r from-blue-500 to-red-500 rounded-full transition-all"
                   [style.width.%]="((controls().temperature - 16) / (30 - 16)) * 100"></div>
            </div>
            <button (click)="adj('temperature', 1)" class="w-12 h-12 rounded-full bg-slate-700 text-white text-2xl font-bold flex items-center justify-center active:scale-90 transition-all">+</button>
          </div>
          <div class="flex justify-between text-slate-500 text-xs mt-1 px-16">
            <span>16°C</span><span>30°C</span>
          </div>
        </div>

        <!-- Lights -->
        <div class="bg-slate-900 border border-slate-800 rounded-3xl p-6">
          <div class="flex items-center justify-between mb-4">
            <div class="flex items-center gap-2">
              <span class="text-3xl">💡</span>
              <p class="text-white font-bold text-lg">Lighting</p>
            </div>
            <p class="text-amber-400 font-black text-2xl">{{ controls().brightness }}%</p>
          </div>
          <div class="flex items-center gap-4">
            <span class="text-2xl">🌑</span>
            <input type="range" [value]="controls().brightness" min="0" max="100"
              class="flex-1 h-2 accent-amber-400" (input)="onBrightness($any($event.target).value)">
            <span class="text-2xl">☀️</span>
          </div>
        </div>

        @if (toast()) {
          <div class="fixed bottom-8 left-1/2 -translate-x-1/2 bg-slate-700 text-white px-6 py-3 rounded-xl text-sm font-medium shadow-xl">{{ toast() }}</div>
        }
      </div>
    </div>
  `,
})
export class TabletControlsPage implements OnInit {
  readonly router = inject(Router);
  private svc     = inject(TabletService);
  controls = signal({ dnd: false, temperature: 22, brightness: 70 });
  toast    = signal('');
  private bookingId = '';

  ngOnInit(): void {
    this.bookingId = this.svc.guestData()?.booking?.id ?? '';
    this.svc.get('/room-control/status', { booking_id: this.bookingId }).subscribe({
      next: (r: any) => { if (r.success) this.controls.set({ dnd: r.data?.dnd_active ?? false, temperature: r.data?.temperature ?? 22, brightness: r.data?.brightness ?? 70 }); },
      error: () => {},
    });
  }

  toggle(key: 'dnd'): void {
    const val = !this.controls()[key];
    this.controls.update(c => ({ ...c, [key]: val }));
    this.svc.post('/room-control/update', { booking_id: this.bookingId, [key]: val }).subscribe({
      next: () => this.flash(`${key === 'dnd' ? 'Do Not Disturb' : key} ${val ? 'enabled' : 'disabled'}`),
      error: () => {},
    });
  }

  adj(key: 'temperature', delta: number): void {
    const val = Math.min(30, Math.max(16, this.controls()[key] + delta));
    this.controls.update(c => ({ ...c, [key]: val }));
    this.svc.post('/room-control/update', { booking_id: this.bookingId, [key]: val }).subscribe({ error: () => {} });
  }

  sync(): void {
    this.svc.post('/room-control/update', { booking_id: this.bookingId, brightness: this.controls().brightness }).subscribe({ error: () => {} });
  }

  requestClean(): void {
    this.svc.post('/service-requests', { booking_id: this.bookingId, category: 'housekeeping', title: 'Room Cleaning', description: 'Guest requested room cleaning from tablet' }).subscribe({
      next: () => this.flash('Housekeeping has been notified'),
      error: () => this.flash('Request sent'),
    });
  }

  onBrightness(v: string): void {
    this.controls.update(c => ({ ...c, brightness: +v }));
    this.sync();
  }

  private flash(msg: string): void {
    this.toast.set(msg);
    setTimeout(() => this.toast.set(''), 3000);
  }
}

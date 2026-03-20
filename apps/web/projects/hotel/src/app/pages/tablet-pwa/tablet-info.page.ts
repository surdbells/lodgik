import { Component, inject, signal, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { TabletService } from './tablet.service';

@Component({ selector: 'app-tablet-info', standalone: true, imports: [],
  template: `
    <div class="h-screen w-screen bg-slate-950 flex flex-col overflow-hidden">
      <div class="flex items-center gap-4 px-6 py-4 border-b border-slate-800 flex-shrink-0">
        <button (click)="router.navigate(['/tablet/home'])" class="w-10 h-10 rounded-xl bg-slate-800 text-white flex items-center justify-center text-lg">←</button>
        <h1 class="text-white font-bold text-xl">Hotel Information</h1>
      </div>
      <div class="flex-1 overflow-y-auto p-6">
        @if (loading()) {
          <div class="flex justify-center pt-16"><div class="w-8 h-8 border-2 border-cyan-400 border-t-transparent rounded-full animate-spin"></div></div>
        }
        @if (!loading() && info()) {
          <!-- Property details -->
          <div class="bg-slate-900 border border-slate-800 rounded-3xl p-6 mb-4">
            <h2 class="text-white font-bold text-2xl mb-1">{{ info()!.name }}</h2>
            @if (info()!.address) { <p class="text-slate-400 text-sm">{{ info()!.address }}</p> }
            @if (info()!.phone)   { <p class="text-cyan-400 mt-2 text-sm">📞 {{ info()!.phone }}</p> }
            @if (info()!.email)   { <p class="text-cyan-400 text-sm">✉️ {{ info()!.email }}</p> }
          </div>
          <!-- Amenities -->
          @if (info()!.amenities?.length) {
            <h3 class="text-slate-400 text-xs uppercase tracking-wider font-bold mb-3">Amenities</h3>
            <div class="grid grid-cols-3 gap-3 mb-4">
              @for (a of info()!.amenities; track a.id || a.name) {
                <div class="bg-slate-900 border border-slate-800 rounded-2xl p-4 text-center">
                  <p class="text-3xl mb-1">{{ a.icon || '✅' }}</p>
                  <p class="text-white text-xs font-medium">{{ a.name }}</p>
                </div>
              }
            </div>
          }
          <!-- Policies -->
          @if (info()!.check_in_time || info()!.check_out_time) {
            <div class="bg-slate-900 border border-slate-800 rounded-2xl p-5">
              <h3 class="text-white font-bold mb-3">Hotel Policies</h3>
              <div class="grid grid-cols-2 gap-4 text-sm">
                @if (info()!.check_in_time) { <div><p class="text-slate-400 text-xs">Check-in</p><p class="text-white font-bold">{{ info()!.check_in_time }}</p></div> }
                @if (info()!.check_out_time) { <div><p class="text-slate-400 text-xs">Check-out</p><p class="text-white font-bold">{{ info()!.check_out_time }}</p></div> }
              </div>
            </div>
          }
        }
      </div>
    </div>
  `,
})
export class TabletInfoPage implements OnInit {
  readonly router = inject(Router);
  private svc     = inject(TabletService);
  info    = signal<any>(null);
  loading = signal(true);
  ngOnInit(): void {
    this.svc.get('/guest/hotel-info').subscribe({
      next: (r: any) => { if (r.success) this.info.set(r.data); this.loading.set(false); },
      error: () => this.loading.set(false),
    });
  }
}

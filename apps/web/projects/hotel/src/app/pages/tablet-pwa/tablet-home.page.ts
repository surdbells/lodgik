import { Component, inject, signal, OnInit } from '@angular/core';
import { Router } from '@angular/router';

const TILES = [
  { icon: '🛎', label: 'Room Service',    sub: 'Order food & drinks',      route: '/tablet/room-service',       color: 'from-orange-600 to-amber-500'   },
  { icon: '💬', label: 'Chat Staff',      sub: 'Message front desk',       route: '/tablet/chat',               color: 'from-blue-600 to-blue-500'      },
  { icon: '🧾', label: 'My Bill',         sub: 'View charges & balance',   route: '/tablet/folio',              color: 'from-emerald-700 to-emerald-500' },
  { icon: '🚿', label: 'Room Controls',   sub: 'DND, housekeeping',        route: '/tablet/controls',           color: 'from-violet-600 to-violet-500'  },
  { icon: '🌿', label: 'Spa & Wellness',  sub: 'Book treatments',          route: '/tablet/spa',                color: 'from-rose-700 to-rose-500'      },
  { icon: 'ℹ️', label: 'Hotel Info',      sub: 'Services & facilities',    route: '/tablet/info',               color: 'from-cyan-700 to-cyan-500'      },
  { icon: '🔔', label: 'Stay Alert',      sub: 'Notify trusted contacts',  route: '/tablet/stay-notifications', color: 'from-amber-700 to-amber-500'    },
  { icon: '🗝',  label: 'Visitor Codes',  sub: 'Guest access codes',       route: '/tablet/visitor-codes',      color: 'from-indigo-700 to-indigo-500'  },
  { icon: '📅', label: 'Extend Stay',     sub: 'Request extension',        route: '/tablet/stay-extension',     color: 'from-teal-700 to-teal-500'      },
  { icon: '🔍', label: 'Lost & Found',    sub: 'Report lost items',        route: '/tablet/lost-found',         color: 'from-gray-700 to-gray-500'      },
  { icon: '⚙️', label: 'Preferences',     sub: 'Room & stay preferences',  route: '/tablet/preferences',        color: 'from-slate-700 to-slate-500'    },
  { icon: '🚪', label: 'Check Out',       sub: 'Request checkout',         route: '/tablet/checkout',           color: 'from-red-700 to-red-500'        },
];

@Component({ selector: 'app-tablet-home', standalone: true, imports: [],
  template: `
    <div class="h-screen w-screen bg-gradient-to-br from-slate-950 to-slate-900 flex flex-col overflow-hidden">
      <!-- Header -->
      <div class="flex items-center justify-between px-8 pt-6 pb-4 flex-shrink-0">
        <div>
          <h1 class="text-white text-2xl font-bold">Welcome, {{ guestName() }}</h1>
          <p class="text-slate-400 text-sm mt-0.5">Room {{ roomNum() }} · {{ bookingRef() }}</p>
        </div>
        <div class="text-right">
          <p class="text-white/70 text-sm">{{ time() }}</p>
          <p class="text-slate-500 text-xs mt-0.5">{{ hotelName() }}</p>
        </div>
      </div>

      <!-- Tile grid — landscape 3×2 -->
      <div class="flex-1 grid grid-cols-3 grid-rows-4 gap-3 px-6 pb-4 overflow-auto">
        @for (tile of tiles; track tile.route) {
          <button (click)="nav(tile.route)"
            class="relative rounded-3xl p-6 flex flex-col justify-between bg-gradient-to-br text-left active:scale-95 transition-all overflow-hidden shadow-xl"
            [class]="tile.color">
            <!-- Ambient glow -->
            <div class="absolute -top-6 -right-6 w-24 h-24 rounded-full bg-white/10 blur-2xl"></div>
            <div class="text-5xl">{{ tile.icon }}</div>
            <div>
              <p class="text-white font-bold text-lg leading-tight">{{ tile.label }}</p>
              <p class="text-white/60 text-xs mt-1">{{ tile.sub }}</p>
            </div>
          </button>
        }
      </div>

      <!-- Footer -->
      <div class="flex items-center justify-between px-8 pb-5 flex-shrink-0">
        <p class="text-slate-600 text-xs">Check-out: {{ checkoutDate() }}</p>
        <button (click)="checkout()" class="text-slate-500 text-xs hover:text-slate-400 transition-colors">
          Request Checkout →
        </button>
      </div>
    </div>
  `,
})
export class TabletHomePage implements OnInit {
  private router = inject(Router);
  tiles = TILES;
  time  = signal('');
  guestName    = signal('Guest');
  roomNum      = signal('');
  bookingRef   = signal('');
  checkoutDate = signal('');
  hotelName    = signal('Lodgik Hotel');
  private clockTimer: any;

  ngOnInit(): void {
    this.tick();
    this.clockTimer = setInterval(() => this.tick(), 60_000);
    try {
      const d = JSON.parse(localStorage.getItem('guest_session') ?? '{}');
      this.guestName.set(d.guest?.first_name ?? d.first_name ?? 'Guest');
      this.roomNum.set(d.room?.room_number ?? '');
      this.bookingRef.set(d.booking?.booking_ref ?? d.booking_ref ?? '');
      this.checkoutDate.set(d.booking?.check_out ? new Date(d.booking.check_out).toLocaleDateString('en-NG', { weekday: 'short', day: 'numeric', month: 'short' }) : '');
      this.hotelName.set(d.property?.name ?? 'Lodgik Hotel');
    } catch {}
  }

  ngOnDestroy(): void { clearInterval(this.clockTimer); }
  tick(): void { this.time.set(new Date().toLocaleTimeString('en-NG', { hour: '2-digit', minute: '2-digit', hour12: true })); }
  nav(route: string): void { this.router.navigate([route]); }
  checkout(): void { this.router.navigate(['/tablet/bill']); }
}

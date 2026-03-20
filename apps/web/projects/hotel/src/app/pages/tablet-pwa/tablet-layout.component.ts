import { Component, inject, OnInit, OnDestroy } from '@angular/core';
import { RouterOutlet, Router, NavigationEnd } from '@angular/router';
import { filter } from 'rxjs/operators';
import { GuestApiService } from '../../services/guest-api.service';

/**
 * Tablet PWA layout — uses the same guest_token auth as the Guest PWA.
 * No device registration. A guest logs in with their access code or OTP
 * (same as /guest/login), and the tablet shows the concierge interface.
 *
 * On startup:
 *   - No guest_token → redirect to /tablet/login (which IS /guest/login)
 *   - Has guest_token → poll session every 20s; if session expires redirect to login
 *
 * The tablet/login route simply reuses the guest login page, with a
 * ?returnTo=/tablet/home query param so after login it lands on the tablet home.
 */
@Component({
  selector: 'app-tablet-layout',
  standalone: true,
  imports: [RouterOutlet],
  template: `<div class="h-screen w-screen overflow-hidden bg-slate-950"><router-outlet/></div>`,
})
export class TabletLayoutComponent implements OnInit, OnDestroy {
  private router   = inject(Router);
  private guestApi = inject(GuestApiService);
  private timer: any;

  ngOnInit(): void {
    this.guard();
    // Poll session validity every 20s — if session expires go back to login
    this.timer = setInterval(() => this.checkSession(), 20_000);
    // Re-guard on every navigation (handles deep links)
    this.router.events.pipe(
      filter(e => e instanceof NavigationEnd)
    ).subscribe(() => this.guard());
  }

  ngOnDestroy(): void { clearInterval(this.timer); }

  private guard(): void {
    const url = this.router.url;
    if (url.startsWith('/tablet/login')) return; // already on login
    if (!localStorage.getItem('guest_token')) {
      this.router.navigate(['/tablet/login']);
    }
  }

  private checkSession(): void {
    if (!localStorage.getItem('guest_token')) {
      this.router.navigate(['/tablet/login']);
      return;
    }
    // Light ping to verify token still valid
    this.guestApi.get('/guest/session').subscribe({
      error: (e: any) => {
        if (e?.status === 401) {
          localStorage.removeItem('guest_token');
          localStorage.removeItem('guest_session');
          this.router.navigate(['/tablet/login']);
        }
      },
    });
  }
}

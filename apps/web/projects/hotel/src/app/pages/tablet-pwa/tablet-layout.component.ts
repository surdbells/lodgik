import { Component, inject, OnInit, OnDestroy, signal } from '@angular/core';
import { RouterOutlet, Router } from '@angular/router';
import { TabletService } from './tablet.service';

@Component({
  selector: 'app-tablet-layout',
  standalone: true,
  imports: [RouterOutlet],
  template: `<div class="h-screen w-screen overflow-hidden bg-slate-950"><router-outlet/></div>`,
})
export class TabletLayoutComponent implements OnInit, OnDestroy {
  private svc    = inject(TabletService);
  private router = inject(Router);
  private timer: any;

  ngOnInit(): void {
    this.poll();
    this.timer = setInterval(() => this.poll(), 15_000);
  }

  ngOnDestroy(): void { clearInterval(this.timer); }

  private poll(): void {
    if (!this.svc.isRegistered) return;
    this.svc.poll().subscribe({
      next: (r: any) => {
        const d = r?.data;
        const hadGuest = this.svc.hasGuest();
        this.svc.updateSession(d);
        const hasGuest = this.svc.hasGuest();

        const url = this.router.url;
        if (!hasGuest && !url.startsWith('/tablet/idle')) {
          this.router.navigate(['/tablet/idle']);
        } else if (hasGuest && url.startsWith('/tablet/idle')) {
          this.router.navigate(['/tablet/home']);
        }
      },
      error: () => {},
    });
  }
}

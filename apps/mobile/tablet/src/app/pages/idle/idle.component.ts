import { Component, NO_ERRORS_SCHEMA, OnInit, OnDestroy } from '@angular/core';
import { NativeScriptCommonModule, RouterExtensions } from '@nativescript/angular';
import { TabletApiService } from '../../services/tablet-api.service';
import { Subscription } from 'rxjs';

@Component({
  selector: 'Idle',
  standalone: true,
  imports: [NativeScriptCommonModule],
  schemas: [NO_ERRORS_SCHEMA],
  template: `
    <GridLayout rows="*, auto" class="bg-gradient-to-b from-blue-900 to-blue-700">
      <FlexboxLayout row="0" flexDirection="column" alignItems="center" justifyContent="center">
        <Label text="🏨" class="text-8xl m-b-6"></Label>
        <Label text="Welcome" class="text-white text-4xl font-bold m-b-2"></Label>
        <Label text="Please check in at reception" class="text-blue-200 text-xl m-b-8"></Label>
        <ActivityIndicator busy="true" color="white" class="m-b-4"></ActivityIndicator>
        <Label text="Waiting for guest check-in..." class="text-blue-300 text-sm"></Label>
      </FlexboxLayout>

      <FlexboxLayout row="1" justifyContent="space-between" alignItems="center" class="p-4">
        <Label [text]="deviceName" class="text-blue-400 text-xs"></Label>
        <Label [text]="currentTime" class="text-blue-300 text-sm"></Label>
      </FlexboxLayout>
    </GridLayout>
  `,
})
export class IdleComponent implements OnInit, OnDestroy {
  deviceName = 'Concierge Tablet';
  currentTime = '';
  private sub?: Subscription;
  private clockTimer: any;

  constructor(private api: TabletApiService, private router: RouterExtensions) {}

  ngOnInit() {
    this.api.startPolling();
    this.updateClock();
    this.clockTimer = setInterval(() => this.updateClock(), 30000);

    const data = this.api.guestData$.value;
    this.deviceName = data?.device?.name || 'Concierge Tablet';

    // Watch for guest check-in
    this.sub = this.api.hasGuest$.subscribe(hasGuest => {
      if (hasGuest) this.router.navigate(['/home'], { clearHistory: true });
    });
  }

  ngOnDestroy() {
    this.sub?.unsubscribe();
    if (this.clockTimer) clearInterval(this.clockTimer);
  }

  private updateClock() {
    const now = new Date();
    this.currentTime = now.toLocaleString('en-NG', { weekday: 'long', hour: '2-digit', minute: '2-digit', hour12: true });
  }
}

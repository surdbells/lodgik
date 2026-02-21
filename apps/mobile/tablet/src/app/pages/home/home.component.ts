import { Component, NO_ERRORS_SCHEMA, OnInit, OnDestroy } from '@angular/core';
import { NativeScriptCommonModule, NativeScriptRouterModule, RouterExtensions } from '@nativescript/angular';
import { TabletApiService } from '../../services/tablet-api.service';
import { Subscription } from 'rxjs';

@Component({
  selector: 'TabletHome',
  standalone: true,
  imports: [NativeScriptCommonModule, NativeScriptRouterModule],
  schemas: [NO_ERRORS_SCHEMA],
  template: `
    <GridLayout rows="auto, *, auto" class="bg-gray-50">
      <!-- Header Bar -->
      <GridLayout row="0" columns="*, auto" class="bg-blue-700 p-4">
        <StackLayout col="0">
          <Label [text]="'Welcome, ' + guestName" class="text-white text-xl font-bold"></Label>
          <Label [text]="'Room ' + roomLabel + ' · ' + bookingRef" class="text-blue-200 text-sm"></Label>
        </StackLayout>
        <Label col="1" [text]="currentTime" class="text-blue-200 text-sm"></Label>
      </GridLayout>

      <!-- Main Content — Landscape Grid -->
      <ScrollView row="1">
        <GridLayout columns="*, *, *, *" rows="auto, auto" class="p-6">
          <!-- Row 1 -->
          <StackLayout col="0" row="0" class="bg-white rounded-2xl p-6 m-2 text-center shadow-sm" (tap)="nav('/room-service')">
            <Label text="🛎️" class="text-5xl m-b-2"></Label>
            <Label text="Room Service" class="text-lg font-bold"></Label>
            <Label text="Order food, drinks & more" class="text-gray-400 text-sm m-t-1"></Label>
          </StackLayout>

          <StackLayout col="1" row="0" class="bg-white rounded-2xl p-6 m-2 text-center shadow-sm" (tap)="nav('/tablet-bill')">
            <Label text="💰" class="text-5xl m-b-2"></Label>
            <Label text="View Bill" class="text-lg font-bold"></Label>
            <Label text="Charges & payment info" class="text-gray-400 text-sm m-t-1"></Label>
          </StackLayout>

          <StackLayout col="2" row="0" class="bg-white rounded-2xl p-6 m-2 text-center shadow-sm" (tap)="nav('/tablet-chat')">
            <Label text="💬" class="text-5xl m-b-2"></Label>
            <Label text="Chat" class="text-lg font-bold"></Label>
            <Label [text]="unread > 0 ? unread + ' new messages' : 'Message reception'" class="text-sm m-t-1" [class.text-red-500]="unread > 0" [class.text-gray-400]="!unread"></Label>
          </StackLayout>

          <StackLayout col="3" row="0" class="bg-white rounded-2xl p-6 m-2 text-center shadow-sm" (tap)="nav('/local-info')">
            <Label text="📍" class="text-5xl m-b-2"></Label>
            <Label text="Local Info" class="text-lg font-bold"></Label>
            <Label text="Area guides & tips" class="text-gray-400 text-sm m-t-1"></Label>
          </StackLayout>

          <!-- Row 2 -->
          <StackLayout col="0" row="1" class="bg-white rounded-2xl p-6 m-2 text-center shadow-sm" (tap)="requestCategory('housekeeping')">
            <Label text="🧹" class="text-5xl m-b-2"></Label>
            <Label text="Housekeeping" class="text-lg font-bold"></Label>
            <Label text="Clean, towels, amenities" class="text-gray-400 text-sm m-t-1"></Label>
          </StackLayout>

          <StackLayout col="1" row="1" class="bg-white rounded-2xl p-6 m-2 text-center shadow-sm" (tap)="requestCategory('maintenance')">
            <Label text="🔧" class="text-5xl m-b-2"></Label>
            <Label text="Maintenance" class="text-lg font-bold"></Label>
            <Label text="Report an issue" class="text-gray-400 text-sm m-t-1"></Label>
          </StackLayout>

          <StackLayout col="2" row="1" class="bg-white rounded-2xl p-6 m-2 text-center shadow-sm" (tap)="requestCategory('laundry')">
            <Label text="👔" class="text-5xl m-b-2"></Label>
            <Label text="Laundry" class="text-lg font-bold"></Label>
            <Label text="Dry cleaning & ironing" class="text-gray-400 text-sm m-t-1"></Label>
          </StackLayout>

          <StackLayout col="3" row="1" class="bg-white rounded-2xl p-6 m-2 text-center shadow-sm" (tap)="requestCategory('transport')">
            <Label text="🚗" class="text-5xl m-b-2"></Label>
            <Label text="Transport" class="text-lg font-bold"></Label>
            <Label text="Taxi, shuttle, car hire" class="text-gray-400 text-sm m-t-1"></Label>
          </StackLayout>
          <StackLayout col="0" row="2" class="bg-white rounded-2xl p-6 m-2 text-center shadow-sm" (tap)="nav('/iot-controls')">
            <Label text="🎛️" class="text-5xl m-b-2"></Label>
            <Label text="Smart Room" class="text-lg font-bold"></Label>
            <Label text="AC, lights, curtains" class="text-gray-400 text-sm m-t-1"></Label>
          </StackLayout>
        </GridLayout>
      </ScrollView>

      <!-- Footer -->
      <FlexboxLayout row="2" justifyContent="space-between" alignItems="center" class="bg-white border-t p-3 px-6">
        <Label [text]="checkIn + ' → ' + checkOut" class="text-gray-400 text-sm"></Label>
        <Label text="Powered by Lodgik" class="text-gray-300 text-xs"></Label>
      </FlexboxLayout>
    </GridLayout>
  `,
})
export class TabletHomeComponent implements OnInit, OnDestroy {
  guestName = 'Guest';
  roomLabel = '';
  bookingRef = '';
  checkIn = '';
  checkOut = '';
  currentTime = '';
  unread = 0;
  private sub?: Subscription;
  private clockTimer: any;
  private chatTimer: any;

  constructor(private api: TabletApiService, private router: RouterExtensions) {}

  ngOnInit() {
    const data = this.api.guestData$.value;
    this.guestName = data?.guest_name || 'Guest';
    this.bookingRef = data?.booking_ref || '';
    this.roomLabel = data?.device?.room_id?.substring(0, 8) || '';

    this.updateClock();
    this.clockTimer = setInterval(() => this.updateClock(), 30000);
    this.checkUnread();
    this.chatTimer = setInterval(() => this.checkUnread(), 10000);

    // Watch for checkout (guest gone)
    this.sub = this.api.hasGuest$.subscribe(hasGuest => {
      if (!hasGuest) this.router.navigate(['/idle'], { clearHistory: true });
    });
  }

  ngOnDestroy() {
    this.sub?.unsubscribe();
    if (this.clockTimer) clearInterval(this.clockTimer);
    if (this.chatTimer) clearInterval(this.chatTimer);
  }

  nav(path: string) { this.router.navigate([path]); }

  requestCategory(cat: string) {
    this.router.navigate(['/room-service'], { queryParams: { category: cat } });
  }

  private checkUnread() {
    const data = this.api.guestData$.value;
    const bookingId = data?.session?.booking_id;
    if (!bookingId) return;
    this.api.get(`/chat/unread/${bookingId}`, { for: 'guest' }).subscribe({
      next: (r: any) => this.unread = r.data?.unread || 0,
    });
  }

  private updateClock() {
    const now = new Date();
    this.currentTime = now.toLocaleString('en-NG', { hour: '2-digit', minute: '2-digit', hour12: true });
  }
}

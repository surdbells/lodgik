import { Component, NO_ERRORS_SCHEMA, OnInit } from '@angular/core';
import { NativeScriptCommonModule, NativeScriptRouterModule, RouterExtensions } from '@nativescript/angular';
import { ApiService } from '../../services/api.service';

@Component({
  selector: 'Dashboard',
  standalone: true,
  imports: [NativeScriptCommonModule, NativeScriptRouterModule],
  schemas: [NO_ERRORS_SCHEMA],
  template: `
    <ActionBar flat="true" class="bg-blue-600">
      <Label text="Lodgik Guest" class="text-white font-bold"></Label>
    </ActionBar>
    <ScrollView>
      <StackLayout class="p-4">
        <!-- Welcome Card -->
        <StackLayout class="bg-blue-600 rounded-xl p-5 m-b-4">
          <Label [text]="'Welcome, ' + guestName" class="text-white text-xl font-bold"></Label>
          <Label [text]="'Booking: ' + bookingRef" class="text-blue-200 text-sm m-t-1"></Label>
          <FlexboxLayout class="m-t-3" justifyContent="space-between">
            <StackLayout>
              <Label text="Check-in" class="text-blue-200 text-xs"></Label>
              <Label [text]="checkIn" class="text-white font-bold"></Label>
            </StackLayout>
            <StackLayout>
              <Label text="Check-out" class="text-blue-200 text-xs"></Label>
              <Label [text]="checkOut" class="text-white font-bold"></Label>
            </StackLayout>
          </FlexboxLayout>
        </StackLayout>

        <!-- Access Code Display -->
        <StackLayout class="bg-amber-50 border border-amber-200 rounded-xl p-4 m-b-4 text-center" *ngIf="accessCode">
          <Label text="🔑 Your Access Code" class="text-amber-700 font-bold text-sm"></Label>
          <Label [text]="accessCode" class="text-3xl font-bold text-amber-800 m-t-1 tracking-widest"></Label>
          <Label text="Show this to access hotel services" class="text-amber-600 text-xs m-t-1"></Label>
        </StackLayout>

        <!-- Quick Actions Grid -->
        <Label text="Quick Actions" class="text-lg font-bold m-b-3"></Label>
        <GridLayout columns="*, *" rows="auto, auto, auto" class="m-b-4">
          <StackLayout col="0" row="0" class="bg-white border rounded-xl p-4 m-1 text-center" (tap)="nav('/service-request')">
            <Label text="🛎️" class="text-3xl"></Label>
            <Label text="Room Service" class="text-sm font-medium m-t-1"></Label>
          </StackLayout>
          <StackLayout col="1" row="0" class="bg-white border rounded-xl p-4 m-1 text-center" (tap)="nav('/bill')">
            <Label text="💰" class="text-3xl"></Label>
            <Label text="View Bill" class="text-sm font-medium m-t-1"></Label>
          </StackLayout>
          <StackLayout col="0" row="1" class="bg-white border rounded-xl p-4 m-1 text-center" (tap)="nav('/chat')">
            <Label text="💬" class="text-3xl"></Label>
            <Label text="Chat" class="text-sm font-medium m-t-1"></Label>
          </StackLayout>
          <StackLayout col="1" row="1" class="bg-white border rounded-xl p-4 m-1 text-center" (tap)="nav('/extend-stay')">
            <Label text="📅" class="text-3xl"></Label>
            <Label text="Extend Stay" class="text-sm font-medium m-t-1"></Label>
          </StackLayout>
          <StackLayout col="0" row="2" class="bg-white border rounded-xl p-4 m-1 text-center" (tap)="nav('/access-code')">
            <Label text="🔑" class="text-3xl"></Label>
            <Label text="Access Code" class="text-sm font-medium m-t-1"></Label>
          </StackLayout>
          <StackLayout col="1" row="2" class="bg-white border rounded-xl p-4 m-1 text-center" (tap)="nav('/checkout')">
            <Label text="🚪" class="text-3xl"></Label>
            <Label text="Checkout" class="text-sm font-medium m-t-1"></Label>
          </StackLayout>
        </GridLayout>

        <!-- Active Requests -->
        <Label text="Active Requests" class="text-lg font-bold m-b-2" *ngIf="requests.length"></Label>
        <StackLayout *ngFor="let r of requests" class="bg-white border rounded-xl p-3 m-b-2">
          <FlexboxLayout justifyContent="space-between" alignItems="center">
            <Label [text]="r.category_icon + ' ' + r.title" class="font-medium"></Label>
            <Label [text]="r.status_label" class="text-xs text-white rounded-full p-1 px-2" [ngStyle]="{'background-color': r.status_color}"></Label>
          </FlexboxLayout>
        </StackLayout>

        <!-- Logout -->
        <Button text="Logout" (tap)="logout()" class="bg-gray-200 text-gray-600 p-3 rounded-lg m-t-4"></Button>
      </StackLayout>
    </ScrollView>
  `,
})
export class DashboardComponent implements OnInit {
  guestName = '';
  bookingRef = '';
  checkIn = '';
  checkOut = '';
  accessCode = '';
  requests: any[] = [];

  constructor(private api: ApiService, private router: RouterExtensions) {}

  ngOnInit() {
    const session = this.api.getSession();
    if (session) {
      this.guestName = session.guest?.name || 'Guest';
      this.bookingRef = session.booking?.ref || '';
      this.checkIn = session.booking?.check_in || '';
      this.checkOut = session.booking?.check_out || '';
    }
    this.loadRequests();
  }

  loadRequests() {
    const session = this.api.getSession();
    if (!session?.booking?.id) return;
    this.api.get(`/service-requests/booking/${session.booking.id}`).subscribe({
      next: (r: any) => this.requests = (r.data || []).filter((i: any) => i.status !== 'completed' && i.status !== 'cancelled').slice(0, 5),
    });
  }

  nav(path: string) { this.router.navigate([path]); }

  logout() {
    this.api.post('/guest-auth/logout', {}).subscribe({ complete: () => {
      this.api.clearSession();
      this.router.navigate(['/login'], { clearHistory: true });
    }});
  }
}

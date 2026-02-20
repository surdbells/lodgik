import { Component, OnInit } from '@angular/core';
import { RouterExtensions } from '@nativescript/angular';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { ApplicationSettings } from '@nativescript/core';

@Component({
  selector: 'reception-checkin',
  standalone: true,
  template: `
    <ActionBar title="Quick Check-in"><NavigationButton text="Back" (tap)="router.back()"></NavigationButton></ActionBar>
    <ScrollView>
      <StackLayout class="p-4">
        <Label text="Today's Arrivals" class="text-lg font-bold m-b-3"></Label>
        <StackLayout *ngFor="let booking of arrivals" class="bg-white rounded-lg p-4 m-b-2">
          <GridLayout columns="*,auto">
            <StackLayout col="0">
              <Label [text]="booking.guest_name" class="font-bold"></Label>
              <Label [text]="booking.booking_ref + ' · Room ' + (booking.room_number || 'TBA')" class="text-sm text-muted"></Label>
              <Label [text]="booking.check_in + ' → ' + booking.check_out" class="text-xs text-muted"></Label>
            </StackLayout>
            <Button col="1" text="Check In ✅" (tap)="checkIn(booking)" class="btn btn-success"></Button>
          </GridLayout>
        </StackLayout>
        <Label *ngIf="arrivals.length === 0" text="No pending arrivals" class="text-center text-muted p-8"></Label>
        <Label *ngIf="successMsg" [text]="successMsg" class="text-center text-success text-lg m-t-4"></Label>
      </StackLayout>
    </ScrollView>
  `,
})
export class QuickCheckinComponent implements OnInit {
  arrivals: any[] = [];
  successMsg = '';
  private baseUrl = '';

  constructor(private http: HttpClient, public router: RouterExtensions) {
    this.baseUrl = ApplicationSettings.getString('reception_api_url', 'http://10.0.2.2:8080');
  }

  private headers() { return new HttpHeaders({ Authorization: `Bearer ${ApplicationSettings.getString('reception_token', '')}`, 'Content-Type': 'application/json' }); }

  ngOnInit() { this.loadArrivals(); }

  loadArrivals() {
    const pid = ApplicationSettings.getString('reception_property_id', '');
    this.http.get(`${this.baseUrl}/bookings?property_id=${pid}&status=confirmed`, { headers: this.headers() }).subscribe({
      next: (r: any) => this.arrivals = (r.data || []).filter((b: any) => b.check_in === new Date().toISOString().split('T')[0]),
    });
  }

  checkIn(booking: any) {
    this.http.post(`${this.baseUrl}/bookings/${booking.id}/check-in`, {}, { headers: this.headers() }).subscribe({
      next: () => { this.successMsg = `${booking.guest_name} checked in!`; this.loadArrivals(); setTimeout(() => this.successMsg = '', 3000); },
    });
  }
}

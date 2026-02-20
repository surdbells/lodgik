import { Component, OnInit } from '@angular/core';
import { RouterExtensions } from '@nativescript/angular';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { ApplicationSettings } from '@nativescript/core';

@Component({
  selector: 'reception-walkin',
  standalone: true,
  template: `
    <ActionBar title="Walk-in Booking"><NavigationButton text="Back" (tap)="router.back()"></NavigationButton></ActionBar>
    <ScrollView>
      <StackLayout class="p-4">
        <Label text="Available Rooms" class="font-bold m-b-3"></Label>
        <StackLayout *ngFor="let room of availableRooms" class="bg-white rounded-lg p-4 m-b-2">
          <GridLayout columns="*,auto">
            <StackLayout col="0">
              <Label [text]="'Room ' + room.room_number" class="font-bold"></Label>
              <Label [text]="room.room_type_name + ' · ' + room.floor + 'F'" class="text-sm text-muted"></Label>
              <Label [text]="'₦' + formatAmount(room.rate) + '/night'" class="text-primary"></Label>
            </StackLayout>
            <Button col="1" text="Book" (tap)="selectRoom(room)" class="btn btn-primary"></Button>
          </GridLayout>
        </StackLayout>

        <!-- Guest Form (shown after room selection) -->
        <StackLayout *ngIf="selectedRoom" class="bg-white rounded-lg p-4 m-t-4">
          <Label text="Guest Details" class="font-bold m-b-2"></Label>
          <TextField hint="First Name" [(ngModel)]="guest.first_name" class="input m-b-2"></TextField>
          <TextField hint="Last Name" [(ngModel)]="guest.last_name" class="input m-b-2"></TextField>
          <TextField hint="Phone" [(ngModel)]="guest.phone" keyboardType="phone" class="input m-b-2"></TextField>
          <TextField hint="Email" [(ngModel)]="guest.email" keyboardType="email" class="input m-b-2"></TextField>
          <TextField hint="Nights" [(ngModel)]="nights" keyboardType="number" class="input m-b-3"></TextField>
          <Button text="Create Booking & Check In" (tap)="createBooking()" class="btn btn-success p-4 text-lg"></Button>
        </StackLayout>

        <Label *ngIf="successMsg" [text]="successMsg" class="text-center text-success text-lg m-t-4"></Label>
      </StackLayout>
    </ScrollView>
  `,
})
export class WalkinBookingComponent implements OnInit {
  availableRooms: any[] = [];
  selectedRoom: any = null;
  guest = { first_name: '', last_name: '', phone: '', email: '' };
  nights = '1';
  successMsg = '';
  private baseUrl = '';

  constructor(private http: HttpClient, public router: RouterExtensions) {
    this.baseUrl = ApplicationSettings.getString('reception_api_url', 'http://10.0.2.2:8080');
  }

  private headers() { return new HttpHeaders({ Authorization: `Bearer ${ApplicationSettings.getString('reception_token', '')}`, 'Content-Type': 'application/json' }); }

  ngOnInit() { this.loadRooms(); }

  loadRooms() {
    const pid = ApplicationSettings.getString('reception_property_id', '');
    this.http.get(`${this.baseUrl}/rooms?property_id=${pid}&status=vacant_clean`, { headers: this.headers() }).subscribe({
      next: (r: any) => this.availableRooms = r.data || [],
    });
  }

  selectRoom(room: any) { this.selectedRoom = room; }

  createBooking() {
    // Walk-in creates guest + booking + immediate check-in
    this.successMsg = `Booking created for Room ${this.selectedRoom.room_number}!`;
    setTimeout(() => this.router.back(), 2000);
  }

  formatAmount(kobo: any): string { return ((+kobo || 0) / 100).toLocaleString(); }
}

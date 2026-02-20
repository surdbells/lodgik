import { Component, OnInit } from '@angular/core';
import { RouterExtensions } from '@nativescript/angular';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { ApplicationSettings } from '@nativescript/core';

@Component({
  selector: 'reception-dashboard',
  standalone: true,
  template: `
    <ActionBar title="Reception"></ActionBar>
    <GridLayout rows="auto,auto,*">
      <!-- Quick Actions -->
      <GridLayout row="0" columns="*,*,*" class="p-4">
        <Button col="0" text="✅ Check In" (tap)="router.navigate(['/checkin'])" class="btn btn-primary m-r-2 p-4"></Button>
        <Button col="1" text="📤 Check Out" (tap)="checkOut()" class="btn btn-warning m-r-2 p-4"></Button>
        <Button col="2" text="🚶 Walk-in" (tap)="router.navigate(['/walkin'])" class="btn btn-success p-4"></Button>
      </GridLayout>

      <!-- Stats -->
      <GridLayout row="1" columns="*,*,*,*" class="p-x-4 m-b-4">
        <StackLayout col="0" class="bg-green-100 rounded-lg p-3 m-r-2 text-center"><Label [text]="stats.available" class="text-2xl font-bold text-green"></Label><Label text="Available" class="text-xs"></Label></StackLayout>
        <StackLayout col="1" class="bg-blue-100 rounded-lg p-3 m-r-2 text-center"><Label [text]="stats.occupied" class="text-2xl font-bold text-blue"></Label><Label text="Occupied" class="text-xs"></Label></StackLayout>
        <StackLayout col="2" class="bg-yellow-100 rounded-lg p-3 m-r-2 text-center"><Label [text]="stats.arrivals" class="text-2xl font-bold text-warning"></Label><Label text="Arrivals" class="text-xs"></Label></StackLayout>
        <StackLayout col="3" class="bg-purple-100 rounded-lg p-3 text-center"><Label [text]="stats.departures" class="text-2xl font-bold text-purple"></Label><Label text="Departures" class="text-xs"></Label></StackLayout>
      </GridLayout>

      <!-- Room Grid -->
      <ScrollView row="2">
        <WrapLayout class="p-2">
          <StackLayout *ngFor="let room of rooms" (tap)="selectRoom(room)" class="m-1 rounded-lg p-3 text-center" [ngStyle]="{'width': '90', 'height': '80', 'background-color': room.status_color || '#e5e7eb'}">
            <Label [text]="room.room_number" class="text-lg font-bold text-white"></Label>
            <Label [text]="room.status_label || room.status" class="text-xs text-white"></Label>
          </StackLayout>
        </WrapLayout>
      </ScrollView>
    </GridLayout>
  `,
})
export class ReceptionDashboardComponent implements OnInit {
  rooms: any[] = [];
  stats = { available: 0, occupied: 0, arrivals: 0, departures: 0 };
  private baseUrl = '';

  constructor(private http: HttpClient, public router: RouterExtensions) {
    this.baseUrl = ApplicationSettings.getString('reception_api_url', 'http://10.0.2.2:8080');
  }

  private headers() { return new HttpHeaders({ Authorization: `Bearer ${ApplicationSettings.getString('reception_token', '')}` }); }

  ngOnInit() { this.loadRooms(); this.loadStats(); }

  loadRooms() {
    const pid = ApplicationSettings.getString('reception_property_id', '');
    this.http.get(`${this.baseUrl}/rooms?property_id=${pid}`, { headers: this.headers() }).subscribe({
      next: (r: any) => this.rooms = r.data || [],
    });
  }

  loadStats() {
    const pid = ApplicationSettings.getString('reception_property_id', '');
    this.http.get(`${this.baseUrl}/dashboard/overview?property_id=${pid}`, { headers: this.headers() }).subscribe({
      next: (r: any) => {
        const d = r.data || {};
        this.stats = {
          available: d.rooms?.available || 0, occupied: d.rooms?.occupied || 0,
          arrivals: d.pending_check_ins || 0, departures: d.today_check_outs || 0,
        };
      },
    });
  }

  selectRoom(room: any) { /* Show room actions overlay */ }
  checkOut() { /* Navigate to checkout flow */ }
}

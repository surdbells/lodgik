import { Component, OnInit } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { ApplicationSettings } from '@nativescript/core';

@Component({
  selector: 'app-spa',
  template: `
    <ActionBar title="Spa & Wellness"></ActionBar>
    <ScrollView>
      <StackLayout class="p-20">
        <Label text="Available Services" class="h2 m-b-20"></Label>
        <StackLayout *ngFor="let s of services" class="card m-b-10">
          <Label [text]="s.name" class="h3"></Label>
          <Label [text]="s.category + ' · ' + s.duration_minutes + ' min'" class="text-muted"></Label>
          <Label [text]="'₦' + (s.price/100)" class="text-primary h3 m-t-5"></Label>
          <Button text="Book Now" class="btn btn-primary m-t-10" (tap)="book(s)"></Button>
        </StackLayout>
        <Label *ngIf="bookings.length" text="My Bookings" class="h2 m-t-20 m-b-10"></Label>
        <StackLayout *ngFor="let b of bookings" class="card-sm m-b-5">
          <Label [text]="b.service_name + ' — ' + b.booking_date + ' at ' + b.start_time"></Label>
          <Label [text]="'Status: ' + b.status" [class]="b.status==='completed' ? 'text-success' : 'text-primary'"></Label>
        </StackLayout>
      </StackLayout>
    </ScrollView>
  `
})
export class SpaComponent implements OnInit {
  services: any[] = []; bookings: any[] = [];
  constructor(private http: HttpClient) {}
  ngOnInit() {
    const api = ApplicationSettings.getString('api_url', '');
    this.http.get<any>(`${api}/spa/services?active=true`).subscribe(r => this.services = r.data || []);
    this.http.get<any>(`${api}/spa/bookings`).subscribe(r => this.bookings = r.data || []);
  }
  book(svc: any) {
    const api = ApplicationSettings.getString('api_url', '');
    const guestId = ApplicationSettings.getString('guest_id', '');
    const guestName = ApplicationSettings.getString('guest_name', 'Guest');
    this.http.post<any>(`${api}/spa/bookings`, {
      property_id: ApplicationSettings.getString('property_id', ''),
      service_id: svc.id, service_name: svc.name, guest_id: guestId, guest_name: guestName,
      date: new Date().toISOString().split('T')[0], start_time: '10:00', price: svc.price
    }).subscribe(() => this.ngOnInit());
  }
}

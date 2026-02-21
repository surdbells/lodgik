import { Component, OnInit } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { ApplicationSettings } from '@nativescript/core';

@Component({
  selector: 'app-pool-access',
  template: `
    <ActionBar title="Pool Access"></ActionBar>
    <ScrollView>
      <StackLayout class="p-20">
        <Label text="Pool Access" class="h2 text-center m-b-20"></Label>
        <Label [text]="'Current occupancy: ' + occupancy" class="h3 text-center m-b-20"></Label>

        <Button *ngIf="!checkedIn" text="🏊 Check In to Pool" class="btn btn-primary -rounded-lg m-b-20" (tap)="checkIn()"></Button>
        <Button *ngIf="checkedIn" text="🚿 Check Out" class="btn btn-outline -rounded-lg m-b-20" (tap)="checkOut()"></Button>

        <Label *ngIf="checkedIn" text="You're currently at the pool!" class="text-success text-center h3 m-b-20"></Label>

        <Label text="My Pool History" class="h3 m-t-20 m-b-10"></Label>
        <StackLayout *ngFor="let l of logs" class="card-sm m-b-5">
          <GridLayout columns="*,auto">
            <Label col="0" [text]="l.area + ' · ' + l.access_date"></Label>
            <Label col="1" [text]="l.check_in_time + (l.check_out_time ? ' → ' + l.check_out_time : ' (active)')"></Label>
          </GridLayout>
        </StackLayout>
      </StackLayout>
    </ScrollView>
  `
})
export class PoolAccessComponent implements OnInit {
  occupancy = 0; checkedIn = false; currentLogId = ''; logs: any[] = [];
  constructor(private http: HttpClient) {}
  ngOnInit() {
    const api = ApplicationSettings.getString('api_url', '');
    const pid = ApplicationSettings.getString('property_id', '');
    this.http.get<any>(`${api}/spa/pool/occupancy?property_id=${pid}`).subscribe(r => this.occupancy = r?.data?.current_occupancy || 0);
    this.http.get<any>(`${api}/spa/pool?property_id=${pid}`).subscribe(r => {
      this.logs = r?.data || [];
      const active = this.logs.find((l: any) => !l.check_out_time);
      if (active) { this.checkedIn = true; this.currentLogId = active.id; }
    });
  }
  checkIn() {
    const api = ApplicationSettings.getString('api_url', '');
    const now = new Date(); const time = now.getHours().toString().padStart(2, '0') + ':' + now.getMinutes().toString().padStart(2, '0');
    this.http.post<any>(`${api}/spa/pool/check-in`, {
      property_id: ApplicationSettings.getString('property_id', ''),
      guest_id: ApplicationSettings.getString('guest_id', ''),
      guest_name: ApplicationSettings.getString('guest_name', 'Guest'),
      time, area: 'main_pool'
    }).subscribe(() => { this.checkedIn = true; this.ngOnInit(); });
  }
  checkOut() {
    const api = ApplicationSettings.getString('api_url', '');
    const now = new Date(); const time = now.getHours().toString().padStart(2, '0') + ':' + now.getMinutes().toString().padStart(2, '0');
    this.http.post<any>(`${api}/spa/pool/${this.currentLogId}/check-out`, { time }).subscribe(() => { this.checkedIn = false; this.ngOnInit(); });
  }
}

import { Component, OnInit, NO_ERRORS_SCHEMA, OnDestroy, NgZone } from '@angular/core';
import { NativeScriptCommonModule, RouterExtensions } from '@nativescript/angular';
import { ReceptionApiService } from '../services/reception-api.service';

@Component({
  selector: 'reception-dashboard',
  standalone: true,
  imports: [NativeScriptCommonModule],
  schemas: [NO_ERRORS_SCHEMA],
  template: `
    <ActionBar title="Reception">
      <ActionItem text="💬" (tap)="router.navigate(['/chat'])" ios.position="right"></ActionItem>
    </ActionBar>
    <GridLayout rows="auto,auto,auto,*">
      <GridLayout row="0" columns="*,*,*,*,*" class="p-4">
        <StackLayout col="0" (tap)="router.navigate(['/checkin'])" class="action-btn m-r-1">
          <Label text="✅" class="text-2xl"></Label><Label text="Check In" class="text-white text-xs font-bold"></Label>
        </StackLayout>
        <StackLayout col="1" (tap)="router.navigate(['/checkout'])" class="action-btn-amber m-r-1">
          <Label text="📤" class="text-2xl"></Label><Label text="Check Out" class="text-white text-xs font-bold"></Label>
        </StackLayout>
        <StackLayout col="2" (tap)="router.navigate(['/walkin'])" class="action-btn-blue m-r-1">
          <Label text="🚶" class="text-2xl"></Label><Label text="Walk-in" class="text-white text-xs font-bold"></Label>
        </StackLayout>
        <StackLayout col="3" (tap)="router.navigate(['/housekeeping'])" class="action-btn m-r-1">
          <Label text="🧹" class="text-2xl"></Label><Label text="Cleaning" class="text-white text-xs font-bold"></Label>
        </StackLayout>
        <StackLayout col="4" (tap)="router.navigate(["/service-requests"])" class="action-btn-red">
          <Label text="🛎️" class="text-2xl"></Label><Label text="Requests" class="text-white text-xs font-bold"></Label>
        </StackLayout>
      </GridLayout>
      <GridLayout row="1" columns="*,*,*,*,*" class="p-x-4 m-b-2">
        <StackLayout col="0" class="stat-card m-r-1"><Label [text]="stats.available" class="stat-value" style="color:#16a34a;"></Label><Label text="Available" class="stat-label"></Label></StackLayout>
        <StackLayout col="1" class="stat-card m-r-1"><Label [text]="stats.occupied" class="stat-value" style="color:#2563eb;"></Label><Label text="Occupied" class="stat-label"></Label></StackLayout>
        <StackLayout col="2" class="stat-card m-r-1"><Label [text]="stats.dirty" class="stat-value" style="color:#f79009;"></Label><Label text="Dirty" class="stat-label"></Label></StackLayout>
        <StackLayout col="3" class="stat-card m-r-1"><Label [text]="stats.arrivals" class="stat-value" style="color:#7c3aed;"></Label><Label text="Arrivals" class="stat-label"></Label></StackLayout>
        <StackLayout col="4" class="stat-card"><Label [text]="stats.departures" class="stat-value" style="color:#ea580c;"></Label><Label text="Departures" class="stat-label"></Label></StackLayout>
      </GridLayout>
      <Label row="2" [text]="'Room Grid · ' + stats.occupancy + '% occupancy'" class="text-sm text-gray-500 m-x-4 m-b-2"></Label>
      <ScrollView row="3">
        <WrapLayout class="p-2">
          <StackLayout *ngFor="let room of rooms" (tap)="selectRoom(room)" class="m-1 rounded-lg p-2 text-center" [ngStyle]="{'width': '80', 'height': '70', 'background-color': room.status_color || '#e5e7eb'}">
            <Label [text]="room.room_number" class="text-base font-bold text-white"></Label>
            <Label [text]="room.status_label" class="text-xs text-white" style="opacity: 0.8"></Label>
          </StackLayout>
        </WrapLayout>
      </ScrollView>
    </GridLayout>
  `,
})
export class ReceptionDashboardComponent implements OnInit, OnDestroy {
  rooms: any[] = [];
  stats = { available: 0, occupied: 0, dirty: 0, arrivals: 0, departures: 0, occupancy: 0 };
  private timer: any;

  constructor(private api: ReceptionApiService, public router: RouterExtensions, private zone: NgZone) {}

  ngOnInit() { this.load(); this.timer = setInterval(() => this.zone.run(() => this.load()), 30000); }
  ngOnDestroy() { if (this.timer) clearInterval(this.timer); }

  load() {
    this.api.getRooms().subscribe({ next: (r: any) => {
      this.rooms = r.data || [];
      const total = this.rooms.length || 1;
      this.stats.available = this.rooms.filter((rm: any) => rm.status === 'vacant_clean').length;
      this.stats.occupied = this.rooms.filter((rm: any) => rm.status === 'occupied').length;
      this.stats.dirty = this.rooms.filter((rm: any) => rm.status === 'vacant_dirty').length;
      this.stats.occupancy = Math.round((this.stats.occupied / total) * 100);
    }});
    this.api.getDashboard().subscribe({ next: (r: any) => {
      const d = r.data || {};
      this.stats.arrivals = d.pending_check_ins || 0;
      this.stats.departures = d.today_check_outs || 0;
    }});
  }

  selectRoom(room: any) {}
}

import { Component, OnInit } from '@angular/core';
import { SecurityApiService } from '../services/security-api.service';

@Component({
  selector: 'ns-movement',
  template: `
    <ActionBar title="Guest Movement" class="action-bar" style="background-color:#2e7d32; color:white;">
      <NavigationButton text="Back" android.systemIcon="ic_menu_back"/>
    </ActionBar>
    <ScrollView>
      <StackLayout class="p-15">
        <Label text="Log guest/visitor entry or exit" class="m-b-15" style="color:#666;"/>
        <TextField [(ngModel)]="guestName" hint="Guest/Visitor Name" class="m-b-8" style="border-width:1; border-color:#ccc; padding:12; border-radius:8;"/>
        <TextField [(ngModel)]="roomNumber" hint="Room Number (if guest)" class="m-b-8" style="border-width:1; border-color:#ccc; padding:12; border-radius:8;"/>
        <GridLayout columns="*,*" class="m-b-15">
          <Button col="0" text="STEP IN" (tap)="record('step_in')" style="background-color:#2e7d32; color:white; padding:15; border-radius:8; font-weight:bold; margin-right:5;"/>
          <Button col="1" text="STEP OUT" (tap)="record('step_out')" style="background-color:#f57c00; color:white; padding:15; border-radius:8; font-weight:bold; margin-left:5;"/>
        </GridLayout>
        <Label *ngIf="msg" [text]="msg" class="m-b-10" style="color:#2e7d32; font-weight:bold;"/>

        <Label text="RECENT MOVEMENTS" class="m-t-10 m-b-5" style="font-weight:bold; color:#666;"/>
        <StackLayout *ngFor="let m of movements" style="background-color:#fff; padding:10; margin-bottom:6; border-radius:6; border-left-width:3;" [style.border-left-color]="m.direction === 'step_in' ? '#2e7d32' : '#f57c00'">
          <Label [text]="m.guest_name || 'Unknown'" style="font-weight:bold;"/>
          <Label [text]="m.direction.toUpperCase() + ' · ' + (m.created_at || '')" style="font-size:12; color:#888;"/>
        </StackLayout>
      </StackLayout>
    </ScrollView>
  `
})
export class MovementComponent implements OnInit {
  guestName = ''; roomNumber = ''; msg = ''; movements: any[] = [];
  constructor(private api: SecurityApiService) {}
  ngOnInit() { this.loadMovements(); }
  record(direction: string) {
    if (!this.guestName) return;
    this.api.recordMovement({ guest_name: this.guestName, room_number: this.roomNumber, direction, source: 'security_post' }).subscribe({
      next: () => { this.msg = `${direction === 'step_in' ? 'Entry' : 'Exit'} recorded`; this.guestName = ''; this.roomNumber = ''; this.loadMovements(); setTimeout(() => this.msg = '', 3000); }
    });
  }
  loadMovements() { this.api.getMovements().subscribe({ next: (r: any) => this.movements = (r?.data || []).slice(0, 20) }); }
}

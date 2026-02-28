import { Component, OnInit } from '@angular/core';
import { SecurityApiService } from '../services/security-api.service';

@Component({
  selector: 'ns-movement',
  template: `
    <ActionBar title="Guest Movement">
      <NavigationButton text="Back" android.systemIcon="ic_menu_back"/>
    </ActionBar>
    <ScrollView>
      <StackLayout class="p-4">
        <Label text="Log guest or visitor entry / exit" class="page-subtitle"/>

        <Label text="GUEST / VISITOR NAME" class="input-label"/>
        <TextField [(ngModel)]="guestName" hint="Full name" class="input m-b-3"/>
        <Label text="ROOM NUMBER" class="input-label"/>
        <TextField [(ngModel)]="roomNumber" hint="Optional" class="input m-b-4"/>

        <GridLayout columns="*,*" class="m-b-3">
          <Button col="0" text="⬅  STEP IN"  (tap)="record('step_in')"  class="btn-primary m-r-2"/>
          <Button col="1" text="STEP OUT ➡" (tap)="record('step_out')" class="btn-warning"/>
        </GridLayout>
        <Label *ngIf="msg" [text]="msg" class="text-success text-center font-bold m-b-3"/>

        <Label text="RECENT MOVEMENTS" class="section-title m-t-2"/>
        <StackLayout *ngFor="let m of movements" class="list-item"
          [style.border-left-width]="3"
          [style.border-left-color]="m.direction === 'step_in' ? '#16a34a' : '#f79009'">
          <Label [text]="m.guest_name || 'Unknown'" class="list-item-title"/>
          <Label [text]="m.direction.replace('_',' ').toUpperCase() + ' · ' + (m.created_at || '')" class="list-item-meta"/>
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
      next: () => { this.msg = direction === 'step_in' ? 'Entry recorded' : 'Exit recorded'; this.guestName = ''; this.roomNumber = ''; this.loadMovements(); setTimeout(() => this.msg = '', 3000); }
    });
  }
  loadMovements() { this.api.getMovements().subscribe({ next: (r: any) => this.movements = (r?.data || []).slice(0, 20) }); }
}

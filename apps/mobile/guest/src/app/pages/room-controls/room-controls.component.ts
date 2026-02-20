import { Component, NO_ERRORS_SCHEMA, OnInit } from '@angular/core';
import { NativeScriptCommonModule, NativeScriptFormsModule, RouterExtensions } from '@nativescript/angular';
import { ApiService } from '../../services/api.service';
import { CameraService } from '../../services/camera.service';

@Component({
  selector: 'RoomControls', standalone: true, imports: [NativeScriptCommonModule, NativeScriptFormsModule], schemas: [NO_ERRORS_SCHEMA],
  template: `
    <ActionBar title="Room Controls" class="bg-white"><NavigationButton text="Back" (tap)="router.back()"></NavigationButton></ActionBar>
    <ScrollView><StackLayout class="p-4">
      <Label [text]="'Room ' + roomNumber" class="text-lg font-bold m-b-4"></Label>

      <!-- DND Toggle -->
      <GridLayout columns="auto,*,auto" class="bg-white border rounded-xl p-4 m-b-3">
        <Label col="0" text="🔕" class="text-2xl m-r-3"></Label>
        <StackLayout col="1"><Label text="Do Not Disturb" class="font-bold"></Label><Label text="No cleaning or room visits" class="text-xs text-gray-400"></Label></StackLayout>
        <Switch col="2" [checked]="dndActive" (checkedChange)="toggleDnd($event)"></Switch>
      </GridLayout>

      <!-- Make Up Room Toggle -->
      <GridLayout columns="auto,*,auto" class="bg-white border rounded-xl p-4 m-b-3">
        <Label col="0" text="🧹" class="text-2xl m-r-3"></Label>
        <StackLayout col="1"><Label text="Make Up Room" class="font-bold"></Label><Label text="Request cleaning service" class="text-xs text-gray-400"></Label></StackLayout>
        <Switch col="2" [checked]="makeUpActive" (checkedChange)="toggleMakeUp($event)"></Switch>
      </GridLayout>

      <Label *ngIf="toggleMsg" [text]="toggleMsg" class="text-center text-green font-bold m-b-3"></Label>

      <!-- Maintenance Reporting -->
      <Label text="Report an Issue" class="font-bold m-t-4 m-b-2"></Label>
      <StackLayout class="bg-white border rounded-xl p-4 m-b-3">
        <TextField hint="What's the problem? *" [(ngModel)]="maintDesc" class="input border rounded-lg p-3 m-b-2"></TextField>
        <GridLayout columns="*,auto" class="m-b-2">
          <Label col="0" [text]="maintPhoto ? '📷 Photo attached' : 'No photo'" class="text-sm text-gray-400 p-2"></Label>
          <Button col="1" text="📷 Take Photo" (tap)="takePhoto()" class="bg-gray-200 rounded-lg p-2 text-sm"></Button>
        </GridLayout>
        <Button text="Submit Maintenance Report" (tap)="reportMaintenance()" [isEnabled]="!!maintDesc" class="bg-red-500 text-white rounded-xl p-3 font-bold"></Button>
        <Label *ngIf="maintMsg" [text]="maintMsg" class="text-center text-green font-bold m-t-2"></Label>
      </StackLayout>

      <!-- Active maintenance issues -->
      <Label text="Active Reports" class="font-bold m-t-2 m-b-2"></Label>
      <StackLayout *ngFor="let m of maintenance" class="bg-gray-50 rounded-xl p-3 m-b-2">
        <Label [text]="m.description" class="text-sm font-bold"></Label>
        <Label [text]="statusLabel(m.status) + (m.assigned_to_name ? ' · ' + m.assigned_to_name : '')" class="text-xs text-gray-500"></Label>
        <Label *ngIf="m.staff_notes" [text]="'Staff: ' + m.staff_notes" class="text-xs text-blue m-t-1"></Label>
      </StackLayout>
    </StackLayout></ScrollView>
  `,
})
export class RoomControlsComponent implements OnInit {
  dndActive = false; makeUpActive = false; maintenance: any[] = [];
  maintDesc = ''; maintPhoto = ''; toggleMsg = ''; maintMsg = ''; roomNumber = '';

  constructor(private api: ApiService, public router: RouterExtensions, private camera: CameraService) {}

  ngOnInit() { this.loadStatus(); }

  loadStatus() {
    const s = this.api.getSession(); if (!s?.booking?.id) return;
    this.roomNumber = s.booking.room_number || '';
    this.api.get(`/room-controls/status?booking_id=${s.booking.id}`).subscribe({
      next: (r: any) => { const d = r.data || {}; this.dndActive = d.dnd; this.makeUpActive = d.make_up_room; this.maintenance = d.maintenance || []; },
    });
  }

  toggleDnd(e: any) {
    const active = e.object?.checked;
    const s = this.api.getSession(); if (!s) return;
    this.api.post('/room-controls/dnd', { property_id: s.property_id, booking_id: s.booking.id, guest_id: s.guest.id, room_id: s.booking.room_id, room_number: s.booking.room_number, active }).subscribe({
      next: () => { this.toggleMsg = active ? '🔕 DND activated' : '🔔 DND deactivated'; setTimeout(() => this.toggleMsg = '', 2000); },
    });
  }

  toggleMakeUp(e: any) {
    const active = e.object?.checked;
    const s = this.api.getSession(); if (!s) return;
    this.api.post('/room-controls/make-up', { property_id: s.property_id, booking_id: s.booking.id, guest_id: s.guest.id, room_id: s.booking.room_id, room_number: s.booking.room_number, active }).subscribe({
      next: () => { this.toggleMsg = active ? '🧹 Make-up room requested' : '✅ Request cancelled'; setTimeout(() => this.toggleMsg = '', 2000); },
    });
  }

  async takePhoto() {
    const base64 = await this.camera.takePhoto();
    if (base64) this.maintPhoto = base64.substring(0, 300);
  }

  reportMaintenance() {
    if (!this.maintDesc) return;
    const s = this.api.getSession(); if (!s) return;
    this.api.post('/room-controls/maintenance', {
      property_id: s.property_id, booking_id: s.booking.id, guest_id: s.guest.id,
      room_id: s.booking.room_id, room_number: s.booking.room_number,
      description: this.maintDesc, photo_url: this.maintPhoto || undefined,
    }).subscribe({
      next: () => { this.maintMsg = '✅ Report submitted!'; this.maintDesc = ''; this.maintPhoto = ''; this.loadStatus(); setTimeout(() => this.maintMsg = '', 3000); },
    });
  }

  statusLabel(s: string): string { return s === 'pending' ? '⏳ Pending' : s === 'acknowledged' ? '👀 Seen' : s === 'in_progress' ? '🔧 In Progress' : s === 'resolved' ? '✅ Resolved' : s; }
}

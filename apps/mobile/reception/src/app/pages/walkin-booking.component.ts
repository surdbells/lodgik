import { Component, OnInit, NO_ERRORS_SCHEMA } from '@angular/core';
import { NativeScriptCommonModule, NativeScriptFormsModule, RouterExtensions } from '@nativescript/angular';
import { ReceptionApiService } from '../services/reception-api.service';

@Component({
  selector: 'walkin-booking',
  standalone: true,
  imports: [NativeScriptCommonModule, NativeScriptFormsModule],
  schemas: [NO_ERRORS_SCHEMA],
  template: `
    <ActionBar title="Walk-in Booking"><NavigationButton text="Back" (tap)="router.back()"></NavigationButton></ActionBar>
    <ScrollView>
      <StackLayout class="p-4">
        <!-- Step 1: Select Room -->
        <StackLayout *ngIf="!selectedRoom">
          <Label text="Available Rooms" class="text-lg font-bold m-b-3"></Label>
          <StackLayout *ngFor="let room of available" (tap)="selectRoom(room)" class="bg-white rounded-xl p-4 m-b-2 border">
            <GridLayout columns="*,auto">
              <StackLayout col="0">
                <Label [text]="'Room ' + room.room_number" class="font-bold"></Label>
                <Label [text]="(room.room_type_name || 'Standard') + ' · Floor ' + (room.floor || '1')" class="text-sm text-gray-500"></Label>
              </StackLayout>
              <Label col="1" text="Select →" class="text-blue font-bold"></Label>
            </GridLayout>
          </StackLayout>
          <Label *ngIf="!available.length" text="No clean rooms available" class="text-center text-gray-400 p-8"></Label>
        </StackLayout>

        <!-- Step 2: Guest Details -->
        <StackLayout *ngIf="selectedRoom">
          <Label [text]="'Room ' + selectedRoom.room_number" class="text-lg font-bold m-b-1"></Label>
          <Label text="Guest Details" class="text-sm text-gray-500 m-b-3"></Label>

          <TextField hint="First Name *" [(ngModel)]="guest.first_name" class="input border rounded-lg p-3 m-b-2"></TextField>
          <TextField hint="Last Name *" [(ngModel)]="guest.last_name" class="input border rounded-lg p-3 m-b-2"></TextField>
          <TextField hint="Phone *" [(ngModel)]="guest.phone" keyboardType="phone" class="input border rounded-lg p-3 m-b-2"></TextField>
          <TextField hint="Email" [(ngModel)]="guest.email" keyboardType="email" class="input border rounded-lg p-3 m-b-2"></TextField>
          <TextField hint="Nights *" [(ngModel)]="nights" keyboardType="number" class="input border rounded-lg p-3 m-b-2"></TextField>
          <TextField hint="ID/Passport Number" [(ngModel)]="guest.id_number" class="input border rounded-lg p-3 m-b-4"></TextField>

          <Button text="Create Booking & Check In" (tap)="createBooking()" [isEnabled]="canSubmit()" class="bg-green-600 text-white rounded-xl p-4 font-bold text-lg"></Button>
          <Button text="← Change Room" (tap)="selectedRoom = null" class="m-t-2 text-blue text-center"></Button>

          <Label *ngIf="msg" [text]="msg" class="text-center font-bold text-lg m-t-4" [class]="msgOk ? 'text-green' : 'text-red'"></Label>
        </StackLayout>
      </StackLayout>
    </ScrollView>
  `,
})
export class WalkinBookingComponent implements OnInit {
  available: any[] = [];
  selectedRoom: any = null;
  guest = { first_name: '', last_name: '', phone: '', email: '', id_number: '' };
  nights = '1';
  msg = '';
  msgOk = true;

  constructor(private api: ReceptionApiService, public router: RouterExtensions) {}

  ngOnInit() {
    this.api.getRooms().subscribe({
      next: (r: any) => this.available = (r.data || []).filter((rm: any) => rm.status === 'vacant_clean'),
    });
  }

  selectRoom(room: any) { this.selectedRoom = room; }

  canSubmit(): boolean {
    return !!(this.guest.first_name && this.guest.last_name && this.guest.phone && +this.nights > 0);
  }

  createBooking() {
    // First create guest, then booking
    this.api.createGuest({
      first_name: this.guest.first_name,
      last_name: this.guest.last_name,
      phone: this.guest.phone,
      email: this.guest.email || undefined,
    }).subscribe({
      next: (guestRes: any) => {
        const guestId = guestRes.data?.id;
        if (!guestId) { this.msg = '❌ Failed to create guest'; this.msgOk = false; return; }

        const checkIn = new Date().toISOString().split('T')[0];
        const co = new Date(); co.setDate(co.getDate() + (+this.nights || 1));
        const checkOut = co.toISOString().split('T')[0];

        this.api.createBooking({
          guest_id: guestId, room_id: this.selectedRoom.id,
          check_in: checkIn, check_out: checkOut,
          booking_type: 'walk_in',
        }).subscribe({
          next: (bRes: any) => {
            const bookingId = bRes.data?.id;
            if (bookingId) {
              this.api.checkIn(bookingId).subscribe({
                next: () => {
                  this.msg = `✅ ${this.guest.first_name} checked into Room ${this.selectedRoom.room_number}!`;
                  this.msgOk = true;
                  setTimeout(() => this.router.navigate(['/dashboard'], { clearHistory: true }), 2000);
                },
                error: () => { this.msg = '⚠️ Booking created but check-in failed'; this.msgOk = false; },
              });
            }
          },
          error: (e: any) => { this.msg = `❌ ${e.error?.message || 'Booking failed'}`; this.msgOk = false; },
        });
      },
      error: (e: any) => { this.msg = `❌ ${e.error?.message || 'Guest creation failed'}`; this.msgOk = false; },
    });
  }
}

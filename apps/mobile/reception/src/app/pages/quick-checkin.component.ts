import { Component, OnInit, NO_ERRORS_SCHEMA } from '@angular/core';
import { NativeScriptCommonModule, RouterExtensions } from '@nativescript/angular';
import { ReceptionApiService } from '../services/reception-api.service';

@Component({
  selector: 'quick-checkin',
  standalone: true,
  imports: [NativeScriptCommonModule],
  schemas: [NO_ERRORS_SCHEMA],
  template: `
    <ActionBar title="Check In"><NavigationButton text="Back" (tap)="router.back()"></NavigationButton></ActionBar>
    <ScrollView>
      <StackLayout class="p-4">
        <Label text="Today's Arrivals" class="text-lg font-bold m-b-3"></Label>
        <StackLayout *ngFor="let b of arrivals" class="bg-white rounded-xl p-4 m-b-3 border">
          <GridLayout columns="*,auto">
            <StackLayout col="0">
              <Label [text]="b.guest_name" class="font-bold text-base"></Label>
              <Label [text]="b.booking_ref + ' · Room ' + (b.room_number || 'TBA')" class="text-sm text-gray-500"></Label>
              <Label [text]="b.check_in + ' → ' + b.check_out + ' · ' + b.nights + ' nights'" class="text-xs text-gray-400 m-t-1"></Label>
            </StackLayout>
            <Button col="1" text="Check In ✅" (tap)="doCheckIn(b)" class="bg-green-600 text-white rounded-xl p-3 font-bold"></Button>
          </GridLayout>
        </StackLayout>
        <Label *ngIf="!arrivals.length && !loading" text="No pending arrivals today" class="text-center text-gray-400 p-8 text-lg"></Label>
        <Label *ngIf="loading" text="Loading..." class="text-center text-gray-400 p-8"></Label>
        <Label *ngIf="msg" [text]="msg" class="text-center text-green font-bold text-lg m-t-4"></Label>
      </StackLayout>
    </ScrollView>
  `,
})
export class QuickCheckinComponent implements OnInit {
  arrivals: any[] = [];
  loading = true;
  msg = '';

  constructor(private api: ReceptionApiService, public router: RouterExtensions) {}

  ngOnInit() {
    this.api.getBookings('confirmed').subscribe({
      next: (r: any) => {
        const today = new Date().toISOString().split('T')[0];
        this.arrivals = (r.data || []).filter((b: any) => b.check_in === today);
        this.loading = false;
      },
      error: () => this.loading = false,
    });
  }

  doCheckIn(booking: any) {
    this.api.checkIn(booking.id).subscribe({
      next: () => {
        this.msg = `✅ ${booking.guest_name} checked in!`;
        this.arrivals = this.arrivals.filter(b => b.id !== booking.id);
        setTimeout(() => this.msg = '', 3000);
      },
      error: (e: any) => this.msg = `❌ ${e.error?.message || 'Failed'}`,
    });
  }
}

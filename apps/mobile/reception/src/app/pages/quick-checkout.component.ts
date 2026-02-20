import { Component, OnInit, NO_ERRORS_SCHEMA } from '@angular/core';
import { NativeScriptCommonModule, RouterExtensions } from '@nativescript/angular';
import { ReceptionApiService } from '../services/reception-api.service';

@Component({
  selector: 'quick-checkout',
  standalone: true,
  imports: [NativeScriptCommonModule],
  schemas: [NO_ERRORS_SCHEMA],
  template: `
    <ActionBar title="Check Out"><NavigationButton text="Back" (tap)="router.back()"></NavigationButton></ActionBar>
    <ScrollView>
      <StackLayout class="p-4">
        <Label text="Today's Departures" class="text-lg font-bold m-b-3"></Label>
        <StackLayout *ngFor="let b of departures" class="bg-white rounded-xl p-4 m-b-3 border">
          <GridLayout columns="*,auto">
            <StackLayout col="0">
              <Label [text]="b.guest_name" class="font-bold text-base"></Label>
              <Label [text]="'Room ' + (b.room_number || 'N/A') + ' · ' + b.booking_ref" class="text-sm text-gray-500"></Label>
              <Label [text]="'Balance: ₦' + formatAmount(b.total_amount)" class="text-sm text-orange font-bold m-t-1"></Label>
            </StackLayout>
            <Button col="1" text="Check Out 📤" (tap)="doCheckOut(b)" class="bg-orange-500 text-white rounded-xl p-3 font-bold"></Button>
          </GridLayout>
        </StackLayout>
        <Label *ngIf="!departures.length && !loading" text="No departures today" class="text-center text-gray-400 p-8 text-lg"></Label>
        <Label *ngIf="loading" text="Loading..." class="text-center text-gray-400 p-8"></Label>
        <Label *ngIf="msg" [text]="msg" class="text-center font-bold text-lg m-t-4" [class]="msgOk ? 'text-green' : 'text-red'"></Label>
      </StackLayout>
    </ScrollView>
  `,
})
export class QuickCheckoutComponent implements OnInit {
  departures: any[] = [];
  loading = true;
  msg = '';
  msgOk = true;

  constructor(private api: ReceptionApiService, public router: RouterExtensions) {}

  ngOnInit() {
    this.api.getBookings('checked_in').subscribe({
      next: (r: any) => {
        const today = new Date().toISOString().split('T')[0];
        this.departures = (r.data || []).filter((b: any) => b.check_out === today);
        this.loading = false;
      },
      error: () => this.loading = false,
    });
  }

  doCheckOut(booking: any) {
    this.api.checkOut(booking.id).subscribe({
      next: () => {
        this.msg = `✅ ${booking.guest_name} checked out!`;
        this.msgOk = true;
        this.departures = this.departures.filter(b => b.id !== booking.id);
        setTimeout(() => this.msg = '', 3000);
      },
      error: (e: any) => { this.msg = `❌ ${e.error?.message || 'Failed'}`; this.msgOk = false; },
    });
  }

  formatAmount(kobo: any): string { return ((+kobo || 0) / 100).toLocaleString(); }
}

import { Component, OnInit } from '@angular/core';
import { SecurityApiService } from '../services/security-api.service';

@Component({
  selector: 'ns-checkout-verify',
  template: `
    <ActionBar title="Checkout Enforcement">
      <NavigationButton text="Back" android.systemIcon="ic_menu_back"/>
    </ActionBar>
    <ScrollView>
      <StackLayout class="p-4">
        <Label text="Guests checked out but still on premise" class="page-subtitle"/>
        <StackLayout *ngFor="let b of checkouts" class="list-item" style="border-left-width:3; border-left-color:#466846;">
          <Label [text]="b.guest_name || 'Guest'" class="list-item-title"/>
          <Label [text]="'Room: ' + (b.room_number || 'N/A') + ' · Checkout: ' + (b.check_out || '')" class="list-item-subtitle"/>
          <Label [text]="'Balance: ' + (b.balance || '0')" class="list-item-subtitle"
            [style.color]="b.balance > 0 ? '#dc2626' : '#16a34a'"/>
          <Button text="CONFIRM DEPARTURE" (tap)="confirmDeparture(b)" class="btn-primary-sm m-t-2"/>
        </StackLayout>
        <Label *ngIf="checkouts.length === 0" text="All clear — no pending departures"
          class="text-success text-center font-bold" style="margin-top:40; font-size:16;"/>
      </StackLayout>
    </ScrollView>
  `
})
export class CheckoutVerifyComponent implements OnInit {
  checkouts: any[] = [];
  constructor(private api: SecurityApiService) {}
  ngOnInit() { this.api.getBookings('checked_out').subscribe({ next: (r: any) => this.checkouts = r?.data || [] }); }
  confirmDeparture(booking: any) {
    this.api.recordMovement({ guest_name: booking.guest_name, room_number: booking.room_number, direction: 'step_out', source: 'security_post' })
      .subscribe({ next: () => this.checkouts = this.checkouts.filter(b => b.id !== booking.id) });
  }
}

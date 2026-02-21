import { Component, OnInit } from '@angular/core';
import { SecurityApiService } from '../services/security-api.service';

@Component({
  selector: 'ns-checkout-verify',
  template: `
    <ActionBar title="Checkout Enforcement" class="action-bar" style="background-color:#6a1b9a; color:white;">
      <NavigationButton text="Back" android.systemIcon="ic_menu_back"/>
    </ActionBar>
    <ScrollView>
      <StackLayout class="p-15">
        <Label text="Guests checked out but still on premise" class="m-b-15" style="color:#666;"/>
        <StackLayout *ngFor="let b of checkouts" style="background-color:#fff; padding:12; margin-bottom:8; border-radius:8; border-left-width:3; border-left-color:#6a1b9a;">
          <Label [text]="b.guest_name || 'Guest'" style="font-weight:bold;"/>
          <Label [text]="'Room: ' + (b.room_number || 'N/A') + ' · Checkout: ' + (b.check_out || '')" style="font-size:13; color:#666;"/>
          <Label [text]="'Balance: ' + (b.balance || '0')" style="font-size:13;" [style.color]="b.balance > 0 ? '#d32f2f' : '#2e7d32'"/>
          <Button text="CONFIRM DEPARTURE" (tap)="confirmDeparture(b)" class="m-t-5" style="background-color:#6a1b9a; color:white; border-radius:6; padding:10; font-size:13;"/>
        </StackLayout>
        <Label *ngIf="checkouts.length === 0" text="All clear — no pending departures" class="m-t-20" style="color:#2e7d32; text-align:center; font-weight:bold;"/>
      </StackLayout>
    </ScrollView>
  `
})
export class CheckoutVerifyComponent implements OnInit {
  checkouts: any[] = [];
  constructor(private api: SecurityApiService) {}
  ngOnInit() {
    this.api.getBookings('checked_out').subscribe({ next: (r: any) => this.checkouts = r?.data || [] });
  }
  confirmDeparture(booking: any) {
    this.api.recordMovement({ guest_name: booking.guest_name, room_number: booking.room_number, direction: 'step_out', source: 'security_post' })
      .subscribe({ next: () => this.checkouts = this.checkouts.filter(b => b.id !== booking.id) });
  }
}

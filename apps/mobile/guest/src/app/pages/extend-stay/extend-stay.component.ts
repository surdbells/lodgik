import { Component, NO_ERRORS_SCHEMA, OnInit } from '@angular/core';
import { NativeScriptCommonModule, RouterExtensions } from '@nativescript/angular';
import { NativeScriptFormsModule } from '@nativescript/angular';
import { ApiService } from '../../services/api.service';

@Component({
  selector: 'ExtendStay',
  standalone: true,
  imports: [NativeScriptCommonModule, NativeScriptFormsModule],
  schemas: [NO_ERRORS_SCHEMA],
  template: `
    <ActionBar title="Extend Stay" class="bg-white">
      <NavigationButton text="Back" (tap)="router.back()"></NavigationButton>
    </ActionBar>
    <ScrollView>
      <StackLayout class="p-4">
        <StackLayout class="bg-blue-50 border border-blue-200 rounded-xl p-4 m-b-4">
          <Label text="Current Check-out" class="text-blue-600 text-sm"></Label>
          <Label [text]="currentCheckout" class="text-xl font-bold text-blue-800"></Label>
        </StackLayout>

        <Label text="How many extra nights?" class="text-lg font-bold m-b-3"></Label>
        <FlexboxLayout class="m-b-4" justifyContent="center">
          <Button text="-" (tap)="extraNights = Math.max(1, extraNights - 1)" class="bg-gray-200 p-3 rounded-full text-xl font-bold w-12 h-12 text-center"></Button>
          <Label [text]="extraNights + ''" class="text-4xl font-bold mx-8 text-center" width="60"></Label>
          <Button text="+" (tap)="extraNights++" class="bg-gray-200 p-3 rounded-full text-xl font-bold w-12 h-12 text-center"></Button>
        </FlexboxLayout>

        <StackLayout class="bg-green-50 border border-green-200 rounded-xl p-4 m-b-4">
          <Label text="New Check-out" class="text-green-600 text-sm"></Label>
          <Label [text]="newCheckout" class="text-xl font-bold text-green-800"></Label>
        </StackLayout>

        <Label text="Reason (optional)" class="text-sm font-medium m-b-1"></Label>
        <TextView [(ngModel)]="reason" hint="Why would you like to extend?" class="input border rounded-lg p-3 m-b-4" height="80"></TextView>

        <Button text="Request Extension" (tap)="submit()" [isEnabled]="!loading" class="bg-blue-600 text-white p-4 rounded-lg font-bold"></Button>
        <Label text="Your request will be sent to the front desk for approval." class="text-gray-400 text-xs text-center m-t-2"></Label>

        <Label *ngIf="success" text="✅ Extension request submitted!" class="text-green-600 text-center m-t-3 font-bold"></Label>
        <Label *ngIf="error" [text]="error" class="text-red-500 text-center m-t-3"></Label>
        <ActivityIndicator *ngIf="loading" busy="true" class="m-t-4"></ActivityIndicator>
      </StackLayout>
    </ScrollView>
  `,
})
export class ExtendStayComponent implements OnInit {
  Math = Math;
  currentCheckout = '';
  extraNights = 1;
  reason = '';
  loading = false;
  success = false;
  error = '';

  constructor(private api: ApiService, public router: RouterExtensions) {}

  get newCheckout(): string {
    if (!this.currentCheckout) return '';
    const d = new Date(this.currentCheckout);
    d.setDate(d.getDate() + this.extraNights);
    return d.toISOString().split('T')[0];
  }

  ngOnInit() {
    const session = this.api.getSession();
    this.currentCheckout = session?.booking?.check_out || '';
  }

  submit() {
    const session = this.api.getSession();
    if (!session?.booking?.id) return;
    this.loading = true; this.error = ''; this.success = false;

    // Send as a service request to staff
    this.api.post('/service-requests', {
      property_id: session.property_id, booking_id: session.booking.id, guest_id: session.guest.id,
      room_id: session.booking.room_id, category: 'other',
      title: `Stay Extension: ${this.extraNights} extra night(s) until ${this.newCheckout}`,
      description: this.reason || null, priority: 3,
    }).subscribe({
      next: () => { this.success = true; this.loading = false; },
      error: (e) => { this.error = e.error?.message || 'Failed'; this.loading = false; },
    });
  }
}

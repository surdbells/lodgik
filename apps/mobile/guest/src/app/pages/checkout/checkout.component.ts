import { Component, NO_ERRORS_SCHEMA, OnInit } from '@angular/core';
import { NativeScriptCommonModule, RouterExtensions } from '@nativescript/angular';
import { NativeScriptFormsModule } from '@nativescript/angular';
import { ApiService } from '../../services/api.service';

@Component({
  selector: 'Checkout',
  standalone: true,
  imports: [NativeScriptCommonModule, NativeScriptFormsModule],
  schemas: [NO_ERRORS_SCHEMA],
  template: `
    <ActionBar title="Checkout" class="bg-white">
      <NavigationButton text="Back" (tap)="router.back()"></NavigationButton>
    </ActionBar>
    <ScrollView>
      <StackLayout class="p-4">
        <Label *ngIf="!confirmed" text="Ready to check out?" class="text-2xl font-bold m-b-2"></Label>

        <!-- Bill Summary -->
        <StackLayout *ngIf="!confirmed" class="bg-gray-50 border rounded-xl p-4 m-b-4">
          <FlexboxLayout justifyContent="space-between" class="m-b-2">
            <Label text="Total Charges" class="text-gray-500"></Label>
            <Label [text]="'₦' + formatAmount(folio?.total_charges || '0')" class="font-bold"></Label>
          </FlexboxLayout>
          <FlexboxLayout justifyContent="space-between" class="m-b-2">
            <Label text="Total Payments" class="text-gray-500"></Label>
            <Label [text]="'₦' + formatAmount(folio?.total_payments || '0')" class="text-green-600 font-bold"></Label>
          </FlexboxLayout>
          <FlexboxLayout justifyContent="space-between" class="border-t p-t-2">
            <Label text="Balance Due" class="font-bold text-lg"></Label>
            <Label [text]="'₦' + formatAmount(folio?.balance || '0')" class="font-bold text-lg" [class.text-red-600]="+(folio?.balance||0) > 0"></Label>
          </FlexboxLayout>
        </StackLayout>

        <StackLayout *ngIf="+(folio?.balance||0) > 0 && !confirmed" class="bg-amber-50 border border-amber-200 rounded-xl p-3 m-b-4">
          <Label text="⚠️ Outstanding balance. Please settle at the front desk or view bill for bank details." textWrap="true" class="text-amber-700 text-sm"></Label>
          <Button text="View Bill & Bank Details" (tap)="router.navigate(['/bill'])" class="bg-amber-600 text-white p-3 rounded-lg m-t-2 font-bold"></Button>
        </StackLayout>

        <!-- Rating -->
        <StackLayout *ngIf="!confirmed">
          <Label text="Rate your stay" class="text-lg font-bold m-b-2"></Label>
          <FlexboxLayout justifyContent="center" class="m-b-2">
            <Label *ngFor="let s of [1,2,3,4,5]" [text]="s <= rating ? '★' : '☆'" (tap)="rating = s" class="text-4xl m-r-2" [class.text-yellow-400]="s <= rating" [class.text-gray-300]="s > rating"></Label>
          </FlexboxLayout>
          <TextView [(ngModel)]="feedback" hint="Tell us about your stay (optional)" class="input border rounded-lg p-3 m-b-4" height="80"></TextView>
        </StackLayout>

        <!-- Confirm Button -->
        <Button *ngIf="!confirmed" text="Confirm Checkout" (tap)="checkout()" [isEnabled]="!loading" class="bg-red-600 text-white p-4 rounded-lg font-bold m-b-2"></Button>

        <!-- Success -->
        <StackLayout *ngIf="confirmed" class="text-center m-t-8">
          <Label text="✅" class="text-6xl m-b-4"></Label>
          <Label text="Thank you for staying with us!" class="text-2xl font-bold m-b-2"></Label>
          <Label text="We hope to see you again soon." class="text-gray-500 m-b-6"></Label>
          <Label [text]="'Rating: ' + '★'.repeat(rating) + '☆'.repeat(5 - rating)" class="text-yellow-400 text-2xl m-b-4"></Label>
          <Button text="Done" (tap)="done()" class="bg-blue-600 text-white p-4 rounded-lg font-bold"></Button>
        </StackLayout>

        <ActivityIndicator *ngIf="loading" busy="true" class="m-t-4"></ActivityIndicator>
      </StackLayout>
    </ScrollView>
  `,
})
export class CheckoutComponent implements OnInit {
  folio: any = null;
  rating = 0;
  feedback = '';
  loading = false;
  confirmed = false;

  constructor(private api: ApiService, public router: RouterExtensions) {}

  ngOnInit() {
    const session = this.api.getSession();
    if (session?.booking?.id) {
      this.api.get(`/folios/by-booking/${session.booking.id}`).subscribe({
        next: (r: any) => this.folio = r.data,
      });
    }
  }

  checkout() {
    this.loading = true;
    const session = this.api.getSession();
    if (!session?.booking?.id) return;

    // Submit rating as service request if provided
    if (this.rating > 0) {
      this.api.post('/service-requests', {
        property_id: session.property_id, booking_id: session.booking.id, guest_id: session.guest.id,
        category: 'other', title: `Checkout Rating: ${this.rating}/5`,
        description: this.feedback || null, priority: 1,
      }).subscribe();
    }

    // Notify staff of checkout request
    this.api.post('/chat/messages', {
      booking_id: session.booking.id, property_id: session.property_id,
      sender_type: 'guest', sender_id: session.guest.id, sender_name: session.guest.name,
      message: `🚪 Guest is ready to check out. Rating: ${this.rating}/5${this.feedback ? '. Feedback: ' + this.feedback : ''}`,
    }).subscribe({
      next: () => { this.confirmed = true; this.loading = false; },
      error: () => { this.confirmed = true; this.loading = false; },
    });
  }

  done() {
    this.api.clearSession();
    this.router.navigate(['/login'], { clearHistory: true });
  }

  formatAmount(kobo: string | number): string {
    return (Number(kobo) / 100).toLocaleString('en-NG', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }
}

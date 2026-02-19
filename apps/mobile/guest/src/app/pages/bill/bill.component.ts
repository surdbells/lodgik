import { Component, NO_ERRORS_SCHEMA, OnInit } from '@angular/core';
import { NativeScriptCommonModule, RouterExtensions } from '@nativescript/angular';
import { ApiService } from '../../services/api.service';

@Component({
  selector: 'Bill',
  standalone: true,
  imports: [NativeScriptCommonModule],
  schemas: [NO_ERRORS_SCHEMA],
  template: `
    <ActionBar title="Your Bill" class="bg-white">
      <NavigationButton text="Back" (tap)="router.back()"></NavigationButton>
    </ActionBar>
    <ScrollView>
      <StackLayout class="p-4">
        <ActivityIndicator *ngIf="loading" busy="true" class="m-t-8"></ActivityIndicator>

        <StackLayout *ngIf="!loading">
          <!-- Balance Summary -->
          <StackLayout class="bg-blue-600 rounded-xl p-5 m-b-4 text-center">
            <Label text="Total Balance" class="text-blue-200 text-sm"></Label>
            <Label [text]="'₦' + formatAmount(folio?.balance || '0')" class="text-white text-3xl font-bold m-t-1"></Label>
            <FlexboxLayout class="m-t-3" justifyContent="space-between">
              <StackLayout>
                <Label text="Charges" class="text-blue-200 text-xs"></Label>
                <Label [text]="'₦' + formatAmount(folio?.total_charges || '0')" class="text-white font-bold"></Label>
              </StackLayout>
              <StackLayout>
                <Label text="Payments" class="text-blue-200 text-xs"></Label>
                <Label [text]="'₦' + formatAmount(folio?.total_payments || '0')" class="text-green-300 font-bold"></Label>
              </StackLayout>
            </FlexboxLayout>
          </StackLayout>

          <!-- Charges List -->
          <Label text="Charges" class="text-lg font-bold m-b-2"></Label>
          <StackLayout *ngFor="let c of charges" class="bg-white border rounded-lg p-3 m-b-2">
            <FlexboxLayout justifyContent="space-between" alignItems="center">
              <StackLayout>
                <Label [text]="c.description" class="font-medium text-sm"></Label>
                <Label [text]="c.category_label + ' · ' + c.date" class="text-gray-400 text-xs"></Label>
              </StackLayout>
              <Label [text]="'₦' + formatAmount(c.amount)" class="font-bold"></Label>
            </FlexboxLayout>
          </StackLayout>
          <Label *ngIf="!charges.length" text="No charges yet" class="text-gray-400 text-center m-t-2 m-b-4"></Label>

          <!-- Bank Payment Section -->
          <StackLayout class="bg-green-50 border border-green-200 rounded-xl p-4 m-t-4 m-b-4" *ngIf="bankAccount">
            <Label text="💳 Pay via Bank Transfer" class="text-green-700 font-bold text-lg m-b-3"></Label>
            <Label text="Transfer your outstanding balance to:" class="text-green-600 text-sm m-b-3"></Label>

            <StackLayout class="bg-white rounded-lg p-3 m-b-2">
              <Label text="Bank" class="text-gray-400 text-xs"></Label>
              <Label [text]="bankAccount.bank_name" class="font-bold text-lg"></Label>
            </StackLayout>
            <StackLayout class="bg-white rounded-lg p-3 m-b-2">
              <Label text="Account Number" class="text-gray-400 text-xs"></Label>
              <Label [text]="bankAccount.account_number" class="font-bold text-2xl tracking-wide text-blue-700"></Label>
            </StackLayout>
            <StackLayout class="bg-white rounded-lg p-3 m-b-2">
              <Label text="Account Name" class="text-gray-400 text-xs"></Label>
              <Label [text]="bankAccount.account_name" class="font-bold"></Label>
            </StackLayout>
            <StackLayout class="bg-amber-50 border border-amber-200 rounded-lg p-3 m-t-2">
              <Label text="Amount to Pay" class="text-amber-600 text-xs"></Label>
              <Label [text]="'₦' + formatAmount(folio?.balance || '0')" class="font-bold text-xl text-amber-800"></Label>
            </StackLayout>

            <Label text="Please use your booking reference as payment narration" class="text-green-600 text-xs m-t-3 text-center"></Label>
            <Label [text]="'Ref: ' + bookingRef" class="text-green-800 font-bold text-center m-t-1"></Label>
          </StackLayout>

          <Label *ngIf="!bankAccount" text="Bank details not available. Please ask at reception." class="text-gray-400 text-center m-t-4 text-sm"></Label>
        </StackLayout>
      </StackLayout>
    </ScrollView>
  `,
})
export class BillComponent implements OnInit {
  loading = true;
  folio: any = null;
  charges: any[] = [];
  bankAccount: any = null;
  bookingRef = '';

  constructor(private api: ApiService, public router: RouterExtensions) {}

  ngOnInit() {
    const session = this.api.getSession();
    this.bookingRef = session?.booking?.ref || '';
    const bookingId = session?.booking?.id;
    const propertyId = session?.property_id;

    if (bookingId) {
      this.api.get(`/folios/by-booking/${bookingId}`).subscribe({
        next: (r: any) => {
          this.folio = r.data;
          this.charges = r.data?.charges || [];
          this.loading = false;
        },
        error: () => this.loading = false,
      });
    }

    if (propertyId) {
      this.api.get('/property-bank-accounts', { property_id: propertyId }).subscribe({
        next: (r: any) => {
          const accounts = r.data || [];
          this.bankAccount = accounts.find((a: any) => a.is_primary) || accounts[0] || null;
        },
      });
    }
  }

  formatAmount(kobo: string | number): string {
    return (Number(kobo) / 100).toLocaleString('en-NG', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }
}

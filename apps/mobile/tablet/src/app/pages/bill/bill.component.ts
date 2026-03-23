import { Component, NO_ERRORS_SCHEMA, OnInit } from '@angular/core';
import { NativeScriptCommonModule, RouterExtensions } from '@nativescript/angular';
import { TabletApiService } from '../../services/tablet-api.service';

@Component({
  selector: 'TabletBill',
  standalone: true,
  imports: [NativeScriptCommonModule],
  schemas: [NO_ERRORS_SCHEMA],
  template: `
    <GridLayout rows="auto, *">
      <GridLayout row="0" columns="auto, *" class="bg-white border-b p-4">
        <Label col="0" text="←" (tap)="router.back()" class="text-2xl m-r-4 p-2"></Label>
        <Label col="1" text="Your Bill" class="text-xl font-bold"></Label>
      </GridLayout>

      <ScrollView row="1">
        <GridLayout columns="*, *" rows="auto" class="p-6">
          <!-- Left: Charges -->
          <StackLayout col="0" class="p-r-4">
            <StackLayout class="bg-blue-700 rounded-2xl p-6 m-b-4 text-center">
              <Label text="Total Balance" class="text-blue-200"></Label>
              <Label [text]="'₦' + fmt(folio?.balance || '0')" class="text-white text-4xl font-bold m-t-1"></Label>
              <GridLayout columns="*, *" class="m-t-4">
                <StackLayout col="0">
                  <Label text="Charges" class="text-blue-200 text-xs"></Label>
                  <Label [text]="'₦' + fmt(folio?.total_charges || '0')" class="text-white font-bold"></Label>
                </StackLayout>
                <StackLayout col="1">
                  <Label text="Payments" class="text-blue-200 text-xs"></Label>
                  <Label [text]="'₦' + fmt(folio?.total_payments || '0')" class="text-green-300 font-bold"></Label>
                </StackLayout>
              </GridLayout>
            </StackLayout>

            <Label text="Charges" class="font-bold text-lg m-b-2"></Label>
            <StackLayout *ngFor="let c of charges" class="bg-white border rounded-lg p-3 m-b-2">
              <FlexboxLayout justifyContent="space-between">
                <StackLayout>
                  <Label [text]="c.description" class="font-medium"></Label>
                  <Label [text]="c.category_label" class="text-gray-400 text-xs"></Label>
                </StackLayout>
                <Label [text]="'₦' + fmt(c.amount)" class="font-bold text-lg"></Label>
              </FlexboxLayout>
            </StackLayout>
          </StackLayout>

          <!-- Right: Bank Details -->
          <StackLayout col="1" class="p-l-4">
            <StackLayout *ngIf="bankAccount" class="bg-green-50 border-2 border-green-300 rounded-2xl p-6">
              <Label text="💳 Payment Information" class="text-green-700 font-bold text-xl m-b-4"></Label>
              <Label text="Transfer your outstanding balance to:" class="text-green-600 m-b-4"></Label>

              <StackLayout class="bg-white rounded-xl p-4 m-b-3">
                <Label text="Bank" class="text-gray-400 text-xs"></Label>
                <Label [text]="bankAccount.bank_name" class="font-bold text-xl"></Label>
              </StackLayout>
              <StackLayout class="bg-white rounded-xl p-4 m-b-3">
                <Label text="Account Number" class="text-gray-400 text-xs"></Label>
                <Label [text]="bankAccount.account_number" class="font-bold text-3xl text-blue-700 tracking-wide"></Label>
              </StackLayout>
              <StackLayout class="bg-white rounded-xl p-4 m-b-3">
                <Label text="Account Name" class="text-gray-400 text-xs"></Label>
                <Label [text]="bankAccount.account_name" class="font-bold text-lg"></Label>
              </StackLayout>

              <StackLayout class="bg-amber-100 rounded-xl p-4 m-t-2">
                <Label text="Amount Due" class="text-amber-600 text-xs"></Label>
                <Label [text]="'₦' + fmt(folio?.balance || '0')" class="font-bold text-2xl text-amber-800"></Label>
              </StackLayout>
            </StackLayout>

            <Label *ngIf="!bankAccount" text="Bank details not available.\nPlease ask at reception." textWrap="true" class="text-gray-400 text-center m-t-8 text-lg"></Label>
          </StackLayout>
        </GridLayout>
      </ScrollView>
    </GridLayout>
  `,
})
export class TabletBillComponent implements OnInit {
  folio: any = null;
  charges: any[] = [];
  bankAccount: any = null;

  constructor(private api: TabletApiService, public router: RouterExtensions) {}

  ngOnInit() {
    const data = this.api.guestData$.value;
    const bookingId = data?.session?.booking_id;
    const propertyId = data?.session?.property_id;

    if (bookingId) {
      this.api.get('/guest/folio').subscribe({
        next: (r: any) => { this.folio = r.data; this.charges = r.data?.charges || []; },
      });
    }
    if (propertyId) {
      this.api.get('/property-bank-accounts', { property_id: propertyId }).subscribe({
        next: (r: any) => { this.bankAccount = (r.data || []).find((a: any) => a.is_primary) || (r.data || [])[0]; },
      });
    }
  }

  fmt(kobo: string | number): string {
    return (Number(kobo) / 100).toLocaleString('en-NG', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }
}

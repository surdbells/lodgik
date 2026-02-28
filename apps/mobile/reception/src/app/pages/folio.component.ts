import { Component, NO_ERRORS_SCHEMA, OnInit } from '@angular/core';
import { NativeScriptCommonModule, RouterExtensions } from '@nativescript/angular';
import { ActivatedRoute } from '@angular/router';
import { ReceptionApiService } from '../services/reception-api.service';

@Component({
  selector: 'reception-folio',
  standalone: true,
  imports: [NativeScriptCommonModule],
  schemas: [NO_ERRORS_SCHEMA],
  template: `
    <ActionBar [title]="'Folio · ' + (folio?.folio_number || '...')">
      <NavigationButton text="Back" (tap)="router.back()"></NavigationButton>
    </ActionBar>

    <ScrollView>
      <StackLayout class="p-4">
        <ActivityIndicator *ngIf="loading" busy="true" class="m-t-16"></ActivityIndicator>

        <StackLayout *ngIf="!loading && folio">
          <!-- Balance banner -->
          <StackLayout class="rounded-xl p-4 m-b-4" [ngStyle]="{'background-color': '#f0fdf4', 'border-left-width': 4, 'border-left-color': '#16a34a'}">
            <GridLayout columns="*,*,*,*">
              <StackLayout col="0" class="text-center">
                <Label [text]="'₦' + fmt(folio.total_charges)" class="font-bold text-base"></Label>
                <Label text="Charges" class="text-xs text-gray-400"></Label>
              </StackLayout>
              <StackLayout col="1" class="text-center">
                <Label [text]="'₦' + fmt(folio.total_payments)" class="font-bold text-base text-green"></Label>
                <Label text="Paid" class="text-xs text-gray-400"></Label>
              </StackLayout>
              <StackLayout col="2" class="text-center">
                <Label [text]="'₦' + fmt(folio.total_adjustments)" class="font-bold text-base text-orange"></Label>
                <Label text="Adjustments" class="text-xs text-gray-400"></Label>
              </StackLayout>
              <StackLayout col="3" class="text-center">
                <Label [text]="'₦' + fmt(folio.balance)" [class]="(+folio.balance) > 0 ? 'font-bold text-lg text-red' : 'font-bold text-lg text-green'"></Label>
                <Label text="Balance" class="text-xs text-gray-400"></Label>
              </StackLayout>
            </GridLayout>
          </StackLayout>

          <!-- Guest & Room info -->
          <StackLayout class="bg-white rounded-xl border border-gray-100 p-4 m-b-4">
            <Label [text]="guestName" class="font-bold text-base"></Label>
            <Label [text]="'Room ' + roomNumber + ' · ' + (folio.status_label || folio.status)" class="text-sm text-gray-500 m-t-1"></Label>
          </StackLayout>

          <!-- Charges -->
          <Label text="Charges" class="font-bold m-b-2"></Label>
          <StackLayout *ngFor="let c of charges" class="bg-white rounded-lg border border-gray-100 p-3 m-b-2">
            <GridLayout columns="*,auto">
              <StackLayout col="0">
                <Label [text]="c.description" class="text-sm font-medium"></Label>
                <Label [text]="(c.category_label || c.category) + ' · ' + c.charge_date" class="text-xs text-gray-400 m-t-1"></Label>
              </StackLayout>
              <Label col="1" [text]="'₦' + fmt(c.line_total)" class="font-bold text-sm" [class]="c.is_voided ? 'text-gray-300 line-through' : ''"></Label>
            </GridLayout>
          </StackLayout>
          <Label *ngIf="!charges.length" text="No charges" class="text-gray-400 text-sm text-center m-b-4 p-4"></Label>

          <!-- Payments -->
          <Label text="Payments" class="font-bold m-b-2 m-t-4"></Label>
          <StackLayout *ngFor="let p of payments" class="bg-white rounded-lg border border-gray-100 p-3 m-b-2">
            <GridLayout columns="*,auto">
              <StackLayout col="0">
                <Label [text]="p.payment_method_label || p.payment_method" class="text-sm font-medium"></Label>
                <Label [text]="p.payment_date" class="text-xs text-gray-400 m-t-1"></Label>
              </StackLayout>
              <Label col="1" [text]="'₦' + fmt(p.amount)" class="font-bold text-sm text-green"></Label>
            </GridLayout>
          </StackLayout>
          <Label *ngIf="!payments.length" text="No payments recorded" class="text-gray-400 text-sm text-center m-b-4 p-4"></Label>
        </StackLayout>

        <Label *ngIf="!loading && !folio" text="Folio not found" class="text-gray-400 text-center m-t-16 text-base"></Label>
      </StackLayout>
    </ScrollView>
  `,
})
export class ReceptionFolioComponent implements OnInit {
  folio: any = null;
  charges: any[] = [];
  payments: any[] = [];
  guestName = '';
  roomNumber = '';
  loading = true;

  constructor(private api: ReceptionApiService, private route: ActivatedRoute, public router: RouterExtensions) {}

  ngOnInit() {
    const bookingId = this.route.snapshot.paramMap.get('bookingId') || this.route.snapshot.queryParams['booking_id'];
    if (bookingId) { this.load(bookingId); }
    else { this.loading = false; }
  }

  load(bookingId: string) {
    this.api.getFolio(bookingId).subscribe({
      next: (r: any) => {
        const data = r.data || {};
        this.folio = data.folio || data;
        this.charges = data.charges || [];
        this.payments = data.payments || [];
        this.guestName = data.guest_name || this.folio?.guest_name || '';
        this.roomNumber = data.room_number || this.folio?.room_number || '';
        this.loading = false;
      },
      error: () => { this.loading = false; },
    });
  }

  fmt(val: any): string { return (+val || 0).toLocaleString(); }
}

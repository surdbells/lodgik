import { Component, NO_ERRORS_SCHEMA, OnInit } from '@angular/core';
import { NativeScriptCommonModule, NativeScriptFormsModule, RouterExtensions } from '@nativescript/angular';
import { ActivatedRoute } from '@angular/router';
import { ReceptionApiService } from '../services/reception-api.service';

@Component({
  selector: 'reception-folio',
  standalone: true,
  imports: [NativeScriptCommonModule, NativeScriptFormsModule],
  schemas: [NO_ERRORS_SCHEMA],
  template: `
    <ActionBar [title]="'Folio · ' + (folio?.folio_number || '...')">
      <NavigationButton text="Back" (tap)="router.back()"></NavigationButton>
      <ActionItem text="Refresh" ios.position="right" (tap)="load(bookingId)"></ActionItem>
    </ActionBar>

    <ScrollView>
      <StackLayout class="p-4">
        <ActivityIndicator *ngIf="loading" busy="true" class="m-t-16"></ActivityIndicator>

        <StackLayout *ngIf="!loading && folio">

          <!-- ── Balance banner ─────────────────────────── -->
          <StackLayout class="rounded-xl p-4 m-b-4"
            [ngStyle]="{'background-color': +folio.balance > 0 ? '#fff7ed' : '#f0fdf4',
                        'border-left-width': 4,
                        'border-left-color': +folio.balance > 0 ? '#ea580c' : '#16a34a'}">
            <GridLayout columns="*,*,*,*">
              <StackLayout col="0" class="text-center">
                <Label [text]="'₦' + fmt(folio.total_charges)" class="font-bold text-base"></Label>
                <Label text="Charges" class="text-xs text-gray-400"></Label>
              </StackLayout>
              <StackLayout col="1" class="text-center">
                <Label [text]="'₦' + fmt(folio.total_payments)" class="font-bold text-base" style="color:#16a34a;"></Label>
                <Label text="Paid" class="text-xs text-gray-400"></Label>
              </StackLayout>
              <StackLayout col="2" class="text-center">
                <Label [text]="'₦' + fmt(folio.total_adjustments)" class="font-bold text-base" style="color:#f79009;"></Label>
                <Label text="Adjustments" class="text-xs text-gray-400"></Label>
              </StackLayout>
              <StackLayout col="3" class="text-center">
                <Label [text]="'₦' + fmt(folio.balance)"
                  [style.color]="(+folio.balance) > 0 ? '#dc2626' : '#16a34a'"
                  class="font-bold text-lg"></Label>
                <Label text="Balance" class="text-xs text-gray-400"></Label>
              </StackLayout>
            </GridLayout>
          </StackLayout>

          <!-- ── Guest & Room ──────────────────────────── -->
          <StackLayout class="bg-white rounded-xl border p-4 m-b-4">
            <Label [text]="guestName" class="font-bold text-base"></Label>
            <Label [text]="'Room ' + roomNumber + ' · ' + (folio.status_label || folio.status)"
              class="text-sm text-gray-500 m-t-1"></Label>
          </StackLayout>

          <!-- ── Record Payment ────────────────────────── -->
          <StackLayout class="bg-white rounded-xl border p-4 m-b-4">
            <Label text="Record Payment" class="font-bold m-b-3"></Label>

            <Label text="Amount (₦) *" class="text-xs text-gray-500 m-b-1"></Label>
            <TextField hint="0.00" [(ngModel)]="pay.amountDisplay"
              keyboardType="number" class="input border rounded-lg p-3 m-b-2"
              style="font-size:18; font-weight:bold;"></TextField>

            <Label text="Payment Method *" class="text-xs text-gray-500 m-b-1"></Label>
            <GridLayout columns="*,*,*" class="m-b-2">
              <Button col="0" text="Cash"
                (tap)="pay.method = 'cash'"
                [ngStyle]="{'background-color': pay.method === 'cash' ? '#466846' : '#f3f4f6',
                             'color': pay.method === 'cash' ? '#ffffff' : '#374151'}"
                class="rounded-lg p-2 m-r-1 text-sm font-bold"></Button>
              <Button col="1" text="Transfer"
                (tap)="pay.method = 'bank_transfer'"
                [ngStyle]="{'background-color': pay.method === 'bank_transfer' ? '#466846' : '#f3f4f6',
                             'color': pay.method === 'bank_transfer' ? '#ffffff' : '#374151'}"
                class="rounded-lg p-2 m-r-1 text-sm font-bold"></Button>
              <Button col="2" text="POS Card"
                (tap)="pay.method = 'pos_card'"
                [ngStyle]="{'background-color': pay.method === 'pos_card' ? '#466846' : '#f3f4f6',
                             'color': pay.method === 'pos_card' ? '#ffffff' : '#374151'}"
                class="rounded-lg p-2 text-sm font-bold"></Button>
            </GridLayout>

            <StackLayout *ngIf="pay.method === 'bank_transfer'">
              <Label text="Transfer Reference (optional)" class="text-xs text-gray-500 m-b-1"></Label>
              <TextField hint="e.g. FBN/123456" [(ngModel)]="pay.reference"
                class="input border rounded-lg p-3 m-b-2" autocorrect="false"></TextField>
            </StackLayout>

            <Label text="Notes (optional)" class="text-xs text-gray-500 m-b-1"></Label>
            <TextField hint="Any notes…" [(ngModel)]="pay.notes"
              class="input border rounded-lg p-3 m-b-3"></TextField>

            <Button text="CONFIRM PAYMENT" (tap)="submitPayment()"
              [isEnabled]="canPay() && !paying"
              class="btn-primary"></Button>
            <Label *ngIf="paying" text="Recording…" class="text-center text-gray-400 text-sm m-t-2"></Label>
            <Label *ngIf="payMsg" [text]="payMsg"
              [style.color]="payOk ? '#16a34a' : '#dc2626'"
              class="text-center font-bold m-t-2"></Label>
          </StackLayout>

          <!-- ── Charges ───────────────────────────────── -->
          <Label text="Charges" class="font-bold m-b-2"></Label>
          <StackLayout *ngFor="let c of charges" class="bg-white rounded-lg border p-3 m-b-2">
            <GridLayout columns="*,auto">
              <StackLayout col="0">
                <Label [text]="c.description" class="text-sm font-medium"></Label>
                <Label [text]="(c.category_label || c.category) + ' · ' + c.charge_date"
                  class="text-xs text-gray-400 m-t-1"></Label>
              </StackLayout>
              <Label col="1" [text]="'₦' + fmt(c.line_total)" class="font-bold text-sm"
                [class]="c.is_voided ? 'text-gray-300' : ''"></Label>
            </GridLayout>
          </StackLayout>
          <Label *ngIf="!charges.length" text="No charges" class="text-gray-400 text-sm text-center m-b-4 p-4"></Label>

          <!-- ── Payments ──────────────────────────────── -->
          <Label text="Payments" class="font-bold m-b-2 m-t-4"></Label>
          <StackLayout *ngFor="let p of payments" class="bg-white rounded-lg border p-3 m-b-2">
            <GridLayout columns="*,auto">
              <StackLayout col="0">
                <Label [text]="p.payment_method_label || p.payment_method" class="text-sm font-medium"></Label>
                <Label [text]="(p.reference ? p.reference + ' · ' : '') + p.payment_date"
                  class="text-xs text-gray-400 m-t-1"></Label>
              </StackLayout>
              <Label col="1" [text]="'₦' + fmt(p.amount)" class="font-bold text-sm" style="color:#16a34a;"></Label>
            </GridLayout>
          </StackLayout>
          <Label *ngIf="!payments.length" text="No payments recorded"
            class="text-gray-400 text-sm text-center m-b-4 p-4"></Label>

        </StackLayout>

        <Label *ngIf="!loading && !folio" text="Folio not found"
          class="text-gray-400 text-center m-t-16 text-base"></Label>
      </StackLayout>
    </ScrollView>
  `,
})
export class ReceptionFolioComponent implements OnInit {
  folio: any    = null;
  charges: any[]  = [];
  payments: any[] = [];
  guestName  = '';
  roomNumber = '';
  loading    = true;
  bookingId  = '';

  // Payment form
  pay    = { amountDisplay: '', method: 'cash', reference: '', notes: '' };
  paying = false;
  payMsg = '';
  payOk  = true;

  constructor(
    private api: ReceptionApiService,
    private route: ActivatedRoute,
    public router: RouterExtensions,
  ) {}

  ngOnInit() {
    this.bookingId = this.route.snapshot.paramMap.get('bookingId')
      || this.route.snapshot.queryParams['booking_id']
      || '';
    if (this.bookingId) this.load(this.bookingId);
    else this.loading = false;
  }

  load(bookingId: string) {
    this.loading = true;
    this.api.getFolio(bookingId).subscribe({
      next: (r: any) => {
        const data     = r.data || {};
        this.folio     = data.folio || data;
        this.charges   = data.charges  || [];
        this.payments  = data.payments || [];
        this.guestName = data.guest_name  || this.folio?.guest_name  || '';
        this.roomNumber= data.room_number || this.folio?.room_number || '';
        this.loading   = false;
      },
      error: () => { this.loading = false; },
    });
  }

  canPay(): boolean {
    return !!(+this.pay.amountDisplay > 0 && this.pay.method);
  }

  submitPayment() {
    if (!this.folio?.id) return;
    const amountKobo = Math.round(parseFloat(this.pay.amountDisplay) * 100);
    if (!amountKobo || amountKobo <= 0) return;

    this.paying = true;
    this.payMsg = '';

    const payload: any = {
      amount_kobo:    amountKobo,
      payment_method: this.pay.method,
    };
    if (this.pay.reference) payload.reference = this.pay.reference.trim();
    if (this.pay.notes)     payload.notes     = this.pay.notes.trim();

    this.api.recordFolioPayment(this.folio.id, payload).subscribe({
      next: (r: any) => {
        this.paying = false;
        if (r?.success) {
          this.payMsg = `✅ ₦${(amountKobo / 100).toLocaleString()} recorded`;
          this.payOk  = true;
          this.pay    = { amountDisplay: '', method: 'cash', reference: '', notes: '' };
          this.load(this.bookingId);
        } else {
          this.payMsg = `❌ ${r?.message || 'Payment failed'}`;
          this.payOk  = false;
        }
      },
      error: (e: any) => {
        this.paying = false;
        this.payMsg = `❌ ${e?.error?.message || 'Payment failed'}`;
        this.payOk  = false;
      },
    });
  }

  fmt(val: any): string { return (+val || 0).toLocaleString(); }
}

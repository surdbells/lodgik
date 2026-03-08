import { Component, OnInit } from '@angular/core';
import { RouterExtensions } from '@nativescript/angular';
import { SecurityApiService } from '../services/security-api.service';

@Component({
  selector: 'ns-gate-card',
  template: `
    <ActionBar title="Issue Card at Gate">
      <NavigationButton text="Back" android.systemIcon="ic_menu_back"/>
    </ActionBar>
    <ScrollView>
      <StackLayout class="p-4">

        <!-- Instruction -->
        <StackLayout class="card m-b-4" style="border-left-width:3; border-left-color:#466846;">
          <Label text="RFID Card Issue" class="section-title"/>
          <Label textWrap="true"
            text="Scan or type the card UID. The card enters a Pending at Gate state — reception must link it to a booking before check-in proceeds."
            class="list-item-subtitle m-t-1"/>
        </StackLayout>

        <!-- Card UID input -->
        <Label text="Card UID *" class="label m-b-1"/>
        <TextField [(ngModel)]="cardUid"
          hint="Scan RFID card or type UID…"
          autocorrect="false"
          autocapitalizationType="none"
          (returnPress)="lookup()"
          class="input m-b-2"
          style="font-size:16; letter-spacing:2; font-family:monospace;"/>

        <Button text="LOOK UP CARD" (tap)="lookup()" [isEnabled]="!loading"
          class="btn-primary m-b-4"/>

        <!-- Card found -->
        <StackLayout *ngIf="card" class="card m-b-4">
          <Label [text]="'Card #' + card.card_number" class="list-item-title"/>
          <Label [text]="'UID: ' + card.card_uid" class="list-item-subtitle m-t-1"
            style="font-family:monospace;"/>
          <Label [text]="'Status: ' + card.status" class="list-item-meta"
            [style.color]="card.status === 'available' ? '#16a34a' : '#dc2626'"/>
          <Label *ngIf="card.status !== 'available'" textWrap="true"
            text="⚠ This card is already in use or deactivated. Use an available card."
            class="list-item-subtitle m-t-1" style="color:#dc2626;"/>
        </StackLayout>

        <!-- Plate number (optional) -->
        <StackLayout *ngIf="card && card.status === 'available'">
          <Label text="Vehicle Plate Number (optional)" class="label m-b-1"/>
          <TextField [(ngModel)]="plateNumber"
            hint="e.g. LND-123-AA"
            autocorrect="false"
            autocapitalizationType="allCharacters"
            class="input m-b-4"
            style="font-family:monospace; letter-spacing:2;"/>

          <Button text="ISSUE AT GATE" (tap)="issue()" [isEnabled]="!saving"
            class="btn-primary"/>
          <Label *ngIf="saving" text="Issuing…" class="text-center list-item-meta m-t-2"/>
        </StackLayout>

        <!-- Not found -->
        <Label *ngIf="notFound" textWrap="true"
          text="No card found with that UID. Check the card is registered in the system."
          class="list-item-subtitle m-t-2" style="color:#dc2626; text-align:center;"/>

        <!-- Success -->
        <StackLayout *ngIf="issued" class="card m-t-4"
          style="background-color:#f0fdf4; border-left-width:4; border-left-color:#16a34a;">
          <Label text="✓ CARD ISSUED" style="font-size:18; font-weight:bold; color:#16a34a;"/>
          <Label [text]="'Card #' + issuedCard.card_number + ' is now Pending at Gate.'" class="list-item-subtitle m-t-1" textWrap="true"/>
          <Label text="Reception can see it highlighted and will attach it to a booking." class="list-item-subtitle m-t-1" textWrap="true"/>
          <Button text="Issue Another Card" (tap)="reset()" class="btn-primary-sm m-t-3"/>
        </StackLayout>

      </StackLayout>
    </ScrollView>
  `
})
export class GateCardComponent implements OnInit {
  cardUid    = '';
  plateNumber = '';
  card: any   = null;
  notFound    = false;
  loading     = false;
  saving      = false;
  issued      = false;
  issuedCard: any = null;

  constructor(private api: SecurityApiService, private router: RouterExtensions) {}
  ngOnInit() {}

  lookup(): void {
    const uid = this.cardUid.trim();
    if (!uid) return;
    this.loading  = true;
    this.card     = null;
    this.notFound = false;
    this.issued   = false;

    this.api.lookupCard(uid).subscribe({
      next: (r: any) => {
        this.loading = false;
        if (r?.success && r?.data) {
          this.card = r.data;
        } else {
          this.notFound = true;
        }
      },
      error: () => { this.loading = false; this.notFound = true; }
    });
  }

  issue(): void {
    if (!this.card?.id) return;
    this.saving = true;
    const payload: any = { card_id: this.card.id };
    if (this.plateNumber.trim()) payload.plate_number = this.plateNumber.trim().toUpperCase();

    this.api.gateIssueCard(payload).subscribe({
      next: (r: any) => {
        this.saving = false;
        if (r?.success) {
          this.issuedCard = r.data;
          this.issued = true;
        }
      },
      error: () => { this.saving = false; }
    });
  }

  reset(): void {
    this.cardUid     = '';
    this.plateNumber = '';
    this.card        = null;
    this.notFound    = false;
    this.issued      = false;
    this.issuedCard  = null;
  }
}

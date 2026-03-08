import { Component, OnInit } from '@angular/core';
import { RouterExtensions } from '@nativescript/angular';
import { SecurityApiService } from '../services/security-api.service';

@Component({
  selector: 'ns-security-exit',
  template: `
    <ActionBar title="Security Exit">
      <NavigationButton text="Back" android.systemIcon="ic_menu_back"/>
    </ActionBar>
    <ScrollView>
      <StackLayout class="p-4">

        <!-- Instruction -->
        <StackLayout class="card m-b-4" style="border-left-width:3; border-left-color:#1d4ed8;">
          <Label text="GUEST EXIT VERIFICATION" class="section-title"/>
          <Label textWrap="true"
            text="Scan or enter the card UID when a guest leaves. This revokes the card and triggers a checkout discrepancy check."
            class="list-item-subtitle m-t-1"/>
        </StackLayout>

        <!-- Scan / type input -->
        <Label text="Card UID or Card Number *" class="label m-b-1"/>
        <TextField [(ngModel)]="query"
          hint="Scan RFID or type card number…"
          autocorrect="false"
          autocapitalizationType="none"
          (returnPress)="lookupCard()"
          class="input m-b-2"
          style="font-size:16; letter-spacing:2; font-family:monospace;"/>

        <Button text="LOOK UP" (tap)="lookupCard()" [isEnabled]="!loading"
          class="btn-primary m-b-4"/>

        <!-- Card found -->
        <StackLayout *ngIf="card && !exitDone" class="card m-b-4"
          style="border-left-width:4; border-left-color:#1d4ed8;">
          <Label [text]="'Card #' + card.card_number" class="list-item-title"/>
          <Label [text]="'UID: ' + card.card_uid" class="list-item-subtitle m-t-1"
            style="font-family:monospace;"/>
          <Label *ngIf="card.guest_name" [text]="'Guest: ' + card.guest_name"
            class="list-item-subtitle m-t-1"/>
          <Label *ngIf="card.room_number" [text]="'Room: ' + card.room_number"
            class="list-item-subtitle"/>
          <Label *ngIf="card.plate_number" [text]="'Plate: ' + card.plate_number"
            class="list-item-subtitle" style="font-family:monospace;"/>
          <Label [text]="'Status: ' + card.status" class="list-item-meta m-t-1"
            [style.color]="card.status === 'active' ? '#16a34a' : '#f79009'"/>

          <!-- Warn if already exited or deactivated -->
          <Label *ngIf="card.status !== 'active' && card.status !== 'checked_in'"
            textWrap="true"
            text="⚠ This card is not currently active. Verify before proceeding."
            class="list-item-subtitle m-t-2" style="color:#f79009;"/>

          <Button text="CONFIRM EXIT" (tap)="confirmExit()" [isEnabled]="!processing"
            class="btn-danger m-t-4"/>
          <Label *ngIf="processing" text="Processing exit…"
            class="text-center list-item-meta m-t-2"/>
        </StackLayout>

        <!-- Not found -->
        <Label *ngIf="notFound" textWrap="true"
          text="No card found. Check the UID or number is correct."
          class="text-center list-item-subtitle m-t-2" style="color:#dc2626;"/>

        <!-- Exit confirmed -->
        <StackLayout *ngIf="exitDone" class="card m-t-4"
          style="background-color:#fff7ed; border-left-width:4; border-left-color:#ea580c;">
          <Label text="✓ EXIT RECORDED" style="font-size:18; font-weight:bold; color:#ea580c;"/>
          <Label [text]="'Card #' + exitCard.card_number + ' has been deactivated.'" class="list-item-subtitle m-t-1" textWrap="true"/>
          <Label *ngIf="exitCard.guest_name"
            [text]="exitCard.guest_name + ' has left the premises.'"
            class="list-item-subtitle m-t-1"/>
          <Label text="A discrepancy check has been triggered automatically."
            class="list-item-meta m-t-1" textWrap="true"/>
          <Button text="Process Another Exit" (tap)="reset()"
            class="btn-primary-sm m-t-3"/>
        </StackLayout>

      </StackLayout>
    </ScrollView>
  `
})
export class SecurityExitComponent implements OnInit {
  query      = '';
  card: any  = null;
  notFound   = false;
  loading    = false;
  processing = false;
  exitDone   = false;
  exitCard: any = null;

  constructor(private api: SecurityApiService, private router: RouterExtensions) {}
  ngOnInit() {}

  lookupCard(): void {
    const q = this.query.trim();
    if (!q) return;
    this.loading  = true;
    this.card     = null;
    this.notFound = false;
    this.exitDone = false;

    this.api.lookupCard(q).subscribe({
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

  confirmExit(): void {
    if (!this.card?.id) return;
    this.processing = true;

    this.api.securityExit(this.card.id).subscribe({
      next: (r: any) => {
        this.processing = false;
        if (r?.success) {
          this.exitCard = { ...this.card, ...r.data };
          this.exitDone = true;
          this.card     = null;
        }
      },
      error: () => { this.processing = false; }
    });
  }

  reset(): void {
    this.query    = '';
    this.card     = null;
    this.notFound = false;
    this.exitDone = false;
    this.exitCard = null;
  }
}

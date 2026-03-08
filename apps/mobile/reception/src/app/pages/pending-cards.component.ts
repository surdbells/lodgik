import { Component, OnInit, NO_ERRORS_SCHEMA } from '@angular/core';
import { NativeScriptCommonModule, NativeScriptFormsModule, RouterExtensions } from '@nativescript/angular';
import { ReceptionApiService } from '../services/reception-api.service';

@Component({
  selector: 'reception-pending-cards',
  standalone: true,
  imports: [NativeScriptCommonModule, NativeScriptFormsModule],
  schemas: [NO_ERRORS_SCHEMA],
  template: `
    <ActionBar title="Pending Gate Cards">
      <NavigationButton text="Back" (tap)="router.back()"></NavigationButton>
      <ActionItem text="Refresh" ios.position="right" (tap)="load()"></ActionItem>
    </ActionBar>

    <ScrollView>
      <StackLayout class="p-4">

        <!-- Explanation banner -->
        <StackLayout class="card m-b-4"
          style="border-left-width:3; border-left-color:#1d4ed8; background-color:#eff6ff;">
          <Label text="CARDS AWAITING BOOKING LINK" class="section-title" style="color:#1d4ed8;"></Label>
          <Label textWrap="true"
            text="Security issued these cards at the gate. Attach each card to a checked-in guest's booking to activate it."
            class="list-item-subtitle m-t-1"></Label>
        </StackLayout>

        <ActivityIndicator *ngIf="loading" busy="true" class="m-t-8"></ActivityIndicator>

        <!-- Empty -->
        <StackLayout *ngIf="!loading && cards.length === 0" style="margin-top:60; align-items:center;">
          <Label text="✓" style="font-size:48; color:#16a34a; text-align:center;"></Label>
          <Label text="No pending gate cards" class="empty-state"></Label>
        </StackLayout>

        <!-- Card rows -->
        <StackLayout *ngFor="let c of cards" class="list-item m-b-3"
          style="border-left-width:4; border-left-color:#f79009;">

          <GridLayout columns="*,auto">
            <StackLayout col="0">
              <Label [text]="'Card #' + c.card_number" class="list-item-title"></Label>
              <Label [text]="'UID: ' + c.card_uid" class="list-item-subtitle"
                style="font-family:monospace;"></Label>
              <Label *ngIf="c.plate_number"
                [text]="'Plate: ' + c.plate_number"
                class="list-item-subtitle" style="font-family:monospace;"></Label>
              <Label [text]="'Issued: ' + formatTime(c.issued_at || c.updated_at)"
                class="list-item-meta m-t-1"></Label>
            </StackLayout>
            <Label col="1" text="PENDING"
              style="font-size:10; font-weight:bold; color:#f79009; vertical-align:top;"></Label>
          </GridLayout>

          <!-- Link to booking section -->
          <StackLayout *ngIf="linking !== c.id" class="m-t-3">
            <Button text="Link to Booking" (tap)="startLink(c)"
              class="btn-primary-sm"></Button>
          </StackLayout>

          <!-- Search & link form -->
          <StackLayout *ngIf="linking === c.id" class="m-t-3">
            <Label text="Search checked-in guest:" class="text-xs text-gray-500 m-b-1"></Label>
            <GridLayout columns="*,auto" class="m-b-2">
              <TextField col="0" [(ngModel)]="searchQuery" hint="Guest name or room…"
                (returnPress)="searchBookings()"
                class="input border rounded-lg p-2 m-r-2"></TextField>
              <Button col="1" text="Search" (tap)="searchBookings()"
                class="btn-primary-sm"></Button>
            </GridLayout>

            <ActivityIndicator *ngIf="searching" busy="true"></ActivityIndicator>

            <StackLayout *ngFor="let b of bookingResults" class="bg-white rounded-lg border p-3 m-b-2">
              <GridLayout columns="*,auto">
                <StackLayout col="0">
                  <Label [text]="b.guest_name" class="text-sm font-bold"></Label>
                  <Label [text]="'Room ' + (b.room_number || '?') + ' · ' + b.booking_ref"
                    class="text-xs text-gray-400"></Label>
                </StackLayout>
                <Button col="1" text="Attach" (tap)="attachCard(c.id, b.id, b.guest_name)"
                  [isEnabled]="!attaching"
                  class="btn-primary-sm"></Button>
              </GridLayout>
            </StackLayout>

            <Label *ngIf="!searching && searched && bookingResults.length === 0"
              text="No active bookings found" class="text-sm text-gray-400 text-center m-t-2"></Label>

            <Button text="Cancel" (tap)="cancelLink()"
              class="text-center text-gray-500 m-t-2"></Button>
          </StackLayout>

          <!-- Attached confirmation -->
          <StackLayout *ngIf="attached[c.id]"
            class="m-t-2 p-2 rounded-lg"
            style="background-color:#f0fdf4;">
            <Label [text]="'✓ Linked to ' + attached[c.id]"
              style="color:#16a34a; font-weight:bold; font-size:12;"></Label>
          </StackLayout>

        </StackLayout>

      </StackLayout>
    </ScrollView>
  `,
})
export class PendingCardsComponent implements OnInit {
  cards: any[]          = [];
  loading               = false;
  linking: string | null = null;
  searchQuery           = '';
  bookingResults: any[] = [];
  searching             = false;
  searched              = false;
  attaching             = false;
  attached: Record<string, string> = {};

  constructor(private api: ReceptionApiService, public router: RouterExtensions) {}

  ngOnInit() { this.load(); }

  load() {
    this.loading = true;
    this.api.getPendingGateCards().subscribe({
      next: (r: any) => { this.cards = r?.data || []; this.loading = false; },
      error: ()      => { this.loading = false; },
    });
  }

  startLink(card: any) {
    this.linking        = card.id;
    this.searchQuery    = '';
    this.bookingResults = [];
    this.searched       = false;
  }

  cancelLink() {
    this.linking        = null;
    this.searchQuery    = '';
    this.bookingResults = [];
    this.searched       = false;
  }

  searchBookings() {
    if (!this.searchQuery.trim()) return;
    this.searching = true;
    this.searched  = false;
    this.api.getActiveBookingsByGuest(this.searchQuery.trim()).subscribe({
      next: (r: any) => {
        this.bookingResults = r?.data || [];
        this.searching      = false;
        this.searched       = true;
      },
      error: () => { this.searching = false; this.searched = true; },
    });
  }

  attachCard(cardId: string, bookingId: string, guestName: string) {
    this.attaching = true;
    this.api.linkCardToBooking(cardId, bookingId).subscribe({
      next: (r: any) => {
        this.attaching = false;
        if (r?.success) {
          this.attached[cardId] = guestName;
          this.linking          = null;
          this.bookingResults   = [];
          // remove from pending list after short delay
          setTimeout(() => {
            this.cards = this.cards.filter(c => c.id !== cardId);
          }, 1500);
        }
      },
      error: () => { this.attaching = false; },
    });
  }

  formatTime(ts: string): string {
    if (!ts) return '—';
    try {
      return new Date(ts).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', month: 'short', day: 'numeric' });
    } catch { return ts; }
  }
}

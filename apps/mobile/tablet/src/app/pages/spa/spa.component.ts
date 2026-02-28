import { Component, NO_ERRORS_SCHEMA, OnInit } from '@angular/core';
import { NativeScriptCommonModule, NativeScriptFormsModule, RouterExtensions } from '@nativescript/angular';
import { TabletApiService } from '../../services/tablet-api.service';

@Component({
  selector: 'TabletSpa',
  standalone: true,
  imports: [NativeScriptCommonModule, NativeScriptFormsModule],
  schemas: [NO_ERRORS_SCHEMA],
  template: `
    <GridLayout rows="auto, *" class="bg-gray-50">
      <GridLayout row="0" columns="auto, *" class="bg-purple-700 p-4">
        <Label col="0" text="←" class="text-white text-2xl m-r-4" (tap)="router.back()"></Label>
        <Label col="1" text="🧖 Spa & Wellness" class="text-white text-xl font-bold"></Label>
      </GridLayout>

      <ScrollView row="1">
        <StackLayout class="p-6">
          <ActivityIndicator *ngIf="loading" busy="true" color="#7c3aed" class="m-t-8"></ActivityIndicator>

          <StackLayout *ngIf="!loading">
            <!-- Services -->
            <Label text="Available Services" class="font-bold text-lg m-b-4"></Label>
            <StackLayout *ngFor="let s of services" class="bg-white rounded-2xl p-5 m-b-4">
              <GridLayout columns="*, auto">
                <StackLayout col="0">
                  <Label [text]="s.name" class="font-bold text-base"></Label>
                  <Label [text]="s.description || ''" class="text-gray-500 text-sm m-t-1" textWrap="true"></Label>
                  <Label [text]="(s.duration_minutes || 60) + ' min'" class="text-purple-600 text-sm m-t-1"></Label>
                </StackLayout>
                <StackLayout col="1" class="text-right">
                  <Label [text]="'₦' + (+s.price || 0).toLocaleString()" class="font-bold text-purple-700 text-base"></Label>
                  <Button text="Book" (tap)="startBook(s)" class="bg-purple-600 text-white rounded-xl p-2 text-sm m-t-2"></Button>
                </StackLayout>
              </GridLayout>
            </StackLayout>
            <Label *ngIf="!services.length && !loading" text="No spa services available at this time" class="text-gray-400 text-center m-t-8"></Label>

            <!-- Booking form -->
            <StackLayout *ngIf="booking" class="bg-purple-50 border border-purple-200 rounded-2xl p-5 m-t-4">
              <Label [text]="'Book: ' + booking.name" class="font-bold text-base m-b-3"></Label>
              <Label text="Preferred Date" class="text-sm text-gray-500 m-b-1"></Label>
              <TextField [(ngModel)]="bookForm.date" hint="YYYY-MM-DD" class="input border border-purple-200 rounded-xl p-3 m-b-3 bg-white text-sm"></TextField>
              <Label text="Preferred Time" class="text-sm text-gray-500 m-b-1"></Label>
              <TextField [(ngModel)]="bookForm.time" hint="e.g. 10:00" class="input border border-purple-200 rounded-xl p-3 m-b-3 bg-white text-sm"></TextField>
              <Label text="Notes (optional)" class="text-sm text-gray-500 m-b-1"></Label>
              <TextField [(ngModel)]="bookForm.notes" hint="Any preferences or requests..." class="input border border-purple-200 rounded-xl p-3 m-b-4 bg-white text-sm"></TextField>
              <GridLayout columns="*,*">
                <Button col="0" text="Cancel" (tap)="booking = null" class="bg-gray-100 text-gray-700 rounded-xl p-3 m-r-2"></Button>
                <Button col="1" text="Confirm Booking" (tap)="confirmBooking()" class="bg-purple-600 text-white rounded-xl p-3"></Button>
              </GridLayout>
              <Label *ngIf="bookMsg" [text]="bookMsg" class="text-center m-t-3 font-medium" [ngStyle]="{'color': bookOk ? '#16a34a' : '#dc2626'}"></Label>
            </StackLayout>
          </StackLayout>
        </StackLayout>
      </ScrollView>
    </GridLayout>
  `,
})
export class TabletSpaComponent implements OnInit {
  services: any[] = [];
  loading = true;
  booking: any = null;
  bookForm: any = { date: '', time: '', notes: '' };
  bookMsg = ''; bookOk = true;

  constructor(private api: TabletApiService, public router: RouterExtensions) {}

  ngOnInit() {
    const data = this.api.guestData$.value;
    const pid = data?.session?.property_id;
    this.api.get('/spa/services', pid ? { property_id: pid } : {}).subscribe({
      next: (r: any) => { this.services = r.data || []; this.loading = false; },
      error: () => { this.loading = false; },
    });
  }

  startBook(s: any) {
    this.booking = s;
    const today = new Date().toISOString().split('T')[0];
    this.bookForm = { date: today, time: '10:00', notes: '' };
  }

  confirmBooking() {
    if (!this.bookForm.date || !this.bookForm.time) {
      this.bookMsg = 'Please select date and time'; this.bookOk = false; return;
    }
    const data = this.api.guestData$.value;
    const s = data?.session;
    this.api.post('/spa/bookings', {
      service_id: this.booking.id,
      property_id: s?.property_id,
      booking_id: s?.booking_id,
      guest_id: s?.guest_id,
      preferred_date: this.bookForm.date,
      preferred_time: this.bookForm.time,
      notes: this.bookForm.notes || null,
    }).subscribe({
      next: () => {
        this.bookMsg = 'Spa appointment requested! Staff will confirm shortly.';
        this.bookOk = true;
        setTimeout(() => { this.booking = null; this.bookMsg = ''; }, 3000);
      },
      error: (e: any) => { this.bookMsg = e.error?.message || 'Booking failed'; this.bookOk = false; },
    });
  }
}

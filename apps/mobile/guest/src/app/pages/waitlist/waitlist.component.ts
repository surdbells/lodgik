import { Component, NO_ERRORS_SCHEMA, OnInit } from '@angular/core';
import { NativeScriptCommonModule, NativeScriptFormsModule, RouterExtensions } from '@nativescript/angular';
import { ApiService } from '../../services/api.service';

@Component({
  selector: 'Waitlist', standalone: true, imports: [NativeScriptCommonModule, NativeScriptFormsModule], schemas: [NO_ERRORS_SCHEMA],
  template: `
    <ActionBar title="Waitlist" class="bg-white"><NavigationButton text="Back" (tap)="router.back()"></NavigationButton></ActionBar>
    <ScrollView><StackLayout class="p-4">
      <!-- Join Form -->
      <Label text="Join a Waitlist" class="font-bold m-b-2"></Label>
      <StackLayout class="bg-white border rounded-xl p-4 m-b-4">
        <Label text="What are you waiting for?" class="text-sm text-gray-500 m-b-2"></Label>
        <SegmentedBar [selectedIndex]="typeIdx" (selectedIndexChanged)="typeIdx = $event.object?.selectedIndex || 0" class="m-b-2">
          <SegmentedBarItem title="Room"></SegmentedBarItem><SegmentedBarItem title="Amenity"></SegmentedBarItem>
          <SegmentedBarItem title="Spa"></SegmentedBarItem><SegmentedBarItem title="Restaurant"></SegmentedBarItem>
        </SegmentedBar>
        <TextField hint="What specifically? (e.g. Suite, Pool, Window Table)" [(ngModel)]="requestedItem" class="input border rounded-lg p-3 m-b-2"></TextField>
        <TextField hint="Notes (optional)" [(ngModel)]="notes" class="input border rounded-lg p-3 m-b-3"></TextField>
        <Button text="Join Queue" (tap)="joinWaitlist()" [isEnabled]="!!requestedItem" class="bg-purple-600 text-white rounded-xl p-3 font-bold"></Button>
        <Label *ngIf="msg" [text]="msg" class="text-center text-green font-bold m-t-2"></Label>
      </StackLayout>

      <!-- Active Entries -->
      <Label text="Your Waitlist Entries" class="font-bold m-b-2"></Label>
      <StackLayout *ngFor="let w of entries" class="bg-white border rounded-xl p-3 m-b-2">
        <GridLayout columns="auto,*,auto">
          <StackLayout col="0" class="bg-purple-100 rounded-full m-r-3 text-center" style="width:40; height:40;">
            <Label [text]="'#' + w.position" class="text-purple font-bold" style="line-height:40;"></Label>
          </StackLayout>
          <StackLayout col="1"><Label [text]="w.requested_item" class="font-bold"></Label><Label [text]="w.waitlist_type.replace('_', ' ') + (w.preferred_date ? ' · ' + w.preferred_date : '')" class="text-xs text-gray-400"></Label></StackLayout>
          <StackLayout col="2" class="text-center">
            <Label [text]="statusLabel(w.status)" class="text-xs font-bold" [class]="w.status === 'notified' ? 'text-orange' : w.status === 'fulfilled' ? 'text-green' : 'text-purple'"></Label>
            <Button *ngIf="w.status === 'waiting'" text="Cancel" (tap)="cancel(w.id)" class="text-red text-xs m-t-1"></Button>
          </StackLayout>
        </GridLayout>
      </StackLayout>
      <Label *ngIf="!entries.length" text="You're not on any waitlists" class="text-center text-gray-400 p-4"></Label>
    </StackLayout></ScrollView>
  `,
})
export class WaitlistComponent implements OnInit {
  entries: any[] = []; requestedItem = ''; notes = ''; typeIdx = 0; msg = '';
  private types = ['room_upgrade', 'amenity', 'spa_slot', 'restaurant'];

  constructor(private api: ApiService, public router: RouterExtensions) {}
  ngOnInit() { this.load(); }

  load() {
    const s = this.api.getSession(); if (!s?.booking?.id) return;
    this.api.get(`/guest-services/waitlist?booking_id=${s.booking.id}`).subscribe({ next: (r: any) => this.entries = r.data || [] });
  }

  joinWaitlist() {
    if (!this.requestedItem) return;
    const s = this.api.getSession(); if (!s) return;
    this.api.post('/guest-services/waitlist', {
      property_id: s.property_id, booking_id: s.booking.id, guest_id: s.guest.id, guest_name: s.guest.name,
      waitlist_type: this.types[this.typeIdx], requested_item: this.requestedItem, notes: this.notes || undefined,
    }).subscribe({ next: (r: any) => { this.msg = `✅ You're #${r.data.position} in queue!`; this.requestedItem = ''; this.notes = ''; this.load(); setTimeout(() => this.msg = '', 3000); } });
  }

  cancel(id: string) { this.api.post(`/guest-services/waitlist/${id}/cancel`, {}).subscribe({ next: () => this.load() }); }
  statusLabel(s: string): string { return s === 'waiting' ? '⏳ Waiting' : s === 'notified' ? '🔔 Available!' : s === 'fulfilled' ? '✅ Done' : '❌ Cancelled'; }
}

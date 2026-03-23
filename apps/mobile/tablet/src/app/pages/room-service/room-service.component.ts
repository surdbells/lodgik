import { Component, NO_ERRORS_SCHEMA, OnInit } from '@angular/core';
import { NativeScriptCommonModule, NativeScriptFormsModule, RouterExtensions } from '@nativescript/angular';
import { ActivatedRoute } from '@angular/router';
import { TabletApiService } from '../../services/tablet-api.service';

@Component({
  selector: 'RoomService',
  standalone: true,
  imports: [NativeScriptCommonModule, NativeScriptFormsModule],
  schemas: [NO_ERRORS_SCHEMA],
  template: `
    <GridLayout rows="auto, *">
      <GridLayout row="0" columns="auto, *" class="bg-white border-b p-4">
        <Label col="0" text="←" (tap)="router.back()" class="text-2xl m-r-4 p-2"></Label>
        <Label col="1" text="Service Request" class="text-xl font-bold"></Label>
      </GridLayout>

      <ScrollView row="1">
        <GridLayout columns="*, *" rows="auto" class="p-6">
          <!-- Left: Category + Form -->
          <StackLayout col="0" class="p-r-4">
            <Label text="Category" class="text-lg font-bold m-b-3"></Label>
            <FlexboxLayout flexWrap="wrap" class="m-b-4">
              <StackLayout *ngFor="let cat of categories" (tap)="selected = cat.key"
                [class]="selected === cat.key ? 'bg-blue-600 rounded-xl p-3 m-1 text-center' : 'bg-white border rounded-xl p-3 m-1 text-center'" width="140">
                <Label [text]="cat.icon" class="text-2xl"></Label>
                <Label [text]="cat.label" [class]="selected === cat.key ? 'text-white text-xs' : 'text-xs'"></Label>
              </StackLayout>
            </FlexboxLayout>

            <Label text="What do you need?" class="font-bold m-b-2"></Label>
            <TextField [(ngModel)]="title" hint="e.g. Extra towels, Room cleaning..." class="input border rounded-lg p-4 m-b-3 text-lg"></TextField>

            <Label text="Additional details" class="font-medium text-sm m-b-1"></Label>
            <TextView [(ngModel)]="description" hint="Optional details..." class="input border rounded-lg p-3 m-b-4" height="80"></TextView>

            <Button text="Submit Request" (tap)="submit()" [isEnabled]="!loading && !!title && !!selected" class="bg-blue-600 text-white p-4 rounded-xl font-bold text-lg"></Button>
            <Label *ngIf="success" text="✅ Request submitted! Staff has been notified." class="text-green-600 text-center m-t-3 font-bold"></Label>
          </StackLayout>

          <!-- Right: Recent Requests -->
          <StackLayout col="1" class="p-l-4">
            <Label text="Your Requests" class="text-lg font-bold m-b-3"></Label>
            <StackLayout *ngFor="let r of requests" class="bg-white border rounded-xl p-4 m-b-2">
              <FlexboxLayout justifyContent="space-between" alignItems="center">
                <Label [text]="r.category_icon + ' ' + r.title" class="font-medium"></Label>
                <Label [text]="r.status_label" class="text-xs text-white rounded-full p-1 px-3" [ngStyle]="{'background-color': r.status_color}"></Label>
              </FlexboxLayout>
              <Label [text]="r.created_at" class="text-gray-400 text-xs m-t-1"></Label>
            </StackLayout>
            <Label *ngIf="!requests.length" text="No requests yet" class="text-gray-400 text-center m-t-4"></Label>
          </StackLayout>
        </GridLayout>
      </ScrollView>
    </GridLayout>
  `,
})
export class RoomServiceComponent implements OnInit {
  categories = [
    { key: 'room_service', icon: '🛎️', label: 'Room Service' },
    { key: 'housekeeping', icon: '🧹', label: 'Housekeeping' },
    { key: 'maintenance', icon: '🔧', label: 'Maintenance' },
    { key: 'food', icon: '🍽️', label: 'Food' },
    { key: 'laundry', icon: '👔', label: 'Laundry' },
    { key: 'amenity', icon: '🎁', label: 'Amenity' },
    { key: 'transport', icon: '🚗', label: 'Transport' },
    { key: 'other', icon: '📋', label: 'Other' },
  ];

  selected = '';
  title = '';
  description = '';
  loading = false;
  success = false;
  requests: any[] = [];

  constructor(private api: TabletApiService, public router: RouterExtensions, private route: ActivatedRoute) {}

  ngOnInit() {
    this.route.queryParams.subscribe(p => { if (p['category']) this.selected = p['category']; });
    this.loadRequests();
  }

  submit() {
    const data = this.api.guestData$.value;
    const session = data?.session;
    if (!session) return;
    this.loading = true; this.success = false;
    this.api.post('/guest/service-requests', {
      property_id: session.property_id, booking_id: session.booking_id,
      guest_id: session.guest_id, room_id: session.room_id,
      category: this.selected, title: this.title,
      description: this.description || null, priority: 2,
    }).subscribe({
      next: () => { this.title = ''; this.description = ''; this.success = true; this.loading = false; this.loadRequests(); },
      error: () => this.loading = false,
    });
  }

  loadRequests() {
    const data = this.api.guestData$.value;
    const bookingId = data?.session?.booking_id;
    if (!bookingId) return;
    this.api.get('/guest/service-requests').subscribe({
      next: (r: any) => this.requests = r.data || [],
    });
  }
}

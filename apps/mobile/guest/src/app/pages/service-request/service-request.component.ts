import { Component, NO_ERRORS_SCHEMA, OnInit } from '@angular/core';
import { NativeScriptCommonModule, RouterExtensions } from '@nativescript/angular';
import { NativeScriptFormsModule } from '@nativescript/angular';
import { ApiService } from '../../services/api.service';
import { CameraService } from '../../services/camera.service';

@Component({
  selector: 'ServiceRequest',
  standalone: true,
  imports: [NativeScriptCommonModule, NativeScriptFormsModule],
  schemas: [NO_ERRORS_SCHEMA],
  template: `
    <ActionBar title="Service Requests" class="bg-white">
      <NavigationButton text="Back" (tap)="router.back()"></NavigationButton>
    </ActionBar>
    <ScrollView>
      <StackLayout class="p-4">
        <!-- Category Grid -->
        <Label text="What do you need?" class="text-lg font-bold m-b-3"></Label>
        <GridLayout columns="*, *, *" rows="auto, auto, auto" class="m-b-4">
          <StackLayout *ngFor="let cat of categories; let i = index" [col]="i % 3" [row]="Math.floor(i / 3)"
            class="bg-white border rounded-xl p-3 m-1 text-center" [class.border-blue-500]="selected === cat.key"
            (tap)="selectCategory(cat.key)">
            <Label [text]="cat.icon" class="text-2xl"></Label>
            <Label [text]="cat.label" class="text-xs m-t-1"></Label>
          </StackLayout>
        </GridLayout>

        <!-- Request Form -->
        <StackLayout *ngIf="selected">
          <Label text="Title" class="text-sm font-medium m-b-1"></Label>
          <TextField [(ngModel)]="title" [hint]="titleHint" class="input border rounded-lg p-3 m-b-3"></TextField>

          <Label text="Details (optional)" class="text-sm font-medium m-b-1"></Label>
          <TextView [(ngModel)]="description" hint="Any additional details..." class="input border rounded-lg p-3 m-b-3" height="80"></TextView>

          <Label text="Priority" class="text-sm font-medium m-b-1"></Label>

          <!-- Photo Attachment -->
          <FlexboxLayout class="m-b-3" alignItems="center">
            <Button text="📷 Take Photo" (tap)="takePhoto()" class="bg-gray-200 p-2 rounded-lg text-sm m-r-2"></Button>
            <Button text="🖼️ Gallery" (tap)="pickPhoto()" class="bg-gray-200 p-2 rounded-lg text-sm m-r-2"></Button>
            <Label *ngIf="photoBase64" text="✅ Photo attached" class="text-green-600 text-sm"></Label>
          </FlexboxLayout>
          <Image *ngIf="photoBase64" [src]="'data:image/jpg;base64,' + photoBase64" height="120" class="m-b-3 rounded-lg" stretch="aspectFit"></Image>

          <Label text="Priority" class="text-sm font-medium m-b-1 hidden"></Label>
          <FlexboxLayout class="m-b-4">
            <Button *ngFor="let p of priorities" [text]="p.label" (tap)="priority = p.value"
              [class]="priority === p.value ? 'bg-blue-600 text-white p-2 m-r-2 rounded-lg text-sm' : 'bg-gray-200 p-2 m-r-2 rounded-lg text-sm'">
            </Button>
          </FlexboxLayout>

          <Button text="Submit Request" (tap)="submit()" [isEnabled]="!loading && !!title" class="bg-blue-600 text-white p-4 rounded-lg font-bold"></Button>
        </StackLayout>

        <!-- My Requests -->
        <Label text="My Requests" class="text-lg font-bold m-t-6 m-b-2"></Label>
        <StackLayout *ngFor="let r of requests" class="bg-white border rounded-xl p-3 m-b-2">
          <FlexboxLayout justifyContent="space-between" alignItems="center">
            <StackLayout>
              <Label [text]="r.category_icon + ' ' + r.title" class="font-medium text-sm"></Label>
              <Label [text]="r.created_at" class="text-gray-400 text-xs m-t-1"></Label>
            </StackLayout>
            <Label [text]="r.status_label" class="text-xs text-white rounded-full p-1 px-2" [ngStyle]="{'background-color': r.status_color}"></Label>
          </FlexboxLayout>
          <StackLayout *ngIf="r.status === 'completed' && !r.guest_rating" class="m-t-2">
            <Label text="Rate this service:" class="text-xs text-gray-500"></Label>
            <FlexboxLayout>
              <Label *ngFor="let s of [1,2,3,4,5]" [text]="'⭐'" (tap)="rate(r.id, s)" class="text-xl m-r-1"></Label>
            </FlexboxLayout>
          </StackLayout>
        </StackLayout>
        <Label *ngIf="!requests.length" text="No requests yet" class="text-gray-400 text-center m-t-2"></Label>

        <ActivityIndicator *ngIf="loading" busy="true" class="m-t-4"></ActivityIndicator>
      </StackLayout>
    </ScrollView>
  `,
})
export class ServiceRequestComponent implements OnInit {
  Math = Math;
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
  priorities = [
    { value: 1, label: 'Low' }, { value: 2, label: 'Normal' },
    { value: 3, label: 'High' }, { value: 4, label: 'Urgent' },
  ];

  selected = '';
  title = '';
  description = '';
  priority = 2;
  titleHint = 'What do you need?';
  loading = false;
  requests: any[] = [];
  photoBase64: string | null = null;

  constructor(private api: ApiService, public router: RouterExtensions, private camera: CameraService) {}

  ngOnInit() { this.loadRequests(); }

  async takePhoto() {
    const base64 = await this.camera.takePhoto();
    if (base64) this.photoBase64 = base64;
  }

  async pickPhoto() {
    const base64 = await this.camera.pickFromGallery();
    if (base64) this.photoBase64 = base64;
  }

  selectCategory(key: string) {
    this.selected = key;
    const cat = this.categories.find(c => c.key === key);
    this.titleHint = cat ? `e.g. ${cat.label} request...` : '';
  }

  submit() {
    const session = this.api.getSession();
    if (!session?.booking?.id) return;
    this.loading = true;
    this.api.post('/service-requests', {
      property_id: session.property_id, booking_id: session.booking.id, guest_id: session.guest.id,
      room_id: session.booking.room_id, category: this.selected, title: this.title,
      description: this.description || null, priority: this.priority,
      photo_url: this.photoBase64 ? `data:image/jpg;base64,${this.photoBase64.substring(0, 200)}` : null,
    }).subscribe({
      next: () => { this.title = ''; this.description = ''; this.selected = ''; this.photoBase64 = null; this.loading = false; this.loadRequests(); },
      error: () => this.loading = false,
    });
  }

  loadRequests() {
    const session = this.api.getSession();
    if (!session?.booking?.id) return;
    this.api.get(`/service-requests/booking/${session.booking.id}`).subscribe({
      next: (r: any) => this.requests = r.data || [],
    });
  }

  rate(id: string, rating: number) {
    this.api.post(`/service-requests/${id}/rate`, { rating }).subscribe({ next: () => this.loadRequests() });
  }
}

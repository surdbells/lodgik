import { Component, NO_ERRORS_SCHEMA } from '@angular/core';
import { NativeScriptCommonModule, NativeScriptFormsModule, RouterExtensions } from '@nativescript/angular';
import { TabletApiService } from '../../services/tablet-api.service';

@Component({
  selector: 'Setup',
  standalone: true,
  imports: [NativeScriptCommonModule, NativeScriptFormsModule],
  schemas: [NO_ERRORS_SCHEMA],
  template: `
    <ActionBar title="Tablet Setup" flat="true" class="bg-blue-800"></ActionBar>
    <FlexboxLayout flexDirection="column" alignItems="center" justifyContent="center" class="p-8">
      <Label text="🏨" class="text-6xl m-b-4"></Label>
      <Label text="Lodgik Concierge" class="text-2xl font-bold m-b-1"></Label>
      <Label text="Tablet Setup" class="text-gray-400 m-b-8"></Label>

      <StackLayout width="400">
        <Label text="API URL" class="text-sm font-medium m-b-1"></Label>
        <TextField [(ngModel)]="apiUrl" hint="https://api.lodgik.app" class="input border rounded-lg p-3 m-b-3"></TextField>

        <Label text="Device Token" class="text-sm font-medium m-b-1"></Label>
        <TextField [(ngModel)]="deviceToken" hint="Paste device token from admin panel" class="input border rounded-lg p-3 m-b-3"></TextField>

        <Label text="— OR register a new device —" class="text-gray-400 text-center m-b-3 text-sm"></Label>

        <Label text="Staff JWT Token" class="text-sm font-medium m-b-1"></Label>
        <TextField [(ngModel)]="staffToken" hint="For new device registration" class="input border rounded-lg p-3 m-b-3"></TextField>

        <Label text="Property ID" class="text-sm font-medium m-b-1"></Label>
        <TextField [(ngModel)]="propertyId" class="input border rounded-lg p-3 m-b-3"></TextField>

        <Label text="Room ID" class="text-sm font-medium m-b-1"></Label>
        <TextField [(ngModel)]="roomId" class="input border rounded-lg p-3 m-b-3"></TextField>

        <Label text="Device Name" class="text-sm font-medium m-b-1"></Label>
        <TextField [(ngModel)]="deviceName" hint="Room 101 Tablet" class="input border rounded-lg p-3 m-b-4"></TextField>

        <Button *ngIf="deviceToken" text="Connect with Token" (tap)="connectExisting()" [isEnabled]="!loading" class="bg-blue-600 text-white p-4 rounded-lg font-bold m-b-2"></Button>
        <Button *ngIf="!deviceToken && staffToken" text="Register New Device" (tap)="registerNew()" [isEnabled]="!loading" class="bg-green-600 text-white p-4 rounded-lg font-bold m-b-2"></Button>

        <Label *ngIf="error" [text]="error" class="text-red-500 text-center m-t-2 text-sm" textWrap="true"></Label>
        <ActivityIndicator *ngIf="loading" busy="true" class="m-t-4"></ActivityIndicator>
      </StackLayout>
    </FlexboxLayout>
  `,
})
export class SetupComponent {
  apiUrl = '';
  deviceToken = '';
  staffToken = '';
  propertyId = '';
  roomId = '';
  deviceName = '';
  loading = false;
  error = '';

  constructor(private api: TabletApiService, private router: RouterExtensions) {
    this.apiUrl = this.api.getBaseUrl();
  }

  connectExisting() {
    if (this.apiUrl) this.api.setBaseUrl(this.apiUrl);
    this.api.setDeviceToken(this.deviceToken);
    this.loading = true;
    this.api.authenticate().subscribe({
      next: () => {
        this.api.startPolling();
        this.router.navigate(['/idle'], { clearHistory: true });
      },
      error: (e) => { this.error = e.error?.message || 'Connection failed'; this.loading = false; },
    });
  }

  registerNew() {
    if (this.apiUrl) this.api.setBaseUrl(this.apiUrl);
    this.loading = true;
    const headers = { 'Content-Type': 'application/json', 'Authorization': `Bearer ${this.staffToken}` };
    this.api.post('/tablets', {
      property_id: this.propertyId, room_id: this.roomId, name: this.deviceName || 'Tablet',
    }).subscribe({
      next: (r: any) => {
        this.api.setDeviceToken(r.data.device_token);
        this.api.startPolling();
        this.loading = false;
        this.router.navigate(['/idle'], { clearHistory: true });
      },
      error: (e) => { this.error = e.error?.message || 'Registration failed'; this.loading = false; },
    });
  }
}

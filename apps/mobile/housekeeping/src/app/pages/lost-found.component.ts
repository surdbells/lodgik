import { Component, NO_ERRORS_SCHEMA, OnInit } from '@angular/core';
import { NativeScriptCommonModule, NativeScriptFormsModule, RouterExtensions } from '@nativescript/angular';
import { HousekeepingApiService } from '../services/housekeeping-api.service';
import { ApplicationSettings } from '@nativescript/core';

@Component({
  selector: 'hk-lost-found',
  standalone: true,
  imports: [NativeScriptCommonModule, NativeScriptFormsModule],
  schemas: [NO_ERRORS_SCHEMA],
  template: `
    <ActionBar title="Lost & Found">
      <NavigationButton text="Back" (tap)="router.back()"></NavigationButton>
      <ActionItem text="+ Report" (tap)="showReport = !showReport" ios.position="right"></ActionItem>
    </ActionBar>
    <ScrollView>
      <StackLayout class="p-4">
        <!-- Report Form -->
        <StackLayout *ngIf="showReport" class="bg-white rounded-xl border border-gray-100 p-4 m-b-4">
          <Label text="Report Found Item" class="font-bold m-b-3"></Label>
          <TextField hint="Description *" [(ngModel)]="form.description" class="input border rounded-lg p-3 m-b-2"></TextField>
          <TextField hint="Location Found *" [(ngModel)]="form.found_location" class="input border rounded-lg p-3 m-b-2"></TextField>
          <TextField hint="Room Number (if found in room)" [(ngModel)]="form.room_number" class="input border rounded-lg p-3 m-b-2"></TextField>
          <TextField hint="Category (clothing, electronics, documents...)" [(ngModel)]="form.category" class="input border rounded-lg p-3 m-b-3"></TextField>
          <GridLayout columns="*,*">
            <Button col="0" text="Cancel" (tap)="showReport = false" class="bg-gray-100 text-gray-700 rounded-xl p-3 m-r-2"></Button>
            <Button col="1" text="Submit" (tap)="submitReport()" class="bg-purple-600 text-white rounded-xl p-3"></Button>
          </GridLayout>
          <Label *ngIf="msg" [text]="msg" class="text-center m-t-3 font-medium" [class]="msgOk ? 'text-green' : 'text-red'"></Label>
        </StackLayout>

        <!-- Items List -->
        <StackLayout *ngFor="let item of items" class="bg-white rounded-xl border p-4 m-b-3" [ngStyle]="{'border-color': item.status === 'claimed' ? '#d1fae5' : '#e5e7eb'}">
          <GridLayout columns="*,auto">
            <StackLayout col="0">
              <Label [text]="item.description" class="font-bold text-sm"></Label>
              <Label [text]="'Found at: ' + item.found_location" class="text-xs text-gray-500 m-t-1"></Label>
              <Label *ngIf="item.room_number" [text]="'Room: ' + item.room_number" class="text-xs text-gray-400"></Label>
            </StackLayout>
            <StackLayout col="1" class="text-right">
              <Label [text]="item.status" class="text-xs font-bold rounded-full p-x-2 p-y-1" [ngStyle]="{'color': item.status === 'claimed' ? '#16a34a' : '#6b7280', 'background-color': item.status === 'claimed' ? '#dcfce7' : '#f3f4f6'}"></Label>
            </StackLayout>
          </GridLayout>

          <!-- Claim section -->
          <StackLayout *ngIf="item.status !== 'claimed'">
            <StackLayout *ngIf="claimingId === item.id" class="m-t-3">
              <TextField hint="Claimant Name *" [(ngModel)]="claimForm.claimant_name" class="input border rounded-lg p-2 m-b-2 text-sm"></TextField>
              <TextField hint="ID Number" [(ngModel)]="claimForm.claimant_id_number" class="input border rounded-lg p-2 m-b-2 text-sm"></TextField>
              <GridLayout columns="*,*">
                <Button col="0" text="Cancel" (tap)="claimingId = ''" class="bg-gray-100 text-gray-700 rounded-lg p-2 m-r-1 text-sm"></Button>
                <Button col="1" text="Confirm Claim" (tap)="confirmClaim(item)" class="bg-green-600 text-white rounded-lg p-2 text-sm"></Button>
              </GridLayout>
            </StackLayout>
            <Button *ngIf="claimingId !== item.id" text="Mark as Claimed" (tap)="startClaim(item.id)" class="bg-blue-100 text-blue rounded-lg p-2 text-xs m-t-2"></Button>
          </StackLayout>
        </StackLayout>

        <Label *ngIf="items.length === 0 && !loading" text="No items reported" class="text-center text-muted p-8"></Label>
        <ActivityIndicator *ngIf="loading" busy="true" class="m-t-8"></ActivityIndicator>
      </StackLayout>
    </ScrollView>
  `,
})
export class LostFoundComponent implements OnInit {
  items: any[] = [];
  showReport = false;
  loading = true;
  claimingId = '';
  msg = ''; msgOk = true;
  form: any = { description: '', found_location: '', room_number: '', category: '' };
  claimForm: any = { claimant_name: '', claimant_id_number: '' };

  constructor(private api: HousekeepingApiService, public router: RouterExtensions) {}

  ngOnInit() { this.load(); }

  load() {
    this.loading = true;
    const pid = ApplicationSettings.getString('hk_property_id', '');
    this.api.getLostAndFound(pid).subscribe({
      next: (r: any) => { this.items = r.data || []; this.loading = false; },
      error: () => { this.loading = false; },
    });
  }

  submitReport() {
    if (!this.form.description || !this.form.found_location) {
      this.msg = 'Description and location are required'; this.msgOk = false; return;
    }
    const pid = ApplicationSettings.getString('hk_property_id', '');
    this.api.reportLostItem({ ...this.form, property_id: pid }).subscribe({
      next: () => {
        this.msg = '✅ Item reported'; this.msgOk = true;
        this.form = { description: '', found_location: '', room_number: '', category: '' };
        this.showReport = false;
        this.load();
        setTimeout(() => this.msg = '', 3000);
      },
      error: () => { this.msg = 'Failed to report item'; this.msgOk = false; },
    });
  }

  startClaim(id: string) { this.claimingId = id; this.claimForm = { claimant_name: '', claimant_id_number: '' }; }

  confirmClaim(item: any) {
    if (!this.claimForm.claimant_name) return;
    this.api.claimLostItem(item.id, this.claimForm).subscribe({
      next: () => { item.status = 'claimed'; this.claimingId = ''; },
    });
  }
}

import { Component, NO_ERRORS_SCHEMA, OnInit, OnDestroy, NgZone } from '@angular/core';
import { NativeScriptCommonModule, RouterExtensions } from '@nativescript/angular';
import { ReceptionApiService } from '../services/reception-api.service';

@Component({
  selector: 'reception-service-requests',
  standalone: true,
  imports: [NativeScriptCommonModule],
  schemas: [NO_ERRORS_SCHEMA],
  template: `
    <ActionBar title="Service Requests">
      <NavigationButton text="Back" (tap)="router.back()"></NavigationButton>
      <ActionItem text="Refresh" (tap)="load()" ios.position="right"></ActionItem>
    </ActionBar>

    <GridLayout rows="auto,auto,*">
      <!-- Status filter tabs -->
      <ScrollView row="0" orientation="horizontal" class="bg-white border-b border-gray-100">
        <StackLayout orientation="horizontal" class="p-x-4 p-y-2">
          <Button *ngFor="let f of filters" [text]="f.label" (tap)="setFilter(f.key)"
            [class]="activeFilter === f.key ? 'bg-blue-600 text-white rounded-full p-x-3 p-y-1 m-r-2 text-sm font-bold' : 'bg-gray-100 text-gray-700 rounded-full p-x-3 p-y-1 m-r-2 text-sm'">
          </Button>
        </StackLayout>
      </ScrollView>

      <!-- Stats row -->
      <GridLayout row="1" columns="*,*,*,*" class="p-x-4 p-y-2 bg-gray-50">
        <StackLayout col="0" class="text-center"><Label [text]="count('pending')" class="font-bold text-orange-500 text-lg"></Label><Label text="Pending" class="text-xs text-gray-400"></Label></StackLayout>
        <StackLayout col="1" class="text-center"><Label [text]="count('in_progress')" class="font-bold text-blue-500 text-lg"></Label><Label text="In Progress" class="text-xs text-gray-400"></Label></StackLayout>
        <StackLayout col="2" class="text-center"><Label [text]="count('completed')" class="font-bold text-green-500 text-lg"></Label><Label text="Completed" class="text-xs text-gray-400"></Label></StackLayout>
        <StackLayout col="3" class="text-center"><Label [text]="allRequests.length.toString()" class="font-bold text-gray-700 text-lg"></Label><Label text="Total" class="text-xs text-gray-400"></Label></StackLayout>
      </GridLayout>

      <ScrollView row="2">
        <StackLayout class="p-4">
          <ActivityIndicator *ngIf="loading" busy="true" class="m-t-8"></ActivityIndicator>

          <StackLayout *ngFor="let r of filtered()" class="bg-white rounded-xl border border-gray-100 p-4 m-b-3">
            <GridLayout columns="auto,*,auto" class="m-b-2">
              <Label col="0" [text]="categoryIcon(r.category)" class="text-2xl m-r-3"></Label>
              <StackLayout col="1">
                <Label [text]="r.title" class="font-bold text-sm"></Label>
                <Label [text]="'Room ' + (r.room_number || '?') + ' · ' + (r.guest_name || 'Guest')" class="text-xs text-gray-400 m-t-1"></Label>
              </StackLayout>
              <StackLayout col="2" class="text-right">
                <Label [text]="r.status_label || r.status" class="text-xs font-bold rounded-full p-x-2 p-y-1" [ngStyle]="{'color': r.status_color || '#374151', 'background-color': (r.status_color || '#374151') + '20'}"></Label>
                <Label [text]="priorityLabel(r.priority)" class="text-xs text-gray-400 m-t-1"></Label>
              </StackLayout>
            </GridLayout>

            <Label *ngIf="r.description" [text]="r.description" class="text-sm text-gray-500 m-b-2" textWrap="true"></Label>
            <Label [text]="timeAgo(r.created_at)" class="text-xs text-gray-400 m-b-3"></Label>

            <!-- Actions -->
            <GridLayout columns="*,*,*" *ngIf="r.status === 'pending' || r.status === 'in_progress'">
              <Button *ngIf="r.status === 'pending'" col="0" text="▶ Start"
                class="bg-blue-600 text-white rounded-lg p-2 text-sm m-r-1" (tap)="updateStatus(r, 'in_progress')"></Button>
              <Button *ngIf="r.status === 'in_progress'" col="0" text="✅ Done"
                class="bg-green-600 text-white rounded-lg p-2 text-sm m-r-1" (tap)="updateStatus(r, 'completed')"></Button>
              <Button col="1" text="❌ Cancel"
                class="bg-gray-200 text-gray-700 rounded-lg p-2 text-sm m-r-1" (tap)="updateStatus(r, 'cancelled')"></Button>
            </GridLayout>
          </StackLayout>

          <Label *ngIf="!loading && filtered().length === 0" text="No requests found" class="text-gray-400 text-center m-t-16 text-base"></Label>
        </StackLayout>
      </ScrollView>
    </GridLayout>
  `,
})
export class ReceptionServiceRequestsComponent implements OnInit, OnDestroy {
  allRequests: any[] = [];
  loading = true;
  activeFilter = 'all';
  filters = [
    { key: 'all', label: 'All' },
    { key: 'pending', label: '⏳ Pending' },
    { key: 'in_progress', label: '▶ In Progress' },
    { key: 'completed', label: '✅ Done' },
  ];
  private timer: any;

  constructor(private api: ReceptionApiService, public router: RouterExtensions, private zone: NgZone) {}

  ngOnInit() { this.load(); this.timer = setInterval(() => this.zone.run(() => this.load()), 30000); }
  ngOnDestroy() { if (this.timer) clearInterval(this.timer); }

  load() {
    this.loading = true;
    this.api.getServiceRequests().subscribe({
      next: (r: any) => { this.allRequests = r.data || []; this.loading = false; },
      error: () => { this.loading = false; },
    });
  }

  setFilter(key: string) { this.activeFilter = key; }

  filtered(): any[] {
    if (this.activeFilter === 'all') return this.allRequests;
    return this.allRequests.filter(r => r.status === this.activeFilter);
  }

  count(status: string): string {
    return this.allRequests.filter(r => r.status === status).length.toString();
  }

  updateStatus(req: any, status: string) {
    this.api.updateServiceRequest(req.id, { status }).subscribe({
      next: () => { req.status = status; req.status_label = status.replace('_', ' '); },
    });
  }

  categoryIcon(cat: string): string {
    return ({ room_service: '🛎️', housekeeping: '🧹', maintenance: '🔧', food: '🍽️', laundry: '👔', transport: '🚗', amenity: '🎁', other: '📋' } as any)[cat] || '📋';
  }

  priorityLabel(p: number): string {
    return p >= 4 ? '🔴 Urgent' : p === 3 ? '🟠 High' : p === 2 ? '🟡 Normal' : '🟢 Low';
  }

  timeAgo(d: string): string {
    const s = (Date.now() - new Date(d).getTime()) / 1000;
    if (s < 60) return 'Just now';
    if (s < 3600) return Math.floor(s / 60) + 'm ago';
    if (s < 86400) return Math.floor(s / 3600) + 'h ago';
    return Math.floor(s / 86400) + 'd ago';
  }
}

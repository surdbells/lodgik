import { Component, NO_ERRORS_SCHEMA, OnInit } from '@angular/core';
import { NativeScriptCommonModule, RouterExtensions } from '@nativescript/angular';
import { TabletApiService } from '../../services/tablet-api.service';

@Component({
  selector: 'TabletPool',
  standalone: true,
  imports: [NativeScriptCommonModule],
  schemas: [NO_ERRORS_SCHEMA],
  template: `
    <GridLayout rows="auto, *" class="bg-gray-50">
      <GridLayout row="0" columns="auto, *" class="bg-cyan-600 p-4">
        <Label col="0" text="←" class="text-white text-2xl m-r-4" (tap)="router.back()"></Label>
        <Label col="1" text="🏊 Pool Access" class="text-white text-xl font-bold"></Label>
      </GridLayout>

      <ScrollView row="1">
        <StackLayout class="p-6">
          <ActivityIndicator *ngIf="loading" busy="true" color="#0891b2" class="m-t-8"></ActivityIndicator>

          <StackLayout *ngIf="!loading">
            <!-- Current access status -->
            <StackLayout class="rounded-2xl p-5 m-b-6 text-center" [ngStyle]="{'background-color': hasAccess ? '#ecfeff' : '#fef2f2', 'border-width': 2, 'border-color': hasAccess ? '#22d3ee' : '#fca5a5'}">
              <Label [text]="hasAccess ? '✅' : '🔒'" class="text-5xl m-b-2"></Label>
              <Label [text]="hasAccess ? 'Pool Access Active' : 'No Active Pool Access'" class="font-bold text-lg" [ngStyle]="{'color': hasAccess ? '#0891b2' : '#dc2626'}"></Label>
              <Label *ngIf="hasAccess && activeAccess" [text]="'Valid until: ' + activeAccess.valid_until" class="text-cyan-600 text-sm m-t-1"></Label>
              <Label *ngIf="hasAccess && activeAccess" [text]="'Code: ' + activeAccess.access_code" class="text-2xl font-bold text-cyan-700 m-t-2 tracking-widest"></Label>
            </StackLayout>

            <!-- Request access button -->
            <Button *ngIf="!hasAccess" text="Request Pool Access" (tap)="requestAccess()" class="bg-cyan-600 text-white rounded-2xl p-4 font-bold text-lg m-b-4"></Button>

            <!-- Pool info -->
            <StackLayout class="bg-white rounded-xl p-4 m-b-4">
              <Label text="Pool Information" class="font-bold m-b-3"></Label>
              <GridLayout columns="auto,*" class="m-b-2">
                <Label col="0" text="🕐" class="m-r-3"></Label>
                <Label col="1" [text]="poolInfo.hours || '6:00 AM – 10:00 PM'" class="text-sm text-gray-600"></Label>
              </GridLayout>
              <GridLayout columns="auto,*" class="m-b-2">
                <Label col="0" text="🌡️" class="m-r-3"></Label>
                <Label col="1" [text]="'Temp: ' + (poolInfo.temperature || 'N/A')" class="text-sm text-gray-600"></Label>
              </GridLayout>
              <GridLayout columns="auto,*" class="m-b-2">
                <Label col="0" text="👥" class="m-r-3"></Label>
                <Label col="1" [text]="'Current occupancy: ' + (poolInfo.current_guests || 0) + ' / ' + (poolInfo.capacity || '∞')" class="text-sm text-gray-600"></Label>
              </GridLayout>
              <GridLayout columns="auto,*">
                <Label col="0" text="📋" class="m-r-3"></Label>
                <Label col="1" [text]="poolInfo.rules || 'Follow hotel pool guidelines'" class="text-sm text-gray-600" textWrap="true"></Label>
              </GridLayout>
            </StackLayout>

            <!-- History -->
            <Label *ngIf="history.length" text="Your Pool Visits" class="font-bold m-b-3"></Label>
            <StackLayout *ngFor="let h of history" class="bg-white rounded-xl p-3 m-b-2">
              <GridLayout columns="*,auto">
                <Label col="0" [text]="h.visit_date || h.created_at" class="text-sm text-gray-600"></Label>
                <Label col="1" [text]="h.duration_minutes ? h.duration_minutes + ' min' : ''" class="text-sm text-gray-400"></Label>
              </GridLayout>
            </StackLayout>
          </StackLayout>

          <Label *ngIf="msg" [text]="msg" class="text-center m-t-4 font-medium" [ngStyle]="{'color': msgOk ? '#0891b2' : '#dc2626'}"></Label>
        </StackLayout>
      </ScrollView>
    </GridLayout>
  `,
})
export class TabletPoolComponent implements OnInit {
  loading = true;
  hasAccess = false;
  activeAccess: any = null;
  poolInfo: any = {};
  history: any[] = [];
  msg = ''; msgOk = true;

  constructor(private api: TabletApiService, public router: RouterExtensions) {}

  ngOnInit() { this.load(); }

  load() {
    this.loading = true;
    const data = this.api.guestData$.value;
    const s = data?.session;
    if (!s) { this.loading = false; return; }

    // Load pool status and guest access in parallel
    this.api.get('/pool/status', { property_id: s.property_id }).subscribe({
      next: (r: any) => { this.poolInfo = r.data || {}; },
    });

    this.api.get(`/pool/access?booking_id=${s.booking_id}`).subscribe({
      next: (r: any) => {
        const access = r.data;
        this.hasAccess = access?.status === 'active';
        this.activeAccess = this.hasAccess ? access : null;
        this.history = access?.history || [];
        this.loading = false;
      },
      error: () => { this.loading = false; },
    });
  }

  requestAccess() {
    const data = this.api.guestData$.value;
    const s = data?.session;
    if (!s) return;
    this.api.post('/pool/access', {
      property_id: s.property_id,
      booking_id: s.booking_id,
      guest_id: s.guest_id,
    }).subscribe({
      next: (r: any) => {
        this.msg = 'Pool access granted!';
        this.msgOk = true;
        this.load();
        setTimeout(() => this.msg = '', 3000);
      },
      error: (e: any) => { this.msg = e.error?.message || 'Failed to request access'; this.msgOk = false; },
    });
  }
}

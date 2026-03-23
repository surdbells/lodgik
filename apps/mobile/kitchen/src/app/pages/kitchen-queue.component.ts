import { Component, OnInit, OnDestroy, NgZone } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { ApplicationSettings, Utils } from '@nativescript/core';

@Component({
  selector: 'kitchen-queue',
  standalone: true,
  template: `
    <ActionBar title="🍳 Kitchen Display" class="bg-dark">
      <ActionItem text="🔊" (tap)="toggleSound()" ios.position="right"></ActionItem>
      <ActionItem text="🔔" (tap)="router.navigate(["/notifications"])" ios.position="right"></ActionItem>
    </ActionBar>
    <GridLayout rows="auto,*" class="bg-gray-900">
      <!-- Stats Bar -->
      <GridLayout row="0" columns="*,*,*" class="p-3 bg-gray-800">
        <Label col="0" [text]="'Pending: ' + pendingCount" class="text-warning text-center font-bold"></Label>
        <Label col="1" [text]="'Preparing: ' + preparingCount" class="text-primary text-center font-bold"></Label>
        <Label col="2" [text]="'Ready: ' + readyCount" class="text-success text-center font-bold"></Label>
      </GridLayout>

      <ScrollView row="1">
        <WrapLayout class="p-2">
          <StackLayout *ngFor="let entry of queue" class="m-2 rounded-xl p-4" [ngStyle]="{'width': '320', 'background-color': orderBg(entry)}" >
            <!-- Order Header -->
            <GridLayout columns="*,auto" class="m-b-2">
              <Label col="0" [text]="'#' + entry.order.order_number" class="text-xl font-bold text-white"></Label>
              <Label col="1" [text]="getElapsed(entry.order.created_at)" class="text-lg font-bold" [ngStyle]="{'color': timerColor(entry.order.created_at)}"></Label>
            </GridLayout>
            <Label [text]="'Table: ' + (entry.order.table_number || 'N/A') + ' · ' + entry.order.order_type" class="text-white text-xs m-b-2 opacity-70"></Label>

            <!-- Items -->
            <StackLayout *ngFor="let item of entry.items" class="m-b-2">
              <GridLayout columns="auto,*,auto">
                <Label col="0" [text]="item.quantity + 'x'" class="text-white font-bold text-lg m-r-2"></Label>
                <StackLayout col="1">
                  <Label [text]="item.product_name" class="text-white font-bold"></Label>
                  <Label *ngIf="item.notes" [text]="item.notes" class="text-yellow text-xs"></Label>
                </StackLayout>
                <StackLayout col="2">
                  <Button *ngIf="item.status === 'pending'" text="Start" (tap)="startItem(item.id)" class="btn btn-sm btn-warning"></Button>
                  <Button *ngIf="item.status === 'preparing'" text="Ready ✓" (tap)="readyItem(item.id)" class="btn btn-sm btn-success"></Button>
                  <Label *ngIf="item.status === 'ready'" text="✅ READY" class="text-success font-bold"></Label>
                </StackLayout>
              </GridLayout>
            </StackLayout>
          </StackLayout>

          <Label *ngIf="queue.length === 0" text="No orders in queue 🎉" class="text-center text-white text-2xl p-20"></Label>
        </WrapLayout>
      </ScrollView>
    </GridLayout>
  `,
})
export class KitchenQueueComponent implements OnInit, OnDestroy {
  queue: any[] = [];
  pendingCount = 0;
  preparingCount = 0;
  readyCount = 0;
  soundEnabled = true;
  private pollTimer: any;
  private baseUrl = '';
  private lastCount = 0;

  constructor(private http: HttpClient, private zone: NgZone) {
    this.baseUrl = ApplicationSettings.getString('kitchen_api_url', 'https://api.lodgik.co/api');
  }

  private headers(): HttpHeaders {
    return new HttpHeaders({ Authorization: `Bearer ${ApplicationSettings.getString('kitchen_token', '')}`, 'Content-Type': 'application/json' });
  }

  ngOnInit() { this.loadQueue(); this.pollTimer = setInterval(() => this.loadQueue(), 5000); }
  ngOnDestroy() { clearInterval(this.pollTimer); }

  loadQueue() {
    const pid = ApplicationSettings.getString('kitchen_property_id', '');
    this.http.get(`${this.baseUrl}/pos/kitchen/queue?property_id=${pid}`, { headers: this.headers() }).subscribe({
      next: (r: any) => {
        this.zone.run(() => {
          this.queue = r.data || [];
          let pending = 0, preparing = 0, ready = 0;
          this.queue.forEach(e => e.items.forEach((i: any) => {
            if (i.status === 'pending') pending++;
            else if (i.status === 'preparing') preparing++;
            else if (i.status === 'ready') ready++;
          }));
          // Sound alert on new orders
          if (pending > this.lastCount && this.soundEnabled) this.playAlert();
          this.lastCount = pending;
          this.pendingCount = pending; this.preparingCount = preparing; this.readyCount = ready;
        });
      },
    });
  }

  startItem(itemId: string) {
    this.http.post(`${this.baseUrl}/pos/kitchen/items/${itemId}/preparing`, {}, { headers: this.headers() }).subscribe({ next: () => this.loadQueue() });
  }

  readyItem(itemId: string) {
    this.http.post(`${this.baseUrl}/pos/kitchen/items/${itemId}/ready`, {}, { headers: this.headers() }).subscribe({ next: () => this.loadQueue() });
  }

  getElapsed(createdAt: string): string {
    if (!createdAt) return '0:00';
    const diff = Math.floor((Date.now() - new Date(createdAt).getTime()) / 1000);
    const m = Math.floor(diff / 60); const s = diff % 60;
    return `${m}:${s.toString().padStart(2, '0')}`;
  }

  timerColor(createdAt: string): string {
    const mins = Math.floor((Date.now() - new Date(createdAt).getTime()) / 60000);
    return mins > 20 ? '#ef4444' : mins > 10 ? '#f59e0b' : '#22c55e';
  }

  orderBg(entry: any): string {
    const hasPrep = entry.items.some((i: any) => i.status === 'preparing');
    const allReady = entry.items.every((i: any) => i.status === 'ready' || i.status === 'served');
    return allReady ? '#166534' : hasPrep ? '#1e3a5f' : '#374151';
  }

  toggleSound() { this.soundEnabled = !this.soundEnabled; }

  playAlert() {
    try {
      // Use device vibration as alert
      Utils.android?.getApplicationContext()?.getSystemService('vibrator')?.vibrate(500);
    } catch (e) { /* Fallback: no vibration */ }
  }
}

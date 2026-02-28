import { Component, NO_ERRORS_SCHEMA, OnInit } from '@angular/core';
import { NativeScriptCommonModule, RouterExtensions } from '@nativescript/angular';
import { ApplicationSettings } from '@nativescript/core';
import { PosApiService } from '../services/pos-api.service';

@Component({
  selector: 'pos-notifications',
  standalone: true,
  imports: [NativeScriptCommonModule],
  schemas: [NO_ERRORS_SCHEMA],
  template: `
    <ActionBar title="Notifications">
      <NavigationButton text="Back" (tap)="router.back()"/>
      <ActionItem text="Mark All Read" (tap)="markAllRead()" ios.position="right" *ngIf="unread > 0"/>
    </ActionBar>
    <GridLayout rows="auto,*">
      <StackLayout row="0" *ngIf="unread > 0" class="bg-blue-50 p-3 border-b border-blue-100">
        <Label [text]="unread + ' unread'" class="text-blue-700 text-sm text-center font-medium"/>
      </StackLayout>
      <ScrollView row="1">
        <StackLayout class="p-4">
          <ActivityIndicator *ngIf="loading" busy="true" class="m-t-8"/>
          <StackLayout *ngFor="let n of notifications" (tap)="markRead(n)"
            class="rounded-xl p-4 m-b-3 border"
            [class]="n.is_read ? 'bg-white border-gray-100' : 'bg-blue-50 border-blue-200'">
            <GridLayout columns="auto,*,auto">
              <Label col="0" [text]="typeIcon(n.type)" class="text-2xl m-r-3"/>
              <StackLayout col="1">
                <Label [text]="n.title" class="font-bold text-sm"/>
                <Label [text]="n.message" class="text-sm m-t-1 text-gray-500" textWrap="true"/>
                <Label [text]="timeAgo(n.created_at)" class="text-xs text-gray-400 m-t-1"/>
              </StackLayout>
              <Label col="2" text="●" class="text-blue-500 text-xs m-l-2" *ngIf="!n.is_read"/>
            </GridLayout>
          </StackLayout>
          <Label *ngIf="!loading && notifications.length === 0" text="No notifications" class="text-gray-400 text-center m-t-16"/>
        </StackLayout>
      </ScrollView>
    </GridLayout>
  `,
})
export class PosNotificationsComponent implements OnInit {
  notifications: any[] = [];
  loading = true;
  unread = 0;
  private pid = ApplicationSettings.getString('pos_property_id', '');

  constructor(private api: PosApiService, public router: RouterExtensions) {}

  ngOnInit() { this.load(); }

  load() {
    this.loading = true;
    this.api.getNotifications(this.pid).subscribe({
      next: (r: any) => { this.notifications = r.data || []; this.unread = this.notifications.filter((n: any) => !n.is_read).length; this.loading = false; },
      error: () => { this.loading = false; },
    });
  }

  markRead(n: any) {
    if (n.is_read) return;
    this.api.markNotificationRead(n.id).subscribe({ next: () => { n.is_read = true; this.unread = Math.max(0, this.unread - 1); } });
  }

  markAllRead() {
    this.api.markAllNotificationsRead(this.pid).subscribe({ next: () => { this.notifications.forEach((n: any) => n.is_read = true); this.unread = 0; } });
  }

  typeIcon(t: string): string { return ({ order: '🧾', payment: '💳', table: '🪑', alert: '⚠️' } as any)[t] || '🔔'; }

  timeAgo(d: string): string {
    const s = (Date.now() - new Date(d).getTime()) / 1000;
    if (s < 60) return 'Just now';
    if (s < 3600) return Math.floor(s / 60) + 'm ago';
    return Math.floor(s / 3600) + 'h ago';
  }
}

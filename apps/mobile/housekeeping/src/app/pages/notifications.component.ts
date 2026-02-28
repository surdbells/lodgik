import { Component, NO_ERRORS_SCHEMA, OnInit } from '@angular/core';
import { NativeScriptCommonModule, RouterExtensions } from '@nativescript/angular';
import { HousekeepingApiService } from '../services/housekeeping-api.service';

@Component({
  selector: 'hk-notifications',
  standalone: true,
  imports: [NativeScriptCommonModule],
  schemas: [NO_ERRORS_SCHEMA],
  template: `
    <ActionBar title="Notifications">
      <NavigationButton text="Back" (tap)="router.back()"></NavigationButton>
      <ActionItem text="Mark All Read" (tap)="markAllRead()" ios.position="right" *ngIf="unread > 0"></ActionItem>
    </ActionBar>

    <GridLayout rows="auto,*">
      <StackLayout row="0" *ngIf="unread > 0" class="bg-purple-50 p-3 border-b border-purple-100">
        <Label [text]="unread + ' unread'" class="text-purple-700 text-sm text-center font-medium"></Label>
      </StackLayout>

      <ScrollView row="1">
        <StackLayout class="p-4">
          <ActivityIndicator *ngIf="loading" busy="true" class="m-t-8"></ActivityIndicator>

          <StackLayout *ngFor="let n of notifications" (tap)="markRead(n)"
            class="rounded-xl p-4 m-b-3 border"
            [class]="n.is_read ? 'bg-white border-gray-100' : 'bg-purple-50 border-purple-200'">
            <GridLayout columns="auto,*,auto">
              <Label col="0" [text]="typeIcon(n.type)" class="text-2xl m-r-3"></Label>
              <StackLayout col="1">
                <Label [text]="n.title" class="font-bold text-sm"></Label>
                <Label [text]="n.message" class="text-sm m-t-1 text-gray-500" textWrap="true"></Label>
                <Label [text]="timeAgo(n.created_at)" class="text-xs text-gray-400 m-t-1"></Label>
              </StackLayout>
              <Label col="2" text="●" class="text-purple-500 text-xs m-l-2" *ngIf="!n.is_read"></Label>
            </GridLayout>
          </StackLayout>

          <Label *ngIf="!loading && notifications.length === 0" text="No notifications" class="text-gray-400 text-center m-t-16"></Label>
        </StackLayout>
      </ScrollView>
    </GridLayout>
  `,
})
export class HousekeepingNotificationsComponent implements OnInit {
  notifications: any[] = [];
  loading = true;
  unread = 0;

  constructor(private api: HousekeepingApiService, public router: RouterExtensions) {}

  ngOnInit() { this.load(); }

  load() {
    this.loading = true;
    this.api.getNotifications().subscribe({
      next: (r: any) => {
        this.notifications = r.data || [];
        this.unread = this.notifications.filter((n: any) => !n.is_read).length;
        this.loading = false;
      },
      error: () => { this.loading = false; },
    });
  }

  markRead(n: any) {
    if (n.is_read) return;
    this.api.markNotificationRead(n.id).subscribe({
      next: () => { n.is_read = true; this.unread = Math.max(0, this.unread - 1); },
    });
  }

  markAllRead() {
    this.api.markAllNotificationsRead().subscribe({
      next: () => { this.notifications.forEach((n: any) => n.is_read = true); this.unread = 0; },
    });
  }

  typeIcon(type: string): string {
    return { housekeeping: '🧹', task: '📋', maintenance: '🔧', alert: '⚠️', lost_found: '🧳' }[type] || '🔔';
  }

  timeAgo(dateStr: string): string {
    const diff = (Date.now() - new Date(dateStr).getTime()) / 1000;
    if (diff < 60) return 'Just now';
    if (diff < 3600) return Math.floor(diff / 60) + 'm ago';
    if (diff < 86400) return Math.floor(diff / 3600) + 'h ago';
    return Math.floor(diff / 86400) + 'd ago';
  }
}

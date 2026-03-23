import { Component, NO_ERRORS_SCHEMA, OnInit } from '@angular/core';
import { NativeScriptCommonModule, RouterExtensions } from '@nativescript/angular';
import { ApiService } from '../../services/api.service';

@Component({
  selector: 'GuestNotifications',
  standalone: true,
  imports: [NativeScriptCommonModule],
  schemas: [NO_ERRORS_SCHEMA],
  template: `
    <ActionBar title="Notifications" class="bg-blue-600">
      <NavigationButton text="Back" (tap)="router.back()"></NavigationButton>
      <ActionItem text="Mark All Read" (tap)="markAllRead()" ios.position="right" *ngIf="unread > 0"></ActionItem>
    </ActionBar>

    <GridLayout rows="auto,*">
      <!-- Unread badge -->
      <StackLayout row="0" *ngIf="unread > 0" class="bg-blue-50 p-3 border-b border-blue-100">
        <Label [text]="unread + ' unread notification' + (unread > 1 ? 's' : '')" class="text-blue-700 text-sm text-center font-medium"></Label>
      </StackLayout>

      <ScrollView row="1">
        <StackLayout class="p-4">
          <ActivityIndicator *ngIf="loading" busy="true" class="m-t-8"></ActivityIndicator>

          <StackLayout *ngFor="let n of notifications" (tap)="markRead(n)"
            class="rounded-xl p-4 m-b-3 border"
            [class]="n.is_read ? 'bg-white border-gray-100' : 'bg-blue-50 border-blue-200'">
            <GridLayout columns="auto,*,auto">
              <Label col="0" [text]="typeIcon(n.type)" class="text-2xl m-r-3"></Label>
              <StackLayout col="1">
                <Label [text]="n.title" class="font-bold text-sm" [class]="n.is_read ? 'text-gray-700' : 'text-blue-900'"></Label>
                <Label [text]="n.message" class="text-sm m-t-1" [class]="n.is_read ? 'text-gray-500' : 'text-blue-700'" textWrap="true"></Label>
                <Label [text]="timeAgo(n.created_at)" class="text-xs text-gray-400 m-t-1"></Label>
              </StackLayout>
              <Label col="2" text="●" class="text-blue-500 text-xs m-l-2" *ngIf="!n.is_read"></Label>
            </GridLayout>
          </StackLayout>

          <Label *ngIf="!loading && notifications.length === 0" text="No notifications yet" class="text-gray-400 text-center m-t-16 text-base"></Label>
        </StackLayout>
      </ScrollView>
    </GridLayout>
  `,
})
export class NotificationsComponent implements OnInit {
  notifications: any[] = [];
  loading = true;
  unread = 0;

  constructor(private api: ApiService, public router: RouterExtensions) {}

  ngOnInit() { this.load(); }

  load() {
    this.loading = true;
    this.api.get('/guest/service-requests').subscribe({
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
    this.api.post(`/notifications/${n.id}/read`, {}).subscribe({
      next: () => { n.is_read = true; this.unread = Math.max(0, this.unread - 1); },
    });
  }

  markAllRead() {
    this.api.post('/notifications/read-all', {}).subscribe({
      next: () => { this.notifications.forEach((n: any) => n.is_read = true); this.unread = 0; },
    });
  }

  typeIcon(type: string): string {
    const icons: Record<string, string> = {
      booking: '📅', payment: '💳', service_request: '🛎️',
      housekeeping: '🧹', maintenance: '🔧', chat: '💬',
      checkout: '📤', promotion: '🎁', alert: '⚠️',
    };
    return icons[type] || '🔔';
  }

  timeAgo(dateStr: string): string {
    if (!dateStr) return '';
    const diff = (Date.now() - new Date(dateStr).getTime()) / 1000;
    if (diff < 60) return 'Just now';
    if (diff < 3600) return Math.floor(diff / 60) + 'm ago';
    if (diff < 86400) return Math.floor(diff / 3600) + 'h ago';
    return Math.floor(diff / 86400) + 'd ago';
  }
}

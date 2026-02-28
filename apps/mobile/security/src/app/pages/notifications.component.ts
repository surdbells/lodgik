import { Component, NO_ERRORS_SCHEMA, OnInit } from '@angular/core';
import { NativeScriptCommonModule, RouterExtensions } from '@nativescript/angular';
import { SecurityApiService } from '../services/security-api.service';

@Component({
  selector: 'ns-notifications',
  standalone: true,
  imports: [NativeScriptCommonModule],
  schemas: [NO_ERRORS_SCHEMA],
  template: `
    <ActionBar title="Notifications" style="background-color:#00695c; color:white;">
      <NavigationButton text="Back" android.systemIcon="ic_menu_back" (tap)="router.back()"/>
      <ActionItem text="Mark All Read" (tap)="markAllRead()" ios.position="right" *ngIf="unread > 0"/>
    </ActionBar>

    <GridLayout rows="auto,*">
      <StackLayout row="0" *ngIf="unread > 0" style="background-color:#e8f5e9; padding:10; border-bottom-width:1; border-bottom-color:#c8e6c9;">
        <Label [text]="unread + ' unread'" style="color:#2e7d32; text-align:center; font-size:13;"/>
      </StackLayout>
      <ScrollView row="1">
        <StackLayout class="p-15">
          <ActivityIndicator *ngIf="loading" busy="true" class="m-t-20"/>
          <StackLayout *ngFor="let n of notifications" (tap)="markRead(n)"
            style="border-radius:8; padding:12; margin-bottom:8; border-width:1;"
            [ngStyle]="{'background-color': n.is_read ? '#fff' : '#e8f5e9', 'border-color': n.is_read ? '#e5e7eb' : '#a5d6a7'}">
            <GridLayout columns="auto,*,auto">
              <Label col="0" [text]="typeIcon(n.type)" style="font-size:22; margin-right:10;"/>
              <StackLayout col="1">
                <Label [text]="n.title" style="font-weight:bold; font-size:13;" [ngStyle]="{'color': n.is_read ? '#374151' : '#1b5e20'}"/>
                <Label [text]="n.message" style="font-size:12; color:#6b7280; margin-top:2;" textWrap="true"/>
                <Label [text]="timeAgo(n.created_at)" style="font-size:11; color:#9ca3af; margin-top:2;"/>
              </StackLayout>
              <Label col="2" text="●" style="color:#00695c; font-size:10; margin-left:6;" *ngIf="!n.is_read"/>
            </GridLayout>
          </StackLayout>
          <Label *ngIf="!loading && notifications.length === 0" text="No notifications" style="color:#9ca3af; text-align:center; margin-top:40; font-size:15;"/>
        </StackLayout>
      </ScrollView>
    </GridLayout>
  `,
})
export class SecurityNotificationsComponent implements OnInit {
  notifications: any[] = [];
  loading = true;
  unread = 0;

  constructor(private api: SecurityApiService, public router: RouterExtensions) {}

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
    this.api.markNotificationRead(n.id).subscribe({ next: () => { n.is_read = true; this.unread = Math.max(0, this.unread - 1); } });
  }

  markAllRead() {
    this.api.markAllNotificationsRead().subscribe({ next: () => { this.notifications.forEach((n: any) => n.is_read = true); this.unread = 0; } });
  }

  typeIcon(type: string): string {
    return ({ booking: '📅', gate_pass: '🚪', visitor: '👤', incident: '⚠️', movement: '🚶', alert: '🚨' } as any)[type] || '🔔';
  }

  timeAgo(d: string): string {
    const s = (Date.now() - new Date(d).getTime()) / 1000;
    if (s < 60) return 'Just now';
    if (s < 3600) return Math.floor(s / 60) + 'm ago';
    if (s < 86400) return Math.floor(s / 3600) + 'h ago';
    return Math.floor(s / 86400) + 'd ago';
  }
}

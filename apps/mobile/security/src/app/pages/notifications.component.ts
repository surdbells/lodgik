import { Component, NO_ERRORS_SCHEMA, OnInit } from '@angular/core';
import { NativeScriptCommonModule, RouterExtensions } from '@nativescript/angular';
import { SecurityApiService } from '../services/security-api.service';

@Component({
  selector: 'ns-notifications',
  standalone: true,
  imports: [NativeScriptCommonModule],
  schemas: [NO_ERRORS_SCHEMA],
  template: `
    <ActionBar title="Notifications">
      <NavigationButton text="Back" android.systemIcon="ic_menu_back" (tap)="router.back()"/>
      <ActionItem text="Mark All Read" (tap)="markAllRead()" ios.position="right" *ngIf="unread > 0"/>
    </ActionBar>

    <GridLayout rows="auto,*">
      <StackLayout row="0" *ngIf="unread > 0" class="badge-sage" style="padding:10; border-bottom-width:1; border-bottom-color:#c9dac9;">
        <Label [text]="unread + ' unread'" class="text-primary text-center" style="font-size:13;"/>
      </StackLayout>
      <ScrollView row="1">
        <StackLayout class="p-4">
          <ActivityIndicator *ngIf="loading" busy="true" class="m-t-4"/>
          <StackLayout *ngFor="let n of notifications" (tap)="markRead(n)" class="list-item"
            [style.background-color]="n.is_read ? '#ffffff' : '#f4f7f4'"
            [style.border-left-width]="n.is_read ? 0 : 3"
            [style.border-left-color]="'#466846'">
            <GridLayout columns="auto,*,auto">
              <Label col="0" [text]="typeIcon(n.type)" style="font-size:22; margin-right:10;"/>
              <StackLayout col="1">
                <Label [text]="n.title" class="list-item-title" style="font-size:13;"
                  [style.color]="n.is_read ? '#374151' : '#293929'"/>
                <Label [text]="n.message" class="list-item-subtitle" textWrap="true"/>
                <Label [text]="timeAgo(n.created_at)" class="list-item-meta"/>
              </StackLayout>
              <Label col="2" text="●" class="text-primary" style="font-size:10; margin-left:6;" *ngIf="!n.is_read"/>
            </GridLayout>
          </StackLayout>
          <Label *ngIf="!loading && notifications.length === 0" text="No notifications" class="empty-state"/>
        </StackLayout>
      </ScrollView>
    </GridLayout>
  `,
})
export class SecurityNotificationsComponent implements OnInit {
  notifications: any[] = []; loading = true; unread = 0;
  constructor(private api: SecurityApiService, public router: RouterExtensions) {}
  ngOnInit() { this.load(); }
  load() {
    this.loading = true;
    this.api.getNotifications().subscribe({
      next: (r: any) => { this.notifications = r.data || []; this.unread = this.notifications.filter((n: any) => !n.is_read).length; this.loading = false; },
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
    if (s < 60) return 'Just now'; if (s < 3600) return Math.floor(s/60) + 'm ago';
    if (s < 86400) return Math.floor(s/3600) + 'h ago'; return Math.floor(s/86400) + 'd ago';
  }
}

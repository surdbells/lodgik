import { Component, NO_ERRORS_SCHEMA, OnInit } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { ApplicationSettings } from '@nativescript/core';
import { NativeScriptCommonModule, RouterExtensions } from '@nativescript/angular';

@Component({
  selector: 'kitchen-notifications',
  standalone: true,
  imports: [NativeScriptCommonModule],
  schemas: [NO_ERRORS_SCHEMA],
  template: `
    <ActionBar title="Notifications" class="bg-dark">
      <NavigationButton text="Back" (tap)="router.back()"/>
      <ActionItem text="Mark All" (tap)="markAllRead()" ios.position="right" *ngIf="unread > 0"/>
    </ActionBar>

    <GridLayout rows="auto,*" class="bg-gray-900">
      <StackLayout row="0" *ngIf="unread > 0" style="background-color:#374151; padding:8;">
        <Label [text]="unread + ' unread'" style="color:#fbbf24; text-align:center; font-size:12; font-weight:bold;"/>
      </StackLayout>
      <ScrollView row="1">
        <StackLayout class="p-3">
          <ActivityIndicator *ngIf="loading" busy="true" color="white" class="m-t-20"/>
          <StackLayout *ngFor="let n of notifications" (tap)="markRead(n)"
            class="rounded-xl p-4 m-b-2"
            [ngStyle]="{'background-color': n.is_read ? '#1f2937' : '#374151'}">
            <GridLayout columns="auto,*">
              <Label col="0" [text]="typeIcon(n.type)" style="font-size:20; margin-right:10;"/>
              <StackLayout col="1">
                <Label [text]="n.title" style="font-weight:bold; font-size:13; color:white;"/>
                <Label [text]="n.message" style="font-size:12; color:#9ca3af; margin-top:2;" textWrap="true"/>
                <Label [text]="timeAgo(n.created_at)" style="font-size:10; color:#6b7280; margin-top:2;"/>
              </StackLayout>
            </GridLayout>
          </StackLayout>
          <Label *ngIf="!loading && notifications.length === 0" text="No notifications" style="color:#6b7280; text-align:center; margin-top:40; font-size:14;"/>
        </StackLayout>
      </ScrollView>
    </GridLayout>
  `,
})
export class KitchenNotificationsComponent implements OnInit {
  notifications: any[] = [];
  loading = true;
  unread = 0;

  constructor(private http: HttpClient, public router: RouterExtensions) {}

  private h(): HttpHeaders {
    return new HttpHeaders({ Authorization: `Bearer ${ApplicationSettings.getString('kitchen_token', '')}`, 'Content-Type': 'application/json' });
  }
  private get base(): string { return ApplicationSettings.getString('kitchen_api_url', 'http://10.0.2.2:8080'); }

  ngOnInit() { this.load(); }

  load() {
    this.loading = true;
    const pid = ApplicationSettings.getString('kitchen_property_id', '');
    this.http.get(`${this.base}/notifications?property_id=${pid}&limit=50`, { headers: this.h() }).subscribe({
      next: (r: any) => { this.notifications = r.data || []; this.unread = this.notifications.filter((n: any) => !n.is_read).length; this.loading = false; },
      error: () => { this.loading = false; },
    });
  }

  markRead(n: any) {
    if (n.is_read) return;
    this.http.post(`${this.base}/notifications/${n.id}/read`, {}, { headers: this.h() }).subscribe({ next: () => { n.is_read = true; this.unread = Math.max(0, this.unread - 1); } });
  }

  markAllRead() {
    const pid = ApplicationSettings.getString('kitchen_property_id', '');
    this.http.post(`${this.base}/notifications/read-all`, { property_id: pid }, { headers: this.h() }).subscribe({ next: () => { this.notifications.forEach((n: any) => n.is_read = true); this.unread = 0; } });
  }

  typeIcon(t: string): string { return ({ order: '🍽️', kitchen: '👨‍🍳', alert: '⚠️' } as any)[t] || '🔔'; }

  timeAgo(d: string): string {
    const s = (Date.now() - new Date(d).getTime()) / 1000;
    if (s < 60) return 'Just now';
    if (s < 3600) return Math.floor(s / 60) + 'm ago';
    return Math.floor(s / 3600) + 'h ago';
  }
}

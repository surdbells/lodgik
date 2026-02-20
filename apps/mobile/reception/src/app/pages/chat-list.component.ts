import { Component, OnInit, OnDestroy, NO_ERRORS_SCHEMA, NgZone } from '@angular/core';
import { NativeScriptCommonModule, RouterExtensions } from '@nativescript/angular';
import { ReceptionApiService } from '../services/reception-api.service';

@Component({
  selector: 'chat-list',
  standalone: true,
  imports: [NativeScriptCommonModule],
  schemas: [NO_ERRORS_SCHEMA],
  template: `
    <ActionBar title="Guest Chats"><NavigationButton text="Back" (tap)="router.back()"></NavigationButton></ActionBar>
    <ScrollView>
      <StackLayout class="p-4">
        <Label text="Active Conversations" class="text-sm text-gray-500 m-b-3"></Label>
        <StackLayout *ngFor="let chat of chats" (tap)="openChat(chat)" class="bg-white rounded-xl p-4 m-b-2 border">
          <GridLayout columns="*,auto">
            <StackLayout col="0">
              <Label [text]="chat.guest_name || 'Guest'" class="font-bold"></Label>
              <Label [text]="'Room ' + (chat.room_number || 'N/A') + ' · ' + chat.booking_ref" class="text-sm text-gray-500"></Label>
              <Label [text]="chat.last_message || ''" class="text-xs text-gray-400 m-t-1" maxLines="1"></Label>
            </StackLayout>
            <StackLayout col="1" class="text-center">
              <StackLayout *ngIf="chat.unread_count > 0" class="bg-red-600 rounded-full" style="width:24; height:24;">
                <Label [text]="chat.unread_count" class="text-white text-xs font-bold text-center" style="line-height:24"></Label>
              </StackLayout>
              <Label [text]="chat.last_message_at?.substring(11, 16) || ''" class="text-xs text-gray-400 m-t-1"></Label>
            </StackLayout>
          </GridLayout>
        </StackLayout>
        <Label *ngIf="!chats.length && !loading" text="No active conversations" class="text-center text-gray-400 p-8 text-lg"></Label>
        <Label *ngIf="loading" text="Loading..." class="text-center text-gray-400 p-8"></Label>
      </StackLayout>
    </ScrollView>
  `,
})
export class ChatListComponent implements OnInit, OnDestroy {
  chats: any[] = [];
  loading = true;
  private timer: any;

  constructor(private api: ReceptionApiService, public router: RouterExtensions, private zone: NgZone) {}

  ngOnInit() { this.load(); this.timer = setInterval(() => this.zone.run(() => this.load()), 10000); }
  ngOnDestroy() { if (this.timer) clearInterval(this.timer); }

  load() {
    this.api.getActiveChats().subscribe({
      next: (r: any) => { this.chats = r.data || []; this.loading = false; },
      error: () => this.loading = false,
    });
  }

  openChat(chat: any) { this.router.navigate(['/chat', chat.booking_id]); }
}

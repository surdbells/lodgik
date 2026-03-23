import { Component, NO_ERRORS_SCHEMA, OnInit, OnDestroy, NgZone } from '@angular/core';
import { NativeScriptCommonModule, NativeScriptFormsModule, RouterExtensions } from '@nativescript/angular';
import { TabletApiService } from '../../services/tablet-api.service';

@Component({
  selector: 'TabletChat',
  standalone: true,
  imports: [NativeScriptCommonModule, NativeScriptFormsModule],
  schemas: [NO_ERRORS_SCHEMA],
  template: `
    <GridLayout rows="auto, *, auto">
      <GridLayout row="0" columns="auto, *" class="bg-white border-b p-4">
        <Label col="0" text="←" (tap)="router.back()" class="text-2xl m-r-4 p-2"></Label>
        <Label col="1" text="Chat with Reception" class="text-xl font-bold"></Label>
      </GridLayout>

      <ScrollView row="1" class="bg-gray-50">
        <StackLayout class="p-6">
          <Label *ngIf="!messages.length" text="Send a message to the front desk" class="text-gray-400 text-center m-t-8 text-lg"></Label>
          <StackLayout *ngFor="let m of messages" class="m-b-3">
            <FlexboxLayout [justifyContent]="m.sender_type === 'guest' ? 'flex-end' : 'flex-start'">
              <StackLayout [class]="m.sender_type === 'guest' ? 'bg-blue-600 rounded-2xl rounded-br-sm p-4' : 'bg-white border rounded-2xl rounded-bl-sm p-4'" maxWidth="600">
                <Label *ngIf="m.sender_type === 'staff'" [text]="m.sender_name" class="text-gray-500 text-xs font-bold m-b-1"></Label>
                <Label [text]="m.message" textWrap="true" [class]="m.sender_type === 'guest' ? 'text-white text-base' : 'text-gray-800 text-base'"></Label>
                <Label [text]="m.created_at?.substring(11, 16)" [class]="m.sender_type === 'guest' ? 'text-blue-200 text-xs text-right m-t-1' : 'text-gray-400 text-xs m-t-1'"></Label>
              </StackLayout>
            </FlexboxLayout>
          </StackLayout>
        </StackLayout>
      </ScrollView>

      <GridLayout row="2" columns="*, auto" class="bg-white border-t p-4">
        <TextField col="0" [(ngModel)]="newMessage" hint="Type a message..." class="input border-2 rounded-full p-4 m-r-3 text-lg" returnKeyType="send" (returnPress)="send()"></TextField>
        <Button col="1" text="Send" (tap)="send()" [isEnabled]="!!newMessage.trim()" class="bg-blue-600 text-white rounded-full p-4 px-8 font-bold text-lg"></Button>
      </GridLayout>
    </GridLayout>
  `,
})
export class TabletChatComponent implements OnInit, OnDestroy {
  messages: any[] = [];
  newMessage = '';
  private pollTimer: any;

  constructor(private api: TabletApiService, public router: RouterExtensions, private zone: NgZone) {}

  ngOnInit() {
    this.loadMessages();
    this.markRead();
    this.pollTimer = setInterval(() => this.zone.run(() => { this.loadMessages(); this.markRead(); }), 5000);
  }

  ngOnDestroy() { if (this.pollTimer) clearInterval(this.pollTimer); }

  private get bookingId(): string { return this.api.guestData$.value?.session?.booking_id || ''; }
  private get propertyId(): string { return this.api.guestData$.value?.session?.property_id || ''; }
  private get guestId(): string { return this.api.guestData$.value?.session?.guest_id || ''; }
  private get guestName(): string { return this.api.guestData$.value?.guest_name || 'Guest'; }

  loadMessages() {
    if (!this.bookingId) return;
    this.api.get('/guest/chat/messages').subscribe({
      next: (r: any) => this.messages = r.data || [],
    });
  }

  markRead() {
    if (!this.bookingId) return;
    this.api.post('/guest/chat/read', {}).subscribe();
  }

  send() {
    if (!this.newMessage.trim() || !this.bookingId) return;
    this.api.post('/guest/chat/send', {
      booking_id: this.bookingId, property_id: this.propertyId,
      sender_type: 'guest', sender_id: this.guestId, sender_name: this.guestName,
      message: this.newMessage.trim(),
    }).subscribe({ next: () => { this.newMessage = ''; this.loadMessages(); } });
  }
}

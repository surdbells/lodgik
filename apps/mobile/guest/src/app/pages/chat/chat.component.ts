import { Component, NO_ERRORS_SCHEMA, OnInit, OnDestroy, NgZone } from '@angular/core';
import { NativeScriptCommonModule, RouterExtensions } from '@nativescript/angular';
import { NativeScriptFormsModule } from '@nativescript/angular';
import { ApiService } from '../../services/api.service';

@Component({
  selector: 'Chat',
  standalone: true,
  imports: [NativeScriptCommonModule, NativeScriptFormsModule],
  schemas: [NO_ERRORS_SCHEMA],
  template: `
    <ActionBar title="Chat with Reception" class="bg-white">
      <NavigationButton text="Back" (tap)="router.back()"></NavigationButton>
    </ActionBar>
    <GridLayout rows="*, auto">
      <!-- Messages -->
      <ScrollView row="0" #scrollView>
        <StackLayout class="p-3">
          <Label *ngIf="!messages.length" text="Start a conversation with the front desk" class="text-gray-400 text-center m-t-8"></Label>
          <StackLayout *ngFor="let m of messages" class="m-b-2">
            <FlexboxLayout [justifyContent]="m.sender_type === 'guest' ? 'flex-end' : 'flex-start'">
              <StackLayout [class]="m.sender_type === 'guest' ? 'bg-blue-600 rounded-xl rounded-br-sm p-3 max-w-3/4' : 'bg-gray-100 rounded-xl rounded-bl-sm p-3 max-w-3/4'">
                <Label *ngIf="m.sender_type === 'staff'" [text]="m.sender_name" class="text-xs text-gray-500 font-bold"></Label>
                <Label [text]="m.message" textWrap="true" [class]="m.sender_type === 'guest' ? 'text-white' : 'text-gray-800'"></Label>
                <Label [text]="m.created_at?.substring(11, 16)" [class]="m.sender_type === 'guest' ? 'text-blue-200 text-xs text-right' : 'text-gray-400 text-xs'"></Label>
              </StackLayout>
            </FlexboxLayout>
          </StackLayout>
        </StackLayout>
      </ScrollView>

      <!-- Input -->
      <GridLayout row="1" columns="*, auto" class="bg-white border-t p-2">
        <TextField col="0" [(ngModel)]="newMessage" hint="Type a message..." class="input border rounded-full p-3 m-r-2" returnKeyType="send" (returnPress)="send()"></TextField>
        <Button col="1" text="Send" (tap)="send()" [isEnabled]="!!newMessage.trim()" class="bg-blue-600 text-white rounded-full p-3 px-5 font-bold"></Button>
      </GridLayout>
    </GridLayout>
  `,
})
export class ChatComponent implements OnInit, OnDestroy {
  messages: any[] = [];
  newMessage = '';
  private pollTimer: any;

  constructor(private api: ApiService, public router: RouterExtensions, private zone: NgZone) {}

  ngOnInit() {
    this.loadMessages();
    this.markRead();
    // Poll every 5 seconds
    this.pollTimer = setInterval(() => this.zone.run(() => this.loadMessages()), 5000);
  }

  ngOnDestroy() { if (this.pollTimer) clearInterval(this.pollTimer); }

  loadMessages() {
    const session = this.api.getSession();
    if (!session?.booking?.id) return;
    this.api.get(`/chat/messages/${session.booking.id}`).subscribe({
      next: (r: any) => this.messages = r.data || [],
    });
  }

  markRead() {
    const session = this.api.getSession();
    if (!session?.booking?.id) return;
    this.api.post(`/chat/messages/${session.booking.id}/read`, { reader_type: 'guest' }).subscribe();
  }

  send() {
    if (!this.newMessage.trim()) return;
    const session = this.api.getSession();
    if (!session?.booking?.id) return;
    this.api.post('/chat/messages', {
      booking_id: session.booking.id, property_id: session.property_id,
      sender_type: 'guest', sender_id: session.guest.id, sender_name: session.guest.name,
      message: this.newMessage.trim(),
    }).subscribe({
      next: () => { this.newMessage = ''; this.loadMessages(); },
    });
  }
}

import { Component, OnInit, OnDestroy, NO_ERRORS_SCHEMA, NgZone } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { NativeScriptCommonModule, NativeScriptFormsModule, RouterExtensions } from '@nativescript/angular';
import { ReceptionApiService } from '../services/reception-api.service';
import { ApplicationSettings } from '@nativescript/core';

@Component({
  selector: 'chat-conversation',
  standalone: true,
  imports: [NativeScriptCommonModule, NativeScriptFormsModule],
  schemas: [NO_ERRORS_SCHEMA],
  template: `
    <ActionBar [title]="'Chat · ' + guestName"><NavigationButton text="Back" (tap)="router.back()"></NavigationButton></ActionBar>
    <GridLayout rows="*,auto">
      <ScrollView row="0" class="bg-gray-50">
        <StackLayout class="p-4">
          <StackLayout *ngFor="let m of messages" class="m-b-2">
            <FlexboxLayout [justifyContent]="m.sender_type === 'staff' ? 'flex-end' : 'flex-start'">
              <StackLayout [class]="m.sender_type === 'staff' ? 'bg-blue-600 rounded-2xl rounded-br-sm p-3' : 'bg-white border rounded-2xl rounded-bl-sm p-3'" maxWidth="300">
                <Label *ngIf="m.sender_type === 'guest'" [text]="m.sender_name" class="text-xs text-gray-400 font-bold m-b-1"></Label>
                <Label *ngIf="m.department && m.department !== 'reception'" [text]="'[' + m.department + ']'" class="text-xs text-amber"></Label>
                <Label [text]="m.message" textWrap="true" [class]="m.sender_type === 'staff' ? 'text-white' : 'text-gray-800'"></Label>
                <Label [text]="m.created_at?.substring(11, 16)" [class]="m.sender_type === 'staff' ? 'text-blue-200 text-xs text-right' : 'text-gray-400 text-xs'"></Label>
              </StackLayout>
            </FlexboxLayout>
          </StackLayout>
          <Label *ngIf="!messages.length" text="No messages yet" class="text-center text-gray-400 p-8"></Label>
        </StackLayout>
      </ScrollView>

      <GridLayout row="1" columns="*,auto" class="bg-white border-t p-2">
        <TextField col="0" [(ngModel)]="newMsg" hint="Type a reply..." class="input border rounded-full p-3 m-r-2" returnKeyType="send" (returnPress)="send()"></TextField>
        <Button col="1" text="Send" (tap)="send()" [isEnabled]="!!newMsg.trim()" class="bg-blue-600 text-white rounded-full p-3 px-5 font-bold"></Button>
      </GridLayout>
    </GridLayout>
  `,
})
export class ChatConversationComponent implements OnInit, OnDestroy {
  messages: any[] = [];
  newMsg = '';
  guestName = '';
  private bookingId = '';
  private timer: any;

  constructor(private route: ActivatedRoute, private api: ReceptionApiService, public router: RouterExtensions, private zone: NgZone) {}

  ngOnInit() {
    this.bookingId = this.route.snapshot.params['bookingId'];
    this.load();
    this.api.markChatRead(this.bookingId).subscribe();
    this.timer = setInterval(() => this.zone.run(() => this.load()), 5000);
  }

  ngOnDestroy() { if (this.timer) clearInterval(this.timer); }

  load() {
    this.api.getChatMessages(this.bookingId).subscribe({
      next: (r: any) => {
        this.messages = r.data || [];
        const guestMsg = this.messages.find((m: any) => m.sender_type === 'guest');
        if (guestMsg) this.guestName = guestMsg.sender_name;
      },
    });
  }

  send() {
    if (!this.newMsg.trim()) return;
    const staffName = ApplicationSettings.getString('reception_staff_name', 'Reception');
    const staffId = ApplicationSettings.getString('reception_staff_id', '');
    this.api.sendChatMessage({
      booking_id: this.bookingId,
      property_id: this.api.propertyId,
      sender_type: 'staff',
      sender_id: staffId,
      sender_name: staffName,
      message: this.newMsg.trim(),
      department: 'reception',
    }).subscribe({
      next: () => { this.newMsg = ''; this.load(); },
    });
  }
}

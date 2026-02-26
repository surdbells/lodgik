import { Component, inject, OnInit, OnDestroy, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ApiService, PageHeaderComponent, LoadingSpinnerComponent, AuthService, ActivePropertyService} from '@lodgik/shared';

@Component({
  selector: 'app-chat',
  standalone: true,
  imports: [FormsModule, PageHeaderComponent, LoadingSpinnerComponent],
  template: `
    <ui-page-header title="Guest Chat" icon="message-circle" [breadcrumbs]="['Guest Experience', 'Chat']" subtitle="Respond to guest messages across departments"></ui-page-header>

    <div class="flex gap-4" style="height: calc(100vh - 160px)">
      <!-- Left: Conversation List -->
      <div class="w-80 bg-white border rounded-lg flex flex-col">
        <div class="p-3 border-b">
          <input type="text" placeholder="Search chats..." [(ngModel)]="searchTerm" class="w-full px-3 py-2 border rounded-lg text-sm" />
        </div>
        <div class="flex-1 overflow-y-auto">
          @for (chat of filteredChats(); track chat.booking_id) {
            <div (click)="selectChat(chat)" class="p-3 border-b cursor-pointer hover:bg-gray-50" [class.bg-sage-50]="selectedBookingId === chat.booking_id">
              <div class="flex justify-between items-start">
                <div class="font-medium text-sm">{{ chat.guest_name || 'Guest' }}</div>
                @if (chat.unread_count > 0) {
                  <span class="bg-red-500 text-white text-xs rounded-full px-1.5 py-0.5 min-w-[20px] text-center">{{ chat.unread_count }}</span>
                }
              </div>
              <div class="text-xs text-gray-400">Room {{ chat.room_number || 'N/A' }} · {{ chat.booking_ref }}</div>
              <div class="text-xs text-gray-400 mt-1 truncate">{{ chat.last_message || '' }}</div>
            </div>
          }
          @if (chats().length === 0) {
            <div class="p-6 text-center text-gray-400 text-sm">No active conversations</div>
          }
        </div>
      </div>

      <!-- Right: Messages -->
      <div class="flex-1 bg-white border rounded-lg flex flex-col">
        @if (selectedBookingId) {
          <!-- Header -->
          <div class="p-3 border-b flex justify-between items-center">
            <div>
              <span class="font-medium">{{ selectedGuestName }}</span>
              <span class="text-xs text-gray-400 ml-2">{{ selectedBookingRef }}</span>
            </div>
            <div class="flex gap-1">
              @for (dept of departments; track dept.value) {
                <button (click)="replyDepartment = dept.value"
                  [class]="replyDepartment === dept.value ? 'px-2 py-1 text-xs bg-sage-600 text-white rounded' : 'px-2 py-1 text-xs border rounded hover:bg-gray-50'">
                  {{ dept.label }}
                </button>
              }
            </div>
          </div>

          <!-- Messages -->
          <div class="flex-1 overflow-y-auto p-4 space-y-2 bg-gray-50" #messageContainer>
            @for (m of messages(); track m.id) {
              <div [class]="m.sender_type === 'staff' ? 'flex justify-end' : 'flex justify-start'">
                <div [class]="m.sender_type === 'staff' ? 'bg-sage-600 text-white rounded-2xl rounded-br-sm px-4 py-2 max-w-md' : 'bg-white border rounded-2xl rounded-bl-sm px-4 py-2 max-w-md'">
                  @if (m.sender_type === 'guest') { <div class="text-xs font-bold text-gray-400 mb-0.5">{{ m.sender_name }}</div> }
                  @if (m.department && m.department !== 'reception' && m.sender_type === 'staff') {
                    <div class="text-xs opacity-70 mb-0.5">[{{ m.department }}]</div>
                  }
                  @if (m.department && m.sender_type === 'guest') {
                    <div class="text-xs text-amber-500 mb-0.5">→ {{ m.department }}</div>
                  }
                  <div class="text-sm">{{ m.message }}</div>
                  <div [class]="m.sender_type === 'staff' ? 'text-xs text-sage-200 text-right mt-1' : 'text-xs text-gray-400 mt-1'">{{ m.created_at?.substring(11, 16) }}</div>
                </div>
              </div>
            }
          </div>

          <!-- Input -->
          <div class="p-3 border-t flex gap-2">
            <input type="text" [(ngModel)]="newMessage" placeholder="Type a reply..." (keydown.enter)="send()"
              class="flex-1 px-4 py-2 border rounded-full text-sm focus:outline-none focus:ring-2 focus:ring-sage-200" />
            <button (click)="send()" [disabled]="!newMessage.trim()" class="px-5 py-2 bg-sage-600 text-white rounded-full text-sm font-medium hover:bg-sage-700 disabled:opacity-50">Send</button>
          </div>
        } @else {
          <div class="flex-1 flex items-center justify-center text-gray-400">
            <div class="text-center">
              <div class="text-4xl mb-2">💬</div>
              <div>Select a conversation to start replying</div>
            </div>
          </div>
        }
      </div>
    </div>
  `,
})
export class ChatPage implements OnInit, OnDestroy {
  private api = inject(ApiService);
  private auth = inject(AuthService);
  private activeProperty = inject(ActivePropertyService);

  chats = signal<any[]>([]);
  messages = signal<any[]>([]);
  selectedBookingId = '';
  selectedGuestName = '';
  selectedBookingRef = '';
  newMessage = '';
  searchTerm = '';
  replyDepartment = 'reception';
  private pollTimer: any;

  departments = [
    { label: 'Reception', value: 'reception' },
    { label: 'Kitchen', value: 'kitchen' },
    { label: 'Bar', value: 'bar' },
  ];

  ngOnInit() {
    this.loadChats();
    this.pollTimer = setInterval(() => {
      this.loadChats();
      if (this.selectedBookingId) this.loadMessages();
    }, 5000);
  }

  ngOnDestroy() { if (this.pollTimer) clearInterval(this.pollTimer); }

  filteredChats() {
    if (!this.searchTerm) return this.chats();
    const s = this.searchTerm.toLowerCase();
    return this.chats().filter(c => (c.guest_name || '').toLowerCase().includes(s) || (c.booking_ref || '').toLowerCase().includes(s));
  }

  loadChats() {
    const pid = this.activeProperty.propertyId();
    this.api.get(`/chat/active?property_id=${pid}`).subscribe({
      next: (r: any) => this.chats.set(r.data || []),
    });
  }

  selectChat(chat: any) {
    this.selectedBookingId = chat.booking_id;
    this.selectedGuestName = chat.guest_name || 'Guest';
    this.selectedBookingRef = chat.booking_ref || '';
    this.loadMessages();
    this.api.post(`/chat/messages/${chat.booking_id}/read`, { reader_type: 'staff' }).subscribe();
  }

  loadMessages() {
    this.api.get(`/chat/messages/${this.selectedBookingId}`).subscribe({
      next: (r: any) => this.messages.set(r.data || []),
    });
  }

  send() {
    if (!this.newMessage.trim() || !this.selectedBookingId) return;
    const user = this.auth.currentUser;
    this.api.post('/chat/messages', {
      booking_id: this.selectedBookingId,
      property_id: user?.property_id || '',
      sender_type: 'staff',
      sender_id: user?.id || '',
      sender_name: [user?.first_name, user?.last_name].filter(Boolean).join(' ') || 'Staff',
      message: this.newMessage.trim(),
      department: this.replyDepartment,
    }).subscribe({
      next: () => { this.newMessage = ''; this.loadMessages(); },
    });
  }
}

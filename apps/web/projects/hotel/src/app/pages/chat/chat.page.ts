import { Component, inject, OnInit, OnDestroy, signal, ViewChild, ElementRef } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ApiService, PageHeaderComponent, LoadingSpinnerComponent, AuthService, ActivePropertyService, TokenService, LODGIK_ICONS } from '@lodgik/shared';
import { LucideAngularModule, LUCIDE_ICONS, LucideIconProvider } from 'lucide-angular';

@Component({
  selector: 'app-chat',
  standalone: true,
  imports: [FormsModule, PageHeaderComponent, LoadingSpinnerComponent, LucideAngularModule],
  providers: [{ provide: LUCIDE_ICONS, multi: true, useValue: new LucideIconProvider(LODGIK_ICONS) }],
  template: `
    <ui-page-header title="Guest Chat" subtitle="Message guests in occupied rooms">
      <button (click)="openNewChat()" class="px-4 py-2.5 bg-sage-600 text-white text-sm font-semibold rounded-lg hover:bg-sage-700 flex items-center gap-2">
        <lucide-icon name="plus" [size]="16" [strokeWidth]="2"></lucide-icon>
        New Conversation
      </button>
    </ui-page-header>

    <div class="flex gap-4" style="height: calc(100vh - 160px)">
      <!-- Left: Conversation List -->
      <div class="w-80 bg-white border rounded-xl flex flex-col shrink-0">
        <div class="p-3 border-b">
          <input type="text" placeholder="Search chats..." [(ngModel)]="searchTerm" class="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm bg-gray-50" />
        </div>
        <div class="flex-1 overflow-y-auto">
          @for (chat of filteredChats(); track chat.booking_id) {
            <div (click)="selectChat(chat)" class="p-3 border-b cursor-pointer hover:bg-gray-50 transition-colors"
                 [class.bg-sage-50]="selectedBookingId === chat.booking_id" [class.border-l-2]="selectedBookingId === chat.booking_id" [class.border-l-sage-600]="selectedBookingId === chat.booking_id">
              <div class="flex justify-between items-start">
                <div class="font-medium text-sm text-gray-900">{{ chat.guest_name || 'Guest' }}</div>
                @if (chat.unread_count > 0) {
                  <span class="bg-red-500 text-white text-[10px] rounded-full px-1.5 py-0.5 min-w-[18px] text-center font-bold">{{ chat.unread_count }}</span>
                }
              </div>
              <div class="text-xs text-gray-400 mt-0.5">Room {{ chat.room_number || '—' }} · {{ chat.booking_ref }}</div>
              @if (chat.last_message) {
                <div class="text-xs text-gray-500 mt-1 truncate">
                  @if (chat.last_sender === 'staff') { <span class="text-sage-600">You:</span> }
                  {{ chat.last_message }}
                </div>
              }
            </div>
          }
          @if (chats().length === 0) {
            <div class="p-8 text-center text-gray-400">
              <lucide-icon name="message-circle" [size]="32" [strokeWidth]="1.5" class="text-gray-300 mx-auto mb-2"></lucide-icon>
              <p class="text-sm">No active conversations</p>
              <button (click)="openNewChat()" class="mt-2 text-sage-600 text-sm hover:underline">Start one</button>
            </div>
          }
        </div>
      </div>

      <!-- Right: Messages -->
      <div class="flex-1 bg-white border rounded-xl flex flex-col min-w-0">
        @if (selectedBookingId) {
          <!-- Header -->
          <div class="p-4 border-b flex justify-between items-center">
            <div>
              <h3 class="font-semibold text-gray-900">{{ selectedGuestName }}</h3>
              <p class="text-xs text-gray-400">Room {{ selectedRoom }} · {{ selectedBookingRef }}</p>
            </div>
            <div class="flex gap-1">
              @for (dept of departments; track dept.value) {
                <button (click)="replyDepartment = dept.value"
                  class="px-2.5 py-1 text-xs rounded-lg transition-colors"
                  [class.bg-sage-600]="replyDepartment === dept.value" [class.text-white]="replyDepartment === dept.value"
                  [class.border]="replyDepartment !== dept.value" [class.border-gray-200]="replyDepartment !== dept.value" [class.hover:bg-gray-50]="replyDepartment !== dept.value">
                  {{ dept.label }}
                </button>
              }
            </div>
          </div>

          <!-- Messages -->
          <div class="flex-1 overflow-y-auto p-4 space-y-3 bg-gray-50" #messageContainer>
            @for (m of messages(); track m.id) {
              <div [class]="m.sender_type === 'staff' ? 'flex justify-end' : 'flex justify-start'">
                <div [class]="m.sender_type === 'staff'
                  ? 'bg-sage-600 text-white rounded-2xl rounded-br-sm px-4 py-2.5 max-w-md shadow-sm'
                  : 'bg-white border rounded-2xl rounded-bl-sm px-4 py-2.5 max-w-md shadow-sm'">
                  @if (m.sender_type === 'guest') { <div class="text-[11px] font-bold text-gray-400 mb-0.5">{{ m.sender_name }}</div> }
                  @if (m.department && m.department !== 'reception' && m.sender_type === 'staff') {
                    <div class="text-[11px] opacity-70 mb-0.5">[{{ m.department }}]</div>
                  }
                  <div class="text-sm leading-relaxed">{{ m.message }}</div>
                  <div [class]="m.sender_type === 'staff' ? 'text-[10px] text-sage-200 text-right mt-1' : 'text-[10px] text-gray-400 mt-1'">
                    {{ m.created_at?.substring(11, 16) }}
                  </div>
                </div>
              </div>
            }
            @if (messages().length === 0) {
              <div class="flex flex-col items-center justify-center h-full text-gray-400">
                <p class="text-sm">No messages yet — send the first one!</p>
              </div>
            }
          </div>

          <!-- Input -->
          <div class="p-3 border-t flex gap-2">
            <input type="text" [(ngModel)]="newMessage" placeholder="Type a message..."
              (keydown.enter)="send()"
              class="flex-1 px-4 py-2.5 border border-gray-200 rounded-full text-sm bg-gray-50 focus:outline-none focus:ring-2 focus:ring-sage-200" />
            <button (click)="send()" [disabled]="!newMessage.trim()"
              class="px-5 py-2.5 bg-sage-600 text-white rounded-full text-sm font-medium hover:bg-sage-700 disabled:opacity-50 transition-colors">
              Send
            </button>
          </div>
        } @else {
          <div class="flex-1 flex items-center justify-center text-gray-400">
            <div class="text-center">
              <lucide-icon name="message-circle" [size]="48" [strokeWidth]="1.25" class="text-gray-200 mx-auto mb-3"></lucide-icon>
              <p class="text-sm text-gray-500">Select a conversation or start a new one</p>
            </div>
          </div>
        }
      </div>
    </div>

    <!-- New Conversation Modal -->
    @if (showNewChat) {
      <div class="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50" (click)="showNewChat = false">
        <div class="bg-white rounded-2xl shadow-2xl w-full max-w-lg p-5 max-h-[80vh] flex flex-col" (click)="$event.stopPropagation()">
          <h3 class="text-lg font-semibold text-gray-900 mb-1">Start Conversation</h3>
          <p class="text-sm text-gray-400 mb-4">Select a guest currently checked in</p>

          <input [(ngModel)]="guestSearch" placeholder="Search by name or room..." class="px-3 py-2 border border-gray-200 rounded-lg text-sm bg-gray-50 mb-3">

          <div class="flex-1 overflow-y-auto space-y-1">
            @for (g of filteredGuests(); track g.booking_id) {
              <button (click)="startConversation(g)" class="w-full text-left px-4 py-3 rounded-xl border border-gray-100 hover:border-sage-300 hover:bg-sage-50 transition-all flex items-center gap-3">
                <div class="w-10 h-10 rounded-full bg-sage-100 flex items-center justify-center text-sage-700 font-bold text-sm shrink-0">
                  {{ g.first_name?.charAt(0) }}{{ g.last_name?.charAt(0) }}
                </div>
                <div class="flex-1 min-w-0">
                  <p class="text-sm font-medium text-gray-900">{{ g.first_name }} {{ g.last_name }}</p>
                  <p class="text-xs text-gray-400">Room {{ g.room_number || '—' }} · {{ g.booking_ref }}</p>
                </div>
                <lucide-icon name="message-circle" [size]="16" class="text-gray-300"></lucide-icon>
              </button>
            }
            @if (occupiedGuests().length === 0) {
              <div class="py-8 text-center text-gray-400">
                <p class="text-sm">No guests currently checked in</p>
              </div>
            }
            @if (occupiedGuests().length > 0 && filteredGuests().length === 0) {
              <div class="py-8 text-center text-gray-400">
                <p class="text-sm">No matching guests</p>
              </div>
            }
          </div>

          <button (click)="showNewChat = false" class="mt-4 w-full px-4 py-2 text-sm text-gray-500 border border-gray-300 rounded-xl">Cancel</button>
        </div>
      </div>
    }
  `,
})
export class ChatPage implements OnInit, OnDestroy {
  private api = inject(ApiService);
  private auth = inject(AuthService);
  private activeProperty = inject(ActivePropertyService);
  private token = inject(TokenService);
  @ViewChild('messageContainer') messageContainer!: ElementRef;

  chats = signal<any[]>([]);
  messages = signal<any[]>([]);
  occupiedGuests = signal<any[]>([]);
  selectedBookingId = '';
  selectedGuestName = '';
  selectedBookingRef = '';
  selectedRoom = '';
  selectedGuestId = '';
  newMessage = '';
  searchTerm = '';
  guestSearch = '';
  replyDepartment = 'reception';
  showNewChat = false;
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
    return this.chats().filter(c =>
      (c.guest_name || '').toLowerCase().includes(s) ||
      (c.booking_ref || '').toLowerCase().includes(s) ||
      (c.room_number || '').includes(s)
    );
  }

  filteredGuests() {
    if (!this.guestSearch) return this.occupiedGuests();
    const s = this.guestSearch.toLowerCase();
    return this.occupiedGuests().filter((g: any) =>
      `${g.first_name} ${g.last_name}`.toLowerCase().includes(s) ||
      (g.room_number || '').includes(s)
    );
  }

  loadChats() {
    const pid = this.activeProperty.propertyId();
    if (!pid) return;
    this.api.get(`/chat/active?property_id=${pid}`).subscribe({
      next: (r: any) => this.chats.set(r.data || []),
    });
  }

  selectChat(chat: any) {
    this.selectedBookingId = chat.booking_id;
    this.selectedGuestName = chat.guest_name || 'Guest';
    this.selectedBookingRef = chat.booking_ref || '';
    this.selectedRoom = chat.room_number || '';
    this.selectedGuestId = chat.guest_id || '';
    this.loadMessages();
    this.api.post(`/chat/messages/${chat.booking_id}/read`, { reader_type: 'staff' }).subscribe();
  }

  loadMessages() {
    this.api.get(`/chat/messages/${this.selectedBookingId}`).subscribe({
      next: (r: any) => {
        this.messages.set(r.data || []);
        setTimeout(() => this.scrollToBottom(), 100);
      },
    });
  }

  send() {
    if (!this.newMessage.trim() || !this.selectedBookingId) return;
    const user = this.token.user();
    this.api.post('/chat/messages', {
      booking_id: this.selectedBookingId,
      property_id: this.activeProperty.propertyId(),
      sender_type: 'staff',
      sender_id: user?.id || '',
      sender_name: [user?.first_name, user?.last_name].filter(Boolean).join(' ') || 'Staff',
      message: this.newMessage.trim(),
      department: this.replyDepartment,
    }).subscribe({
      next: () => {
        this.newMessage = '';
        this.loadMessages();
        this.loadChats();
      },
    });
  }

  // Start new conversation with an occupied guest
  startConversation(guest: any) {
    this.showNewChat = false;
    // Check if conversation already exists
    const existing = this.chats().find(c => c.booking_id === guest.booking_id);
    if (existing) {
      this.selectChat(existing);
      return;
    }
    // Send initial greeting
    const user = this.token.user();
    this.api.post('/chat/messages', {
      booking_id: guest.booking_id,
      property_id: this.activeProperty.propertyId(),
      sender_type: 'staff',
      sender_id: user?.id || '',
      sender_name: [user?.first_name, user?.last_name].filter(Boolean).join(' ') || 'Staff',
      message: `Hello ${guest.first_name}, welcome! How can we assist you during your stay?`,
      department: 'reception',
    }).subscribe({
      next: () => {
        this.loadChats();
        // Select the new chat after a brief delay
        setTimeout(() => {
          this.selectedBookingId = guest.booking_id;
          this.selectedGuestName = `${guest.first_name} ${guest.last_name}`;
          this.selectedBookingRef = guest.booking_ref;
          this.selectedRoom = guest.room_number || '';
          this.selectedGuestId = guest.guest_id || '';
          this.loadMessages();
        }, 500);
      },
    });
  }

  private scrollToBottom() {
    try {
      const el = this.messageContainer?.nativeElement;
      if (el) el.scrollTop = el.scrollHeight;
    } catch {}
  }

  // Load occupied guests when "New Conversation" modal opens
  private _guestsLoaded = false;
  openNewChat() {
    this.showNewChat = true;
    this.guestSearch = '';
    if (!this._guestsLoaded) {
      const pid = this.activeProperty.propertyId();
      if (pid) {
        this.api.get(`/chat/occupied-guests?property_id=${pid}`).subscribe({
          next: (r: any) => { this.occupiedGuests.set(r.data || []); this._guestsLoaded = true; },
        });
      }
    }
  }
}

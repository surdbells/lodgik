import {
  Component, signal, inject, OnInit, OnDestroy,
  ViewChild, ElementRef, AfterViewChecked,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { DatePipe } from '@angular/common';
import { RouterLink } from '@angular/router';
import { GuestApiService } from '../../services/guest-api.service';

@Component({
  selector: 'app-guest-chat',
  standalone: true,
  imports: [FormsModule, DatePipe, RouterLink],
  template: `
    <div class="flex flex-col h-[calc(100vh-120px)] max-w-md mx-auto">

      <!-- Header -->
      <div class="px-4 py-3 flex items-center gap-3 border-b border-white/10">
        <a routerLink="/guest/home" class="text-white/50 hover:text-white text-xl">←</a>
        <div class="flex-1">
          <h2 class="text-sm font-semibold text-white">Front Desk</h2>
          <p class="text-[11px] text-white/40">Hotel staff · usually replies in minutes</p>
        </div>
        <div class="w-2 h-2 bg-emerald-400 rounded-full"></div>
      </div>

      <!-- Messages -->
      <div #messageContainer class="flex-1 overflow-y-auto px-4 py-4 space-y-3">
        @if (loading()) {
          <div class="flex justify-center py-8">
            <div class="w-5 h-5 border-2 border-amber-400 border-t-transparent rounded-full animate-spin"></div>
          </div>
        }

        @for (msg of messages(); track msg.id) {
          <div class="flex" [class]="msg.sender_type === 'guest' ? 'justify-end' : 'justify-start'">
            <div class="max-w-[78%]">
              @if (msg.sender_type !== 'guest') {
                <p class="text-[10px] text-white/30 mb-0.5 px-1">{{ msg.sender_name ?? 'Staff' }}</p>
              }
              <div class="px-3.5 py-2.5 rounded-2xl text-sm leading-relaxed"
                [class]="msg.sender_type === 'guest'
                  ? 'bg-amber-400 text-slate-900 rounded-br-sm'
                  : 'bg-white/10 text-white/85 rounded-bl-sm border border-white/10'">
                {{ msg.message }}
              </div>
              <p class="text-[10px] text-white/25 mt-0.5 px-1"
                [class]="msg.sender_type === 'guest' ? 'text-right' : ''">
                {{ msg.created_at | date:'HH:mm' }}
              </p>
            </div>
          </div>
        }

        @if (!loading() && messages().length === 0) {
          <div class="text-center py-16">
            <p class="text-3xl mb-3">💬</p>
            <p class="text-white/40 text-sm">Start a conversation</p>
            <p class="text-white/25 text-xs mt-1">Our team typically replies within minutes</p>
          </div>
        }
      </div>

      <!-- Input -->
      <div class="px-4 py-3 border-t border-white/10 bg-slate-900/50 backdrop-blur-md">
        @if (error()) {
          <p class="text-red-400 text-xs mb-2 px-1">{{ error() }}</p>
        }
        <div class="flex gap-2 items-end">
          <textarea
            [(ngModel)]="newMessage"
            (keydown.enter)="onEnter($event)"
            rows="1"
            placeholder="Type a message…"
            class="flex-1 px-4 py-2.5 bg-white/10 border border-white/20 rounded-2xl text-white text-sm
                   placeholder-white/30 focus:outline-none focus:ring-2 focus:ring-amber-400 resize-none
                   max-h-24 leading-snug">
          </textarea>
          <button (click)="send()" [disabled]="!newMessage.trim() || sending()"
            class="w-10 h-10 bg-amber-400 rounded-2xl flex items-center justify-center text-slate-900 text-lg
                   hover:bg-amber-300 disabled:opacity-40 disabled:cursor-not-allowed flex-shrink-0 transition-colors">
            {{ sending() ? '…' : '↑' }}
          </button>
        </div>
      </div>

    </div>
  `,
})
export default class GuestChatPage implements OnInit, OnDestroy, AfterViewChecked {
  @ViewChild('messageContainer') private msgContainer!: ElementRef;

  private guestApi = inject(GuestApiService);

  loading    = signal(true);
  sending    = signal(false);
  messages   = signal<any[]>([]);
  error      = signal<string | null>(null);
  newMessage = '';

  private pollInterval: ReturnType<typeof setInterval> | null = null;
  private shouldScrollBottom = false;

  ngOnInit(): void  { this.loadMessages(); this.startPolling(); }
  ngOnDestroy(): void { if (this.pollInterval) clearInterval(this.pollInterval); }

  ngAfterViewChecked(): void {
    if (this.shouldScrollBottom) { this.scrollBottom(); this.shouldScrollBottom = false; }
  }

  onEnter(event: Event): void {
    const e = event as KeyboardEvent;
    if (!e.shiftKey) { e.preventDefault(); this.send(); }
  }

  send(): void {
    const text = this.newMessage.trim();
    if (!text || this.sending()) return;
    this.sending.set(true);
    this.error.set(null);
    this.newMessage = '';

    this.guestApi.post<any>('/guest/chat/send', { message: text }).subscribe({
      next: (r: any) => {
        this.sending.set(false);
        if (r.success) { this.loadMessages(); }
        else { this.error.set(r.message ?? 'Failed to send'); }
      },
      error: (err: any) => {
        this.sending.set(false);
        this.error.set(err?.error?.message ?? 'Could not send message. Please try again.');
      },
    });
  }

  private startPolling(): void {
    this.pollInterval = setInterval(() => this.loadMessages(false), 8000);
  }

  private loadMessages(showLoader = true): void {
    if (showLoader) this.loading.set(true);
    this.guestApi.get<any>('/guest/chat/messages').subscribe({
      next: (r: any) => {
        this.messages.set(r.data ?? []);
        this.loading.set(false);
        this.shouldScrollBottom = true;
        // Mark staff messages as read
        if ((r.data ?? []).some((m: any) => m.sender_type !== 'guest')) {
          this.guestApi.post('/guest/chat/read', {}).subscribe();
        }
      },
      error: () => this.loading.set(false),
    });
  }

  private scrollBottom(): void {
    try {
      const el = this.msgContainer.nativeElement;
      el.scrollTop = el.scrollHeight;
    } catch {}
  }
}

import {
  Component, signal, inject, OnInit, OnDestroy,
  ViewChild, ElementRef, AfterViewChecked,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { DatePipe } from '@angular/common';
import { RouterLink } from '@angular/router';
import { LucideAngularModule, ArrowLeft, MessageCircle, SendHorizonal } from 'lucide-angular';
import { GuestApiService } from '../../services/guest-api.service';
import { GuestThemeService } from '../../services/guest-theme.service';

@Component({
  selector: 'app-guest-chat',
  standalone: true,
  imports: [FormsModule, DatePipe, RouterLink, LucideAngularModule],
  template: `
    <div class="flex flex-col max-w-md mx-auto" style="height: calc(100dvh - 120px)">

      <!-- Header -->
      <div class="px-4 py-3 flex items-center gap-3 border-b" [class]="th.header()">
        <a routerLink="/guest/home" class="transition-colors" [class]="th.backBtn()">
          <lucide-icon [img]="ArrowLeftIcon" class="w-5 h-5"></lucide-icon>
        </a>
        <div class="flex-1">
          <h2 class="text-sm font-semibold" [class]="th.text()">Front Desk</h2>
          <p class="text-[11px]" [class]="th.subtle()">Hotel staff · usually replies in minutes</p>
        </div>
        <div class="w-2 h-2 bg-emerald-400 rounded-full"></div>
      </div>

      <!-- Messages -->
      <div #msgContainer class="flex-1 overflow-y-auto px-4 py-4 space-y-3">
        @if (loading()) {
          <div class="flex justify-center py-8">
            <div class="w-5 h-5 border-2 rounded-full animate-spin" [class]="th.spinner()"></div>
          </div>
        }

        @for (msg of messages(); track msg.id) {
          <div class="flex" [class]="msg.sender_type === 'guest' ? 'justify-end' : 'justify-start'">
            <div class="max-w-[78%]">
              @if (msg.sender_type !== 'guest') {
                <p class="text-[10px] mb-0.5 px-1" [class]="th.subtle()">
                  {{ msg.sender_name ?? (msg.sender_type === 'system' ? 'Lodgik' : 'Staff') }}
                </p>
              }
              <div class="px-3.5 py-2.5 rounded-2xl text-sm leading-relaxed"
                [class]="msg.sender_type === 'guest'
                  ? 'bg-amber-400 text-slate-900 rounded-br-sm'
                  : msg.sender_type === 'system'
                    ? (th.isDark() ? 'bg-blue-500/20 text-blue-200 rounded-bl-sm border border-blue-500/20' : 'bg-blue-50 text-blue-700 rounded-bl-sm border border-blue-100')
                    : (th.isDark() ? 'bg-white/10 text-white/85 rounded-bl-sm border border-white/10' : 'bg-gray-100 text-gray-800 rounded-bl-sm')">
                {{ msg.message }}
              </div>
              <p class="text-[10px] mt-0.5 px-1" [class]="[th.subtle(), msg.sender_type === 'guest' ? 'text-right' : '']">
                {{ msg.created_at | date:'HH:mm' }}
              </p>
            </div>
          </div>
        }

        @if (!loading() && messages().length === 0) {
          <div class="text-center py-16">
            <div class="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-3"
              [class]="th.iconCircle()">
              <lucide-icon [img]="MessageCircleIcon" class="w-7 h-7" [class]="th.subtle()"></lucide-icon>
            </div>
            <p class="text-sm" [class]="th.muted()">Start a conversation</p>
            <p class="text-xs mt-1" [class]="th.subtle()">Our team is here to help 24/7</p>
          </div>
        }
      </div>

      <!-- Input -->
      <div class="px-4 py-3 border-t" [class]="th.header()">
        @if (error()) {
          <p class="text-red-400 text-xs mb-2 px-1">{{ error() }}</p>
        }
        <div class="flex items-end gap-2">
          <textarea [(ngModel)]="message" rows="1"
            placeholder="Message the front desk…"
            (keydown.enter)="$event.shiftKey ? null : (send(); $event.preventDefault())"
            class="flex-1 rounded-2xl px-4 py-2.5 text-sm resize-none max-h-32 leading-relaxed"
            [class]="th.input()">
          </textarea>
          <button (click)="send()" [disabled]="!message.trim() || sending()"
            class="w-10 h-10 rounded-full bg-amber-400 text-slate-900 flex items-center justify-center
                   disabled:opacity-40 active:scale-95 transition-all shrink-0">
            @if (sending()) {
              <span class="w-4 h-4 border-2 border-slate-900 border-t-transparent rounded-full animate-spin"></span>
            } @else {
              <lucide-icon [img]="SendHorizonalIcon" class="w-4 h-4"></lucide-icon>
            }
          </button>
        </div>
      </div>

    </div>
  `,
})
export default class GuestChatPage implements OnInit, OnDestroy, AfterViewChecked {
  private guestApi = inject(GuestApiService);
  readonly th      = inject(GuestThemeService);

  @ViewChild('msgContainer') msgContainer!: ElementRef<HTMLElement>;

  readonly ArrowLeftIcon     = ArrowLeft;
  readonly MessageCircleIcon = MessageCircle;
  readonly SendHorizonalIcon = SendHorizonal;

  messages = signal<any[]>([]);
  loading  = signal(true);
  sending  = signal(false);
  error    = signal<string | null>(null);
  message  = '';

  private pollInterval: any = null;
  private shouldScrollBottom = true;

  ngOnInit(): void {
    this.loadMessages(true);
    this.startPolling();
  }

  ngOnDestroy(): void {
    if (this.pollInterval) clearInterval(this.pollInterval);
  }

  ngAfterViewChecked(): void {
    if (this.shouldScrollBottom) {
      this.scrollBottom();
      this.shouldScrollBottom = false;
    }
  }

  send(): void {
    const msg = this.message.trim();
    if (!msg || this.sending()) return;
    this.sending.set(true);
    this.error.set(null);
    const prev = this.message;
    this.message = '';
    this.guestApi.post<any>('/guest/chat/send', { message: msg }).subscribe({
      next: (r: any) => {
        this.messages.update(m => [...m, r.data]);
        this.sending.set(false);
        this.shouldScrollBottom = true;
      },
      error: (err: any) => {
        this.message = prev;
        this.sending.set(false);
        this.error.set(err?.error?.message ?? 'Could not send message. Please try again.');
      },
    });
  }

  private startPolling(): void {
    this.pollInterval = setInterval(() => this.loadMessages(false), 8000);
  }

  private loadMessages(showLoader: boolean): void {
    if (showLoader) this.loading.set(true);
    this.guestApi.get<any>('/guest/chat/messages').subscribe({
      next: (r: any) => {
        this.messages.set(r.data ?? []);
        this.loading.set(false);
        this.shouldScrollBottom = true;
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

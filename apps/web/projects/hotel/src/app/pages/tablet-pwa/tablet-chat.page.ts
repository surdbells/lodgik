import { Component, inject, signal, OnInit, OnDestroy, ElementRef, ViewChild } from '@angular/core';
import { Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { TabletService } from './tablet.service';

@Component({ selector: 'app-tablet-chat', standalone: true, imports: [FormsModule],
  template: `
    <div class="h-screen w-screen bg-slate-950 flex flex-col overflow-hidden">
      <div class="flex items-center gap-4 px-6 py-4 border-b border-slate-800 flex-shrink-0">
        <button (click)="router.navigate(['/tablet/home'])" class="w-10 h-10 rounded-xl bg-slate-800 text-white flex items-center justify-center text-lg">←</button>
        <div class="flex-1">
          <h1 class="text-white font-bold text-xl">Chat with Staff</h1>
          <div class="flex items-center gap-1.5 mt-0.5"><span class="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span><span class="text-slate-400 text-xs">Front Desk · Available 24/7</span></div>
        </div>
      </div>

      <!-- Messages -->
      <div #msgList class="flex-1 overflow-y-auto p-5 space-y-3">
        @for (m of messages(); track m.id) {
          <div class="flex" [class]="m.sender_type === 'guest' ? 'justify-end' : 'justify-start'">
            <div class="max-w-sm px-4 py-3 rounded-2xl text-sm"
                 [class]="m.sender_type === 'guest' ? 'bg-blue-600 text-white rounded-br-sm' : 'bg-slate-800 text-white rounded-bl-sm'">
              <p class="leading-relaxed">{{ m.message }}</p>
              <p class="text-[10px] mt-1 opacity-50">{{ m.sender_name }} · {{ fmtTime(m.created_at) }}</p>
            </div>
          </div>
        }
        @if (messages().length === 0) {
          <div class="text-center py-16 text-slate-500 text-sm">Send a message to contact staff</div>
        }
      </div>

      <!-- Input -->
      <div class="flex-shrink-0 border-t border-slate-800 px-5 py-4 flex gap-3">
        <input [(ngModel)]="draft" (keydown.enter)="send()" placeholder="Type a message…"
          class="flex-1 bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-white text-sm focus:outline-none focus:border-blue-500">
        <button (click)="send()" [disabled]="!draft.trim() || sending()"
          class="px-6 py-3 bg-blue-600 text-white rounded-xl font-bold text-sm disabled:opacity-50 active:scale-95 transition-all">
          Send
        </button>
      </div>
    </div>
  `,
})
export class TabletChatPage implements OnInit, OnDestroy {
  @ViewChild('msgList') msgList!: ElementRef;
  readonly router = inject(Router);
  private svc     = inject(TabletService);

  messages = signal<any[]>([]);
  draft    = '';
  sending  = signal(false);
  private bookingId = '';
  private timer: any;

  ngOnInit(): void {
    this.bookingId = this.svc.guestData()?.booking?.id ?? '';
    this.load();
    this.timer = setInterval(() => this.load(), 10_000);
  }
  ngOnDestroy(): void { clearInterval(this.timer); }

  private load(): void {
    if (!this.bookingId) return;
    this.svc.get(`/chat/messages/${this.bookingId}`).subscribe({
      next: (r: any) => {
        this.messages.set(r.data ?? []);
        setTimeout(() => { if (this.msgList) this.msgList.nativeElement.scrollTop = this.msgList.nativeElement.scrollHeight; }, 50);
      },
      error: () => {},
    });
  }

  send(): void {
    if (!this.draft.trim() || this.sending()) return;
    const msg = this.draft.trim();
    this.draft = '';
    this.sending.set(true);
    this.svc.post('/chat/messages', { booking_id: this.bookingId, message: msg, sender_type: 'guest' }).subscribe({
      next: () => { this.sending.set(false); this.load(); },
      error: () => this.sending.set(false),
    });
  }

  fmtTime(dt: string): string {
    return dt ? new Date(dt).toLocaleTimeString('en-NG', { hour: '2-digit', minute: '2-digit', hour12: true }) : '';
  }
}

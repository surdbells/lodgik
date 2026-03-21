import { Component, signal, inject, OnInit, computed } from '@angular/core';
import { RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { GuestApiService } from '../../services/guest-api.service';
import { GuestThemeService } from '../../services/guest-theme.service';

@Component({
  selector: 'app-guest-stay-notifications',
  standalone: true,
  imports: [RouterLink, FormsModule],
  template: `
    <div class="px-4 py-6 max-w-md mx-auto pb-32">

      <!-- Header -->
      <div class="flex items-center gap-3 mb-5">
        <a routerLink="/guest/home" class="transition-colors" [class]="th.backBtn()">
          <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 12H5M12 19l-7-7 7-7"/>
          </svg>
        </a>
        <div class="flex-1">
          <h2 class="text-lg font-bold" [class]="th.text()">Stay Notifications</h2>
          <p class="text-xs mt-0.5" [class]="th.muted()">
            Let up to 3 trusted contacts know about your stay for safety
          </p>
        </div>
      </div>

      <!-- Info banner -->
      <div class="rounded-2xl p-4 mb-5 border" [class]="th.accentBg() + ' border-amber-400/20'">
        <p class="text-xs leading-relaxed" [class]="th.text()">
          🔒 <strong>Your safety matters.</strong> Add up to 3 trusted contacts — friends, family, or colleagues —
          who will receive your hotel location, booking dates, and room number. They can reach the hotel directly if needed.
        </p>
      </div>

      <!-- Loading -->
      @if (loading()) {
        <div class="flex justify-center py-10">
          <div class="w-6 h-6 border-2 rounded-full animate-spin" [class]="th.spinner()"></div>
        </div>
      }

      <!-- Contact cards -->
      @if (!loading()) {
        <div class="space-y-3 mb-5">
          @for (contact of contacts(); track contact.id) {
            <div class="rounded-2xl p-4 border" [class]="th.card()">
              <div class="flex items-start justify-between mb-3">
                <div>
                  <p class="font-bold text-sm" [class]="th.text()">{{ contact.contact_name }}</p>
                  @if (contact.contact_email) {
                    <p class="text-xs mt-0.5" [class]="th.muted()">✉️ {{ contact.contact_email }}</p>
                  }
                  @if (contact.contact_phone) {
                    <p class="text-xs mt-0.5" [class]="th.muted()">📞 {{ contact.contact_phone }}</p>
                  }
                </div>
                <div class="flex items-center gap-2">
                  @if (contact.status === 'sent') {
                    <span class="text-[10px] bg-emerald-500/20 text-emerald-400 px-2 py-0.5 rounded-full font-bold">✓ Sent</span>
                  }
                  <button (click)="deleteContact(contact.id)"
                    class="w-7 h-7 rounded-full flex items-center justify-center text-red-400 hover:bg-red-400/10 transition-colors text-sm">✕</button>
                </div>
              </div>

              <!-- Toggles -->
              <div class="space-y-2 mb-3">
                <div class="flex items-center justify-between">
                  <span class="text-xs" [class]="th.muted()">Notify on check-in automatically</span>
                  <button (click)="toggleField(contact, 'notify_on_checkin')"
                    class="w-9 h-5 rounded-full transition-colors relative"
                    [class]="contact.notify_on_checkin ? 'bg-amber-400' : (th.isDark() ? 'bg-slate-700' : 'bg-gray-200')">
                    <span class="absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform"
                      [class]="contact.notify_on_checkin ? 'translate-x-4 left-0.5' : 'left-0.5'"></span>
                  </button>
                </div>
                <div class="flex items-center justify-between">
                  <span class="text-xs" [class]="th.muted()">Share booking details (dates, room)</span>
                  <button (click)="toggleField(contact, 'share_booking_details')"
                    class="w-9 h-5 rounded-full transition-colors relative"
                    [class]="contact.share_booking_details ? 'bg-amber-400' : (th.isDark() ? 'bg-slate-700' : 'bg-gray-200')">
                    <span class="absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform"
                      [class]="contact.share_booking_details ? 'translate-x-4 left-0.5' : 'left-0.5'"></span>
                  </button>
                </div>
              </div>

              <!-- Send button -->
              <button (click)="sendNow(contact)"
                [disabled]="sending() === contact.id"
                class="w-full py-2.5 rounded-xl text-xs font-bold transition-all active:scale-95"
                [class]="sending() === contact.id ? 'opacity-50 ' + th.badge() : th.badge()">
                @if (sending() === contact.id) {
                  <span class="flex items-center justify-center gap-1.5">
                    <span class="w-3 h-3 border border-current border-t-transparent rounded-full animate-spin"></span>
                    Sending…
                  </span>
                } @else {
                  📤 Send Now
                }
              </button>

              @if (sentResult() && sentResult()!.id === contact.id) {
                <p class="text-xs text-emerald-400 text-center mt-2 font-medium">
                  ✓ Sent via {{ sentResult()!.channels.join(', ') }}
                </p>
              }
              @if (sendError() && sendError()!.id === contact.id) {
                <p class="text-xs text-red-400 text-center mt-2">{{ sendError()!.message }}</p>
              }
            </div>
          }
        </div>

        <!-- Add new contact (max 3) -->
        @if (contacts().length < 3) {
          @if (!showForm()) {
            <button (click)="showForm.set(true)"
              class="w-full py-3.5 rounded-2xl border-2 border-dashed text-sm font-semibold transition-all active:scale-95"
              [class]="th.isDark() ? 'border-slate-700 text-slate-400 hover:border-slate-600' : 'border-gray-200 text-gray-500 hover:border-sage-300'">
              + Add Trusted Contact ({{ contacts().length }}/3)
            </button>
          } @else {
            <div class="rounded-2xl p-5 border" [class]="th.card()">
              <h3 class="font-bold text-sm mb-4" [class]="th.text()">New Trusted Contact</h3>
              <div class="space-y-3">
                <div>
                  <label class="text-xs font-medium mb-1 block" [class]="th.muted()">Full Name *</label>
                  <input [(ngModel)]="form.contact_name" placeholder="e.g. Jane Doe"
                    class="w-full rounded-xl px-3 py-2.5 text-sm" [class]="th.input()">
                </div>
                <div>
                  <label class="text-xs font-medium mb-1 block" [class]="th.muted()">Email Address</label>
                  <input [(ngModel)]="form.contact_email" type="email" placeholder="jane@example.com"
                    class="w-full rounded-xl px-3 py-2.5 text-sm" [class]="th.input()">
                </div>
                <div>
                  <label class="text-xs font-medium mb-1 block" [class]="th.muted()">Phone Number (with country code)</label>
                  <input [(ngModel)]="form.contact_phone" type="tel" placeholder="+2348012345678"
                    class="w-full rounded-xl px-3 py-2.5 text-sm" [class]="th.input()">
                </div>
                <div class="flex items-center justify-between py-1">
                  <span class="text-xs" [class]="th.muted()">Notify automatically on check-in</span>
                  <button (click)="form.notify_on_checkin = !form.notify_on_checkin"
                    class="w-9 h-5 rounded-full transition-colors relative"
                    [class]="form.notify_on_checkin ? 'bg-amber-400' : (th.isDark() ? 'bg-slate-700' : 'bg-gray-200')">
                    <span class="absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform"
                      [class]="form.notify_on_checkin ? 'translate-x-4 left-0.5' : 'left-0.5'"></span>
                  </button>
                </div>
                <div class="flex items-center justify-between py-1">
                  <span class="text-xs" [class]="th.muted()">Share booking details (dates, room)</span>
                  <button (click)="form.share_booking_details = !form.share_booking_details"
                    class="w-9 h-5 rounded-full transition-colors relative"
                    [class]="form.share_booking_details ? 'bg-amber-400' : (th.isDark() ? 'bg-slate-700' : 'bg-gray-200')">
                    <span class="absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform"
                      [class]="form.share_booking_details ? 'translate-x-4 left-0.5' : 'left-0.5'"></span>
                  </button>
                </div>
                @if (formError()) {
                  <p class="text-red-400 text-xs">{{ formError() }}</p>
                }
                <div class="flex gap-2 pt-1">
                  <button (click)="save()" [disabled]="saving()"
                    class="flex-1 py-3 rounded-xl text-sm font-bold bg-amber-400 text-slate-900 disabled:opacity-50 active:scale-95 transition-all">
                    {{ saving() ? 'Saving…' : 'Save Contact' }}
                  </button>
                  <button (click)="cancelForm()"
                    class="flex-1 py-3 rounded-xl text-sm font-semibold transition-colors" [class]="th.badge()">
                    Cancel
                  </button>
                </div>
              </div>
            </div>
          }
        } @else {
          <p class="text-center text-xs py-3" [class]="th.muted()">Maximum 3 contacts reached</p>
        }
      }
    </div>
  `,
})
export default class GuestStayNotificationsPage implements OnInit {
  private guestApi = inject(GuestApiService);
  readonly th       = inject(GuestThemeService);

  loading   = signal(true);
  contacts  = signal<any[]>([]);
  showForm  = signal(false);
  saving    = signal(false);
  sending   = signal<string | null>(null);
  sentResult = signal<{ id: string; channels: string[] } | null>(null);
  sendError  = signal<{ id: string; message: string } | null>(null);
  formError  = signal('');

  form: any = {
    contact_name: '', contact_email: '', contact_phone: '',
    notify_on_checkin: false, share_booking_details: true,
  };

  ngOnInit(): void { this.load(); }

  private load(): void {
    this.loading.set(true);
    this.guestApi.get('/guest/stay-notifications').subscribe({
      next: (r: any) => { this.contacts.set(r.data ?? []); this.loading.set(false); },
      error: () => this.loading.set(false),
    });
  }

  save(): void {
    if (!this.form.contact_name?.trim()) { this.formError.set('Name is required'); return; }
    if (!this.form.contact_email?.trim() && !this.form.contact_phone?.trim()) {
      this.formError.set('Provide at least an email address or phone number'); return;
    }
    this.formError.set('');
    this.saving.set(true);
    this.guestApi.post('/guest/stay-notifications', this.form).subscribe({
      next: (r: any) => {
        this.saving.set(false);
        if (r.success || r.data) {
          this.cancelForm();
          this.load();
        } else { this.formError.set(r.message ?? 'Failed to save'); }
      },
      error: (e: any) => { this.saving.set(false); this.formError.set(e?.error?.message ?? 'Failed to save'); },
    });
  }

  cancelForm(): void {
    this.showForm.set(false);
    this.form = { contact_name: '', contact_email: '', contact_phone: '', notify_on_checkin: false, share_booking_details: true };
    this.formError.set('');
  }

  toggleField(contact: any, field: string): void {
    const val = !contact[field];
    this.guestApi.put(`/guest/stay-notifications/${contact.id}`, { ...contact, [field]: val }).subscribe({
      next: (r: any) => { if (r.success || r.data) this.contacts.update(cs => cs.map(c => c.id === contact.id ? { ...c, [field]: val } : c)); },
    });
  }

  deleteContact(id: string): void {
    this.guestApi.delete(`/guest/stay-notifications/${id}`).subscribe({
      next: () => this.contacts.update(cs => cs.filter(c => c.id !== id)),
    });
  }

  sendNow(contact: any): void {
    this.sentResult.set(null);
    this.sendError.set(null);
    this.sending.set(contact.id);
    this.guestApi.post(`/guest/stay-notifications/${contact.id}/send`, {}).subscribe({
      next: (r: any) => {
        this.sending.set(null);
        if (r.success) {
          const channels: string[] = r.data?.channels_sent ?? [];
          this.sentResult.set({ id: contact.id, channels });
          this.contacts.update(cs => cs.map(c => c.id === contact.id ? { ...c, status: 'sent' } : c));
          setTimeout(() => this.sentResult.set(null), 5000);
        } else {
          this.sendError.set({ id: contact.id, message: r.message ?? 'Failed to send' });
          setTimeout(() => this.sendError.set(null), 5000);
        }
      },
      error: (e: any) => {
        this.sending.set(null);
        this.sendError.set({ id: contact.id, message: e?.error?.message ?? 'Failed to send' });
        setTimeout(() => this.sendError.set(null), 5000);
      },
    });
  }
}

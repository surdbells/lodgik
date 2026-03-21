import { Component, signal, inject, OnInit } from '@angular/core';
import { RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { GuestApiService } from '../../services/guest-api.service';
import { GuestThemeService } from '../../services/guest-theme.service';

@Component({
  selector: 'app-guest-stay-notifications',
  standalone: true,
  imports: [RouterLink, FormsModule],
  template: `
    <div class="px-4 py-6 max-w-md mx-auto pb-24">

      <!-- Header -->
      <div class="flex items-center gap-3 mb-5">
        <a routerLink="/guest/home" class="transition-colors" [class]="th.backBtn()">
          <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 12H5M12 19l-7-7 7-7"/>
          </svg>
        </a>
        <div class="flex-1">
          <h2 class="text-lg font-bold" [class]="th.text()">Trusted Contacts</h2>
          <p class="text-xs mt-0.5" [class]="th.muted()">Notify up to 3 people of your stay</p>
        </div>
      </div>

      <!-- Info banner -->
      <div class="rounded-2xl p-4 mb-5 border" [class]="th.accentBg()">
        <p class="text-xs font-semibold" [class]="th.accentText()">🔒 For your safety</p>
        <p class="text-xs mt-1" [class]="th.muted()">
          Let trusted contacts know where you are staying — they'll receive hotel details, your
          check-in/out dates, and a Google Maps link. You control exactly what is shared.
        </p>
      </div>

      <!-- Loading -->
      @if (loading()) {
        <div class="flex justify-center py-10">
          <div class="w-6 h-6 border-2 rounded-full animate-spin" [class]="th.spinner()"></div>
        </div>
      }

      <!-- Contact list -->
      @if (!loading()) {
        @for (contact of contacts(); track contact.id) {
          <div class="rounded-2xl p-4 mb-3 border" [class]="th.card()">
            <div class="flex items-start justify-between mb-3">
              <div>
                <p class="text-sm font-bold" [class]="th.text()">{{ contact.contact_name }}</p>
                @if (contact.contact_email) {
                  <p class="text-xs mt-0.5" [class]="th.muted()">✉️ {{ contact.contact_email }}</p>
                }
                @if (contact.contact_phone) {
                  <p class="text-xs" [class]="th.muted()">📞 {{ contact.contact_phone }}</p>
                }
              </div>
              <div class="flex items-center gap-2">
                @if (contact.last_sent_at) {
                  <span class="text-[10px] bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded-full font-medium">Sent</span>
                }
                <button (click)="openEdit(contact)" class="text-xs px-2 py-1 rounded-lg border transition-colors" [class]="th.badge()">Edit</button>
              </div>
            </div>

            <!-- Toggles -->
            <div class="space-y-2 text-xs mb-3" [class]="th.muted()">
              <div class="flex items-center justify-between">
                <span>Notify when I check in</span>
                <span class="font-semibold" [class]="contact.notify_on_checkin ? 'text-emerald-500' : th.muted()">
                  {{ contact.notify_on_checkin ? '✓ Yes' : 'No' }}
                </span>
              </div>
              <div class="flex items-center justify-between">
                <span>Share booking details</span>
                <span class="font-semibold" [class]="contact.share_booking_details ? 'text-emerald-500' : th.muted()">
                  {{ contact.share_booking_details ? '✓ Yes' : 'No' }}
                </span>
              </div>
            </div>

            <!-- Actions -->
            <div class="flex gap-2">
              <button (click)="sendNow(contact)"
                [disabled]="sending() === contact.id"
                class="flex-1 py-2 text-xs font-bold rounded-xl transition-all active:scale-95 disabled:opacity-50"
                [class]="th.primaryBtn()">
                {{ sending() === contact.id ? 'Sending…' : '📤 Send Now' }}
              </button>
              <button (click)="remove(contact.id)"
                class="px-3 py-2 text-xs rounded-xl border transition-colors" [class]="th.dangerOutline()">
                Remove
              </button>
            </div>

            @if (sendResult()[contact.id]) {
              <p class="text-xs mt-2 font-medium"
                 [class]="sendResult()[contact.id]!.ok ? 'text-emerald-500' : 'text-red-400'">
                {{ sendResult()[contact.id]!.message }}
              </p>
            }
          </div>
        }

        <!-- Add button -->
        @if (contacts().length < 3) {
          <button (click)="openAdd()"
            class="w-full rounded-2xl py-3.5 border-2 border-dashed text-sm font-semibold transition-all active:scale-95"
            [class]="th.dashedBtn()">
            + Add Contact ({{ contacts().length }}/3)
          </button>
        } @else {
          <p class="text-center text-xs py-3" [class]="th.muted()">Maximum 3 contacts added</p>
        }
      }

      <!-- Add / Edit modal -->
      @if (showForm()) {
        <div class="fixed inset-0 z-50 flex items-end justify-center p-4" style="background:rgba(0,0,0,.5)"
             (click)="closeForm()">
          <div class="w-full max-w-md rounded-3xl p-6" [class]="th.cardBg()" (click)="$event.stopPropagation()">
            <div class="w-10 h-1 rounded-full bg-gray-400/40 mx-auto mb-5"></div>
            <h3 class="text-base font-bold mb-4" [class]="th.text()">
              {{ editingContact() ? 'Edit Contact' : 'Add Trusted Contact' }}
            </h3>

            <div class="space-y-3">
              <!-- Name -->
              <div>
                <label class="block text-xs font-medium mb-1" [class]="th.muted()">Full Name *</label>
                <input [(ngModel)]="form.contact_name" placeholder="e.g. Mum, Brother, Jane"
                  class="w-full rounded-xl px-3 py-3 text-sm" [class]="th.input()">
              </div>
              <!-- Email -->
              <div>
                <label class="block text-xs font-medium mb-1" [class]="th.muted()">Email Address</label>
                <input [(ngModel)]="form.contact_email" type="email" placeholder="their@email.com"
                  class="w-full rounded-xl px-3 py-3 text-sm" [class]="th.input()">
              </div>
              <!-- Phone -->
              <div>
                <label class="block text-xs font-medium mb-1" [class]="th.muted()">Phone / WhatsApp</label>
                <input [(ngModel)]="form.contact_phone" type="tel" placeholder="+234 800 000 0000"
                  class="w-full rounded-xl px-3 py-3 text-sm" [class]="th.input()">
              </div>

              <!-- Toggles -->
              <div class="rounded-2xl border p-4 space-y-3" [class]="th.card()">
                <label class="flex items-center justify-between cursor-pointer">
                  <div>
                    <p class="text-sm font-medium" [class]="th.text()">Notify when I check in</p>
                    <p class="text-xs" [class]="th.muted()">Auto-send when hotel checks you in</p>
                  </div>
                  <button (click)="form.notify_on_checkin = !form.notify_on_checkin"
                    class="relative w-11 h-6 rounded-full transition-colors flex-shrink-0"
                    [class]="form.notify_on_checkin ? 'bg-emerald-500' : 'bg-gray-300'">
                    <span class="absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform"
                          [class]="form.notify_on_checkin ? 'translate-x-5 left-0.5' : 'left-0.5'"></span>
                  </button>
                </label>
                <label class="flex items-center justify-between cursor-pointer">
                  <div>
                    <p class="text-sm font-medium" [class]="th.text()">Share booking details</p>
                    <p class="text-xs" [class]="th.muted()">Include check-in/out dates and room</p>
                  </div>
                  <button (click)="form.share_booking_details = !form.share_booking_details"
                    class="relative w-11 h-6 rounded-full transition-colors flex-shrink-0"
                    [class]="form.share_booking_details ? 'bg-emerald-500' : 'bg-gray-300'">
                    <span class="absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform"
                          [class]="form.share_booking_details ? 'translate-x-5 left-0.5' : 'left-0.5'"></span>
                  </button>
                </label>
                <label class="flex items-center justify-between cursor-pointer">
                  <div>
                    <p class="text-sm font-medium" [class]="th.text()">Share my name</p>
                    <p class="text-xs" [class]="th.muted()">Include your full name in the message</p>
                  </div>
                  <button (click)="form.share_guest_details = !form.share_guest_details"
                    class="relative w-11 h-6 rounded-full transition-colors flex-shrink-0"
                    [class]="form.share_guest_details ? 'bg-emerald-500' : 'bg-gray-300'">
                    <span class="absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform"
                          [class]="form.share_guest_details ? 'translate-x-5 left-0.5' : 'left-0.5'"></span>
                  </button>
                </label>
              </div>
            </div>

            @if (formError()) {
              <p class="text-xs text-red-400 mt-3">{{ formError() }}</p>
            }

            <div class="flex gap-3 mt-5">
              <button (click)="closeForm()" class="flex-1 py-3 rounded-xl border text-sm" [class]="th.badge()">Cancel</button>
              <button (click)="save()" [disabled]="saving()"
                class="flex-1 py-3 rounded-xl font-bold text-sm disabled:opacity-50" [class]="th.primaryBtn()">
                {{ saving() ? 'Saving…' : (editingContact() ? 'Update' : 'Add Contact') }}
              </button>
            </div>
          </div>
        </div>
      }
    </div>
  `,
})
export default class GuestStayNotificationsPage implements OnInit {
  private guestApi = inject(GuestApiService);
  readonly th      = inject(GuestThemeService);

  contacts    = signal<any[]>([]);
  loading     = signal(true);
  showForm    = signal(false);
  saving      = signal(false);
  sending     = signal<string | null>(null);
  formError   = signal('');
  editingContact = signal<any | null>(null);
  sendResult  = signal<Record<string, { ok: boolean; message: string }>>({});

  form = {
    contact_name: '',
    contact_email: '',
    contact_phone: '',
    notify_on_checkin: true,
    share_booking_details: true,
    share_guest_details: false,
  };

  ngOnInit(): void { this.load(); }

  private load(): void {
    this.loading.set(true);
    this.guestApi.get('/guest/stay-notifications').subscribe({
      next: (r: any) => { this.contacts.set(r.data ?? []); this.loading.set(false); },
      error: () => this.loading.set(false),
    });
  }

  openAdd(): void {
    this.editingContact.set(null);
    this.form = { contact_name: '', contact_email: '', contact_phone: '',
      notify_on_checkin: true, share_booking_details: true, share_guest_details: false };
    this.formError.set('');
    this.showForm.set(true);
  }

  openEdit(c: any): void {
    this.editingContact.set(c);
    this.form = {
      contact_name: c.contact_name, contact_email: c.contact_email ?? '',
      contact_phone: c.contact_phone ?? '', notify_on_checkin: c.notify_on_checkin,
      share_booking_details: c.share_booking_details, share_guest_details: c.share_guest_details,
    };
    this.formError.set('');
    this.showForm.set(true);
  }

  closeForm(): void { this.showForm.set(false); }

  save(): void {
    if (!this.form.contact_name.trim()) { this.formError.set('Name is required'); return; }
    if (!this.form.contact_email.trim() && !this.form.contact_phone.trim()) {
      this.formError.set('Please add an email address or phone number'); return;
    }
    this.saving.set(true);
    this.formError.set('');
    const edit = this.editingContact();
    const req$ = edit
      ? this.guestApi.put(`/guest/stay-notifications/${edit.id}`, this.form)
      : this.guestApi.post('/guest/stay-notifications', this.form);

    req$.subscribe({
      next: (r: any) => {
        this.saving.set(false);
        if (r.success || r.data) { this.closeForm(); this.load(); }
        else this.formError.set(r.message ?? 'Failed to save');
      },
      error: (e: any) => { this.saving.set(false); this.formError.set(e?.error?.message ?? 'Failed to save'); },
    });
  }

  remove(id: string): void {
    this.guestApi.delete(`/guest/stay-notifications/${id}`).subscribe({
      next: () => this.load(),
      error: () => {},
    });
  }

  sendNow(contact: any): void {
    this.sending.set(contact.id);
    this.sendResult.update(r => ({ ...r, [contact.id]: null as any }));
    this.guestApi.post(`/guest/stay-notifications/${contact.id}/send`, {}).subscribe({
      next: (r: any) => {
        this.sending.set(null);
        const channels = r.data?.channels_sent ?? [];
        this.sendResult.update(prev => ({
          ...prev,
          [contact.id]: {
            ok: true,
            message: `✓ Sent via ${channels.join(', ')}`,
          },
        }));
        this.load();
      },
      error: (e: any) => {
        this.sending.set(null);
        this.sendResult.update(prev => ({
          ...prev,
          [contact.id]: { ok: false, message: e?.error?.message ?? 'Failed to send' },
        }));
      },
    });
  }
}

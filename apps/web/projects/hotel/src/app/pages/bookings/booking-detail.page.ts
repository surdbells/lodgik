import { Component, inject, OnInit, signal } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { DatePipe } from '@angular/common';
import { ApiService, PageHeaderComponent, LoadingSpinnerComponent, ToastService, ConfirmDialogService } from '@lodgik/shared';

@Component({
  selector: 'app-booking-detail',
  standalone: true,
  imports: [DatePipe, RouterLink, PageHeaderComponent, LoadingSpinnerComponent],
  template: `
    <ui-page-header [title]="booking()?.booking_ref || 'Booking'" subtitle="Booking details and timeline">
      <a routerLink="/bookings" class="px-4 py-2 text-sm border border-gray-300 rounded-lg hover:bg-gray-50">← Back</a>
    </ui-page-header>

    <ui-loading [loading]="loading()"></ui-loading>

    @if (!loading() && booking()) {
      <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <!-- Main Info -->
        <div class="lg:col-span-2 space-y-6">
          <!-- Status Banner -->
          <div class="rounded-lg p-4 flex items-center justify-between" [style.background-color]="booking()!.status_color + '15'" [style.border-left]="'4px solid ' + booking()!.status_color">
            <div>
              <span class="text-xs font-medium text-gray-500">Status</span>
              <p class="text-lg font-bold" [style.color]="booking()!.status_color">{{ booking()!.status_label }}</p>
            </div>
            <div class="text-right">
              <span class="text-xs font-medium text-gray-500">Total</span>
              <p class="text-2xl font-bold text-gray-900">₦{{ (+booking()!.total_amount).toLocaleString() }}</p>
            </div>
          </div>

          <!-- Details Grid -->
          <div class="bg-white rounded-lg border border-gray-200 p-5">
            <h3 class="text-sm font-semibold text-gray-700 mb-4">Booking Details</h3>
            <div class="grid grid-cols-2 sm:grid-cols-3 gap-4 text-sm">
              <div><span class="text-gray-400">Reference</span><p class="font-medium mt-0.5">{{ booking()!.booking_ref }}</p></div>
              <div><span class="text-gray-400">Type</span><p class="font-medium mt-0.5">{{ booking()!.booking_type_label }}</p></div>
              <div><span class="text-gray-400">Source</span><p class="font-medium mt-0.5">{{ booking()!.source || 'Direct' }}</p></div>
              <div><span class="text-gray-400">Check-in</span><p class="font-medium mt-0.5">{{ booking()!.check_in | date:'medium' }}</p></div>
              <div><span class="text-gray-400">Check-out</span><p class="font-medium mt-0.5">{{ booking()!.check_out | date:'medium' }}</p></div>
              <div><span class="text-gray-400">Duration</span><p class="font-medium mt-0.5">{{ booking()!.duration_hours ? booking()!.duration_hours + ' hrs' : booking()!.nights + ' night(s)' }}</p></div>
              <div><span class="text-gray-400">Guests</span><p class="font-medium mt-0.5">{{ booking()!.adults }} adult(s), {{ booking()!.children }} child(ren)</p></div>
              <div><span class="text-gray-400">Rate</span><p class="font-medium mt-0.5">₦{{ (+booking()!.rate_per_night).toLocaleString() }} {{ booking()!.duration_hours ? '/hr' : '/night' }}</p></div>
              @if (+booking()!.discount_amount > 0) {
                <div><span class="text-gray-400">Discount</span><p class="font-medium text-red-500 mt-0.5">-₦{{ (+booking()!.discount_amount).toLocaleString() }}</p></div>
              }
            </div>
            @if (booking()!.special_requests) {
              <div class="mt-4 pt-4 border-t border-gray-100 text-sm">
                <span class="text-gray-400">Special Requests</span>
                <p class="mt-1 text-gray-700">{{ booking()!.special_requests }}</p>
              </div>
            }
          </div>

          <!-- Addons -->
          @if (booking()!.addons?.length > 0) {
            <div class="bg-white rounded-lg border border-gray-200 p-5">
              <h3 class="text-sm font-semibold text-gray-700 mb-3">Add-ons</h3>
              <div class="space-y-2">
                @for (a of booking()!.addons; track a.id) {
                  <div class="flex justify-between text-sm py-2 border-b border-gray-50">
                    <span>{{ a.name }} <span class="text-gray-400">×{{ a.quantity }}</span></span>
                    <span class="font-medium">₦{{ (+a.line_total).toLocaleString() }}</span>
                  </div>
                }
              </div>
            </div>
          }

          <!-- Actions -->
          <div class="flex flex-wrap gap-3">
            @if (booking()!.status === 'confirmed') {
              <button (click)="doCheckIn()" class="px-5 py-2.5 bg-emerald-600 text-white text-sm font-medium rounded-lg hover:bg-emerald-700">Check In Guest</button>
              <button (click)="doCancel()" class="px-5 py-2.5 bg-red-600 text-white text-sm font-medium rounded-lg hover:bg-red-700">Cancel Booking</button>
              <button (click)="doNoShow()" class="px-5 py-2.5 bg-gray-600 text-white text-sm font-medium rounded-lg hover:bg-gray-700">Mark No-Show</button>
            }
            @if (booking()!.status === 'checked_in') {
              <button (click)="doCheckOut()" class="px-5 py-2.5 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700">Check Out Guest</button>
            }
            @if (booking()!.status === 'pending') {
              <button (click)="doCancel()" class="px-5 py-2.5 bg-red-600 text-white text-sm font-medium rounded-lg hover:bg-red-700">Cancel Booking</button>
            }
          </div>

          <!-- Folio & Invoice Links -->
          @if (booking()!.status === 'checked_in' || booking()!.status === 'checked_out') {
            <div class="flex gap-3 mt-4">
              @if (folioId()) {
                <a [routerLink]="['/folios', folioId()]" class="flex items-center gap-2 px-4 py-2 bg-purple-50 border border-purple-200 text-purple-700 text-sm font-medium rounded-lg hover:bg-purple-100">
                  📂 View Folio
                </a>
              }
              @if (invoiceId()) {
                <a [routerLink]="['/invoices', invoiceId()]" class="flex items-center gap-2 px-4 py-2 bg-blue-50 border border-blue-200 text-blue-700 text-sm font-medium rounded-lg hover:bg-blue-100">
                  📄 View Invoice
                </a>
              }
            </div>
          }
        </div>

        <!-- Timeline Sidebar -->
        <div class="bg-white rounded-lg border border-gray-200 p-5">
          <h3 class="text-sm font-semibold text-gray-700 mb-4">Timeline</h3>
          <div class="space-y-0">
            @for (log of statusHistory(); track log.id) {
              <div class="flex gap-3 pb-4 relative">
                <!-- Vertical line -->
                @if (!$last) {
                  <div class="absolute left-[7px] top-5 bottom-0 w-px bg-gray-200"></div>
                }
                <div class="w-4 h-4 rounded-full border-2 mt-0.5 shrink-0 z-10 bg-white" [style.border-color]="statusColor(log.new_status)"></div>
                <div class="min-w-0">
                  <div class="flex items-center gap-2">
                    <span class="text-sm font-medium">{{ statusLabel(log.new_status) }}</span>
                  </div>
                  <p class="text-xs text-gray-400 mt-0.5">{{ log.created_at | date:'medium' }}</p>
                  @if (log.notes) {
                    <p class="text-xs text-gray-500 mt-1">{{ log.notes }}</p>
                  }
                </div>
              </div>
            }
            @if (statusHistory().length === 0) {
              <p class="text-gray-400 text-sm">No status changes recorded</p>
            }
          </div>

          <!-- Timestamps -->
          <div class="mt-6 pt-4 border-t border-gray-100 space-y-2 text-xs text-gray-400">
            <div class="flex justify-between"><span>Created</span><span>{{ booking()!.created_at | date:'short' }}</span></div>
            @if (booking()!.checked_in_at) {
              <div class="flex justify-between"><span>Checked In</span><span>{{ booking()!.checked_in_at | date:'short' }}</span></div>
            }
            @if (booking()!.checked_out_at) {
              <div class="flex justify-between"><span>Checked Out</span><span>{{ booking()!.checked_out_at | date:'short' }}</span></div>
            }
          </div>
        </div>
      </div>
    }
  `,
})
export class BookingDetailPage implements OnInit {
  private api = inject(ApiService);
  private route = inject(ActivatedRoute);
  private toast = inject(ToastService);
  private confirm = inject(ConfirmDialogService);

  loading = signal(true);
  booking = signal<any>(null);
  statusHistory = signal<any[]>([]);
  folioId = signal<string>('');
  invoiceId = signal<string>('');

  private bookingId = '';

  ngOnInit(): void {
    this.bookingId = this.route.snapshot.paramMap.get('id') ?? '';
    if (this.bookingId) this.loadBooking();
  }

  loadBooking(): void {
    this.api.get(`/bookings/${this.bookingId}`).subscribe(r => {
      if (r.success) {
        this.booking.set(r.data);
        this.loadHistory();
        this.loadFolioAndInvoice();
      }
      this.loading.set(false);
    });
  }

  loadHistory(): void {
    this.api.get(`/bookings/${this.bookingId}/status-history`).subscribe(r => {
      if (r.success) this.statusHistory.set(r.data ?? []);
    });
  }

  loadFolioAndInvoice(): void {
    this.api.get(`/folios/by-booking/${this.bookingId}`).subscribe(r => {
      if (r.success && r.data?.folio) this.folioId.set(r.data.folio.id);
    });
    this.api.get(`/invoices/by-booking/${this.bookingId}`).subscribe(r => {
      if (r.success && r.data?.invoice) this.invoiceId.set(r.data.invoice.id);
    });
  }

  statusLabel(status: string): string {
    return { pending: 'Pending', confirmed: 'Confirmed', checked_in: 'Checked In', checked_out: 'Checked Out', cancelled: 'Cancelled', no_show: 'No Show' }[status] ?? status;
  }

  statusColor(status: string): string {
    return { pending: '#f59e0b', confirmed: '#3b82f6', checked_in: '#22c55e', checked_out: '#6b7280', cancelled: '#ef4444', no_show: '#dc2626' }[status] ?? '#6b7280';
  }

  async doCheckIn(): Promise<void> {
    const ok = await this.confirm.confirm({ title: 'Check In', message: 'Check in this guest?', variant: 'info' });
    if (ok) this.api.post(`/bookings/${this.bookingId}/check-in`).subscribe(r => {
      if (r.success) { this.toast.success('Guest checked in!'); this.loadBooking(); } else this.toast.error(r.message || 'Failed');
    });
  }

  async doCheckOut(): Promise<void> {
    const ok = await this.confirm.confirm({ title: 'Check Out', message: 'Check out this guest?', variant: 'info' });
    if (ok) this.api.post(`/bookings/${this.bookingId}/check-out`).subscribe(r => {
      if (r.success) { this.toast.success('Guest checked out!'); this.loadBooking(); } else this.toast.error(r.message || 'Failed');
    });
  }

  async doCancel(): Promise<void> {
    const ok = await this.confirm.confirm({ title: 'Cancel Booking', message: 'Cancel this booking?', variant: 'warning' });
    if (ok) this.api.post(`/bookings/${this.bookingId}/cancel`).subscribe(r => {
      if (r.success) { this.toast.success('Booking cancelled'); this.loadBooking(); } else this.toast.error(r.message || 'Failed');
    });
  }

  async doNoShow(): Promise<void> {
    const ok = await this.confirm.confirm({ title: 'No Show', message: 'Mark this booking as no-show?', variant: 'warning' });
    if (ok) this.api.post(`/bookings/${this.bookingId}/no-show`).subscribe(r => {
      if (r.success) { this.toast.success('Marked as no-show'); this.loadBooking(); } else this.toast.error(r.message || 'Failed');
    });
  }
}

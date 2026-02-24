import { Component, inject, OnInit, signal } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { DatePipe, UpperCasePipe } from '@angular/common';
import { ApiService, PageHeaderComponent, LoadingSpinnerComponent, StatsCardComponent, ToastService } from '@lodgik/shared';

@Component({
  selector: 'app-guest-profile',
  standalone: true,
  imports: [DatePipe, UpperCasePipe, RouterLink, PageHeaderComponent, LoadingSpinnerComponent, StatsCardComponent],
  template: `
    <ui-page-header [title]="guest()?.full_name || 'Guest Profile'" subtitle="Guest details and booking history">
      <a routerLink="/guests" class="px-4 py-2 text-sm border border-gray-300 rounded-lg hover:bg-gray-50">← Back</a>
    </ui-page-header>

    <ui-loading [loading]="loading()"></ui-loading>

    @if (!loading() && guest()) {
      <!-- Stats Row -->
      <div class="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
        <ui-stats-card label="Total Stays" [value]="guest()!.total_stays" icon="hotel"></ui-stats-card>
        <ui-stats-card label="Total Spent" [value]="'₦' + (+guest()!.total_spent).toLocaleString()" icon="hand-coins"></ui-stats-card>
        <ui-stats-card label="VIP Status" [value]="guest()!.vip_status.toUpperCase()" [icon]="vipIcon(guest()!.vip_status)"></ui-stats-card>
        <ui-stats-card label="Last Visit" [value]="lastVisitLabel()" icon="calendar-days"></ui-stats-card>
      </div>

      <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <!-- Profile Card -->
        <div class="bg-white rounded-xl border border-gray-100 shadow-card p-5">
          <div class="flex items-center gap-3 mb-4">
            <div class="w-12 h-12 rounded-full flex items-center justify-center text-white text-lg font-bold"
                 [style.background-color]="vipColor(guest()!.vip_status)">
              {{ guest()!.first_name[0] }}{{ guest()!.last_name[0] }}
            </div>
            <div>
              <h3 class="font-semibold text-gray-900">{{ guest()!.full_name }}</h3>
              <span class="inline-block px-2 py-0.5 rounded-full text-xs font-medium"
                    [class]="vipClass(guest()!.vip_status)">{{ guest()!.vip_status | uppercase }}</span>
            </div>
          </div>
          <div class="space-y-3 text-sm">
            @if (guest()!.email) { <div class="flex justify-between"><span class="text-gray-400">Email</span><span class="font-medium">{{ guest()!.email }}</span></div> }
            @if (guest()!.phone) { <div class="flex justify-between"><span class="text-gray-400">Phone</span><span class="font-medium">{{ guest()!.phone }}</span></div> }
            @if (guest()!.nationality) { <div class="flex justify-between"><span class="text-gray-400">Nationality</span><span class="font-medium">{{ guest()!.nationality }}</span></div> }
            @if (guest()!.gender) { <div class="flex justify-between"><span class="text-gray-400">Gender</span><span class="font-medium capitalize">{{ guest()!.gender }}</span></div> }
            @if (guest()!.date_of_birth) { <div class="flex justify-between"><span class="text-gray-400">DOB</span><span class="font-medium">{{ guest()!.date_of_birth }}</span></div> }
            @if (guest()!.id_type) { <div class="flex justify-between"><span class="text-gray-400">ID</span><span class="font-medium">{{ guest()!.id_type }}: {{ guest()!.id_number }}</span></div> }
            @if (guest()!.company_name) { <div class="flex justify-between"><span class="text-gray-400">Company</span><span class="font-medium">{{ guest()!.company_name }}</span></div> }
            @if (guest()!.address) {
              <div class="pt-2 border-t border-gray-100">
                <span class="text-gray-400">Address</span>
                <p class="font-medium mt-1">{{ guest()!.address }}<br>{{ guest()!.city }}, {{ guest()!.state }} {{ guest()!.country }}</p>
              </div>
            }
            @if (guest()!.notes) {
              <div class="pt-2 border-t border-gray-100">
                <span class="text-gray-400">Notes</span>
                <p class="mt-1 text-gray-700">{{ guest()!.notes }}</p>
              </div>
            }
          </div>
        </div>

        <!-- Booking History -->
        <div class="lg:col-span-2 bg-white rounded-xl border border-gray-100 shadow-card p-5">
          <h3 class="text-sm font-semibold text-gray-700 mb-4">Booking History</h3>
          @if (bookings().length === 0) {
            <p class="text-gray-400 text-sm py-8 text-center">No bookings yet</p>
          } @else {
            <div class="space-y-3 max-h-[500px] overflow-y-auto">
              @for (b of bookings(); track b.id) {
                <div class="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
                  <div class="flex items-center gap-3">
                    <span class="w-2 h-8 rounded-full" [style.background-color]="b.status_color"></span>
                    <div>
                      <div class="flex items-center gap-2">
                        <span class="font-medium text-sm">{{ b.booking_ref }}</span>
                        <span class="px-1.5 py-0.5 rounded text-[10px] font-medium text-white" [style.background-color]="b.status_color">{{ b.status_label }}</span>
                      </div>
                      <div class="text-xs text-gray-400 mt-0.5">
                        {{ b.booking_type_label }} · {{ b.check_in | date:'mediumDate' }} → {{ b.check_out | date:'mediumDate' }}
                      </div>
                    </div>
                  </div>
                  <div class="text-right">
                    <div class="font-semibold text-sm">₦{{ (+b.total_amount).toLocaleString() }}</div>
                    <div class="text-xs text-gray-400">{{ b.nights }} night{{ b.nights > 1 ? 's' : '' }}</div>
                  </div>
                </div>
              }
            </div>
          }
        </div>
      </div>
    }
  `,
})
export class GuestProfilePage implements OnInit {
  private api = inject(ApiService);
  private route = inject(ActivatedRoute);

  loading = signal(true);
  guest = signal<any>(null);
  bookings = signal<any[]>([]);

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('id');
    if (id) this.loadGuest(id);
  }

  loadGuest(id: string): void {
    this.api.get(`/guests/${id}`).subscribe(r => {
      if (r.success) {
        this.guest.set(r.data);
        this.loadBookings(id);
      }
      this.loading.set(false);
    });
  }

  loadBookings(guestId: string): void {
    this.api.get('/bookings', { guest_id: guestId, limit: 50 }).subscribe(r => {
      if (r.success) this.bookings.set(r.data ?? []);
    });
  }

  lastVisitLabel(): string {
    const d = this.guest()?.last_visit_at;
    if (!d) return 'Never';
    return new Date(d).toLocaleDateString('en-NG', { year: 'numeric', month: 'short', day: 'numeric' });
  }

  vipIcon(status: string): string {
    return { regular: '👤', silver: '🥈', gold: '🥇', platinum: '💎', vvip: '👑' }[status] ?? '👤';
  }

  vipColor(status: string): string {
    return { regular: '#6b7280', silver: '#9ca3af', gold: '#f59e0b', platinum: '#8b5cf6', vvip: '#dc2626' }[status] ?? '#6b7280';
  }

  vipClass(status: string): string {
    return { regular: 'bg-gray-100 text-gray-600', silver: 'bg-gray-200 text-gray-700', gold: 'bg-yellow-100 text-yellow-700', platinum: 'bg-purple-100 text-purple-700', vvip: 'bg-red-100 text-red-700' }[status] ?? 'bg-gray-100 text-gray-600';
  }
}

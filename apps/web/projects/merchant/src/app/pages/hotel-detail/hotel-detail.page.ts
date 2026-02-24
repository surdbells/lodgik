import { Component, inject, signal, OnInit } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { DatePipe } from '@angular/common';
import { PageHeaderComponent, LoadingSpinnerComponent, StatsCardComponent, BadgeComponent } from '@lodgik/shared';
import { MerchantApiService } from '../../services/merchant-api.service';

@Component({
  selector: 'app-hotel-detail',
  standalone: true,
  imports: [RouterLink, DatePipe, PageHeaderComponent, LoadingSpinnerComponent, StatsCardComponent, BadgeComponent],
  template: `
    <ui-page-header [title]="hotel().hotel_name || 'Hotel'" subtitle="Hotel details & commission history">
      <a routerLink="/hotels" class="px-3 py-2 bg-gray-100 text-gray-700 text-sm rounded-lg">← Back</a>
    </ui-page-header>
    <ui-loading [loading]="loading()"></ui-loading>
    @if (!loading()) {
      <div class="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <ui-stats-card label="Status" [value]="hotel().onboarding_status" icon="clipboard-list"></ui-stats-card>
        <ui-stats-card label="Rooms" [value]="hotel().rooms_count" icon="bed-double"></ui-stats-card>
        <ui-stats-card label="Category" [value]="hotel().hotel_category" icon="star"></ui-stats-card>
        <ui-stats-card label="Contact" [value]="hotel().contact_person || '—'" icon="user-round"></ui-stats-card>
      </div>
      <div class="bg-white rounded-xl border border-gray-100 shadow-card p-5 mb-6">
        <h3 class="text-sm font-semibold mb-3">Details</h3>
        <div class="grid grid-cols-2 gap-3 text-sm">
          <div><span class="text-gray-500">Location:</span> {{ hotel().location || '—' }}</div>
          <div><span class="text-gray-500">Email:</span> {{ hotel().contact_email || '—' }}</div>
          <div><span class="text-gray-500">Phone:</span> {{ hotel().contact_phone || '—' }}</div>
          <div><span class="text-gray-500">Bound:</span> {{ hotel().bound_at | date:'mediumDate' }}</div>
        </div>
      </div>
      <div class="bg-white rounded-xl border border-gray-100 shadow-card overflow-hidden">
        <div class="px-5 py-3 border-b border-gray-100"><h3 class="text-sm font-semibold">Commission History</h3></div>
        <table class="w-full text-sm">
          <thead class="bg-gray-50 text-xs text-gray-500 uppercase"><tr><th class="px-4 py-2 text-left">Date</th><th class="px-4 py-2 text-left">Scope</th><th class="px-4 py-2 text-right">Amount</th><th class="px-4 py-2 text-left">Status</th></tr></thead>
          <tbody class="divide-y divide-gray-100">
            @for (c of hotel().commissions || []; track c.id) {
              <tr><td class="px-4 py-2">{{ c.created_at | date:'shortDate' }}</td><td class="px-4 py-2 capitalize">{{ c.scope }}</td><td class="px-4 py-2 text-right font-medium">₦{{ (+c.commission_amount).toLocaleString() }}</td><td class="px-4 py-2"><ui-badge [variant]="c.status === 'paid' ? 'success' : c.status === 'reversed' ? 'danger' : 'warning'">{{ c.status }}</ui-badge></td></tr>
            } @empty { <tr><td colspan="4" class="px-4 py-6 text-center text-gray-400">No commissions yet</td></tr> }
          </tbody>
        </table>
      </div>
    }
  `,
})
export class HotelDetailPage implements OnInit {
  private api = inject(MerchantApiService);
  private route = inject(ActivatedRoute);
  loading = signal(true); hotel = signal<any>({});

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('id')!;
    this.api.hotelDetail(id).subscribe({ next: (h: any) => { this.hotel.set(h); this.loading.set(false); }, error: () => this.loading.set(false) });
  }
}

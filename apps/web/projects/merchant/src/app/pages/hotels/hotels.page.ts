import { Component, inject, signal, OnInit } from '@angular/core';
import { RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { PageHeaderComponent, LoadingSpinnerComponent, BadgeComponent, ToastService } from '@lodgik/shared';
import { MerchantApiService } from '../../services/merchant-api.service';

@Component({
  selector: 'app-hotels',
  standalone: true,
  imports: [RouterLink, FormsModule, PageHeaderComponent, LoadingSpinnerComponent, BadgeComponent],
  template: `
    <ui-page-header title="Hotels" subtitle="Manage your registered hotels">
      <button (click)="showForm.set(true)" class="px-4 py-2 bg-sage-600 text-white text-sm rounded-lg hover:bg-sage-700">+ Register Hotel</button>
    </ui-page-header>
    <ui-loading [loading]="loading()"></ui-loading>

    @if (showForm()) {
      <div class="bg-white rounded-xl border border-gray-100 shadow-card p-5 mb-6">
        <h3 class="text-sm font-semibold mb-4">Register New Hotel</h3>
        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div><label class="block text-xs font-medium text-gray-600 mb-1">Hotel Name *</label><input [(ngModel)]="form.hotel_name" class="w-full px-3 py-2 border rounded-lg text-sm"></div>
          <div><label class="block text-xs font-medium text-gray-600 mb-1">Location</label><input [(ngModel)]="form.location" class="w-full px-3 py-2 border rounded-lg text-sm"></div>
          <div><label class="block text-xs font-medium text-gray-600 mb-1">Contact Person</label><input [(ngModel)]="form.contact_person" class="w-full px-3 py-2 border rounded-lg text-sm"></div>
          <div><label class="block text-xs font-medium text-gray-600 mb-1">Contact Phone</label><input [(ngModel)]="form.contact_phone" class="w-full px-3 py-2 border rounded-lg text-sm"></div>
          <div><label class="block text-xs font-medium text-gray-600 mb-1">Contact Email</label><input [(ngModel)]="form.contact_email" class="w-full px-3 py-2 border rounded-lg text-sm"></div>
          <div><label class="block text-xs font-medium text-gray-600 mb-1">Rooms</label><input [(ngModel)]="form.rooms_count" type="number" class="w-full px-3 py-2 border rounded-lg text-sm"></div>
          <div><label class="block text-xs font-medium text-gray-600 mb-1">Category</label>
            <select [(ngModel)]="form.hotel_category" class="w-full px-3 py-2 border rounded-lg text-sm">
              <option value="budget">Budget</option><option value="boutique">Boutique</option><option value="luxury">Luxury</option>
            </select>
          </div>
        </div>
        <div class="flex gap-2 mt-4">
          <button (click)="register()" class="px-4 py-2 bg-sage-600 text-white text-sm rounded-lg hover:bg-sage-700">Register</button>
          <button (click)="showForm.set(false)" class="px-4 py-2 bg-gray-100 text-gray-700 text-sm rounded-lg">Cancel</button>
        </div>
      </div>
    }

    @if (!loading()) {
      <div class="bg-white rounded-xl border border-gray-100 shadow-card overflow-hidden">
        <table class="w-full text-sm">
          <thead class="bg-gray-50 text-left text-xs font-medium text-gray-500 uppercase">
            <tr><th class="px-4 py-3">Hotel</th><th class="px-4 py-3">Location</th><th class="px-4 py-3">Rooms</th><th class="px-4 py-3">Category</th><th class="px-4 py-3">Status</th><th class="px-4 py-3"></th></tr>
          </thead>
          <tbody class="divide-y divide-gray-100">
            @for (h of hotels(); track h.id) {
              <tr class="hover:bg-gray-50">
                <td class="px-4 py-3 font-medium">{{ h.hotel_name }}</td>
                <td class="px-4 py-3 text-gray-600">{{ h.location || '—' }}</td>
                <td class="px-4 py-3">{{ h.rooms_count }}</td>
                <td class="px-4 py-3 capitalize">{{ h.hotel_category }}</td>
                <td class="px-4 py-3"><ui-badge [variant]="h.onboarding_status === 'active' ? 'success' : h.onboarding_status === 'pending' ? 'warning' : 'neutral'">{{ h.onboarding_status }}</ui-badge></td>
                <td class="px-4 py-3"><a [routerLink]="['/hotels', h.id]" class="text-emerald-600 hover:underline text-xs">View</a></td>
              </tr>
            } @empty { <tr><td colspan="6" class="px-4 py-8 text-center text-gray-400">No hotels registered yet</td></tr> }
          </tbody>
        </table>
      </div>
    }
  `,
})
export class HotelsPage implements OnInit {
  private api = inject(MerchantApiService);
  private toast = inject(ToastService);
  loading = signal(true); showForm = signal(false);
  hotels = signal<any[]>([]);
  form: any = { hotel_name: '', location: '', contact_person: '', contact_phone: '', contact_email: '', rooms_count: 0, hotel_category: 'budget' };

  ngOnInit(): void { this.load(); }
  load(): void { this.api.listHotels().subscribe({ next: (h: any[]) => { this.hotels.set(h || []); this.loading.set(false); }, error: () => this.loading.set(false) }); }
  register(): void {
    this.api.registerHotel(this.form).subscribe({ next: () => {
      this.toast.success('Hotel registered successfully'); this.showForm.set(false);
      this.form = { hotel_name: '', location: '', contact_person: '', contact_phone: '', contact_email: '', rooms_count: 0, hotel_category: 'budget' };
      this.load();
    }, error: (e: any) => this.toast.error(e?.error?.error || 'Failed to register hotel') });
  }
}

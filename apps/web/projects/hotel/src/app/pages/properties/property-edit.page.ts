import { Component, inject, OnInit, signal } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { ApiService, PageHeaderComponent, LoadingSpinnerComponent, ToastService } from '@lodgik/shared';

@Component({
  selector: 'app-property-edit',
  standalone: true,
  imports: [FormsModule, RouterLink, PageHeaderComponent, LoadingSpinnerComponent],
  template: `
    <ui-page-header [title]="form.name || 'Edit Property'" subtitle="Update property details">
      <a routerLink="/properties" class="px-4 py-2 text-sm border border-gray-300 rounded-lg hover:bg-gray-50">← Back</a>
    </ui-page-header>

    <ui-loading [loading]="loading()"></ui-loading>

    @if (!loading()) {
      <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <!-- Basic Info -->
        <div class="bg-white rounded-lg border border-gray-200 p-5">
          <h3 class="text-sm font-semibold text-gray-700 mb-4">Basic Information</h3>
          <div class="space-y-3">
            <div>
              <label class="block text-xs font-medium text-gray-500 mb-1">Property Name *</label>
              <input [(ngModel)]="form.name" class="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm">
            </div>
            <div>
              <label class="block text-xs font-medium text-gray-500 mb-1">Email</label>
              <input [(ngModel)]="form.email" type="email" class="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm">
            </div>
            <div>
              <label class="block text-xs font-medium text-gray-500 mb-1">Phone</label>
              <input [(ngModel)]="form.phone" class="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm">
            </div>
            <div>
              <label class="block text-xs font-medium text-gray-500 mb-1">Star Rating</label>
              <select [(ngModel)]="form.star_rating" class="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm">
                <option [ngValue]="null">Not Rated</option>
                <option [ngValue]="1">★</option><option [ngValue]="2">★★</option><option [ngValue]="3">★★★</option>
                <option [ngValue]="4">★★★★</option><option [ngValue]="5">★★★★★</option>
              </select>
            </div>
          </div>
        </div>

        <!-- Address -->
        <div class="bg-white rounded-lg border border-gray-200 p-5">
          <h3 class="text-sm font-semibold text-gray-700 mb-4">Address</h3>
          <div class="space-y-3">
            <div>
              <label class="block text-xs font-medium text-gray-500 mb-1">Address</label>
              <input [(ngModel)]="form.address" class="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm">
            </div>
            <div class="grid grid-cols-2 gap-3">
              <div>
                <label class="block text-xs font-medium text-gray-500 mb-1">City</label>
                <input [(ngModel)]="form.city" class="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm">
              </div>
              <div>
                <label class="block text-xs font-medium text-gray-500 mb-1">State</label>
                <input [(ngModel)]="form.state" class="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm">
              </div>
            </div>
            <div>
              <label class="block text-xs font-medium text-gray-500 mb-1">Country</label>
              <input [(ngModel)]="form.country" class="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm" value="NG">
            </div>
          </div>
        </div>

        <!-- Operations -->
        <div class="bg-white rounded-lg border border-gray-200 p-5">
          <h3 class="text-sm font-semibold text-gray-700 mb-4">Operations</h3>
          <div class="space-y-3">
            <div class="grid grid-cols-2 gap-3">
              <div>
                <label class="block text-xs font-medium text-gray-500 mb-1">Check-in Time</label>
                <input [(ngModel)]="form.check_in_time" type="time" class="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm">
              </div>
              <div>
                <label class="block text-xs font-medium text-gray-500 mb-1">Check-out Time</label>
                <input [(ngModel)]="form.check_out_time" type="time" class="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm">
              </div>
            </div>
            <div class="flex items-center gap-2 mt-2">
              <input [(ngModel)]="form.is_active" type="checkbox" id="active" class="rounded">
              <label for="active" class="text-sm text-gray-700">Property is active</label>
            </div>
          </div>
        </div>

        <!-- Bank Accounts -->
        <div class="bg-white rounded-lg border border-gray-200 p-5">
          <h3 class="text-sm font-semibold text-gray-700 mb-4">Bank Accounts</h3>
          @if (bankAccounts().length > 0) {
            <div class="space-y-2">
              @for (ba of bankAccounts(); track ba.id) {
                <div class="flex items-center justify-between p-3 bg-gray-50 rounded-lg text-sm">
                  <div>
                    <p class="font-medium">{{ ba.bank_name }}</p>
                    <p class="text-xs text-gray-400">{{ ba.account_number }} · {{ ba.account_name }}</p>
                  </div>
                  @if (ba.is_primary) {
                    <span class="px-2 py-0.5 bg-blue-100 text-blue-700 text-xs rounded-full">Primary</span>
                  }
                </div>
              }
            </div>
          } @else {
            <p class="text-gray-400 text-sm py-4 text-center">No bank accounts configured</p>
          }
        </div>
      </div>

      <!-- Save -->
      <div class="mt-6 flex gap-3">
        <button (click)="save()" class="px-6 py-2.5 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700">Save Changes</button>
        <a routerLink="/properties" class="px-6 py-2.5 text-sm text-gray-500 border border-gray-300 rounded-lg hover:bg-gray-50">Cancel</a>
      </div>
    }
  `,
})
export class PropertyEditPage implements OnInit {
  private api = inject(ApiService);
  private route = inject(ActivatedRoute);
  private toast = inject(ToastService);

  loading = signal(true);
  bankAccounts = signal<any[]>([]);
  private propertyId = '';

  form: any = { name: '', email: '', phone: '', address: '', city: '', state: '', country: 'NG', star_rating: null, check_in_time: '14:00', check_out_time: '12:00', is_active: true };

  ngOnInit(): void {
    this.propertyId = this.route.snapshot.paramMap.get('id') ?? '';
    if (this.propertyId) this.loadProperty();
  }

  loadProperty(): void {
    this.api.get(`/properties/${this.propertyId}`).subscribe(r => {
      if (r.success) {
        const d = r.data as any;
        this.form = { name: d.name, email: d.email || '', phone: d.phone || '', address: d.address || '', city: d.city || '', state: d.state || '', country: d.country || 'NG', star_rating: d.star_rating, check_in_time: d.check_in_time || '14:00', check_out_time: d.check_out_time || '12:00', is_active: d.is_active };
        this.loadBankAccounts();
      }
      this.loading.set(false);
    });
  }

  loadBankAccounts(): void {
    this.api.get(`/properties/${this.propertyId}/bank-accounts`).subscribe(r => {
      if (r.success) this.bankAccounts.set(r.data ?? []);
    });
  }

  save(): void {
    if (!this.form.name) { this.toast.error('Name is required'); return; }
    const body = { ...this.form };
    Object.keys(body).forEach(k => { if (body[k] === '') body[k] = null; });
    this.api.put(`/properties/${this.propertyId}`, body).subscribe(r => {
      if (r.success) this.toast.success('Property updated');
      else this.toast.error(r.message || 'Failed');
    });
  }
}

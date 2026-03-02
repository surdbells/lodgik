import { Component, inject, signal, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { DatePipe } from '@angular/common';
import { PageHeaderComponent, LoadingSpinnerComponent, BadgeComponent, ToastService } from '@lodgik/shared';
import { MerchantApiService } from '../../services/merchant-api.service';

@Component({
  selector: 'app-leads',
  standalone: true,
  imports: [FormsModule, DatePipe, PageHeaderComponent, LoadingSpinnerComponent, BadgeComponent],
  template: `
    <ui-page-header title="Leads" icon="users" [breadcrumbs]="['Business', 'Leads']" subtitle="Manage your hotel lead pipeline">
      <button (click)="openForm()" class="px-4 py-2 bg-sage-600 text-white text-sm font-medium rounded-lg hover:bg-sage-700">+ New Lead</button>
    </ui-page-header>
    <ui-loading [loading]="loading()"></ui-loading>

    @if (showForm()) {
      <div class="bg-white rounded-xl border border-gray-100 shadow-card p-5 mb-6">
        <h3 class="text-sm font-semibold mb-1">New Lead</h3>
        <p class="text-xs text-gray-400 mb-4">Fields marked <span class="text-red-400">*</span> are required</p>

        @if (formError()) {
          <div class="bg-red-50 border border-red-100 text-red-700 text-xs p-3 rounded-lg mb-4">{{ formError() }}</div>
        }

        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label class="block text-xs font-medium text-gray-700 mb-1">Hotel Name <span class="text-red-400">*</span></label>
            <input [(ngModel)]="form.hotel_name"
              class="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-sage-200 focus:border-sage-400 outline-none bg-gray-50 focus:bg-white"
              placeholder="e.g. Grand Lagos Hotel">
          </div>
          <div>
            <label class="block text-xs font-medium text-gray-700 mb-1">Contact Name</label>
            <input [(ngModel)]="form.contact_name"
              class="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-sage-200 focus:border-sage-400 outline-none bg-gray-50 focus:bg-white"
              placeholder="Decision maker name">
          </div>
          <div>
            <label class="block text-xs font-medium text-gray-700 mb-1">Phone <span class="text-red-400">*</span></label>
            <input [(ngModel)]="form.contact_phone" type="tel"
              class="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-sage-200 focus:border-sage-400 outline-none bg-gray-50 focus:bg-white"
              placeholder="+234...">
          </div>
          <div>
            <label class="block text-xs font-medium text-gray-700 mb-1">Email</label>
            <input [(ngModel)]="form.contact_email" type="email"
              class="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-sage-200 focus:border-sage-400 outline-none bg-gray-50 focus:bg-white"
              placeholder="contact@hotel.com">
          </div>
          <div>
            <label class="block text-xs font-medium text-gray-700 mb-1">Location <span class="text-red-400">*</span></label>
            <input [(ngModel)]="form.location"
              class="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-sage-200 focus:border-sage-400 outline-none bg-gray-50 focus:bg-white"
              placeholder="e.g. Victoria Island, Lagos">
          </div>
          <div>
            <label class="block text-xs font-medium text-gray-700 mb-1">Estimated Rooms</label>
            <input [(ngModel)]="form.rooms_estimate" type="number" min="0"
              class="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-sage-200 focus:border-sage-400 outline-none bg-gray-50 focus:bg-white"
              placeholder="0">
          </div>
          <div class="md:col-span-2">
            <label class="block text-xs font-medium text-gray-700 mb-1">Notes</label>
            <textarea [(ngModel)]="form.notes" rows="2"
              class="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-sage-200 focus:border-sage-400 outline-none bg-gray-50 focus:bg-white resize-none"
              placeholder="Additional context about this lead..."></textarea>
          </div>
        </div>
        <div class="flex gap-2 mt-5">
          <button (click)="create()" [disabled]="creating()"
            class="px-5 py-2 bg-sage-600 text-white text-sm font-medium rounded-lg hover:bg-sage-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors">
            {{ creating() ? 'Creating...' : 'Create Lead' }}
          </button>
          <button (click)="cancelForm()"
            class="px-4 py-2 bg-gray-100 text-gray-700 text-sm rounded-lg hover:bg-gray-200 transition-colors">
            Cancel
          </button>
        </div>
      </div>
    }

    @if (!loading()) {
      <div class="flex gap-2 mb-4 flex-wrap">
        @for (f of statusFilters; track f.value) {
          <button (click)="filterStatus.set(f.value); load()"
            class="px-3 py-1.5 text-xs rounded-full border transition-colors"
            [class]="filterStatus() === f.value ? 'bg-sage-100 text-sage-700 border-sage-300' : 'hover:bg-gray-50 border-gray-200 text-gray-600'">
            {{ f.label }}
          </button>
        }
      </div>

      <div class="bg-white rounded-xl border border-gray-100 shadow-card overflow-hidden">
        <table class="w-full text-sm">
          <thead class="bg-gray-50 text-xs text-gray-500 uppercase tracking-wide">
            <tr>
              <th class="px-4 py-3 text-left">Hotel</th>
              <th class="px-4 py-3 text-left">Contact</th>
              <th class="px-4 py-3 text-left">Location</th>
              <th class="px-4 py-3 text-center">Rooms</th>
              <th class="px-4 py-3 text-center">Status</th>
              <th class="px-4 py-3 text-left">Created</th>
              <th class="px-4 py-3"></th>
            </tr>
          </thead>
          <tbody class="divide-y divide-gray-100">
            @for (l of leads(); track l.id) {
              <tr class="hover:bg-gray-50 transition-colors">
                <td class="px-4 py-3 font-medium text-gray-900">{{ l.hotel_name }}</td>
                <td class="px-4 py-3 text-gray-600">
                  <div>{{ l.contact_name || '—' }}</div>
                  @if (l.contact_email) { <div class="text-xs text-gray-400">{{ l.contact_email }}</div> }
                </td>
                <td class="px-4 py-3 text-gray-600">{{ l.location || '—' }}</td>
                <td class="px-4 py-3 text-center text-gray-600">{{ l.rooms_estimate || '—' }}</td>
                <td class="px-4 py-3 text-center">
                  <ui-badge [variant]="l.status === 'converted' ? 'success' : l.status === 'lost' ? 'danger' : 'warning'">{{ l.status }}</ui-badge>
                </td>
                <td class="px-4 py-3 text-gray-400 text-xs">{{ l.created_at | date:'shortDate' }}</td>
                <td class="px-4 py-3">
                  @if (l.status !== 'converted' && l.status !== 'lost') {
                    <button (click)="convertLead(l)"
                      class="text-emerald-600 hover:text-emerald-800 text-xs font-medium hover:underline">
                      Convert →
                    </button>
                  }
                </td>
              </tr>
            } @empty {
              <tr><td colspan="7" class="px-4 py-12 text-center text-gray-400">No leads yet. Create your first lead to start tracking hotel prospects.</td></tr>
            }
          </tbody>
        </table>
      </div>
    }
  `,
})
export class LeadsPage implements OnInit {
  private api   = inject(MerchantApiService);
  private toast = inject(ToastService);

  loading      = signal(true);
  showForm     = signal(false);
  creating     = signal(false);
  leads        = signal<any[]>([]);
  filterStatus = signal('');
  formError    = signal('');

  form: any = {
    hotel_name: '', contact_name: '', contact_phone: '',
    contact_email: '', location: '', rooms_estimate: 0, notes: '',
  };

  statusFilters = [
    { label: 'All', value: '' },
    { label: 'Lead', value: 'lead' },
    { label: 'Contacted', value: 'contacted' },
    { label: 'Demo', value: 'demo' },
    { label: 'Converted', value: 'converted' },
    { label: 'Lost', value: 'lost' },
  ];

  ngOnInit(): void { this.load(); }

  load(): void {
    this.api.listLeads(this.filterStatus() || undefined).subscribe({
      next: (l: any[]) => { this.leads.set(l || []); this.loading.set(false); },
      error: () => this.loading.set(false),
    });
  }

  openForm(): void {
    this.formError.set('');
    this.form = { hotel_name: '', contact_name: '', contact_phone: '', contact_email: '', location: '', rooms_estimate: 0, notes: '' };
    this.showForm.set(true);
  }

  cancelForm(): void { this.showForm.set(false); this.formError.set(''); }

  create(): void {
    this.formError.set('');

    if (!this.form.hotel_name?.trim()) {
      this.formError.set('Hotel name is required.'); return;
    }
    if (!this.form.contact_phone?.trim()) {
      this.formError.set('Contact phone is required.'); return;
    }
    if (!this.form.location?.trim()) {
      this.formError.set('Location is required.'); return;
    }
    if (this.form.contact_email?.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(this.form.contact_email.trim())) {
      this.formError.set('Contact email is not a valid email address.'); return;
    }

    this.creating.set(true);
    this.api.createLead(this.form).subscribe({
      next: () => {
        this.toast.success('Lead created successfully.');
        this.creating.set(false);
        this.showForm.set(false);
        this.form = { hotel_name: '', contact_name: '', contact_phone: '', contact_email: '', location: '', rooms_estimate: 0, notes: '' };
        this.load();
      },
      error: (e: any) => {
        this.creating.set(false);
        this.formError.set(e?.error?.message || 'Failed to create lead.');
      },
    });
  }

  convertLead(l: any): void {
    this.api.convertLead(l.id, {}).subscribe({
      next: () => { this.toast.success('Lead converted to hotel!'); this.load(); },
      error: (e: any) => this.toast.error(e?.error?.error || 'Conversion failed'),
    });
  }
}

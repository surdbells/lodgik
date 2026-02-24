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
    <ui-page-header title="Leads" icon="users" [breadcrumbs]="['Business', 'Leads']" subtitle="Manage your lead pipeline">
      <button (click)="showForm.set(true)" class="px-4 py-2 bg-sage-600 text-white text-sm rounded-lg hover:bg-sage-700">+ New Lead</button>
    </ui-page-header>
    <ui-loading [loading]="loading()"></ui-loading>

    @if (showForm()) {
      <div class="bg-white rounded-xl border border-gray-100 shadow-card p-5 mb-6">
        <h3 class="text-sm font-semibold mb-4">New Lead</h3>
        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div><label class="block text-xs font-medium text-gray-600 mb-1">Hotel Name *</label><input [(ngModel)]="form.hotel_name" class="w-full px-3 py-2 border rounded-lg text-sm"></div>
          <div><label class="block text-xs font-medium text-gray-600 mb-1">Contact Name</label><input [(ngModel)]="form.contact_name" class="w-full px-3 py-2 border rounded-lg text-sm"></div>
          <div><label class="block text-xs font-medium text-gray-600 mb-1">Phone</label><input [(ngModel)]="form.contact_phone" class="w-full px-3 py-2 border rounded-lg text-sm"></div>
          <div><label class="block text-xs font-medium text-gray-600 mb-1">Email</label><input [(ngModel)]="form.contact_email" class="w-full px-3 py-2 border rounded-lg text-sm"></div>
          <div><label class="block text-xs font-medium text-gray-600 mb-1">Location</label><input [(ngModel)]="form.location" class="w-full px-3 py-2 border rounded-lg text-sm"></div>
          <div><label class="block text-xs font-medium text-gray-600 mb-1">Est. Rooms</label><input [(ngModel)]="form.rooms_estimate" type="number" class="w-full px-3 py-2 border rounded-lg text-sm"></div>
          <div class="md:col-span-2"><label class="block text-xs font-medium text-gray-600 mb-1">Notes</label><textarea [(ngModel)]="form.notes" rows="2" class="w-full px-3 py-2 border rounded-lg text-sm"></textarea></div>
        </div>
        <div class="flex gap-2 mt-4">
          <button (click)="create()" class="px-4 py-2 bg-sage-600 text-white text-sm rounded-lg hover:bg-sage-700">Create Lead</button>
          <button (click)="showForm.set(false)" class="px-4 py-2 bg-gray-100 text-gray-700 text-sm rounded-lg">Cancel</button>
        </div>
      </div>
    }

    @if (!loading()) {
      <div class="flex gap-2 mb-4">
        @for (f of statusFilters; track f) {
          <button (click)="filterStatus.set(f.value); load()" [class.bg-emerald-100]="filterStatus() === f.value" [class.text-emerald-700]="filterStatus() === f.value" class="px-3 py-1 text-xs rounded-full border hover:bg-gray-50">{{ f.label }}</button>
        }
      </div>
      <div class="bg-white rounded-xl border border-gray-100 shadow-card overflow-hidden">
        <table class="w-full text-sm">
          <thead class="bg-gray-50 text-xs text-gray-500 uppercase"><tr><th class="px-4 py-2 text-left">Hotel</th><th class="px-4 py-2 text-left">Contact</th><th class="px-4 py-2 text-left">Location</th><th class="px-4 py-2">Rooms</th><th class="px-4 py-2">Status</th><th class="px-4 py-2 text-left">Created</th><th class="px-4 py-2"></th></tr></thead>
          <tbody class="divide-y divide-gray-100">
            @for (l of leads(); track l.id) {
              <tr class="hover:bg-gray-50">
                <td class="px-4 py-2 font-medium">{{ l.hotel_name }}</td>
                <td class="px-4 py-2 text-gray-600">{{ l.contact_name || '—' }}</td>
                <td class="px-4 py-2 text-gray-600">{{ l.location || '—' }}</td>
                <td class="px-4 py-2 text-center">{{ l.rooms_estimate }}</td>
                <td class="px-4 py-2 text-center"><ui-badge [variant]="l.status === 'converted' ? 'success' : l.status === 'lost' ? 'danger' : 'warning'">{{ l.status }}</ui-badge></td>
                <td class="px-4 py-2">{{ l.created_at | date:'shortDate' }}</td>
                <td class="px-4 py-2">
                  @if (l.status !== 'converted' && l.status !== 'lost') {
                    <button (click)="convertLead(l)" class="text-emerald-600 hover:underline text-xs mr-2">Convert</button>
                  }
                </td>
              </tr>
            } @empty { <tr><td colspan="7" class="px-4 py-8 text-center text-gray-400">No leads yet</td></tr> }
          </tbody>
        </table>
      </div>
    }
  `,
})
export class LeadsPage implements OnInit {
  private api = inject(MerchantApiService);
  private toast = inject(ToastService);
  loading = signal(true); showForm = signal(false);
  leads = signal<any[]>([]); filterStatus = signal('');
  form: any = { hotel_name: '', contact_name: '', contact_phone: '', contact_email: '', location: '', rooms_estimate: 0, notes: '' };
  statusFilters = [{ label: 'All', value: '' }, { label: 'Lead', value: 'lead' }, { label: 'Contacted', value: 'contacted' }, { label: 'Demo', value: 'demo' }, { label: 'Converted', value: 'converted' }];

  ngOnInit(): void { this.load(); }
  load(): void { this.api.listLeads(this.filterStatus() || undefined).subscribe({ next: (l: any[]) => { this.leads.set(l || []); this.loading.set(false); }, error: () => this.loading.set(false) }); }
  create(): void {
    this.api.createLead(this.form).subscribe({ next: () => {
      this.toast.success('Lead created'); this.showForm.set(false);
      this.form = { hotel_name: '', contact_name: '', contact_phone: '', contact_email: '', location: '', rooms_estimate: 0, notes: '' };
      this.load();
    } });
  }
  convertLead(l: any): void {
    this.api.convertLead(l.id, {}).subscribe({ next: () => { this.toast.success('Lead converted to hotel!'); this.load(); },
      error: (e: any) => this.toast.error(e?.error?.error || 'Conversion failed') });
  }
}

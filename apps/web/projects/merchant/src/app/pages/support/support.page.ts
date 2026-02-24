import { Component, inject, signal, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { DatePipe } from '@angular/common';
import { PageHeaderComponent, LoadingSpinnerComponent, BadgeComponent, ToastService } from '@lodgik/shared';
import { MerchantApiService } from '../../services/merchant-api.service';

@Component({
  selector: 'app-support',
  standalone: true,
  imports: [FormsModule, DatePipe, PageHeaderComponent, LoadingSpinnerComponent, BadgeComponent],
  template: `
    <ui-page-header title="Support" icon="message-circle" [breadcrumbs]="['Support']" subtitle="Get help with your merchant account">
      <button (click)="showForm.set(true)" class="px-4 py-2 bg-sage-600 text-white text-sm rounded-lg hover:bg-sage-700">+ New Ticket</button>
    </ui-page-header>
    <ui-loading [loading]="loading()"></ui-loading>

    @if (showForm()) {
      <div class="bg-white rounded-xl border border-gray-100 shadow-card p-5 mb-6">
        <h3 class="text-sm font-semibold mb-4">Create Support Ticket</h3>
        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div><label class="block text-xs font-medium text-gray-600 mb-1">Subject *</label><input [(ngModel)]="form.subject" class="w-full px-3 py-2 border rounded-lg text-sm"></div>
          <div><label class="block text-xs font-medium text-gray-600 mb-1">Category</label>
            <select [(ngModel)]="form.priority_tag" class="w-full px-3 py-2 border rounded-lg text-sm">
              <option value="sales">Sales</option><option value="finance">Finance</option><option value="technical">Technical</option><option value="onboarding">Onboarding</option>
            </select>
          </div>
          <div class="md:col-span-2"><label class="block text-xs font-medium text-gray-600 mb-1">Description *</label><textarea [(ngModel)]="form.description" rows="3" class="w-full px-3 py-2 border rounded-lg text-sm"></textarea></div>
        </div>
        <div class="flex gap-2 mt-4">
          <button (click)="create()" class="px-4 py-2 bg-sage-600 text-white text-sm rounded-lg hover:bg-sage-700">Submit</button>
          <button (click)="showForm.set(false)" class="px-4 py-2 bg-gray-100 text-gray-700 text-sm rounded-lg">Cancel</button>
        </div>
      </div>
    }

    @if (!loading()) {
      <div class="bg-white rounded-xl border border-gray-100 shadow-card overflow-hidden">
        <table class="w-full text-sm">
          <thead class="bg-gray-50 text-xs text-gray-500 uppercase"><tr><th class="px-4 py-2 text-left">Subject</th><th class="px-4 py-2">Category</th><th class="px-4 py-2">Status</th><th class="px-4 py-2 text-left">SLA Due</th><th class="px-4 py-2 text-left">Created</th></tr></thead>
          <tbody class="divide-y divide-gray-100">
            @for (t of tickets(); track t.id) {
              <tr class="hover:bg-gray-50">
                <td class="px-4 py-2 font-medium">{{ t.subject }}</td>
                <td class="px-4 py-2 text-center capitalize">{{ t.priority_tag }}</td>
                <td class="px-4 py-2 text-center"><ui-badge [variant]="t.status === 'resolved' ? 'success' : t.status === 'open' ? 'danger' : 'warning'">{{ t.status }}</ui-badge></td>
                <td class="px-4 py-2">{{ t.sla_due_at | date:'short' }}</td>
                <td class="px-4 py-2">{{ t.created_at | date:'shortDate' }}</td>
              </tr>
            } @empty { <tr><td colspan="5" class="px-4 py-8 text-center text-gray-400">No tickets</td></tr> }
          </tbody>
        </table>
      </div>
    }
  `,
})
export class SupportPage implements OnInit {
  private api = inject(MerchantApiService);
  private toast = inject(ToastService);
  loading = signal(true); showForm = signal(false); tickets = signal<any[]>([]);
  form: any = { subject: '', description: '', priority_tag: 'sales' };

  ngOnInit(): void { this.load(); }
  load(): void { this.api.listTickets().subscribe({ next: (t: any[]) => { this.tickets.set(t); this.loading.set(false); } }); }
  create(): void {
    this.api.createTicket(this.form).subscribe({ next: () => {
      this.toast.success('Ticket created'); this.showForm.set(false); this.form = { subject: '', description: '', priority_tag: 'sales' }; this.load();
    } });
  }
}

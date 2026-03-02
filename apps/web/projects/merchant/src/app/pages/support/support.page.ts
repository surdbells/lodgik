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
      <button (click)="openForm()" class="px-4 py-2 bg-sage-600 text-white text-sm font-medium rounded-lg hover:bg-sage-700">+ New Ticket</button>
    </ui-page-header>
    <ui-loading [loading]="loading()"></ui-loading>

    @if (showForm()) {
      <div class="bg-white rounded-xl border border-gray-100 shadow-card p-5 mb-6">
        <h3 class="text-sm font-semibold mb-1">Create Support Ticket</h3>
        <p class="text-xs text-gray-400 mb-4">Fields marked <span class="text-red-400">*</span> are required</p>

        @if (formError()) {
          <div class="bg-red-50 border border-red-100 text-red-700 text-xs p-3 rounded-lg mb-4">{{ formError() }}</div>
        }

        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label class="block text-xs font-medium text-gray-700 mb-1">Subject <span class="text-red-400">*</span></label>
            <input [(ngModel)]="form.subject"
              class="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-sage-200 focus:border-sage-400 outline-none bg-gray-50 focus:bg-white"
              placeholder="Brief description of your issue" maxlength="150">
          </div>
          <div>
            <label class="block text-xs font-medium text-gray-700 mb-1">Category <span class="text-red-400">*</span></label>
            <select [(ngModel)]="form.priority_tag"
              class="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-sage-200 focus:border-sage-400 outline-none bg-gray-50 focus:bg-white">
              <option value="">— Select category —</option>
              <option value="sales">Sales</option>
              <option value="finance">Finance / Payouts</option>
              <option value="technical">Technical Issue</option>
              <option value="onboarding">Onboarding</option>
            </select>
          </div>
          <div class="md:col-span-2">
            <label class="block text-xs font-medium text-gray-700 mb-1">Description <span class="text-red-400">*</span></label>
            <textarea [(ngModel)]="form.description" rows="4"
              class="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-sage-200 focus:border-sage-400 outline-none bg-gray-50 focus:bg-white resize-none"
              placeholder="Describe your issue in detail. Include any relevant context, error messages or steps to reproduce."></textarea>
            <p class="text-xs text-gray-400 mt-1">{{ form.description.length }} / 2000 characters</p>
          </div>
        </div>
        <div class="flex gap-2 mt-5">
          <button (click)="create()" [disabled]="creating()"
            class="px-5 py-2 bg-sage-600 text-white text-sm font-medium rounded-lg hover:bg-sage-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors">
            {{ creating() ? 'Submitting...' : 'Submit Ticket' }}
          </button>
          <button (click)="cancelForm()"
            class="px-4 py-2 bg-gray-100 text-gray-700 text-sm rounded-lg hover:bg-gray-200 transition-colors">
            Cancel
          </button>
        </div>
      </div>
    }

    @if (!loading()) {
      @if (tickets().length === 0) {
        <div class="bg-white rounded-xl border border-gray-100 shadow-card p-12 text-center">
          <svg xmlns="http://www.w3.org/2000/svg" class="w-10 h-10 text-gray-300 mx-auto mb-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
          <p class="text-gray-400 text-sm">No support tickets yet.</p>
          <p class="text-gray-300 text-xs mt-1">Click "+ New Ticket" to get help from our team.</p>
        </div>
      } @else {
        <div class="bg-white rounded-xl border border-gray-100 shadow-card overflow-hidden">
          <table class="w-full text-sm">
            <thead class="bg-gray-50 text-xs text-gray-500 uppercase tracking-wide">
              <tr>
                <th class="px-4 py-3 text-left">Subject</th>
                <th class="px-4 py-3 text-center">Category</th>
                <th class="px-4 py-3 text-center">Status</th>
                <th class="px-4 py-3 text-left">SLA Due</th>
                <th class="px-4 py-3 text-left">Created</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-gray-100">
              @for (t of tickets(); track t.id) {
                <tr class="hover:bg-gray-50 transition-colors">
                  <td class="px-4 py-3 font-medium text-gray-900 max-w-xs truncate">{{ t.subject }}</td>
                  <td class="px-4 py-3 text-center capitalize text-gray-600">{{ t.priority_tag }}</td>
                  <td class="px-4 py-3 text-center">
                    <ui-badge [variant]="t.status === 'resolved' ? 'success' : t.status === 'open' ? 'danger' : 'warning'">{{ t.status }}</ui-badge>
                  </td>
                  <td class="px-4 py-3 text-gray-500 text-xs">{{ t.sla_due_at | date:'short' }}</td>
                  <td class="px-4 py-3 text-gray-400 text-xs">{{ t.created_at | date:'shortDate' }}</td>
                </tr>
              }
            </tbody>
          </table>
        </div>
      }
    }
  `,
})
export class SupportPage implements OnInit {
  private api   = inject(MerchantApiService);
  private toast = inject(ToastService);

  loading   = signal(true);
  showForm  = signal(false);
  creating  = signal(false);
  tickets   = signal<any[]>([]);
  formError = signal('');

  form: any = { subject: '', description: '', priority_tag: '' };

  ngOnInit(): void { this.load(); }

  load(): void {
    this.api.listTickets().subscribe({
      next: (t: any[]) => { this.tickets.set(t || []); this.loading.set(false); },
      error: () => this.loading.set(false),
    });
  }

  openForm(): void {
    this.form = { subject: '', description: '', priority_tag: '' };
    this.formError.set('');
    this.showForm.set(true);
  }

  cancelForm(): void { this.showForm.set(false); this.formError.set(''); }

  create(): void {
    this.formError.set('');

    if (!this.form.subject?.trim()) {
      this.formError.set('Subject is required.'); return;
    }
    if (this.form.subject.trim().length < 5) {
      this.formError.set('Subject must be at least 5 characters.'); return;
    }
    if (!this.form.priority_tag) {
      this.formError.set('Please select a category.'); return;
    }
    if (!this.form.description?.trim()) {
      this.formError.set('Description is required.'); return;
    }
    if (this.form.description.trim().length < 20) {
      this.formError.set('Description must be at least 20 characters.'); return;
    }

    this.creating.set(true);
    this.api.createTicket(this.form).subscribe({
      next: () => {
        this.toast.success('Ticket submitted. Our team will respond within the SLA window.');
        this.creating.set(false);
        this.showForm.set(false);
        this.form = { subject: '', description: '', priority_tag: '' };
        this.load();
      },
      error: (e: any) => {
        this.creating.set(false);
        this.formError.set(e?.error?.message || 'Failed to submit ticket.');
      },
    });
  }
}

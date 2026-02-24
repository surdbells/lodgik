import { Component, inject, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ApiService, PageHeaderComponent, DataTableComponent, TableColumn, TableAction, LoadingSpinnerComponent, ToastService, ConfirmDialogService } from '@lodgik/shared';

@Component({
  selector: 'app-invitation-list',
  standalone: true,
  imports: [PageHeaderComponent, DataTableComponent, LoadingSpinnerComponent, FormsModule],
  template: `
    <ui-page-header title="Tenant Invitations" subtitle="Invite hotels to join the platform">
      <button class="px-4 py-2 bg-sage-600 text-white text-sm font-medium rounded-lg hover:bg-sage-700" (click)="showCreate = !showCreate">
        {{ showCreate ? 'Cancel' : '+ Invite' }}
      </button>
    </ui-page-header>

    @if (showCreate) {
      <div class="bg-white rounded-xl border border-gray-100 shadow-card p-5 mb-6">
        <h3 class="text-sm font-semibold text-gray-700 mb-3">New Invitation</h3>
        <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <input [(ngModel)]="form.hotel_name" placeholder="Hotel name" class="px-3 py-2 border border-gray-200 rounded-xl text-sm bg-gray-50">
          <input [(ngModel)]="form.email" placeholder="Email" class="px-3 py-2 border border-gray-200 rounded-xl text-sm bg-gray-50">
          <input [(ngModel)]="form.contact_name" placeholder="Contact name" class="px-3 py-2 border border-gray-200 rounded-xl text-sm bg-gray-50">
          <input [(ngModel)]="form.phone" placeholder="Phone" class="px-3 py-2 border border-gray-200 rounded-xl text-sm bg-gray-50">
        </div>
        <button (click)="create()" class="mt-4 px-4 py-2 bg-sage-600 text-white text-sm rounded-lg hover:bg-sage-700">Send Invitation</button>
      </div>
    }

    <ui-loading [loading]="loading()"></ui-loading>
    @if (!loading()) {
      <ui-data-table [columns]="columns" [data]="invitations()" [actions]="actions" [totalItems]="total()"></ui-data-table>
    }
  `,
})
export class InvitationListPage implements OnInit {
  private api = inject(ApiService);
  private toast = inject(ToastService);
  private confirm = inject(ConfirmDialogService);
  loading = signal(true);
  invitations = signal<any[]>([]);
  total = signal(0);
  showCreate = false;
  form: any = { hotel_name: '', email: '', contact_name: '', phone: '' };

  columns: TableColumn[] = [
    { key: 'hotel_name', label: 'Hotel', sortable: true },
    { key: 'email', label: 'Email' },
    { key: 'contact_name', label: 'Contact' },
    { key: 'status', label: 'Status', render: (v: string) => {
      const cls: Record<string,string> = { pending: 'bg-amber-50 text-amber-700', accepted: 'bg-emerald-50 text-emerald-700', revoked: 'bg-red-50 text-red-600', expired: 'bg-gray-100 text-gray-500' };
      return `<span class="px-2 py-0.5 rounded-full text-xs font-medium ${cls[v] || 'bg-gray-100 text-gray-600'}">${v}</span>`;
    }},
    { key: 'created_at', label: 'Sent', render: (v: string) => v ? new Date(v).toLocaleDateString() : '—' },
  ];
  actions: TableAction[] = [
    { label: 'Revoke', color: 'danger', handler: (r) => this.revoke(r), hidden: (r) => r.status !== 'pending' },
  ];

  ngOnInit(): void { this.load(); }
  load(): void {
    this.api.get('/admin/invitations').subscribe({ next: r => { if (r.success) { this.invitations.set(r.data); this.total.set(r.meta?.total ?? 0); } this.loading.set(false); }, error: () => this.loading.set(false) });
  }
  create(): void {
    this.api.post('/admin/invitations', this.form).subscribe(r => { if (r.success) { this.toast.success('Invitation sent'); this.showCreate = false; this.load(); } });
  }
  async revoke(row: any): Promise<void> {
    const ok = await this.confirm.confirm({ title: 'Revoke Invitation', message: `Revoke invitation for "${row.hotel_name}"?`, variant: 'danger' });
    if (ok) this.api.delete(`/admin/invitations/${row.id}`).subscribe(r => { if (r.success) { this.toast.success('Revoked'); this.load(); } });
  }
}

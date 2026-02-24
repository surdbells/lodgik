import { Component, inject, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { DecimalPipe, UpperCasePipe } from '@angular/common';
import { ApiService, PageHeaderComponent, DataTableComponent, TableColumn, TableAction, LoadingSpinnerComponent, ToastService, ConfirmDialogService } from '@lodgik/shared';

@Component({
  selector: 'app-guests',
  standalone: true,
  imports: [FormsModule, DecimalPipe, UpperCasePipe, PageHeaderComponent, DataTableComponent, LoadingSpinnerComponent],
  template: `
    <ui-page-header title="Guests" subtitle="Manage guest profiles and history" icon="user-round" [breadcrumbs]="['Manage Guests', 'Guest List']">
      <button class="px-4 py-2 bg-sage-600 text-white text-sm font-medium rounded-lg hover:bg-sage-700" (click)="showForm = !showForm; resetForm()">
        {{ showForm ? 'Cancel' : '+ Add Guest' }}
      </button>
    </ui-page-header>

    @if (showForm) {
      <div class="bg-white rounded-xl border border-gray-100 shadow-card p-5 mb-6">
        <h3 class="text-sm font-semibold text-gray-700 mb-3">{{ editId ? 'Edit' : 'New' }} Guest</h3>
        <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          <input [(ngModel)]="form.first_name" placeholder="First name *" class="px-3 py-2 border border-gray-200 rounded-xl text-sm bg-gray-50">
          <input [(ngModel)]="form.last_name" placeholder="Last name *" class="px-3 py-2 border border-gray-200 rounded-xl text-sm bg-gray-50">
          <input [(ngModel)]="form.email" type="email" placeholder="Email" class="px-3 py-2 border border-gray-200 rounded-xl text-sm bg-gray-50">
          <input [(ngModel)]="form.phone" placeholder="Phone (+234...)" class="px-3 py-2 border border-gray-200 rounded-xl text-sm bg-gray-50">
          <select [(ngModel)]="form.id_type" class="px-3 py-2 border border-gray-200 rounded-xl text-sm bg-gray-50">
            <option value="">ID Type</option>
            <option value="national_id">National ID</option>
            <option value="passport">Passport</option>
            <option value="drivers_license">Driver's License</option>
            <option value="voters_card">Voter's Card</option>
            <option value="nin">NIN</option>
          </select>
          <input [(ngModel)]="form.id_number" placeholder="ID Number" class="px-3 py-2 border border-gray-200 rounded-xl text-sm bg-gray-50">
          <input [(ngModel)]="form.nationality" placeholder="Nationality" class="px-3 py-2 border border-gray-200 rounded-xl text-sm bg-gray-50">
          <select [(ngModel)]="form.gender" class="px-3 py-2 border border-gray-200 rounded-xl text-sm bg-gray-50">
            <option value="">Gender</option>
            <option value="male">Male</option>
            <option value="female">Female</option>
            <option value="other">Other</option>
          </select>
          <select [(ngModel)]="form.vip_status" class="px-3 py-2 border border-gray-200 rounded-xl text-sm bg-gray-50">
            <option value="regular">Regular</option>
            <option value="silver">Silver</option>
            <option value="gold">Gold</option>
            <option value="platinum">Platinum</option>
            <option value="vvip">VVIP</option>
          </select>
          <input [(ngModel)]="form.company_name" placeholder="Company" class="px-3 py-2 border border-gray-200 rounded-xl text-sm bg-gray-50">
          <input [(ngModel)]="form.city" placeholder="City" class="px-3 py-2 border border-gray-200 rounded-xl text-sm bg-gray-50">
          <input [(ngModel)]="form.state" placeholder="State" class="px-3 py-2 border border-gray-200 rounded-xl text-sm bg-gray-50">
        </div>
        <div class="mt-3">
          <textarea [(ngModel)]="form.notes" placeholder="Notes" rows="2" class="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm bg-gray-50"></textarea>
        </div>
        <div class="flex gap-2 mt-3">
          <button (click)="save()" class="px-4 py-2 bg-sage-600 text-white text-sm rounded-xl hover:bg-sage-700 transition-colors">{{ editId ? 'Update' : 'Create' }}</button>
          @if (editId) {
            <button (click)="showForm = false; editId = ''" class="px-4 py-2 text-sm text-gray-500 border border-gray-300 rounded-lg hover:bg-gray-50">Cancel</button>
          }
        </div>
      </div>
    }

    <!-- Filters -->
    <div class="flex flex-wrap items-center gap-3 mb-4">
      <input [(ngModel)]="search" (ngModelChange)="onSearch()" placeholder="Search guests..." class="px-3 py-2 border border-gray-200 rounded-xl text-sm bg-gray-50 w-64">
      <select [(ngModel)]="vipFilter" (ngModelChange)="load()" class="px-3 py-2 border border-gray-200 rounded-xl text-sm bg-gray-50">
        <option value="">All VIP Levels</option>
        <option value="regular">Regular</option>
        <option value="silver">Silver</option>
        <option value="gold">Gold</option>
        <option value="platinum">Platinum</option>
        <option value="vvip">VVIP</option>
      </select>
    </div>

    <ui-loading [loading]="loading()"></ui-loading>
    @if (!loading()) {
      <ui-data-table [columns]="columns" [data]="guests()" [actions]="actions" [totalItems]="total()" [searchable]="false" (pageChange)="onPage($event)"></ui-data-table>
    }

    <!-- Guest Detail Modal -->
    @if (showDetail && detailGuest) {
      <div class="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50" (click)="showDetail = false">
        <div class="bg-white rounded-2xl shadow-2xl w-full max-w-lg p-6 max-h-[80vh] overflow-y-auto" (click)="$event.stopPropagation()">
          <div class="flex items-center justify-between mb-4">
            <div>
              <h3 class="text-lg font-semibold">{{ detailGuest.full_name }}</h3>
              <span class="inline-block px-2 py-0.5 rounded-full text-xs font-medium mt-1"
                    [class]="vipClass(detailGuest.vip_status)">{{ detailGuest.vip_status | uppercase }}</span>
            </div>
            <button (click)="showDetail = false" class="text-gray-400 hover:text-gray-600 text-xl">&times;</button>
          </div>
          <div class="grid grid-cols-2 gap-3 text-sm">
            <div><span class="text-gray-400">Email</span><p class="font-medium">{{ detailGuest.email || '—' }}</p></div>
            <div><span class="text-gray-400">Phone</span><p class="font-medium">{{ detailGuest.phone || '—' }}</p></div>
            <div><span class="text-gray-400">Nationality</span><p class="font-medium">{{ detailGuest.nationality || '—' }}</p></div>
            <div><span class="text-gray-400">ID</span><p class="font-medium">{{ detailGuest.id_type ? detailGuest.id_type + ': ' + detailGuest.id_number : '—' }}</p></div>
            <div><span class="text-gray-400">Company</span><p class="font-medium">{{ detailGuest.company_name || '—' }}</p></div>
            <div><span class="text-gray-400">Gender</span><p class="font-medium">{{ detailGuest.gender || '—' }}</p></div>
            <div><span class="text-gray-400">Total Stays</span><p class="font-medium text-sage-600">{{ detailGuest.total_stays }}</p></div>
            <div><span class="text-gray-400">Total Spent</span><p class="font-medium text-emerald-600">₦{{ detailGuest.total_spent | number }}</p></div>
          </div>
          @if (detailGuest.notes) {
            <div class="mt-3 text-sm"><span class="text-gray-400">Notes</span><p class="mt-1 text-gray-700">{{ detailGuest.notes }}</p></div>
          }
          <div class="flex gap-2 mt-5">
            <button (click)="edit(detailGuest); showDetail = false" class="px-4 py-2 bg-sage-600 text-white text-sm rounded-xl hover:bg-sage-700 transition-colors">Edit</button>
            <button (click)="showDetail = false" class="px-4 py-2 text-sm text-gray-500 border border-gray-300 rounded-lg hover:bg-gray-50">Close</button>
          </div>
        </div>
      </div>
    }
  `,
})
export class GuestsPage implements OnInit {
  private api = inject(ApiService);
  private toast = inject(ToastService);
  private confirm = inject(ConfirmDialogService);
  private router = inject(Router);

  loading = signal(true);
  guests = signal<any[]>([]);
  total = signal(0);
  page = 1;
  search = '';
  vipFilter = '';
  showForm = false;
  editId = '';
  showDetail = false;
  detailGuest: any = null;
  private searchTimer: any;

  form: any = { first_name: '', last_name: '', email: '', phone: '', id_type: '', id_number: '', nationality: 'Nigerian', gender: '', vip_status: 'regular', company_name: '', city: '', state: '', notes: '' };

  columns: TableColumn[] = [
    { key: 'full_name', label: 'Name', sortable: true },
    { key: 'phone', label: 'Phone', render: (v: any) => v || '—' },
    { key: 'email', label: 'Email', render: (v: any) => v || '—' },
    { key: 'vip_status', label: 'VIP', render: (v: string) => `<span class="px-2 py-0.5 rounded-full text-xs font-medium ${this.vipClass(v)}">${v.toUpperCase()}</span>` },
    { key: 'total_stays', label: 'Stays', width: '60px' },
    { key: 'total_spent', label: 'Spent (₦)', render: (v: any) => `₦${Number(v).toLocaleString()}` },
  ];

  actions: TableAction[] = [
    { label: 'Profile', handler: (r) => this.router.navigate(['/guests', r.id]) },
    { label: 'Edit', handler: (r) => this.edit(r) },
  ];

  ngOnInit(): void { this.load(); }

  load(): void {
    const params: any = { page: this.page, limit: 20 };
    if (this.search) params.search = this.search;
    if (this.vipFilter) params.vip_status = this.vipFilter;

    this.api.get('/guests', params).subscribe({
      next: r => { if (r.success) { this.guests.set(r.data ?? []); this.total.set(r.meta?.total ?? 0); } this.loading.set(false); },
      error: () => this.loading.set(false),
    });
  }

  onSearch(): void {
    clearTimeout(this.searchTimer);
    this.searchTimer = setTimeout(() => { this.page = 1; this.load(); }, 300);
  }

  onPage(e: any): void { this.page = e.page; this.load(); }

  resetForm(): void {
    this.editId = '';
    this.form = { first_name: '', last_name: '', email: '', phone: '', id_type: '', id_number: '', nationality: 'Nigerian', gender: '', vip_status: 'regular', company_name: '', city: '', state: '', notes: '' };
  }

  edit(row: any): void {
    this.editId = row.id;
    this.form = { first_name: row.first_name, last_name: row.last_name, email: row.email ?? '', phone: row.phone ?? '', id_type: row.id_type ?? '', id_number: row.id_number ?? '', nationality: row.nationality ?? '', gender: row.gender ?? '', vip_status: row.vip_status, company_name: row.company_name ?? '', city: row.city ?? '', state: row.state ?? '', notes: row.notes ?? '' };
    this.showForm = true;
  }

  save(): void {
    if (!this.form.first_name || !this.form.last_name) {
      this.toast.error('First and last name are required');
      return;
    }
    const body = { ...this.form };
    // Clean empty strings to null
    Object.keys(body).forEach(k => { if (body[k] === '') body[k] = null; });

    const req = this.editId ? this.api.put(`/guests/${this.editId}`, body) : this.api.post('/guests', body);
    req.subscribe(r => {
      if (r.success) { this.toast.success(this.editId ? 'Updated' : 'Created'); this.showForm = false; this.resetForm(); this.load(); }
      else this.toast.error(r.message || 'Failed');
    });
  }

  vipClass(status: string): string {
    const map: Record<string, string> = {
      regular: 'bg-gray-100 text-gray-600', silver: 'bg-gray-200 text-gray-700',
      gold: 'bg-yellow-100 text-yellow-700', platinum: 'bg-purple-100 text-purple-700',
      vvip: 'bg-red-100 text-red-700',
    };
    return map[status] ?? 'bg-gray-100 text-gray-600';
  }
}

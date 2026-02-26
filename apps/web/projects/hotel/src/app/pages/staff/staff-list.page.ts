import { Component, inject, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ApiService, PageHeaderComponent, DataTableComponent, TableColumn, TableAction, LoadingSpinnerComponent, ToastService, ConfirmDialogService } from '@lodgik/shared';

@Component({
  selector: 'app-staff-list',
  standalone: true,
  imports: [PageHeaderComponent, DataTableComponent, LoadingSpinnerComponent, FormsModule],
  template: `
    <ui-page-header title="Staff" subtitle="Manage hotel staff members">
      <button class="px-4 py-2 bg-sage-600 text-white text-sm font-medium rounded-lg hover:bg-sage-700" (click)="showAdd = !showAdd">
        {{ showAdd ? 'Cancel' : '+ Add Staff' }}
      </button>
    </ui-page-header>

    @if (showAdd) {
      <div class="bg-white rounded-xl border border-gray-100 shadow-card p-5 mb-6">
        <h3 class="text-sm font-semibold text-gray-700 mb-3">Add Staff Member</h3>
        <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          <input [(ngModel)]="form.first_name" placeholder="First name" class="px-3 py-2 border border-gray-200 rounded-xl text-sm bg-gray-50">
          <input [(ngModel)]="form.last_name" placeholder="Last name" class="px-3 py-2 border border-gray-200 rounded-xl text-sm bg-gray-50">
          <input [(ngModel)]="form.email" type="email" placeholder="Email" class="px-3 py-2 border border-gray-200 rounded-xl text-sm bg-gray-50">
          <input [(ngModel)]="form.password" type="password" placeholder="Password" class="px-3 py-2 border border-gray-200 rounded-xl text-sm bg-gray-50">
          <select [(ngModel)]="form.role" class="px-3 py-2 border border-gray-200 rounded-xl text-sm bg-gray-50">
            <option value="manager">Manager</option><option value="front_desk">Front Desk</option>
            <option value="housekeeping">Housekeeping</option><option value="maintenance">Maintenance</option>
            <option value="restaurant">Restaurant</option><option value="bar">Bar</option>
            <option value="kitchen">Kitchen</option><option value="accountant">Accountant</option>
            <option value="security">Security</option><option value="concierge">Concierge</option>
          </select>
        </div>
        <button (click)="addStaff()" class="mt-3 px-4 py-2 bg-sage-600 text-white text-sm rounded-xl hover:bg-sage-700 transition-colors">Add</button>
      </div>
    }

    <ui-loading [loading]="loading()"></ui-loading>
    @if (!loading()) {
      <ui-data-table [columns]="columns" [data]="staff()" [actions]="actions" [totalItems]="total()" (pageChange)="onPage($event)"></ui-data-table>
    }

    <!-- Edit Staff Modal -->
    @if (showEdit && editForm) {
      <div class="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50" (click)="showEdit = false">
        <div class="bg-white rounded-2xl shadow-2xl w-full max-w-md p-5" (click)="$event.stopPropagation()">
          <h3 class="text-lg font-semibold mb-4">Edit {{ editForm.first_name }} {{ editForm.last_name }}</h3>
          <div class="space-y-3">
            <!-- Avatar Upload -->
            <div class="flex items-center gap-4 pb-3 border-b">
              <div class="w-16 h-16 rounded-full bg-sage-100 flex items-center justify-center text-sage-700 text-xl font-bold overflow-hidden shrink-0">
                @if (editForm.avatar_url) {
                  <img [src]="editForm.avatar_url" class="w-full h-full object-cover" alt="Avatar">
                } @else {
                  {{ editForm.first_name?.charAt(0) }}{{ editForm.last_name?.charAt(0) }}
                }
              </div>
              <div>
                <label class="px-3 py-1.5 bg-gray-100 text-gray-700 text-xs rounded-lg cursor-pointer hover:bg-gray-200 inline-block">
                  Upload Photo
                  <input type="file" accept="image/*" (change)="onAvatarSelect($event)" class="hidden">
                </label>
                @if (editForm.avatar_url) {
                  <button (click)="editForm.avatar_url = ''" class="ml-2 text-xs text-red-500 hover:underline">Remove</button>
                }
                <p class="text-[11px] text-gray-400 mt-1">JPG, PNG up to 2MB</p>
              </div>
            </div>
            <div class="grid grid-cols-2 gap-3">
              <div><label class="text-xs text-gray-500">First Name</label>
                <input [(ngModel)]="editForm.first_name" class="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm bg-gray-50"></div>
              <div><label class="text-xs text-gray-500">Last Name</label>
                <input [(ngModel)]="editForm.last_name" class="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm bg-gray-50"></div>
            </div>
            <div><label class="text-xs text-gray-500">Email</label>
              <input [(ngModel)]="editForm.email" type="email" class="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm bg-gray-50"></div>
            <div><label class="text-xs text-gray-500">Phone</label>
              <input [(ngModel)]="editForm.phone" class="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm bg-gray-50" placeholder="+234..."></div>
            <div><label class="text-xs text-gray-500">Role</label>
              <select [(ngModel)]="editForm.role" class="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm bg-gray-50">
                <option value="manager">Manager</option><option value="front_desk">Front Desk</option>
                <option value="housekeeping">Housekeeping</option><option value="maintenance">Maintenance</option>
                <option value="restaurant">Restaurant</option><option value="bar">Bar</option>
                <option value="kitchen">Kitchen</option><option value="accountant">Accountant</option>
                <option value="security">Security</option><option value="concierge">Concierge</option>
              </select></div>
            <div class="flex items-center gap-2">
              <input type="checkbox" [(ngModel)]="editForm.is_active" id="editActive" class="rounded">
              <label for="editActive" class="text-sm">Active</label>
            </div>

            <div class="border-t pt-3 mt-3">
              <label class="text-xs text-gray-500">Reset Password (leave empty to keep current)</label>
              <input [(ngModel)]="editForm.new_password" type="password" placeholder="New password" class="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm bg-gray-50 mt-1">
            </div>
          </div>
          <div class="flex gap-2 mt-5">
            <button (click)="saveEdit()" class="flex-1 px-4 py-2 bg-sage-600 text-white text-sm rounded-xl hover:bg-sage-700">Save</button>
            <button (click)="showEdit = false" class="px-4 py-2 text-sm text-gray-500 border border-gray-300 rounded-xl">Cancel</button>
          </div>
        </div>
      </div>
    }
  `,
})
export class StaffListPage implements OnInit {
  private api = inject(ApiService);
  private toast = inject(ToastService);
  private confirm = inject(ConfirmDialogService);
  loading = signal(true); staff = signal<any[]>([]); total = signal(0); page = 1;
  showAdd = false;
  form: any = { first_name: '', last_name: '', email: '', password: '', role: 'front_desk' };

  columns: TableColumn[] = [
    { key: 'avatar_url', label: '', render: (_v: string, row: any) => {
      const initials = (row.first_name?.charAt(0) || '') + (row.last_name?.charAt(0) || '');
      return row.avatar_url
        ? `<img src="${row.avatar_url}" class="w-8 h-8 rounded-full object-cover">`
        : `<div class="w-8 h-8 rounded-full bg-sage-100 flex items-center justify-center text-sage-700 text-xs font-bold">${initials}</div>`;
    }},
    { key: 'first_name', label: 'First Name', sortable: true },
    { key: 'last_name', label: 'Last Name', sortable: true },
    { key: 'email', label: 'Email' },
    { key: 'role', label: 'Role', render: (v: string) => `<span class="px-2 py-0.5 bg-gray-100 rounded text-xs">${v}</span>` },
    { key: 'is_active', label: 'Active', render: (v: boolean) => v ? '<span class="text-emerald-600">Active</span>' : '<span class="text-gray-400">Inactive</span>' },
  ];
  actions: TableAction[] = [
    { label: 'Edit', handler: (r) => this.openEdit(r) },
    { label: 'Reset Password', handler: (r) => this.resetPassword(r) },
    { label: 'Deactivate', color: 'danger', handler: (r) => this.deactivate(r), hidden: (r) => !r.is_active },
    { label: 'Reactivate', handler: (r) => this.reactivate(r), hidden: (r) => r.is_active },
  ];

  showEdit = false;
  editForm: any = null;

  ngOnInit(): void { this.load(); }
  load(): void {
    this.api.get('/staff', { page: this.page, limit: 20 }).subscribe({ next: r => { if (r.success) { this.staff.set(r.data); this.total.set(r.meta?.total ?? 0); } this.loading.set(false); }, error: () => this.loading.set(false) });
  }
  onPage(e: any): void { this.page = e.page; this.load(); }
  addStaff(): void {
    this.api.post('/staff', this.form).subscribe(r => {
      if (r.success) { this.toast.success('Staff added'); this.showAdd = false; this.form = { first_name: '', last_name: '', email: '', password: '', role: 'front_desk' }; this.load(); }
      else this.toast.error(r.message || 'Failed');
    });
  }
  openEdit(row: any): void {
    this.editForm = { id: row.id, first_name: row.first_name, last_name: row.last_name, email: row.email, phone: row.phone || '', role: row.role, is_active: row.is_active, new_password: '', avatar_url: row.avatar_url || '' };
    this.showEdit = true;
  }
  onAvatarSelect(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input?.files?.[0];
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) { this.toast.error('Image must be under 2MB'); return; }
    const reader = new FileReader();
    reader.onload = () => {
      const base64 = reader.result as string;
      this.editForm.avatar_url = base64; // preview
      this.editForm._avatarBase64 = base64; // store for upload
    };
    reader.readAsDataURL(file);
  }
  saveEdit(): void {
    if (!this.editForm) return;
    const { id, new_password, _avatarBase64, avatar_url, ...body } = this.editForm;
    if (new_password) body.password = new_password;
    
    const afterSave = () => {
      // Upload avatar if a new one was selected
      if (_avatarBase64) {
        this.api.post(`/staff/${id}/avatar`, { image: _avatarBase64 }).subscribe({
          next: (r: any) => { if (r.success) this.toast.success('Avatar updated'); },
          error: () => this.toast.error('Avatar upload failed'),
        });
      }
      this.toast.success('Staff updated'); this.showEdit = false; this.load();
    };

    this.api.patch(`/staff/${id}`, body).subscribe(r => {
      if (r.success) afterSave();
      else this.toast.error(r.message || 'Failed');
    });
  }
  resetPassword(row: any): void {
    const pw = prompt(`Enter new password for ${row.first_name} ${row.last_name}:`);
    if (pw && pw.length >= 6) {
      this.api.patch(`/staff/${row.id}`, { password: pw }).subscribe(r => {
        if (r.success) this.toast.success('Password reset');
        else this.toast.error(r.message || 'Failed');
      });
    } else if (pw) { this.toast.error('Password must be at least 6 characters'); }
  }
  async deactivate(row: any): Promise<void> {
    const ok = await this.confirm.confirm({ title: 'Deactivate Staff', message: `Deactivate ${row.first_name} ${row.last_name}?`, variant: 'warning' });
    if (ok) this.api.patch(`/staff/${row.id}`, { is_active: false }).subscribe(r => { if (r.success) { this.toast.success('Deactivated'); this.load(); } });
  }
  reactivate(row: any): void {
    this.api.patch(`/staff/${row.id}`, { is_active: true }).subscribe(r => {
      if (r.success) { this.toast.success('Reactivated'); this.load(); }
    });
  }
}

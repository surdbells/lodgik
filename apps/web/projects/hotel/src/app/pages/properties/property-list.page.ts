import { Component, inject, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { ApiService, PageHeaderComponent, DataTableComponent, TableColumn, TableAction, LoadingSpinnerComponent, ToastService, AuthService } from '@lodgik/shared';

@Component({
  selector: 'app-property-list',
  standalone: true,
  imports: [FormsModule, PageHeaderComponent, DataTableComponent, LoadingSpinnerComponent],
  template: `
    <ui-page-header title="Properties" icon="hotel" [breadcrumbs]="['System', 'Properties']" subtitle="Manage your hotel properties">
      <button (click)="showAdd = !showAdd" class="px-4 py-2 bg-sage-600 text-white text-sm font-medium rounded-lg hover:bg-sage-700">{{ showAdd ? 'Cancel' : '+ Add Property' }}</button>
    </ui-page-header>

    <!-- Current Property Indicator -->
    @if (currentPid()) {
      <div class="bg-sage-50 border border-sage-200 rounded-xl p-3 mb-4 flex items-center justify-between">
        <div class="flex items-center gap-2">
          <span class="text-sage-600 font-semibold text-sm">Active:</span>
          <span class="text-sm text-gray-700">{{ currentPropertyName() }}</span>
        </div>
        <span class="text-xs text-gray-400">All data is scoped to this property</span>
      </div>
    }

    <!-- Add Property Form -->
    @if (showAdd) {
      <div class="bg-white rounded-xl border border-gray-100 shadow-card p-5 mb-6">
        <h3 class="text-sm font-semibold text-gray-700 mb-3">Add Property</h3>
        <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          <input [(ngModel)]="addForm.name" placeholder="Property name" class="px-3 py-2 border border-gray-200 rounded-xl text-sm bg-gray-50">
          <input [(ngModel)]="addForm.address_line1" placeholder="Address" class="px-3 py-2 border border-gray-200 rounded-xl text-sm bg-gray-50">
          <input [(ngModel)]="addForm.city" placeholder="City" class="px-3 py-2 border border-gray-200 rounded-xl text-sm bg-gray-50">
          <input [(ngModel)]="addForm.state" placeholder="State" class="px-3 py-2 border border-gray-200 rounded-xl text-sm bg-gray-50">
          <input [(ngModel)]="addForm.country" placeholder="Country" value="Nigeria" class="px-3 py-2 border border-gray-200 rounded-xl text-sm bg-gray-50">
          <input [(ngModel)]="addForm.phone" placeholder="Phone" class="px-3 py-2 border border-gray-200 rounded-xl text-sm bg-gray-50">
          <input [(ngModel)]="addForm.email" placeholder="Email" class="px-3 py-2 border border-gray-200 rounded-xl text-sm bg-gray-50">
          <select [(ngModel)]="addForm.star_rating" class="px-3 py-2 border border-gray-200 rounded-xl text-sm bg-gray-50">
            <option [value]="0">No rating</option>
            <option [value]="1">1 Star</option><option [value]="2">2 Stars</option><option [value]="3">3 Stars</option>
            <option [value]="4">4 Stars</option><option [value]="5">5 Stars</option>
          </select>
          <input [(ngModel)]="addForm.total_rooms" type="number" placeholder="Total rooms" class="px-3 py-2 border border-gray-200 rounded-xl text-sm bg-gray-50">
        </div>
        <div class="grid grid-cols-2 gap-3 mt-3">
          <div><label class="text-xs text-gray-500">Check-in Time</label>
            <input [(ngModel)]="addForm.check_in_time" type="time" value="14:00" class="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm bg-gray-50"></div>
          <div><label class="text-xs text-gray-500">Check-out Time</label>
            <input [(ngModel)]="addForm.check_out_time" type="time" value="11:00" class="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm bg-gray-50"></div>
        </div>
        <button (click)="createProperty()" class="mt-3 px-4 py-2 bg-sage-600 text-white text-sm rounded-xl hover:bg-sage-700">Create Property</button>
      </div>
    }

    <!-- Edit Property Modal -->
    @if (showEdit && editForm) {
      <div class="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50" (click)="showEdit = false">
        <div class="bg-white rounded-2xl shadow-2xl w-full max-w-lg p-5 max-h-[90vh] overflow-y-auto" (click)="$event.stopPropagation()">
          <h3 class="text-lg font-semibold mb-4">Edit {{ editForm.name }}</h3>
          <div class="space-y-3">
            <div class="grid grid-cols-2 gap-3">
              <div><label class="text-xs text-gray-500">Name</label>
                <input [(ngModel)]="editForm.name" class="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm bg-gray-50"></div>
              <div><label class="text-xs text-gray-500">Phone</label>
                <input [(ngModel)]="editForm.phone" class="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm bg-gray-50"></div>
            </div>
            <div><label class="text-xs text-gray-500">Address</label>
              <input [(ngModel)]="editForm.address_line1" class="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm bg-gray-50"></div>
            <div class="grid grid-cols-3 gap-3">
              <div><label class="text-xs text-gray-500">City</label>
                <input [(ngModel)]="editForm.city" class="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm bg-gray-50"></div>
              <div><label class="text-xs text-gray-500">State</label>
                <input [(ngModel)]="editForm.state" class="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm bg-gray-50"></div>
              <div><label class="text-xs text-gray-500">Country</label>
                <input [(ngModel)]="editForm.country" class="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm bg-gray-50"></div>
            </div>
            <div class="grid grid-cols-3 gap-3">
              <div><label class="text-xs text-gray-500">Star Rating</label>
                <select [(ngModel)]="editForm.star_rating" class="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm bg-gray-50">
                  <option [value]="0">None</option><option [value]="1">1</option><option [value]="2">2</option>
                  <option [value]="3">3</option><option [value]="4">4</option><option [value]="5">5</option>
                </select></div>
              <div><label class="text-xs text-gray-500">Check-in</label>
                <input [(ngModel)]="editForm.check_in_time" type="time" class="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm bg-gray-50"></div>
              <div><label class="text-xs text-gray-500">Check-out</label>
                <input [(ngModel)]="editForm.check_out_time" type="time" class="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm bg-gray-50"></div>
            </div>
            <div class="flex items-center gap-2">
              <input type="checkbox" [(ngModel)]="editForm.is_active" id="editPropActive" class="rounded">
              <label for="editPropActive" class="text-sm">Active</label>
            </div>
          </div>
          <div class="flex gap-2 mt-5">
            <button (click)="saveEdit()" class="flex-1 px-4 py-2 bg-sage-600 text-white text-sm rounded-xl hover:bg-sage-700">Save</button>
            <button (click)="showEdit = false" class="px-4 py-2 text-sm text-gray-500 border border-gray-300 rounded-xl">Cancel</button>
          </div>
        </div>
      </div>
    }

    <ui-loading [loading]="loading()"></ui-loading>
    @if (!loading()) {
      <ui-data-table [columns]="columns" [data]="properties()" [actions]="actions" [totalItems]="properties().length" [searchable]="true"></ui-data-table>
    }
  `,
})
export class PropertyListPage implements OnInit {
  private api = inject(ApiService);
  private auth = inject(AuthService);
  private toast = inject(ToastService);
  private router = inject(Router);

  loading = signal(true);
  properties = signal<any[]>([]);
  currentPid = signal('');
  showAdd = false;
  showEdit = false;
  editForm: any = null;
  addForm: any = { name: '', address_line1: '', city: '', state: '', country: 'Nigeria', phone: '', email: '', star_rating: 0, total_rooms: 0, check_in_time: '14:00', check_out_time: '11:00' };

  columns: TableColumn[] = [
    { key: 'name', label: 'Name', sortable: true },
    { key: 'city', label: 'City' },
    { key: 'state', label: 'State' },
    { key: 'star_rating', label: 'Stars', align: 'center', render: (v: number) => v ? '⭐'.repeat(v) : '—' },
    { key: 'total_rooms', label: 'Rooms', align: 'center' },
    { key: 'check_in_time', label: 'Check-in' },
    { key: 'check_out_time', label: 'Check-out' },
    { key: 'is_active', label: 'Active', render: (v: boolean) => v ? '<span class="text-emerald-600">Yes</span>' : '<span class="text-gray-400">No</span>' },
  ];

  actions: TableAction[] = [
    { label: 'Edit', handler: (r) => this.openEdit(r) },
    { label: 'Switch to', handler: (r) => this.switchProperty(r), hidden: (r) => r.id === this.currentPid() },
  ];

  ngOnInit(): void {
    this.currentPid.set(this.auth.currentUser?.property_id || '');
    this.load();
  }

  load(): void {
    this.api.get('/properties').subscribe({ next: r => { if (r.success) this.properties.set(r.data); this.loading.set(false); }, error: () => this.loading.set(false) });
  }

  currentPropertyName(): string {
    return this.properties().find(p => p.id === this.currentPid())?.name || 'Unknown';
  }

  createProperty(): void {
    if (!this.addForm.name) { this.toast.error('Name is required'); return; }
    this.api.post('/properties', this.addForm).subscribe((r: any) => {
      if (r.success) { this.toast.success('Property created'); this.showAdd = false; this.addForm = { name: '', address_line1: '', city: '', state: '', country: 'Nigeria', phone: '', email: '', star_rating: 0, total_rooms: 0, check_in_time: '14:00', check_out_time: '11:00' }; this.load(); }
      else this.toast.error(r.message || 'Failed');
    });
  }

  openEdit(row: any): void {
    this.editForm = { ...row };
    this.showEdit = true;
  }

  saveEdit(): void {
    if (!this.editForm) return;
    this.api.patch(`/properties/${this.editForm.id}`, this.editForm).subscribe((r: any) => {
      if (r.success) { this.toast.success('Property updated'); this.showEdit = false; this.load(); }
      else this.toast.error(r.message || 'Failed');
    });
  }

  switchProperty(row: any): void {
    // Update property_id in localStorage user data and reload
    const userData = localStorage.getItem('lodgik_user');
    if (userData) {
      const user = JSON.parse(userData);
      user.property_id = row.id;
      localStorage.setItem('lodgik_user', JSON.stringify(user));
    }
    this.currentPid.set(row.id);
    this.toast.success(`Switched to ${row.name}`);
    // Reload the app to refresh all data
    window.location.href = '/dashboard';
  }
}

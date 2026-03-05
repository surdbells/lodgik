import { Component, inject, OnInit, signal } from '@angular/core';
import { NgClass } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import {
  ApiService,
  PageHeaderComponent,
  LoadingSpinnerComponent,
  ToastService,
  ConfirmDialogService,
} from '@lodgik/shared';

const TYPE_LABELS: Record<string, { label: string; icon: string; color: string }> = {
  reception:  { label: 'Reception',     icon: '🛎️',  color: '#3b82f6' },
  security:   { label: 'Security Post', icon: '🛡️',  color: '#8b5cf6' },
  facility:   { label: 'Facility',      icon: '🏊',  color: '#22c55e' },
  pos:        { label: 'POS Terminal',  icon: '💳',  color: '#f59e0b' },
  entry_gate: { label: 'Entry Gate',    icon: '➡️',  color: '#06b6d4' },
  exit_gate:  { label: 'Exit Gate',     icon: '⬅️',  color: '#6b7280' },
};

@Component({
  selector: 'app-scan-points',
  standalone: true,
  imports: [NgClass, FormsModule, RouterLink, PageHeaderComponent, LoadingSpinnerComponent],
  template: `
    <ui-page-header title="Scan Points" subtitle="Configure scanning terminals across the property">
      <button (click)="openCreate()" class="px-4 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700">
        + Add Scan Point
      </button>
    </ui-page-header>

    <div class="mb-4">
      <input [(ngModel)]="propertyId" (change)="load()" placeholder="Property ID"
        class="border rounded-lg px-3 py-2 text-sm w-56">
    </div>

    <ui-loading [loading]="loading()"></ui-loading>

    <!-- Scan points grid -->
    @if (!loading() && scanPoints().length) {
      <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
        @for (sp of scanPoints(); track sp.id) {
          <div class="bg-white rounded-xl border border-gray-100 shadow-sm p-5 hover:shadow-md transition-shadow">
            <!-- Header -->
            <div class="flex items-start justify-between mb-3">
              <div class="flex items-center gap-3">
                <span class="text-2xl">{{ typeInfo(sp.scan_point_type).icon }}</span>
                <div>
                  <h3 class="font-semibold text-gray-900">{{ sp.name }}</h3>
                  <span class="text-xs font-medium px-2 py-0.5 rounded-full text-white inline-block mt-0.5"
                        [style.background-color]="typeInfo(sp.scan_point_type).color">
                    {{ typeInfo(sp.scan_point_type).label }}
                  </span>
                </div>
              </div>
              <div class="flex items-center gap-1.5">
                <span class="w-2 h-2 rounded-full inline-block" [ngClass]="sp.is_active ? 'bg-green-400' : 'bg-gray-300'"></span>
                <span class="text-xs text-gray-500">{{ sp.is_active ? 'Active' : 'Inactive' }}</span>
              </div>
            </div>

            @if (sp.location_desc) {
              <p class="text-sm text-gray-500 mb-3">📍 {{ sp.location_desc }}</p>
            }

            <!-- Device key -->
            <div class="bg-gray-50 rounded-lg p-3 mb-3">
              <p class="text-xs text-gray-400 mb-1">Device Key</p>
              <div class="flex items-center gap-2">
                <code class="text-xs font-mono text-gray-700 flex-1 truncate">
                  {{ showKey()[sp.id] ? sp.device_key : sp.device_key?.slice(0,8) + '•••••••••••' }}
                </code>
                <button (click)="toggleKey(sp.id)" class="text-xs text-blue-600 hover:text-blue-800 whitespace-nowrap">
                  {{ showKey()[sp.id] ? 'Hide' : 'Show' }}
                </button>
                <button (click)="copyKey(sp.device_key)" class="text-xs text-gray-500 hover:text-gray-700">
                  Copy
                </button>
              </div>
            </div>

            <!-- Actions -->
            <div class="flex gap-2">
              <button (click)="openEdit(sp)" class="flex-1 text-xs py-1.5 border border-gray-200 rounded-lg hover:bg-gray-50 text-gray-700">
                Edit
              </button>
              <button (click)="confirmRegenKey(sp)" class="flex-1 text-xs py-1.5 border border-amber-200 text-amber-700 rounded-lg hover:bg-amber-50">
                Regen Key
              </button>
              <button (click)="confirmDelete(sp)" class="text-xs py-1.5 px-3 border border-red-200 text-red-600 rounded-lg hover:bg-red-50">
                ✕
              </button>
            </div>
          </div>
        }
      </div>
    }

    @if (!loading() && !scanPoints().length && propertyId) {
      <div class="bg-white rounded-xl border border-gray-100 p-12 text-center">
        <p class="text-4xl mb-3">📡</p>
        <p class="text-gray-600 font-medium">No scan points configured</p>
        <p class="text-gray-400 text-sm mt-1">Add scan points for each terminal where cards will be scanned.</p>
        <button (click)="openCreate()" class="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700">Add First Scan Point</button>
      </div>
    }

    <!-- Type reference guide -->
    <div class="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
      <h3 class="font-semibold text-gray-700 mb-4 text-sm">Scan Point Types Guide</h3>
      <div class="grid grid-cols-2 md:grid-cols-3 gap-3">
        @for (entry of typeEntries; track entry[0]) {
          <div class="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
            <span class="text-xl">{{ entry[1].icon }}</span>
            <div>
              <p class="text-sm font-medium text-gray-800">{{ entry[1].label }}</p>
              <p class="text-xs text-gray-500 font-mono">{{ entry[0] }}</p>
            </div>
          </div>
        }
      </div>
    </div>

    <!-- ── Create / Edit Modal ───────────────────────────────── -->
    @if (showModal()) {
      <div class="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
        <div class="bg-white rounded-2xl shadow-2xl w-full max-w-md">
          <div class="p-6 border-b border-gray-100">
            <h2 class="text-lg font-bold text-gray-900">{{ editingId() ? 'Edit Scan Point' : 'Add Scan Point' }}</h2>
          </div>
          <div class="p-6 space-y-4">
            <div>
              <label class="text-xs font-medium text-gray-700 block mb-1">Name *</label>
              <input [(ngModel)]="form.name" placeholder="e.g. Main Reception, Security Gate A" class="w-full border rounded-lg px-3 py-2 text-sm">
            </div>
            <div>
              <label class="text-xs font-medium text-gray-700 block mb-1">Type *</label>
              <select [(ngModel)]="form.type" class="w-full border rounded-lg px-3 py-2 text-sm">
                <option value="">Select type...</option>
                @for (entry of typeEntries; track entry[0]) {
                  <option [value]="entry[0]">{{ entry[1].icon }} {{ entry[1].label }}</option>
                }
              </select>
            </div>
            <div>
              <label class="text-xs font-medium text-gray-700 block mb-1">Location Description</label>
              <input [(ngModel)]="form.locationDesc" placeholder="e.g. Ground floor, near elevator" class="w-full border rounded-lg px-3 py-2 text-sm">
            </div>
            @if (editingId()) {
              <div class="flex items-center gap-3">
                <label class="text-xs font-medium text-gray-700">Active</label>
                <button (click)="form.isActive = !form.isActive"
                  class="relative inline-flex h-6 w-11 items-center rounded-full transition-colors"
                  [ngClass]="form.isActive ? 'bg-blue-600' : 'bg-gray-200'">
                  <span class="inline-block w-4 h-4 transform bg-white rounded-full transition-transform"
                        [ngClass]="form.isActive ? 'translate-x-6' : 'translate-x-1'"></span>
                </button>
              </div>
            }
          </div>
          <div class="p-6 border-t border-gray-100 flex gap-3 justify-end">
            <button (click)="showModal.set(false)" class="px-4 py-2 border border-gray-300 text-sm rounded-lg hover:bg-gray-50">Cancel</button>
            <button (click)="submitModal()" [disabled]="saving()"
              class="px-4 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 disabled:opacity-50">
              {{ saving() ? 'Saving...' : (editingId() ? 'Update' : 'Create') }}
            </button>
          </div>
        </div>
      </div>
    }
  `,
})
export class ScanPointsPage implements OnInit {
  private api     = inject(ApiService);
  private toast   = inject(ToastService);
  private confirm = inject(ConfirmDialogService);

  scanPoints = signal<any[]>([]);
  loading    = signal(false);
  saving     = signal(false);
  showModal  = signal(false);
  editingId  = signal<string | null>(null);
  showKey    = signal<Record<string, boolean>>({});

  propertyId = '';
  form       = { name: '', type: '', locationDesc: '', isActive: true };
  typeEntries = Object.entries(TYPE_LABELS);

  typeInfo(type: string) { return TYPE_LABELS[type] ?? { label: type, icon: '📡', color: '#6b7280' }; }

  ngOnInit(): void {
    this.propertyId = localStorage.getItem('selectedPropertyId') ?? '';
    if (this.propertyId) this.load();
  }

  load(): void {
    if (!this.propertyId) return;
    this.loading.set(true);
    this.api.get(`/scan-points?property_id=${this.propertyId}`).subscribe({
      next: (r: any) => { this.scanPoints.set(r.data?.items ?? []); this.loading.set(false); },
      error: () => this.loading.set(false),
    });
  }

  openCreate(): void {
    this.form = { name: '', type: '', locationDesc: '', isActive: true };
    this.editingId.set(null);
    this.showModal.set(true);
  }

  openEdit(sp: any): void {
    this.form = { name: sp.name, type: sp.scan_point_type, locationDesc: sp.location_desc ?? '', isActive: sp.is_active };
    this.editingId.set(sp.id);
    this.showModal.set(true);
  }

  submitModal(): void {
    if (!this.form.name || !this.form.type) { this.toast.error('Name and type are required'); return; }
    this.saving.set(true);

    if (this.editingId()) {
      this.api.put(`/scan-points/${this.editingId()}`, {
        name: this.form.name, scan_point_type: this.form.type,
        location_desc: this.form.locationDesc || null, is_active: this.form.isActive,
      }).subscribe({
        next: () => { this.toast.success('Scan point updated'); this.showModal.set(false); this.saving.set(false); this.load(); },
        error: (e: any) => { this.toast.error(e?.error?.message ?? 'Update failed'); this.saving.set(false); },
      });
    } else {
      this.api.post('/scan-points', {
        property_id: this.propertyId, name: this.form.name,
        scan_point_type: this.form.type, location_desc: this.form.locationDesc || null,
      }).subscribe({
        next: () => { this.toast.success('Scan point created'); this.showModal.set(false); this.saving.set(false); this.load(); },
        error: (e: any) => { this.toast.error(e?.error?.message ?? 'Creation failed'); this.saving.set(false); },
      });
    }
  }

  toggleKey(id: string): void {
    this.showKey.update(prev => ({ ...prev, [id]: !prev[id] }));
  }

  copyKey(key: string): void {
    navigator.clipboard.writeText(key).then(() => this.toast.success('Device key copied'));
  }

  confirmRegenKey(sp: any): void {
    this.confirm.confirm({
      title: 'Regenerate Device Key',
      message: `This will invalidate the current key for "${sp.name}". The physical scanner must be reconfigured. Continue?`,
      confirmLabel: 'Regenerate',
      variant: 'warning',
    }).then(confirmed => {
      if (!confirmed) return;
      this.api.post(`/scan-points/${sp.id}/regenerate-key`, {}).subscribe({
        next: () => { this.toast.success('Key regenerated'); this.load(); },
        error: (e: any) => this.toast.error(e?.error?.message ?? 'Failed'),
      });
    });
  }

  confirmDelete(sp: any): void {
    this.confirm.confirm({
      title: 'Delete Scan Point',
      message: `Delete "${sp.name}"? This cannot be undone.`,
      confirmLabel: 'Delete',
      variant: 'danger',
    }).then(confirmed => {
      if (!confirmed) return;
      this.api.delete(`/scan-points/${sp.id}`).subscribe({
        next: () => { this.toast.success('Scan point deleted'); this.load(); },
        error: (e: any) => this.toast.error(e?.error?.message ?? 'Failed'),
      });
    });
  }
}

import { Component, inject, signal, OnInit } from '@angular/core';
import { JsonPipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ApiService, PageHeaderComponent, LoadingSpinnerComponent, BadgeComponent, ToastService } from '@lodgik/shared';

@Component({
  selector: 'app-commission-config',
  standalone: true,
  imports: [FormsModule, JsonPipe, PageHeaderComponent, LoadingSpinnerComponent, BadgeComponent],
  template: `
    <ui-page-header title="Commission Configuration" icon="hand-coins" [breadcrumbs]="['Marketplace', 'Commission']" subtitle="Manage commission tiers and rates">
      <button (click)="showForm.set(true)" class="px-4 py-2 bg-sage-600 text-white text-sm rounded-lg hover:bg-sage-700">+ New Tier</button>
    </ui-page-header>
    <ui-loading [loading]="loading()"></ui-loading>

    @if (showForm()) {
      <div class="bg-white rounded-lg border p-5 mb-6">
        <h3 class="text-sm font-semibold mb-4">{{ editId() ? 'Edit' : 'Create' }} Commission Tier</h3>
        <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div><label class="block text-xs font-medium mb-1">Name *</label><input [(ngModel)]="form.name" class="w-full px-3 py-2 border rounded-lg text-sm"></div>
          <div><label class="block text-xs font-medium mb-1">Type</label>
            <select [(ngModel)]="form.type" class="w-full px-3 py-2 border rounded-lg text-sm"><option value="percentage">Percentage</option><option value="flat">Flat Amount</option></select>
          </div>
          <div><label class="block text-xs font-medium mb-1">Default?</label>
            <select [(ngModel)]="form.is_default" class="w-full px-3 py-2 border rounded-lg text-sm"><option [ngValue]="false">No</option><option [ngValue]="true">Yes</option></select>
          </div>
          <div><label class="block text-xs font-medium mb-1">New Subscription Rate</label><input [(ngModel)]="form.new_subscription_rate" type="number" step="0.01" class="w-full px-3 py-2 border rounded-lg text-sm"></div>
          <div><label class="block text-xs font-medium mb-1">Renewal Rate</label><input [(ngModel)]="form.renewal_rate" type="number" step="0.01" class="w-full px-3 py-2 border rounded-lg text-sm"></div>
          <div><label class="block text-xs font-medium mb-1">Upgrade Rate</label><input [(ngModel)]="form.upgrade_rate" type="number" step="0.01" class="w-full px-3 py-2 border rounded-lg text-sm"></div>
          <div class="md:col-span-3"><label class="block text-xs font-medium mb-1">Description</label><textarea [(ngModel)]="form.description" rows="2" class="w-full px-3 py-2 border rounded-lg text-sm"></textarea></div>
        </div>
        <div class="flex gap-2 mt-4">
          <button (click)="save()" class="px-4 py-2 bg-sage-600 text-white text-sm rounded-lg">{{ editId() ? 'Update' : 'Create' }}</button>
          <button (click)="cancel()" class="px-4 py-2 bg-gray-100 text-sm rounded-lg">Cancel</button>
        </div>
      </div>
    }

    @if (!loading()) {
      <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        @for (t of tiers(); track t.id) {
          <div class="bg-white rounded-lg border p-5">
            <div class="flex items-center justify-between mb-3">
              <h4 class="text-sm font-semibold">{{ t.name }}</h4>
              <div class="flex gap-1">
                @if (t.is_default) { <ui-badge variant="primary">Default</ui-badge> }
                <ui-badge [variant]="t.is_active ? 'success' : 'neutral'">{{ t.is_active ? 'Active' : 'Inactive' }}</ui-badge>
              </div>
            </div>
            @if (t.description) { <p class="text-xs text-gray-500 mb-3">{{ t.description }}</p> }
            <div class="space-y-1.5 text-sm">
              <div class="flex justify-between"><span class="text-gray-500">New Subscription:</span><span class="font-medium">{{ t.new_subscription_rate }}{{ t.type === 'percentage' ? '%' : ' ₦' }}</span></div>
              <div class="flex justify-between"><span class="text-gray-500">Renewal:</span><span class="font-medium">{{ t.renewal_rate }}{{ t.type === 'percentage' ? '%' : ' ₦' }}</span></div>
              <div class="flex justify-between"><span class="text-gray-500">Upgrade:</span><span class="font-medium">{{ t.upgrade_rate }}{{ t.type === 'percentage' ? '%' : ' ₦' }}</span></div>
            </div>
            @if (t.plan_overrides) { <div class="mt-2 pt-2 border-t text-xs text-gray-500">Plan overrides: {{ t.plan_overrides | json }}</div> }
            <button (click)="edit(t)" class="mt-3 text-sage-600 hover:underline text-xs">Edit Tier</button>
          </div>
        } @empty { <div class="col-span-3 text-center py-12 text-gray-400 bg-white rounded-lg border">No tiers configured</div> }
      </div>
    }
  `,
})
export class CommissionConfigPage implements OnInit {
  private api = inject(ApiService);
  private toast = inject(ToastService);
  loading = signal(true); tiers = signal<any[]>([]); showForm = signal(false); editId = signal<string>('');
  form: any = { name: '', type: 'percentage', new_subscription_rate: '10.00', renewal_rate: '5.00', upgrade_rate: '8.00', description: '', is_default: false };

  ngOnInit(): void { this.load(); }
  load(): void { this.api.get('/admin/merchants/tiers').subscribe({ next: (r: any) => { this.tiers.set(r.data || []); this.loading.set(false); }, error: () => this.loading.set(false) }); }
  save(): void {
    const obs = this.editId() ? this.api.put(`/admin/merchants/tiers/${this.editId()}`, this.form) : this.api.post('/admin/merchants/tiers', this.form);
    obs.subscribe({ next: () => { this.toast.success(this.editId() ? 'Tier updated' : 'Tier created'); this.cancel(); this.load(); } });
  }
  edit(t: any): void { this.form = { ...t }; this.editId.set(t.id); this.showForm.set(true); }
  cancel(): void { this.showForm.set(false); this.editId.set(''); this.form = { name: '', type: 'percentage', new_subscription_rate: '10.00', renewal_rate: '5.00', upgrade_rate: '8.00', description: '', is_default: false }; }
}

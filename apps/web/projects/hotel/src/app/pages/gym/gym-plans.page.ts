import { Component, inject, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ApiService, PageHeaderComponent, LoadingSpinnerComponent, AuthService, ActivePropertyService} from '@lodgik/shared';

@Component({
  selector: 'app-gym-plans',
  standalone: true,
  imports: [FormsModule, PageHeaderComponent, LoadingSpinnerComponent],
  template: `
    <ui-page-header title="Membership Plans" subtitle="Configure gym membership pricing and features">
      <button (click)="showForm = true; editPlan = null; resetForm()" class="px-4 py-2 bg-sage-600 text-white text-sm font-medium rounded-lg hover:bg-sage-700">+ New Plan</button>
    </ui-page-header>

    <ui-loading [loading]="loading()"></ui-loading>

    <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
      @for (p of plans(); track p.id) {
        <div class="bg-white border rounded-xl p-5 relative" [class.opacity-50]="!p.is_active">
          @if (!p.is_active) { <span class="absolute top-2 right-2 bg-gray-200 text-gray-500 px-2 py-0.5 rounded text-xs">Inactive</span> }
          <h3 class="text-lg font-semibold mb-1">{{ p.name }}</h3>
          <p class="text-2xl font-bold text-sage-600 mb-2">₦{{ formatAmount(p.price) }}<span class="text-sm text-gray-400 font-normal"> / {{ p.duration_days }} days</span></p>
          @if (p.description) { <p class="text-xs text-gray-500 mb-3">{{ p.description }}</p> }
          <div class="space-y-1 text-xs text-gray-600">
            <div>{{ p.includes_classes ? '✅' : '❌' }} Group classes {{ p.max_classes ? '(' + p.max_classes + '/period)' : '(unlimited)' }}</div>
            <div>{{ p.includes_pool ? '✅' : '❌' }} Pool & spa access</div>
          </div>
          <div class="flex gap-2 mt-4">
            <button (click)="editPlanFn(p)" class="px-3 py-1.5 border rounded-lg text-xs text-sage-600 hover:bg-sage-50">Edit</button>
            <button (click)="toggleActive(p)" class="px-3 py-1.5 border rounded-lg text-xs" [class]="p.is_active ? 'text-red-500 hover:bg-red-50' : 'text-green-500 hover:bg-green-50'">
              {{ p.is_active ? 'Deactivate' : 'Activate' }}
            </button>
          </div>
        </div>
      }
    </div>

    @if (showForm) {
      <div class="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50" (click)="showForm = false">
        <div class="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6" (click)="$event.stopPropagation()">
          <h3 class="text-lg font-semibold mb-4">{{ editPlan ? 'Edit Plan' : 'New Membership Plan' }}</h3>
          <div class="space-y-3">
            <div><label class="text-xs text-gray-500">Plan Name *</label><input [(ngModel)]="form.name" class="w-full border rounded-lg px-3 py-2 text-sm"/></div>
            <div class="grid grid-cols-2 gap-3">
              <div><label class="text-xs text-gray-500">Duration (days) *</label><input [(ngModel)]="form.duration_days" type="number" class="w-full border rounded-lg px-3 py-2 text-sm"/></div>
              <div><label class="text-xs text-gray-500">Price (₦) *</label><input [(ngModel)]="form.price_display" type="number" class="w-full border rounded-lg px-3 py-2 text-sm"/></div>
            </div>
            <div><label class="text-xs text-gray-500">Description</label><textarea [(ngModel)]="form.description" rows="2" class="w-full border rounded-lg px-3 py-2 text-sm"></textarea></div>
            <div class="grid grid-cols-2 gap-3">
              <div><label class="text-xs text-gray-500">Max Classes/Period</label><input [(ngModel)]="form.max_classes" type="number" placeholder="Blank = unlimited" class="w-full border rounded-lg px-3 py-2 text-sm"/></div>
              <div><label class="text-xs text-gray-500">Sort Order</label><input [(ngModel)]="form.sort_order" type="number" class="w-full border rounded-lg px-3 py-2 text-sm"/></div>
            </div>
            <div class="flex gap-4">
              <label class="flex items-center gap-2 text-sm"><input [(ngModel)]="form.includes_classes" type="checkbox"/> Group classes</label>
              <label class="flex items-center gap-2 text-sm"><input [(ngModel)]="form.includes_pool" type="checkbox"/> Pool/Spa</label>
            </div>
          </div>
          <div class="flex justify-end gap-2 mt-4">
            <button (click)="showForm = false" class="px-4 py-2 border rounded-lg text-sm">Cancel</button>
            <button (click)="save()" [disabled]="saving" class="px-4 py-2 bg-sage-600 text-white rounded-lg text-sm font-medium">{{ saving ? 'Saving...' : 'Save' }}</button>
          </div>
        </div>
      </div>
    }
  `,
})
export class GymPlansPage implements OnInit {
  private api = inject(ApiService);
  private auth = inject(AuthService);
  private activeProperty = inject(ActivePropertyService);
  loading = signal(true);
  plans = signal<any[]>([]);
  showForm = false;
  saving = false;
  editPlan: any = null;
  form: any = {};

  ngOnInit() { this.load(); }

  load() {
    this.api.get(`/gym/plans?property_id=${this.activeProperty.propertyId()}&active=0`).subscribe({
      next: (r: any) => { this.plans.set(r.data || []); this.loading.set(false); },
    });
  }

  resetForm() { this.form = { name: '', duration_days: 30, price_display: 0, description: '', max_classes: null, includes_classes: true, includes_pool: false, sort_order: 0 }; }

  editPlanFn(p: any) {
    this.editPlan = p;
    this.form = { ...p, price_display: +p.price / 100 };
    this.showForm = true;
  }

  save() {
    this.saving = true;
    const payload = { ...this.form, price: String(Math.round(this.form.price_display * 100)), property_id: this.activeProperty.propertyId() };
    delete payload.price_display;
    const req$ = this.editPlan ? this.api.put(`/gym/plans/${this.editPlan.id}`, payload) : this.api.post('/gym/plans', payload);
    req$.subscribe({ next: () => { this.saving = false; this.showForm = false; this.load(); }, error: () => this.saving = false });
  }

  toggleActive(p: any) {
    this.api.put(`/gym/plans/${p.id}`, { is_active: !p.is_active }).subscribe({ next: () => this.load() });
  }

  formatAmount(kobo: any): string { return (+kobo / 100).toLocaleString('en-NG'); }
}

import { Component, inject, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ApiService, PageHeaderComponent, LoadingSpinnerComponent, ToastService, ConfirmDialogService, ActivePropertyService } from '@lodgik/shared';

@Component({
  selector: 'app-amenities',
  standalone: true,
  imports: [FormsModule, PageHeaderComponent, LoadingSpinnerComponent],
  template: `
    <ui-page-header title="Amenities" icon="sparkles" [breadcrumbs]="['Hotel', 'Amenities']" subtitle="Manage hotel amenities and room features">
      <button (click)="showForm = true" class="px-4 py-2 bg-sage-600 text-white text-sm font-medium rounded-lg hover:bg-sage-700">+ Add Amenity</button>
    </ui-page-header>

    <ui-loading [loading]="loading()"></ui-loading>

    @if (!loading()) {
      <!-- Category Filter -->
      <div class="flex flex-wrap gap-2 mb-5">
        <button (click)="activeCategory = ''"
          class="px-3 py-1.5 text-xs font-medium rounded-full border transition-colors"
          [class]="activeCategory === '' ? 'bg-sage-600 text-white border-sage-600' : 'border-gray-300 text-gray-500 hover:border-gray-400'">
          All ({{ amenities().length }})
        </button>
        @for (cat of categories(); track cat) {
          <button (click)="activeCategory = cat"
            class="px-3 py-1.5 text-xs font-medium rounded-full border transition-colors"
            [class]="activeCategory === cat ? 'bg-sage-600 text-white border-sage-600' : 'border-gray-300 text-gray-500 hover:border-gray-400'">
            {{ cat }} ({{ countByCategory(cat) }})
          </button>
        }
      </div>

      <!-- Amenities Grid -->
      <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        @for (a of filtered(); track a.id) {
          <div class="bg-white rounded-xl border border-gray-100 shadow-card p-4 hover:shadow-md transition-shadow">
            <div class="flex items-start justify-between mb-2">
              <div class="flex items-center gap-2">
                @if (a.icon) {
                  @if (isEmoji(a.icon)) {
                    <span class="text-2xl leading-none">{{ a.icon }}</span>
                  } @else {
                    <span class="material-icons text-sage-600" style="font-size:28px;">{{ a.icon }}</span>
                  }
                }
                <div>
                  <h4 class="text-sm font-semibold text-gray-900">{{ a.name }}</h4>
                  @if (a.category) {
                    <span class="text-[10px] font-medium uppercase tracking-wide text-gray-400">{{ a.category }}</span>
                  }
                </div>
              </div>
              <div class="flex items-center gap-1">
                <button (click)="openEdit(a)" class="p-1.5 text-gray-400 hover:text-sage-600 rounded-lg hover:bg-sage-50 transition-colors" title="Edit">✏️</button>
                <button (click)="deleteAmenity(a.id)" class="p-1.5 text-gray-400 hover:text-red-500 rounded-lg hover:bg-red-50 transition-colors" title="Delete">🗑️</button>
              </div>
            </div>
            @if (a.description) {
              <p class="text-xs text-gray-500 mt-1 line-clamp-2">{{ a.description }}</p>
            }
            @if (a.is_chargeable) {
              <div class="mt-2 flex items-center gap-1">
                <span class="text-xs px-2 py-0.5 rounded-full bg-amber-100 text-amber-700 font-medium">₦{{ (+a.charge_amount || 0).toLocaleString() }} / stay</span>
              </div>
            }
          </div>
        }
        @if (filtered().length === 0) {
          <div class="col-span-4 text-center py-16 text-gray-400">
            <p class="text-4xl mb-3">✨</p>
            <p class="text-base">No amenities added yet</p>
            <p class="text-sm mt-1">Click "+ Add Amenity" to get started</p>
          </div>
        }
      </div>
    }

    <!-- Add/Edit Modal -->
    @if (showForm) {
      <div class="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50" (click)="closeForm()">
        <div class="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6" (click)="$event.stopPropagation()">
          <h3 class="text-lg font-semibold mb-5">{{ editingId ? 'Edit Amenity' : 'Add Amenity' }}</h3>
          <div class="space-y-3">
            <div>
              <label class="text-xs font-medium text-gray-500 mb-1 block">Name *</label>
              <input [(ngModel)]="form.name" placeholder="e.g. Swimming Pool" class="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm bg-gray-50 focus:bg-white focus:ring-2 focus:ring-sage-200 outline-none" />
            </div>
            <div class="grid grid-cols-2 gap-3">
              <div>
                <label class="text-xs font-medium text-gray-500 mb-1 block">Category</label>
                <select [(ngModel)]="form.category" class="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm bg-gray-50">
                  <option value="">Select category</option>
                  <option value="Recreation">Recreation</option>
                  <option value="Wellness">Wellness</option>
                  <option value="Business">Business</option>
                  <option value="Dining">Dining</option>
                  <option value="Transport">Transport</option>
                  <option value="Connectivity">Connectivity</option>
                  <option value="Safety">Safety</option>
                  <option value="Comfort">Comfort</option>
                  <option value="Other">Other</option>
                </select>
              </div>
              <div>
                <label class="text-xs font-medium text-gray-500 mb-1 block">Icon (emoji)</label>
                <input [(ngModel)]="form.icon" placeholder="🏊" class="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm bg-gray-50" />
              </div>
            </div>
            <div>
              <label class="text-xs font-medium text-gray-500 mb-1 block">Description</label>
              <textarea [(ngModel)]="form.description" placeholder="Brief description..." rows="2" class="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm bg-gray-50 resize-none"></textarea>
            </div>
            <label class="flex items-center gap-2 text-sm">
              <input type="checkbox" [(ngModel)]="form.is_chargeable" class="rounded border-gray-300">
              <span>Chargeable amenity</span>
            </label>
            @if (form.is_chargeable) {
              <div>
                <label class="text-xs font-medium text-gray-500 mb-1 block">Charge Amount (₦)</label>
                <input [(ngModel)]="form.charge_amount" type="number" placeholder="0" class="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm bg-gray-50" />
              </div>
            }
          </div>
          <div class="flex justify-end gap-3 mt-5">
            <button (click)="closeForm()" class="px-4 py-2 text-sm text-gray-600 border border-gray-200 rounded-xl hover:bg-gray-50">Cancel</button>
            <button (click)="submit()" class="px-5 py-2 text-sm bg-sage-600 text-white font-medium rounded-xl hover:bg-sage-700">
              {{ editingId ? 'Update' : 'Add' }}
            </button>
          </div>
        </div>
      </div>
    }
  `,
})
export default class AmenitiesPage implements OnInit {
  private api = inject(ApiService);
  private toast = inject(ToastService);
  private confirm = inject(ConfirmDialogService);
  private activeProperty = inject(ActivePropertyService);

  loading = signal(true);
  amenities = signal<any[]>([]);
  activeCategory = '';
  showForm = false;
  editingId: string | null = null;

  form: any = { name: '', category: '', icon: '', description: '', is_chargeable: false, charge_amount: 0 };

  categories(): string[] {
    const cats = new Set(this.amenities().map(a => a.category).filter(Boolean));
    return Array.from(cats);
  }

  filtered(): any[] {
    return this.activeCategory
      ? this.amenities().filter(a => a.category === this.activeCategory)
      : this.amenities();
  }

  countByCategory(cat: string): number {
    return this.amenities().filter(a => a.category === cat).length;
  }

  /** Returns true if the string is emoji, false if it's a Material Icons ligature name */
  isEmoji(icon: string): boolean {
    return /\p{Emoji}/u.test(icon) && !/^[a-z_]+$/.test(icon);
  }

  ngOnInit(): void { this.load(); }

  load(): void {
    const pid = this.activeProperty.propertyId();
    this.api.get('/amenities', pid ? { property_id: pid } : {}).subscribe({
      next: r => { this.amenities.set(r.data || []); this.loading.set(false); },
      error: () => this.loading.set(false),
    });
  }

  openEdit(a: any): void {
    this.editingId = a.id;
    this.form = { ...a };
    this.showForm = true;
  }

  closeForm(): void {
    this.showForm = false;
    this.editingId = null;
    this.form = { name: '', category: '', icon: '', description: '', is_chargeable: false, charge_amount: 0 };
  }

  submit(): void {
    if (!this.form.name) { this.toast.error('Name is required'); return; }
    const pid = this.activeProperty.propertyId();
    const payload = { ...this.form, property_id: pid };

    const req = this.editingId
      ? this.api.put(`/amenities/${this.editingId}`, payload)
      : this.api.post('/amenities', payload);

    req.subscribe((r: any) => {
      if (r.success) {
        this.toast.success(this.editingId ? 'Amenity updated' : 'Amenity added');
        this.closeForm();
        this.load();
      } else this.toast.error(r.message || 'Failed');
    });
  }

  async deleteAmenity(id: string): Promise<void> {
    const ok = await this.confirm.confirm({ title: 'Delete Amenity', message: 'Remove this amenity?', variant: 'warning' });
    if (ok) {
      this.api.delete(`/amenities/${id}`).subscribe({
        next: () => { this.toast.success('Amenity deleted'); this.load(); },
      });
    }
  }
}

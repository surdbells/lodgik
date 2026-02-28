import { Component, inject, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ApiService, PageHeaderComponent, LoadingSpinnerComponent, ActivePropertyService, ToastService } from '@lodgik/shared';

@Component({
  selector: 'app-guest-preferences',
  standalone: true,
  imports: [FormsModule, PageHeaderComponent, LoadingSpinnerComponent],
  template: `
    <ui-page-header title="Guest Preferences" icon="star" [breadcrumbs]="['Guest Experience', 'Preferences']"
      subtitle="VIP preferences, dietary needs, and communication settings">
    </ui-page-header>

    <ui-loading [loading]="loading()"></ui-loading>

    <!-- ── Edit Panel (slide-over) ───────────────────────── -->
    @if (editingPref) {
      <div class="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex justify-end" (click)="editingPref = null">
        <div class="bg-white w-full max-w-md h-full overflow-y-auto p-6 shadow-2xl" (click)="$event.stopPropagation()">
          <div class="flex justify-between items-center mb-6">
            <div>
              <h3 class="text-base font-semibold text-gray-800">Edit Preferences</h3>
              <p class="text-xs text-gray-400 mt-0.5">{{ editingPref.guest_name || editingPref.guest_id }}</p>
            </div>
            <button (click)="editingPref = null" class="text-gray-400 hover:text-gray-600 text-xl">&times;</button>
          </div>

          <!-- VIP Status -->
          <div class="mb-4">
            <label class="text-xs font-semibold text-gray-500 uppercase mb-2 block">VIP Status</label>
            <select [(ngModel)]="editForm.vip_status" class="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm bg-gray-50">
              <option value="">Not VIP</option>
              <option value="silver">Silver</option>
              <option value="gold">Gold</option>
              <option value="platinum">Platinum</option>
              <option value="vvip">VVIP</option>
            </select>
          </div>

          <!-- Room Preferences -->
          <div class="mb-4">
            <label class="text-xs font-semibold text-gray-500 uppercase mb-2 block">Room Preferences</label>
            <div class="space-y-2">
              @for (item of roomPrefItems; track item.key) {
                <label class="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" [(ngModel)]="editForm.room_preferences[item.key]" class="rounded border-gray-300 text-sage-600">
                  <span class="text-sm text-gray-700">{{ item.label }}</span>
                </label>
              }
            </div>
            <div class="mt-2">
              <input [(ngModel)]="editForm.room_preferences.floor_preference" placeholder="Floor preference (e.g. high floor)"
                class="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm bg-gray-50">
            </div>
          </div>

          <!-- Dietary Restrictions -->
          <div class="mb-4">
            <label class="text-xs font-semibold text-gray-500 uppercase mb-2 block">Dietary Restrictions</label>
            <div class="flex flex-wrap gap-2 mb-2">
              @for (d of dietaryOptions; track d) {
                <label class="flex items-center gap-1.5 cursor-pointer px-2 py-1 rounded-lg border text-xs"
                  [class]="editForm.dietary_restrictions.includes(d) ? 'border-sage-300 bg-sage-50 text-sage-700' : 'border-gray-200 text-gray-600'">
                  <input type="checkbox" [checked]="editForm.dietary_restrictions.includes(d)" (change)="toggleDietary(d)" class="hidden">
                  {{ d }}
                </label>
              }
            </div>
          </div>

          <!-- Communication Preference -->
          <div class="mb-4">
            <label class="text-xs font-semibold text-gray-500 uppercase mb-2 block">Communication Preference</label>
            <select [(ngModel)]="editForm.communication_preference" class="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm bg-gray-50">
              <option value="email">Email</option>
              <option value="sms">SMS</option>
              <option value="whatsapp">WhatsApp</option>
              <option value="none">None</option>
            </select>
          </div>

          <!-- Language -->
          <div class="mb-4">
            <label class="text-xs font-semibold text-gray-500 uppercase mb-2 block">Preferred Language</label>
            <select [(ngModel)]="editForm.preferred_language" class="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm bg-gray-50">
              <option value="en">English</option>
              <option value="fr">French</option>
              <option value="ar">Arabic</option>
              <option value="yo">Yoruba</option>
              <option value="ha">Hausa</option>
              <option value="ig">Igbo</option>
            </select>
          </div>

          <!-- Notes -->
          <div class="mb-6">
            <label class="text-xs font-semibold text-gray-500 uppercase mb-2 block">Special Notes</label>
            <textarea [(ngModel)]="editForm.notes" rows="3" placeholder="Any special requirements or notes..."
              class="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm bg-gray-50 resize-none"></textarea>
          </div>

          <div class="flex gap-2">
            <button (click)="savePreferences()" [disabled]="savingPref" class="flex-1 py-2.5 bg-sage-600 text-white text-sm font-medium rounded-xl hover:bg-sage-700 disabled:opacity-50">
              {{ savingPref ? 'Saving...' : 'Save Preferences' }}
            </button>
            <button (click)="editingPref = null" class="px-4 py-2 text-sm text-gray-500 border border-gray-200 rounded-xl hover:bg-gray-50">Cancel</button>
          </div>
        </div>
      </div>
    }

    @if (!loading()) {
      <!-- Search -->
      <div class="mb-4">
        <input [(ngModel)]="searchQuery" (ngModelChange)="filterPrefs()" placeholder="Search by guest name..."
          class="w-full max-w-sm px-4 py-2 border border-gray-200 rounded-xl text-sm bg-white shadow-sm focus:ring-2 focus:ring-sage-200 focus:border-sage-400 outline-none">
      </div>

      <div class="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
        <table class="w-full text-sm">
          <thead class="bg-gray-50 border-b border-gray-100">
            <tr>
              <th class="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Guest</th>
              <th class="px-4 py-3 text-center text-xs font-semibold text-gray-500 uppercase">VIP</th>
              <th class="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Room Prefs</th>
              <th class="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Dietary</th>
              <th class="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Comm.</th>
              <th class="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Language</th>
              <th class="px-4 py-3"></th>
            </tr>
          </thead>
          <tbody class="divide-y divide-gray-50">
            @for (p of filteredPrefs(); track p.id) {
              <tr class="hover:bg-gray-50/50 transition-colors">
                <td class="px-4 py-3 font-medium text-gray-800">{{ p.guest_name || p.guest_id }}</td>
                <td class="px-4 py-3 text-center">
                  @if (p.vip_status) {
                    <span class="text-xs font-bold px-2 py-0.5 rounded-full" [class]="vipBadge(p.vip_status)">{{ p.vip_status }}</span>
                  } @else {
                    <span class="text-gray-300">—</span>
                  }
                </td>
                <td class="px-4 py-3 text-xs text-gray-500">{{ formatJson(p.room_preferences) }}</td>
                <td class="px-4 py-3 text-xs text-gray-500">{{ (p.dietary_restrictions || []).join(', ') || '—' }}</td>
                <td class="px-4 py-3 text-xs text-gray-600">{{ p.communication_preference || '—' }}</td>
                <td class="px-4 py-3 text-xs text-gray-600">{{ p.preferred_language || '—' }}</td>
                <td class="px-4 py-3 text-right">
                  <button (click)="openEdit(p)" class="text-xs px-2.5 py-1 border border-gray-200 rounded-lg text-gray-500 hover:bg-gray-50">Edit</button>
                </td>
              </tr>
            } @empty {
              <tr><td colspan="7" class="px-4 py-12 text-center text-gray-400">
                <p class="text-sm font-medium">No guest preferences recorded</p>
              </td></tr>
            }
          </tbody>
        </table>
      </div>
    }
  `,
})
export default class GuestPreferencesPage implements OnInit {
  private api = inject(ApiService);
  private activeProperty = inject(ActivePropertyService);
  private toast = inject(ToastService);

  loading = signal(true);
  prefs = signal<any[]>([]);
  filteredPrefs = signal<any[]>([]);
  searchQuery = '';
  editingPref: any = null;
  savingPref = false;
  editForm: any = { vip_status: '', room_preferences: {}, dietary_restrictions: [], communication_preference: 'email', preferred_language: 'en', notes: '' };

  roomPrefItems = [
    { key: 'quiet_room', label: 'Quiet room' },
    { key: 'non_smoking', label: 'Non-smoking' },
    { key: 'away_from_elevator', label: 'Away from elevator' },
    { key: 'extra_pillows', label: 'Extra pillows' },
    { key: 'feather_free', label: 'Feather-free bedding' },
  ];
  dietaryOptions = ['Vegetarian', 'Vegan', 'Halal', 'Kosher', 'Gluten-free', 'Nut allergy', 'Lactose-free', 'Diabetic'];

  ngOnInit() { this.load(); }

  load() {
    const pid = this.activeProperty.propertyId();
    this.api.get(`/loyalty/guests/preferences?property_id=${pid}`).subscribe({
      next: (r: any) => {
        const data = r?.data || [];
        this.prefs.set(data);
        this.filteredPrefs.set(data);
        this.loading.set(false);
      },
      error: () => this.loading.set(false),
    });
  }

  filterPrefs() {
    const q = this.searchQuery.toLowerCase();
    if (!q) { this.filteredPrefs.set(this.prefs()); return; }
    this.filteredPrefs.set(this.prefs().filter(p =>
      (p.guest_name || '').toLowerCase().includes(q) || (p.guest_id || '').toLowerCase().includes(q)
    ));
  }

  openEdit(pref: any) {
    this.editingPref = pref;
    this.editForm = {
      vip_status: pref.vip_status || '',
      room_preferences: { ...(pref.room_preferences || {}) },
      dietary_restrictions: [...(pref.dietary_restrictions || [])],
      communication_preference: pref.communication_preference || 'email',
      preferred_language: pref.preferred_language || 'en',
      notes: pref.notes || '',
    };
  }

  toggleDietary(d: string) {
    const idx = this.editForm.dietary_restrictions.indexOf(d);
    if (idx >= 0) { this.editForm.dietary_restrictions.splice(idx, 1); }
    else { this.editForm.dietary_restrictions.push(d); }
  }

  savePreferences() {
    this.savingPref = true;
    const body = { ...this.editForm };
    if (!body.vip_status) body.vip_status = null;
    this.api.put(`/loyalty/guests/${this.editingPref.guest_id}/preferences`, body).subscribe({
      next: (r: any) => {
        this.savingPref = false;
        if (r.success) { this.toast.success('Preferences saved'); this.editingPref = null; this.load(); }
        else { this.toast.error(r.message || 'Failed to save'); }
      },
      error: () => { this.savingPref = false; this.toast.error('Failed to save preferences'); },
    });
  }

  formatJson(obj: any): string {
    if (!obj || Object.keys(obj).length === 0) return '—';
    return Object.entries(obj).filter(([, v]) => v && v !== false).map(([k]) => k.replace(/_/g, ' ')).join(', ') || '—';
  }

  vipBadge(status: string): string {
    const map: Record<string, string> = {
      silver: 'bg-gray-100 text-gray-600', gold: 'bg-amber-100 text-amber-700',
      platinum: 'bg-purple-100 text-purple-700', vvip: 'bg-red-100 text-red-700',
    };
    return map[status] || 'bg-gray-100 text-gray-500';
  }
}

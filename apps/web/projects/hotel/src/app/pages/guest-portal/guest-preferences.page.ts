import { Component, inject, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { GuestApiService } from '../../services/guest-api.service';
import { GuestThemeService } from '../../services/guest-theme.service';

@Component({
  selector: 'app-guest-preferences',
  standalone: true,
  imports: [FormsModule],
  template: `
    <div class="min-h-screen" [class]="theme.isDark() ? 'bg-gray-950 text-white' : 'bg-gray-50 text-gray-900'">

      <!-- Header -->
      <div class="sticky top-0 z-10 px-4 pt-12 pb-4"
           [class]="theme.isDark() ? 'bg-gray-950/95 backdrop-blur-md' : 'bg-white/95 backdrop-blur-md border-b border-gray-100'">
        <div class="flex items-center gap-3 max-w-lg mx-auto">
          <a href="/guest/home" class="w-8 h-8 flex items-center justify-center rounded-full"
             [class]="theme.isDark() ? 'bg-gray-800 text-gray-300' : 'bg-gray-100 text-gray-600'">
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7"/>
            </svg>
          </a>
          <div>
            <h1 class="text-lg font-bold">My Preferences</h1>
            <p class="text-xs" [class]="theme.isDark() ? 'text-gray-400' : 'text-gray-500'">
              Help us personalise your stay
            </p>
          </div>
        </div>
      </div>

      <div class="px-4 py-4 pb-28 max-w-lg mx-auto space-y-5">

        @if (loading()) {
          <div class="flex justify-center py-12">
            <div class="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
          </div>
        } @else {

          <!-- Room Preferences -->
          <div class="rounded-2xl p-4 space-y-3"
               [class]="theme.isDark() ? 'bg-gray-900' : 'bg-white shadow-sm border border-gray-100'">
            <h2 class="text-sm font-semibold flex items-center gap-2">🛏️ Room Preferences</h2>

            <div>
              <label class="text-xs" [class]="theme.isDark() ? 'text-gray-400' : 'text-gray-500'">Pillow type</label>
              <select [(ngModel)]="prefs.room_preferences.pillow_type"
                class="w-full mt-1 rounded-xl px-3 py-2.5 text-sm border focus:outline-none focus:ring-2 focus:ring-blue-500"
                [class]="theme.isDark() ? 'bg-gray-800 border-gray-700 text-white' : 'bg-gray-50 border-gray-200 text-gray-900'">
                <option value="">No preference</option>
                <option value="soft">Soft</option>
                <option value="firm">Firm</option>
                <option value="memory_foam">Memory foam</option>
                <option value="feather">Feather</option>
              </select>
            </div>

            <div>
              <label class="text-xs" [class]="theme.isDark() ? 'text-gray-400' : 'text-gray-500'">Floor preference</label>
              <select [(ngModel)]="prefs.room_preferences.floor_preference"
                class="w-full mt-1 rounded-xl px-3 py-2.5 text-sm border focus:outline-none focus:ring-2 focus:ring-blue-500"
                [class]="theme.isDark() ? 'bg-gray-800 border-gray-700 text-white' : 'bg-gray-50 border-gray-200 text-gray-900'">
                <option value="">No preference</option>
                <option value="low">Low floor (1–5)</option>
                <option value="mid">Mid floor (6–10)</option>
                <option value="high">High floor (11+)</option>
              </select>
            </div>

            <div>
              <label class="text-xs" [class]="theme.isDark() ? 'text-gray-400' : 'text-gray-500'">Room temperature</label>
              <select [(ngModel)]="prefs.room_preferences.temperature"
                class="w-full mt-1 rounded-xl px-3 py-2.5 text-sm border focus:outline-none focus:ring-2 focus:ring-blue-500"
                [class]="theme.isDark() ? 'bg-gray-800 border-gray-700 text-white' : 'bg-gray-50 border-gray-200 text-gray-900'">
                <option value="">No preference</option>
                <option value="cool">Cool (18–21°C)</option>
                <option value="comfortable">Comfortable (22–24°C)</option>
                <option value="warm">Warm (25–27°C)</option>
              </select>
            </div>

            <div class="flex items-center justify-between">
              <span class="text-sm" [class]="theme.isDark() ? 'text-gray-300' : 'text-gray-700'">Quiet room (away from lifts)</span>
              <button (click)="prefs.room_preferences.quiet_room = !prefs.room_preferences.quiet_room"
                class="w-12 h-6 rounded-full transition-colors relative"
                [class]="prefs.room_preferences.quiet_room ? 'bg-blue-500' : (theme.isDark() ? 'bg-gray-700' : 'bg-gray-300')">
                <span class="absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform"
                      [class]="prefs.room_preferences.quiet_room ? 'translate-x-6' : 'translate-x-0.5'"></span>
              </button>
            </div>

            <div class="flex items-center justify-between">
              <span class="text-sm" [class]="theme.isDark() ? 'text-gray-300' : 'text-gray-700'">Late checkout preferred</span>
              <button (click)="prefs.room_preferences.late_checkout = !prefs.room_preferences.late_checkout"
                class="w-12 h-6 rounded-full transition-colors relative"
                [class]="prefs.room_preferences.late_checkout ? 'bg-blue-500' : (theme.isDark() ? 'bg-gray-700' : 'bg-gray-300')">
                <span class="absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform"
                      [class]="prefs.room_preferences.late_checkout ? 'translate-x-6' : 'translate-x-0.5'"></span>
              </button>
            </div>
          </div>

          <!-- Dietary Restrictions -->
          <div class="rounded-2xl p-4"
               [class]="theme.isDark() ? 'bg-gray-900' : 'bg-white shadow-sm border border-gray-100'">
            <h2 class="text-sm font-semibold mb-3 flex items-center gap-2">🍽️ Dietary Restrictions</h2>
            <div class="grid grid-cols-2 gap-2">
              @for (opt of dietaryOptions; track opt.value) {
                <button (click)="toggleDietary(opt.value)"
                  class="flex items-center gap-2 px-3 py-2.5 rounded-xl border text-sm transition-colors"
                  [class]="isDietarySelected(opt.value)
                    ? 'bg-green-500 border-green-500 text-white'
                    : (theme.isDark() ? 'bg-gray-800 border-gray-700 text-gray-300' : 'bg-gray-50 border-gray-200 text-gray-700')">
                  <span>{{ opt.icon }}</span>
                  <span>{{ opt.label }}</span>
                </button>
              }
            </div>
          </div>

          <!-- Special Occasions -->
          <div class="rounded-2xl p-4 space-y-3"
               [class]="theme.isDark() ? 'bg-gray-900' : 'bg-white shadow-sm border border-gray-100'">
            <h2 class="text-sm font-semibold flex items-center gap-2">🎉 Special Occasions</h2>
            <p class="text-xs" [class]="theme.isDark() ? 'text-gray-400' : 'text-gray-500'">Let us know so we can make it special</p>

            <div class="grid grid-cols-3 gap-2">
              @for (occ of occasionOptions; track occ.value) {
                <button (click)="toggleOccasion(occ.value)"
                  class="flex flex-col items-center gap-1 p-2.5 rounded-xl border text-xs transition-colors"
                  [class]="isOccasionSelected(occ.value)
                    ? 'bg-pink-500 border-pink-500 text-white'
                    : (theme.isDark() ? 'bg-gray-800 border-gray-700 text-gray-300' : 'bg-gray-50 border-gray-200 text-gray-700')">
                  <span class="text-lg">{{ occ.icon }}</span>
                  <span>{{ occ.label }}</span>
                </button>
              }
            </div>
          </div>

          <!-- Communication -->
          <div class="rounded-2xl p-4"
               [class]="theme.isDark() ? 'bg-gray-900' : 'bg-white shadow-sm border border-gray-100'">
            <h2 class="text-sm font-semibold mb-3 flex items-center gap-2">💬 Preferred Contact</h2>
            <div class="grid grid-cols-2 gap-2">
              @for (opt of commOptions; track opt.value) {
                <button (click)="prefs.communication_preference = opt.value"
                  class="flex items-center gap-2 px-3 py-2.5 rounded-xl border text-sm transition-colors"
                  [class]="prefs.communication_preference === opt.value
                    ? 'bg-blue-500 border-blue-500 text-white'
                    : (theme.isDark() ? 'bg-gray-800 border-gray-700 text-gray-300' : 'bg-gray-50 border-gray-200 text-gray-700')">
                  <span>{{ opt.icon }}</span>
                  <span>{{ opt.label }}</span>
                </button>
              }
            </div>
          </div>

          <!-- Language -->
          <div class="rounded-2xl p-4"
               [class]="theme.isDark() ? 'bg-gray-900' : 'bg-white shadow-sm border border-gray-100'">
            <h2 class="text-sm font-semibold mb-3 flex items-center gap-2">🌐 Preferred Language</h2>
            <select [(ngModel)]="prefs.preferred_language"
              class="w-full rounded-xl px-3 py-2.5 text-sm border focus:outline-none focus:ring-2 focus:ring-blue-500"
              [class]="theme.isDark() ? 'bg-gray-800 border-gray-700 text-white' : 'bg-gray-50 border-gray-200 text-gray-900'">
              <option value="en">English</option>
              <option value="yo">Yoruba</option>
              <option value="ha">Hausa</option>
              <option value="ig">Igbo</option>
              <option value="fr">French</option>
              <option value="ar">Arabic</option>
            </select>
          </div>

          <!-- Additional notes -->
          <div class="rounded-2xl p-4"
               [class]="theme.isDark() ? 'bg-gray-900' : 'bg-white shadow-sm border border-gray-100'">
            <h2 class="text-sm font-semibold mb-2 flex items-center gap-2">📝 Additional Notes</h2>
            <textarea [(ngModel)]="prefs.notes" rows="3" placeholder="Anything else we should know…"
              class="w-full rounded-xl px-3 py-2.5 text-sm border resize-none focus:outline-none focus:ring-2 focus:ring-blue-500"
              [class]="theme.isDark() ? 'bg-gray-800 border-gray-700 text-white placeholder-gray-600' : 'bg-gray-50 border-gray-200 text-gray-900 placeholder-gray-400'">
            </textarea>
          </div>

          <!-- Save button -->
          <button (click)="save()" [disabled]="saving()"
            class="w-full py-4 rounded-2xl text-sm font-semibold transition-all"
            [class]="saving()
              ? 'bg-gray-400 text-white cursor-not-allowed'
              : 'bg-blue-600 text-white hover:bg-blue-700 active:scale-95'">
            {{ saving() ? 'Saving…' : '💾 Save Preferences' }}
          </button>

          @if (saved()) {
            <div class="text-center text-sm text-green-500 font-medium">✅ Preferences saved!</div>
          }
        }
      </div>
    </div>
  `,
})
export default class GuestPreferencesPage implements OnInit {
  private guestApi = inject(GuestApiService);
  theme = inject(GuestThemeService);

  loading = signal(true);
  saving  = signal(false);
  saved   = signal(false);

  prefs: any = {
    room_preferences:        { pillow_type: '', floor_preference: '', temperature: '', quiet_room: false, late_checkout: false },
    dietary_restrictions:    [],
    special_occasions:       [],
    communication_preference: 'whatsapp',
    preferred_language:       'en',
    notes:                    '',
  };

  readonly dietaryOptions = [
    { value: 'vegetarian',  icon: '🥗', label: 'Vegetarian' },
    { value: 'vegan',       icon: '🌱', label: 'Vegan' },
    { value: 'halal',       icon: '🌙', label: 'Halal' },
    { value: 'gluten_free', icon: '🌾', label: 'Gluten-free' },
    { value: 'dairy_free',  icon: '🥛', label: 'Dairy-free' },
    { value: 'nut_allergy', icon: '🥜', label: 'Nut allergy' },
  ];

  readonly occasionOptions = [
    { value: 'birthday',      icon: '🎂', label: 'Birthday' },
    { value: 'anniversary',   icon: '💍', label: 'Anniversary' },
    { value: 'honeymoon',     icon: '🥂', label: 'Honeymoon' },
    { value: 'baby_shower',   icon: '👶', label: 'Baby' },
    { value: 'graduation',    icon: '🎓', label: 'Graduation' },
    { value: 'business_trip', icon: '💼', label: 'Business' },
  ];

  readonly commOptions = [
    { value: 'whatsapp', icon: '💬', label: 'WhatsApp' },
    { value: 'sms',      icon: '📱', label: 'SMS' },
    { value: 'email',    icon: '📧', label: 'Email' },
    { value: 'phone',    icon: '📞', label: 'Phone' },
  ];

  ngOnInit(): void {
    this.guestApi.get('/preferences').subscribe({
      next: (r: any) => {
        if (r.success && r.data && Object.keys(r.data).length > 0) {
          this.prefs = {
            room_preferences:        r.data.room_preferences        ?? this.prefs.room_preferences,
            dietary_restrictions:    r.data.dietary_restrictions    ?? [],
            special_occasions:       r.data.special_occasions       ?? [],
            communication_preference: r.data.communication_preference ?? 'whatsapp',
            preferred_language:       r.data.preferred_language      ?? 'en',
            notes:                    r.data.notes                   ?? '',
          };
        }
        this.loading.set(false);
      },
      error: () => this.loading.set(false),
    });
  }

  toggleDietary(value: string): void {
    const arr: string[] = this.prefs.dietary_restrictions ?? [];
    this.prefs.dietary_restrictions = arr.includes(value) ? arr.filter(v => v !== value) : [...arr, value];
  }

  isDietarySelected(value: string): boolean {
    return (this.prefs.dietary_restrictions ?? []).includes(value);
  }

  toggleOccasion(value: string): void {
    const arr: string[] = this.prefs.special_occasions ?? [];
    this.prefs.special_occasions = arr.includes(value) ? arr.filter(v => v !== value) : [...arr, value];
  }

  isOccasionSelected(value: string): boolean {
    return (this.prefs.special_occasions ?? []).includes(value);
  }

  save(): void {
    this.saving.set(true);
    this.saved.set(false);
    this.guestApi.post('/preferences', this.prefs).subscribe({
      next: (r: any) => {
        this.saving.set(false);
        if (r.success) { this.saved.set(true); setTimeout(() => this.saved.set(false), 3000); }
      },
      error: () => this.saving.set(false),
    });
  }
}

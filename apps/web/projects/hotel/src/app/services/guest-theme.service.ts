import { Injectable, signal, computed, effect } from '@angular/core';

export type GuestTheme = 'dark' | 'light';

/**
 * Shared theme service for the Guest PWA.
 * Persists preference in localStorage under 'guest_theme'.
 * Exposes pre-built Tailwind class strings for common UI patterns
 * so every page uses the same semantic tokens.
 */
@Injectable({ providedIn: 'root' })
export class GuestThemeService {
  readonly theme = signal<GuestTheme>(
    (localStorage.getItem('guest_theme') as GuestTheme) ?? 'light'
  );

  readonly isDark = computed(() => this.theme() === 'dark');

  constructor() {
    effect(() => localStorage.setItem('guest_theme', this.theme()));
  }

  toggle(): void {
    this.theme.set(this.isDark() ? 'light' : 'dark');
  }

  // ── Semantic tokens ───────────────────────────────────────────

  readonly page = computed(() =>
    this.isDark()
      ? 'min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 text-white'
      : 'min-h-screen bg-stone-50 text-gray-900'
  );

  readonly header = computed(() =>
    this.isDark() ? 'border-white/10 bg-slate-900/60 backdrop-blur-md' : 'border-gray-200 bg-white/90 backdrop-blur-md'
  );

  readonly navBg = computed(() =>
    this.isDark() ? 'border-white/10 bg-slate-900/80 backdrop-blur-md' : 'border-gray-200 bg-white/90 backdrop-blur-md'
  );

  readonly navItem = computed(() =>
    this.isDark() ? 'text-white/50 hover:text-white' : 'text-gray-400 hover:text-gray-700'
  );

  readonly navActive = computed(() =>
    this.isDark() ? 'text-amber-400' : 'text-amber-500'
  );

  readonly card = computed(() =>
    this.isDark() ? 'bg-white/10 border border-white/10' : 'bg-white border border-gray-200 shadow-sm'
  );

  readonly cardSubtle = computed(() =>
    this.isDark() ? 'bg-white/5 border border-white/5' : 'bg-gray-50 border border-gray-100'
  );

  readonly cardHover = computed(() =>
    this.isDark()
      ? 'bg-white/10 hover:bg-white/15 border border-white/10'
      : 'bg-white hover:bg-gray-50 border border-gray-200 shadow-sm'
  );

  readonly text = computed(() =>
    this.isDark() ? 'text-white' : 'text-gray-900'
  );

  readonly muted = computed(() =>
    this.isDark() ? 'text-white/50' : 'text-gray-500'
  );

  readonly subtle = computed(() =>
    this.isDark() ? 'text-white/30' : 'text-gray-400'
  );

  readonly divider = computed(() =>
    this.isDark() ? 'border-white/10' : 'border-gray-200'
  );

  readonly input = computed(() =>
    this.isDark()
      ? 'bg-white/10 border border-white/20 text-white placeholder-white/30 focus:border-amber-400 focus:outline-none focus:ring-0'
      : 'bg-white border border-gray-300 text-gray-900 placeholder-gray-400 focus:border-amber-500 focus:outline-none focus:ring-0'
  );

  readonly inputLabel = computed(() =>
    this.isDark() ? 'text-white/60 text-xs font-medium' : 'text-gray-600 text-xs font-medium'
  );

  readonly spinner = computed(() =>
    this.isDark() ? 'border-amber-400 border-t-transparent' : 'border-amber-500 border-t-transparent'
  );

  readonly accent = computed(() =>
    this.isDark() ? 'text-amber-400' : 'text-amber-500'
  );

  readonly accentBg = computed(() =>
    this.isDark() ? 'bg-amber-400/20 border border-amber-400/30' : 'bg-amber-50 border border-amber-200'
  );

  readonly accentText = computed(() =>
    this.isDark() ? 'text-amber-300' : 'text-amber-700'
  );

  readonly badge = computed(() =>
    this.isDark() ? 'bg-white/10 text-white/70' : 'bg-gray-100 text-gray-600'
  );

  readonly danger = computed(() =>
    this.isDark() ? 'bg-red-500/20 border border-red-500/30 text-red-300' : 'bg-red-50 border border-red-200 text-red-600'
  );

  readonly success = computed(() =>
    this.isDark() ? 'bg-emerald-500/20 border border-emerald-500/30 text-emerald-300' : 'bg-emerald-50 border border-emerald-200 text-emerald-700'
  );

  readonly iconCircle = computed(() =>
    this.isDark() ? 'bg-white/10' : 'bg-gray-100'
  );

  readonly backBtn = computed(() =>
    this.isDark() ? 'text-white/50 hover:text-white' : 'text-gray-400 hover:text-gray-700'
  );
}

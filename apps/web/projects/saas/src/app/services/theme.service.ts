import { Injectable, signal, effect } from '@angular/core';

@Injectable({ providedIn: 'root' })
export class ThemeService {
  theme = signal<'light' | 'dark'>(
    (typeof localStorage !== 'undefined' ? localStorage.getItem('lodgik-theme') : null) === 'dark'
      ? 'dark' : 'light'
  );

  constructor() {
    effect(() => {
      const t = this.theme();
      document.documentElement.setAttribute('data-theme', t);
      if (typeof localStorage !== 'undefined') localStorage.setItem('lodgik-theme', t);
    });
  }

  toggle(): void { this.theme.update(v => v === 'light' ? 'dark' : 'light'); }
}

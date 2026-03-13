import { Injectable, signal, effect } from '@angular/core';

export type Theme = 'light' | 'dark';

@Injectable({ providedIn: 'root' })
export class ThemeService {
  readonly theme = signal<Theme>(this.getInitial());

  constructor() {
    effect(() => {
      const t = this.theme();
      document.documentElement.setAttribute('data-theme', t);
      localStorage.setItem('lodgik-theme', t);
    });
  }

  toggle(): void {
    this.theme.update(t => (t === 'light' ? 'dark' : 'light'));
  }

  private getInitial(): Theme {
    const stored = localStorage.getItem('lodgik-theme') as Theme | null;
    if (stored === 'dark' || stored === 'light') return stored;
    // Light by default — only use system preference if no stored value
    return 'light';
  }
}

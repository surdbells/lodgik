import { Injectable, signal } from '@angular/core';

export interface BrandingConfig {
  primaryColor: string;
  secondaryColor: string;
  logoUrl: string | null;
  appName: string;
}

const DEFAULT_BRANDING: BrandingConfig = {
  primaryColor: '#1e3a5f',
  secondaryColor: '#f59e0b',
  logoUrl: null,
  appName: 'Lodgik',
};

@Injectable({ providedIn: 'root' })
export class BrandingService {
  private _config = signal<BrandingConfig>(DEFAULT_BRANDING);
  readonly config = this._config.asReadonly();

  apply(config: Partial<BrandingConfig>): void {
    const merged = { ...this._config(), ...config };
    this._config.set(merged);
    this.applyCssVariables(merged);
  }

  reset(): void {
    this._config.set(DEFAULT_BRANDING);
    this.applyCssVariables(DEFAULT_BRANDING);
  }

  private applyCssVariables(config: BrandingConfig): void {
    const root = document.documentElement;
    const primary = this.hexToHSL(config.primaryColor);
    const secondary = this.hexToHSL(config.secondaryColor);

    root.style.setProperty('--lodgik-primary-500', config.primaryColor);
    root.style.setProperty('--lodgik-primary-600', this.darken(config.primaryColor, 10));
    root.style.setProperty('--lodgik-primary-700', this.darken(config.primaryColor, 20));
    root.style.setProperty('--lodgik-primary-50', this.lighten(config.primaryColor, 45));
    root.style.setProperty('--lodgik-primary-100', this.lighten(config.primaryColor, 38));
    root.style.setProperty('--lodgik-accent-500', config.secondaryColor);
    root.style.setProperty('--lodgik-accent-600', this.darken(config.secondaryColor, 10));

    // Angular Material CSS variable overrides
    root.style.setProperty('--mat-sys-primary', config.primaryColor);
    root.style.setProperty('--mat-sys-tertiary', config.secondaryColor);
  }

  private hexToRGB(hex: string): [number, number, number] {
    const h = hex.replace('#', '');
    return [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)];
  }

  private hexToHSL(hex: string): [number, number, number] {
    const [r, g, b] = this.hexToRGB(hex).map(v => v / 255);
    const max = Math.max(r, g, b), min = Math.min(r, g, b);
    let h = 0, s = 0;
    const l = (max + min) / 2;
    if (max !== min) {
      const d = max - min;
      s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
      if (max === r) h = ((g - b) / d + (g < b ? 6 : 0)) / 6;
      else if (max === g) h = ((b - r) / d + 2) / 6;
      else h = ((r - g) / d + 4) / 6;
    }
    return [Math.round(h * 360), Math.round(s * 100), Math.round(l * 100)];
  }

  private darken(hex: string, amount: number): string {
    const [r, g, b] = this.hexToRGB(hex);
    const f = 1 - amount / 100;
    return `#${[r, g, b].map(v => Math.round(v * f).toString(16).padStart(2, '0')).join('')}`;
  }

  private lighten(hex: string, amount: number): string {
    const [r, g, b] = this.hexToRGB(hex);
    const f = amount / 100;
    return `#${[r, g, b].map(v => Math.round(v + (255 - v) * f).toString(16).padStart(2, '0')).join('')}`;
  }
}

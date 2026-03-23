import { Injectable, inject } from '@angular/core';
import { Router } from '@angular/router';

export interface TourStep {
  element?: string;      // CSS selector for element to highlight
  title: string;
  description: string;
  side?: 'top' | 'bottom' | 'left' | 'right';
  align?: 'start' | 'center' | 'end';
}

@Injectable({ providedIn: 'root' })
export class TourService {
  private router = inject(Router);
  private driver: any = null;
  private initialized = false;

  private async init(): Promise<void> {
    if (this.initialized) return;
    const { driver } = await import('driver.js');
    this.driver = driver;
    // Inject driver.js CSS
    if (!document.getElementById('driver-js-css')) {
      const link = document.createElement('link');
      link.id = 'driver-js-css';
      link.rel = 'stylesheet';
      link.href = 'https://cdn.jsdelivr.net/npm/driver.js@1/dist/driver.css';
      document.head.appendChild(link);
    }
    this.initialized = true;
  }

  async start(steps: TourStep[], tourKey?: string): Promise<void> {
    await this.init();
    const driverSteps = steps.map(s => ({
      element: s.element,
      popover: {
        title: s.title,
        description: s.description,
        side: s.side ?? 'bottom',
        align: s.align ?? 'start',
      },
    }));
    const d = this.driver({
      animate: true,
      overlayOpacity: 0.3,
      showProgress: true,
      progressText: '{{current}} of {{total}}',
      nextBtnText: 'Next →',
      prevBtnText: '← Back',
      doneBtnText: 'Got it!',
      onDestroyStarted: () => {
        if (tourKey) this.markSeen(tourKey);
        d.destroy();
      },
      steps: driverSteps,
    });
    d.drive();
  }

  /** Returns true if the user has NOT seen this tour before */
  isNew(tourKey: string): boolean {
    return !localStorage.getItem(`tour_seen_${tourKey}`);
  }

  markSeen(tourKey: string): void {
    localStorage.setItem(`tour_seen_${tourKey}`, '1');
  }

  /** Auto-start tour if user hasn't seen it */
  async autoStart(steps: TourStep[], tourKey: string): Promise<void> {
    if (this.isNew(tourKey)) {
      // Small delay so page elements render first
      setTimeout(() => this.start(steps, tourKey), 800);
    }
  }
}

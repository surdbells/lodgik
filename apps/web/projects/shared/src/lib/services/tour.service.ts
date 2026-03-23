import { Injectable } from '@angular/core';
import { driver as driverFn } from 'driver.js';

export interface TourStep {
  element?: string;
  title: string;
  description: string;
  side?: 'top' | 'bottom' | 'left' | 'right';
  align?: 'start' | 'center' | 'end';
}

@Injectable({ providedIn: 'root' })
export class TourService {

  start(steps: TourStep[], tourKey?: string): void {
    const d = driverFn({
      animate: true,
      overlayOpacity: 0.4,
      showProgress: true,
      progressText: '{{current}} of {{total}}',
      nextBtnText: 'Next →',
      prevBtnText: '← Back',
      doneBtnText: '✓ Got it',
      popoverClass: 'lodgik-tour-popover',
      onDestroyStarted: () => {
        if (tourKey) this.markSeen(tourKey);
        d.destroy();
      },
      steps: steps.map(s => ({
        // If element selector finds nothing, driver.js centres the popover automatically
        element: s.element,
        popover: {
          title: `<span style="color:#4A7A4A">${s.title}</span>`,
          description: s.description,
          side: s.side ?? 'bottom',
          align: s.align ?? 'start',
        },
      })),
    });
    d.drive();
  }

  isNew(tourKey: string): boolean {
    return !localStorage.getItem(`tour_seen_${tourKey}`);
  }

  markSeen(tourKey: string): void {
    localStorage.setItem(`tour_seen_${tourKey}`, '1');
  }

  autoStart(steps: TourStep[], tourKey: string): void {
    if (this.isNew(tourKey)) {
      setTimeout(() => this.start(steps, tourKey), 600);
    }
  }
}

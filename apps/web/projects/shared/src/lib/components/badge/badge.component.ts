import { Component, Input } from '@angular/core';

@Component({
  selector: 'ui-badge',
  standalone: true,
  template: `
    <span class="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium"
          [class]="variantClass">
      @if (dot) { <span class="w-1.5 h-1.5 rounded-full mr-1.5" [class]="dotClass"></span> }
      <ng-content></ng-content>
    </span>
  `,
})
export class BadgeComponent {
  @Input() variant: 'success' | 'danger' | 'warning' | 'info' | 'neutral' | 'primary' = 'neutral';
  @Input() dot = false;

  get variantClass(): string {
    const map: Record<string, string> = {
      success: 'bg-emerald-50 text-emerald-700',
      danger: 'bg-red-50 text-red-700',
      warning: 'bg-amber-50 text-amber-700',
      info: 'bg-blue-50 text-blue-700',
      primary: 'bg-sage-50 text-sage-700',
      neutral: 'bg-gray-100 text-gray-600',
    };
    return map[this.variant] ?? map['neutral'];
  }

  get dotClass(): string {
    const map: Record<string, string> = {
      success: 'bg-emerald-500',
      danger: 'bg-red-500',
      warning: 'bg-amber-500',
      info: 'bg-blue-500',
      primary: 'bg-sage-500',
      neutral: 'bg-gray-400',
    };
    return map[this.variant] ?? map['neutral'];
  }
}

import { Component, Input, Output, EventEmitter } from '@angular/core';

@Component({
  selector: 'ui-empty-state',
  standalone: true,
  template: `
    <div class="flex flex-col items-center justify-center py-12 px-4 text-center">
      @if (icon) {
        <span class="text-4xl mb-3">{{ icon }}</span>
      }
      <h3 class="text-base font-semibold text-gray-700">{{ title }}</h3>
      @if (message) {
        <p class="mt-1 text-sm text-gray-500 max-w-sm">{{ message }}</p>
      }
      @if (actionLabel) {
        <button (click)="action.emit()" class="mt-4 px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors">
          {{ actionLabel }}
        </button>
      }
      <ng-content></ng-content>
    </div>
  `,
})
export class EmptyStateComponent {
  @Input() title = 'Nothing here yet';
  @Input() message?: string;
  @Input() icon?: string;
  @Input() actionLabel?: string;
  @Output() action = new EventEmitter<void>();
}

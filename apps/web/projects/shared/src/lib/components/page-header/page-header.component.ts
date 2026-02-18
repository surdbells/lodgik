import { Component, Input } from '@angular/core';

@Component({
  selector: 'ui-page-header',
  standalone: true,
  template: `
    <div class="mb-6">
      @if (breadcrumbs.length) {
        <nav class="flex items-center gap-1.5 text-sm text-gray-400 mb-2">
          @for (crumb of breadcrumbs; track crumb; let last = $last) {
            <span [class.text-gray-600]="last" [class.font-medium]="last">{{ crumb }}</span>
            @if (!last) { <span>›</span> }
          }
        </nav>
      }
      <div class="flex items-center justify-between gap-4">
        <div>
          <h1 class="text-2xl font-bold text-gray-900">{{ title }}</h1>
          @if (subtitle) {
            <p class="mt-0.5 text-sm text-gray-500">{{ subtitle }}</p>
          }
        </div>
        <div class="flex items-center gap-2 shrink-0">
          <ng-content></ng-content>
        </div>
      </div>
    </div>
  `,
})
export class PageHeaderComponent {
  @Input() title = '';
  @Input() subtitle?: string;
  @Input() breadcrumbs: string[] = [];
}

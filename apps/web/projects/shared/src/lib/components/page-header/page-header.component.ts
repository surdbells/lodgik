import { Component, Input } from '@angular/core';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'ui-page-header',
  standalone: true,
  imports: [RouterLink],
  template: `
    <!-- Breadcrumbs -->
    @if (breadcrumbs.length) {
      <nav class="flex items-center gap-1.5 text-sm text-gray-400 mb-4">
        <a routerLink="/dashboard" class="hover:text-gray-600 transition-colors">
          <svg class="w-4 h-4" viewBox="0 0 16 16" fill="none">
            <path d="M2 6l6-4 6 4v7a1 1 0 01-1 1H3a1 1 0 01-1-1V6z" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
          </svg>
        </a>
        @for (crumb of breadcrumbs; track crumb; let last = $last) {
          <span class="text-gray-300">/</span>
          <span [class.text-sage-700]="last" [class.font-semibold]="last" class="text-sm">{{ crumb }}</span>
        }
      </nav>
    }

    <div class="flex items-start justify-between gap-4 mb-6">
      <div class="flex items-center gap-4">
        <!-- Page icon -->
        @if (icon) {
          <div class="w-12 h-12 rounded-xl bg-sage-50 flex items-center justify-center text-2xl shrink-0">
            {{ icon }}
          </div>
        }
        <div>
          <div class="flex items-center gap-2">
            <h1 class="text-2xl font-bold text-gray-900 font-heading">{{ title }}</h1>
            @if (starred) {
              <button class="text-gray-300 hover:text-amber-400 transition-colors">
                <svg class="w-5 h-5" fill="none" viewBox="0 0 20 20">
                  <path d="M10 2l2.09 6.26H18l-5 3.64L14.18 18 10 14.27 5.82 18 7 11.9l-5-3.64h5.91L10 2z" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round"/>
                </svg>
              </button>
            }
          </div>
          @if (subtitle) {
            <p class="mt-0.5 text-sm text-gray-500">{{ subtitle }}</p>
          }
        </div>
      </div>
      <div class="flex items-center gap-2 shrink-0">
        <ng-content></ng-content>
      </div>
    </div>
  `,
})
export class PageHeaderComponent {
  @Input() title = '';
  @Input() subtitle?: string;
  @Input() icon?: string;
  @Input() breadcrumbs: string[] = [];
  @Input() starred = false;
}

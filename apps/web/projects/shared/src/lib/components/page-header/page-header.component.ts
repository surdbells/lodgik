import { Component, Input, Output, EventEmitter } from '@angular/core';
import { RouterLink } from '@angular/router';
import { LucideAngularModule, LUCIDE_ICONS, LucideIconProvider } from 'lucide-angular';
import { LODGIK_ICONS } from '../../icons';

@Component({
  selector: 'ui-page-header',
  standalone: true,
  imports: [RouterLink, LucideAngularModule],
  providers: [{ provide: LUCIDE_ICONS, multi: true, useValue: new LucideIconProvider(LODGIK_ICONS) }],
  template: `
    <!-- Breadcrumbs -->
    @if (breadcrumbs.length) {
      <nav class="flex items-center gap-1.5 text-sm text-gray-400 mb-4">
        <a routerLink="/dashboard" class="hover:text-gray-600 transition-colors">
          <lucide-icon name="home" [size]="15" [strokeWidth]="1.75"></lucide-icon>
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
          <div class="w-12 h-12 rounded-xl bg-sage-50 flex items-center justify-center shrink-0">
            @if (isLucide) {
              <lucide-icon [name]="icon" [size]="24" [strokeWidth]="1.75" class="text-sage-600"></lucide-icon>
            } @else {
              <span class="text-2xl">{{ icon }}</span>
            }
          </div>
        }
        <div>
          <h1 class="text-2xl font-bold text-gray-900 font-heading">{{ title }}</h1>
          @if (subtitle) {
            <p class="mt-0.5 text-sm text-gray-500">{{ subtitle }}</p>
          }
        </div>
      </div>
      <div class="flex items-center gap-2 shrink-0">
        <ng-content></ng-content>
        @if (tourKey) {
          <button (click)="tourClick.emit()"
            title="Take a guided tour of this page"
            class="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-violet-600 bg-violet-50 border border-violet-200 rounded-lg hover:bg-violet-100 transition-colors">
            <span class="text-sm">?</span> Tour
          </button>
        }
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
  @Input() tourKey?: string;
  @Output() tourClick = new EventEmitter<void>();

  /** True if icon is a lucide name (lowercase kebab-case), false if emoji */
  get isLucide(): boolean {
    return !!this.icon && /^[a-z][a-z0-9-]*$/.test(this.icon);
  }
}

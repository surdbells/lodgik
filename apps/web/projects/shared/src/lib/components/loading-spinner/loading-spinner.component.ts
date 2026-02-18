import { Component, Input } from '@angular/core';

@Component({
  selector: 'ui-loading',
  standalone: true,
  template: `
    @if (loading) {
      <div class="flex items-center justify-center" [class.py-12]="!inline" [class.py-1]="inline">
        <div class="animate-spin rounded-full border-2 border-gray-300 border-t-blue-600"
             [style.width.px]="size" [style.height.px]="size"></div>
        @if (message) {
          <span class="ml-3 text-sm text-gray-500">{{ message }}</span>
        }
      </div>
    }
  `,
})
export class LoadingSpinnerComponent {
  @Input() loading = true;
  @Input() size = 28;
  @Input() message?: string;
  @Input() inline = false;
}

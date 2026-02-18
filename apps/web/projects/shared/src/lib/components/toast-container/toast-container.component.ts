import { Component, inject } from '@angular/core';
import { ToastService } from '../../services/toast.service';

@Component({
  selector: 'ui-toast-container',
  standalone: true,
  template: `
    <div class="fixed top-4 right-4 z-[60] flex flex-col gap-2 max-w-sm">
      @for (toast of toastService.toasts(); track toast.id) {
        <div class="flex items-start gap-2 px-4 py-3 rounded-lg shadow-lg border text-sm animate-slide-in"
             [class]="toastClass(toast.type)">
          <span class="shrink-0 mt-0.5">{{ toastIcon(toast.type) }}</span>
          <p class="flex-1 text-gray-800">{{ toast.message }}</p>
          <button (click)="toastService.dismiss(toast.id)"
                  class="text-gray-400 hover:text-gray-600 shrink-0">✕</button>
        </div>
      }
    </div>
  `,
  styles: [`
    @keyframes slideIn {
      from { transform: translateX(100%); opacity: 0; }
      to { transform: translateX(0); opacity: 1; }
    }
    .animate-slide-in { animation: slideIn 0.25s ease-out; }
  `],
})
export class ToastContainerComponent {
  toastService = inject(ToastService);

  toastClass(type: string): string {
    switch (type) {
      case 'success': return 'bg-emerald-50 border-emerald-200';
      case 'error': return 'bg-red-50 border-red-200';
      case 'warning': return 'bg-amber-50 border-amber-200';
      default: return 'bg-blue-50 border-blue-200';
    }
  }

  toastIcon(type: string): string {
    switch (type) {
      case 'success': return '✓';
      case 'error': return '✕';
      case 'warning': return '⚠';
      default: return 'ℹ';
    }
  }
}

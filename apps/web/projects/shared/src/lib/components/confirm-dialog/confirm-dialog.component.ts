import { Component, Injectable, signal, inject } from '@angular/core';

export interface ConfirmOptions {
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: 'danger' | 'warning' | 'info';
}

@Injectable({ providedIn: 'root' })
export class ConfirmDialogService {
  readonly visible = signal(false);
  readonly options = signal<ConfirmOptions>({ title: '', message: '' });
  private resolver?: (confirmed: boolean) => void;

  confirm(opts: ConfirmOptions): Promise<boolean> {
    this.options.set(opts);
    this.visible.set(true);
    return new Promise<boolean>(resolve => {
      this.resolver = resolve;
    });
  }

  resolve(confirmed: boolean): void {
    this.visible.set(false);
    this.resolver?.(confirmed);
    this.resolver = undefined;
  }
}

@Component({
  selector: 'ui-confirm-dialog',
  standalone: true,
  template: `
    @if (dialog.visible()) {
      <div class="fixed inset-0 z-50 flex items-center justify-center">
        <!-- Backdrop -->
        <div class="absolute inset-0 bg-black/40" (click)="dialog.resolve(false)"></div>

        <!-- Dialog -->
        <div class="relative bg-white rounded-xl shadow-xl w-full max-w-md mx-4 p-6">
          <div class="flex items-start gap-3">
            <span class="text-2xl shrink-0">{{ dialogIcon }}</span>
            <div>
              <h3 class="text-lg font-semibold text-gray-900">{{ opts().title }}</h3>
              <p class="mt-1 text-sm text-gray-600">{{ opts().message }}</p>
            </div>
          </div>

          <div class="mt-6 flex justify-end gap-2">
            <button (click)="dialog.resolve(false)"
                    class="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors">
              {{ opts().cancelLabel || 'Cancel' }}
            </button>
            <button (click)="dialog.resolve(true)"
                    class="px-4 py-2 text-sm font-medium text-white rounded-lg transition-colors"
                    [class]="confirmBtnClass">
              {{ opts().confirmLabel || 'Confirm' }}
            </button>
          </div>
        </div>
      </div>
    }
  `,
})
export class ConfirmDialogComponent {
  dialog = inject(ConfirmDialogService);
  opts = this.dialog.options;

  get dialogIcon(): string {
    switch (this.opts().variant) {
      case 'danger': return '⚠️';
      case 'warning': return '⚡';
      default: return 'ℹ️';
    }
  }

  get confirmBtnClass(): string {
    switch (this.opts().variant) {
      case 'danger': return 'bg-red-600 hover:bg-red-700';
      case 'warning': return 'bg-amber-600 hover:bg-amber-700';
      default: return 'bg-blue-600 hover:bg-blue-700';
    }
  }
}

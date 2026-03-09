import { Component, Input, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../../services/api.service';
import { ToastService } from '../../services/toast.service';

/**
 * ReceiptActionsComponent
 * Renders View / Download / Share-by-email actions for any receipt URL.
 *
 * Inputs:
 *   url       — the receipt file URL (renders nothing if falsy)
 *   shareUrl  — API POST path for share-receipt e.g. /folios/payments/{id}/share-receipt
 *               (relative to ApiService baseUrl — no leading /api needed)
 *   label     — descriptive name shown in the share modal (e.g. "Payment Receipt")
 */
@Component({
  selector: 'app-receipt-actions',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    @if (url) {
      <div class="flex items-center gap-1.5 flex-wrap">

        <!-- View -->
        <a [href]="url" target="_blank" rel="noopener" title="View receipt"
           class="inline-flex items-center gap-1 px-2 py-1 rounded text-[11px] font-medium bg-blue-50 text-blue-700 hover:bg-blue-100 transition-colors">
          <svg class="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
            <path stroke-linecap="round" stroke-linejoin="round"
              d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/>
            <path stroke-linecap="round" stroke-linejoin="round"
              d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"/>
          </svg>
          View
        </a>

        <!-- Download -->
        <a [href]="url" [download]="downloadName()" title="Download receipt"
           class="inline-flex items-center gap-1 px-2 py-1 rounded text-[11px] font-medium bg-gray-100 text-gray-700 hover:bg-gray-200 transition-colors">
          <svg class="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
            <path stroke-linecap="round" stroke-linejoin="round"
              d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"/>
          </svg>
          Download
        </a>

        <!-- Share by email -->
        @if (shareUrl) {
          <button (click)="openShare()" title="Share receipt by email"
                  class="inline-flex items-center gap-1 px-2 py-1 rounded text-[11px] font-medium bg-emerald-50 text-emerald-700 hover:bg-emerald-100 transition-colors">
            <svg class="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
              <path stroke-linecap="round" stroke-linejoin="round"
                d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"/>
            </svg>
            Share
          </button>
        }
      </div>

      <!-- ── Share modal ──────────────────────────────────────── -->
      @if (showModal()) {
        <div class="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4"
             (click)="closeShare()">
          <div class="bg-white rounded-xl shadow-xl w-full max-w-sm p-6"
               (click)="$event.stopPropagation()">

            <!-- Header -->
            <div class="flex items-start justify-between mb-4">
              <div>
                <h3 class="text-sm font-semibold text-gray-800">Share by Email</h3>
                <p class="text-xs text-gray-500 mt-0.5">
                  A link to this {{ label || 'receipt' }} will be emailed to the recipient.
                </p>
              </div>
              <button (click)="closeShare()" class="text-gray-400 hover:text-gray-600 p-1 -mt-1 -mr-1">
                <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                  <path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12"/>
                </svg>
              </button>
            </div>

            <!-- Name field -->
            <label class="block text-xs font-medium text-gray-600 mb-1">
              Recipient Name <span class="text-gray-400 font-normal">(optional)</span>
            </label>
            <input type="text" [(ngModel)]="shareName" placeholder="e.g. John Doe"
                   class="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm mb-3
                          focus:outline-none focus:ring-2 focus:ring-emerald-500/30">

            <!-- Email field -->
            <label class="block text-xs font-medium text-gray-600 mb-1">
              Email Address <span class="text-red-400">*</span>
            </label>
            <input type="email" [(ngModel)]="shareEmail" placeholder="recipient@example.com"
                   class="w-full border rounded-lg px-3 py-2 text-sm mb-1
                          focus:outline-none focus:ring-2 focus:ring-emerald-500/30"
                   [class.border-red-300]="emailError()"
                   [class.border-gray-200]="!emailError()">
            @if (emailError()) {
              <p class="text-xs text-red-500 mb-1">{{ emailError() }}</p>
            }

            <!-- Actions -->
            <div class="flex gap-2 mt-4">
              <button (click)="sendShare()" [disabled]="sending()"
                      class="flex-1 bg-emerald-600 text-white text-sm font-medium py-2 rounded-lg
                             hover:bg-emerald-700 disabled:opacity-60 transition-colors">
                {{ sending() ? 'Sending…' : 'Send Receipt' }}
              </button>
              <button (click)="closeShare()" [disabled]="sending()"
                      class="px-4 py-2 text-sm text-gray-600 border border-gray-200 rounded-lg
                             hover:bg-gray-50 disabled:opacity-60 transition-colors">
                Cancel
              </button>
            </div>

          </div>
        </div>
      }
    }
  `,
})
export class ReceiptActionsComponent {
  /** The receipt/proof file URL. Nothing renders if this is falsy. */
  @Input() url: string | null | undefined = null;
  /** API POST path for share-receipt — relative to base URL, e.g. /folios/payments/{id}/share-receipt */
  @Input() shareUrl: string | null | undefined = null;
  /** Human-readable label used in the share modal */
  @Input() label: string = 'receipt';

  private api   = inject(ApiService);
  private toast = inject(ToastService);

  showModal  = signal(false);
  sending    = signal(false);
  emailError = signal('');

  shareEmail = '';
  shareName  = '';

  /** Derives a filename from the URL for the download attribute */
  downloadName(): string {
    if (!this.url) return 'receipt';
    try {
      const parts = new URL(this.url).pathname.split('/');
      return decodeURIComponent(parts[parts.length - 1]) || 'receipt';
    } catch {
      return 'receipt';
    }
  }

  openShare(): void {
    this.shareEmail = '';
    this.shareName  = '';
    this.emailError.set('');
    this.showModal.set(true);
  }

  closeShare(): void {
    if (this.sending()) return;
    this.showModal.set(false);
  }

  sendShare(): void {
    this.emailError.set('');
    const email = this.shareEmail.trim();
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      this.emailError.set('Please enter a valid email address');
      return;
    }
    if (!this.shareUrl) return;

    this.sending.set(true);
    const body: Record<string, string> = { email };
    if (this.shareName.trim()) body['name'] = this.shareName.trim();

    this.api.post(this.shareUrl, body).subscribe({
      next: () => {
        this.toast.success('Receipt sent to ' + email);
        this.showModal.set(false);
        this.sending.set(false);
      },
      error: (err: any) => {
        const msg = err?.error?.message || 'Failed to send receipt. Please try again.';
        this.toast.error(msg);
        this.sending.set(false);
      },
    });
  }
}

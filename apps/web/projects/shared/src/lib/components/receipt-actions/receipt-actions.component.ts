import { Component, Input, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../../services/api.service';
import { ToastService } from '../../services/toast.service';

/**
 * ReceiptActionsComponent
 * Renders View (in-app modal) / Download / Share-by-email for any receipt URL.
 *
 * Inputs:
 *   url       — the receipt file URL (renders nothing if falsy)
 *   shareUrl  — API POST path for share-receipt e.g. /folios/payments/{id}/share-receipt
 *   label     — descriptive name shown in viewer title and share modal
 */
@Component({
  selector: 'app-receipt-actions',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    @if (url) {
      <div class="flex items-center gap-1.5 flex-wrap">

        <!-- View (in-app modal) -->
        <button (click)="openViewer()" title="View receipt"
                class="inline-flex items-center gap-1 px-2 py-1 rounded text-[11px] font-medium bg-blue-50 text-blue-700 hover:bg-blue-100 transition-colors">
          <svg class="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
            <path stroke-linecap="round" stroke-linejoin="round"
              d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/>
            <path stroke-linecap="round" stroke-linejoin="round"
              d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"/>
          </svg>
          View
        </button>

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

      <!-- ── Receipt viewer modal ──────────────────────────────── -->
      @if (showViewer()) {
        <div class="fixed inset-0 z-50 flex flex-col bg-black/90"
             (keydown.escape)="closeViewer()">

          <!-- Toolbar -->
          <div class="flex items-center justify-between px-4 py-3 bg-gray-900 border-b border-white/10 flex-shrink-0">
            <h3 class="text-sm font-semibold text-white truncate max-w-xs">
              {{ label || 'Receipt' }}
            </h3>
            <div class="flex items-center gap-2">
              <!-- Open in new tab fallback -->
              <a [href]="url" target="_blank" rel="noopener"
                 class="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-white/10 text-white hover:bg-white/20 transition-colors">
                <svg class="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                  <path stroke-linecap="round" stroke-linejoin="round"
                    d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"/>
                </svg>
                Open in tab
              </a>
              <!-- Download -->
              <a [href]="url" [download]="downloadName()"
                 class="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-white/10 text-white hover:bg-white/20 transition-colors">
                <svg class="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                  <path stroke-linecap="round" stroke-linejoin="round"
                    d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"/>
                </svg>
                Download
              </a>
              <!-- Close -->
              <button (click)="closeViewer()"
                      class="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-red-500/20 text-red-300 hover:bg-red-500/30 transition-colors">
                <svg class="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                  <path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12"/>
                </svg>
                Close
              </button>
            </div>
          </div>

          <!-- Content area -->
          <div class="flex-1 overflow-auto flex items-center justify-center p-4">
            @if (isPdf()) {
              <!--
                api.lodgik.co sets X-Frame-Options: DENY on all responses,
                so iframes are blocked by the browser. Instead we offer
                open-in-new-tab (full native PDF viewer) and download.
              -->
              <div class="text-center text-white/70 space-y-5">
                <svg class="w-20 h-20 mx-auto text-white/30" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5"
                    d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z"/>
                </svg>
                <div>
                  <p class="text-base font-medium text-white">{{ label || 'Receipt' }}</p>
                  <p class="text-xs text-white/50 mt-1">PDF documents open in a new browser tab for the best viewing experience.</p>
                </div>
                <div class="flex gap-3 justify-center flex-wrap">
                  <a [href]="url" target="_blank" rel="noopener"
                     class="inline-flex items-center gap-2 px-5 py-2.5 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 transition-colors">
                    <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                      <path stroke-linecap="round" stroke-linejoin="round"
                        d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"/>
                    </svg>
                    Open PDF
                  </a>
                  <a [href]="url" [download]="downloadName()"
                     class="inline-flex items-center gap-2 px-5 py-2.5 bg-white/10 text-white text-sm rounded-lg hover:bg-white/20 transition-colors">
                    <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                      <path stroke-linecap="round" stroke-linejoin="round"
                        d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"/>
                    </svg>
                    Download
                  </a>
                </div>
              </div>
            } @else if (isImage()) {
              <!-- Image: rendered directly -->
              <img [src]="url" [alt]="label || 'Receipt'"
                   class="max-w-full max-h-full object-contain rounded-lg shadow-2xl"
                   (error)="imgError.set(true)">
              @if (imgError()) {
                <div class="text-center text-white/60">
                  <p class="mb-3">Could not display the image here.</p>
                  <a [href]="url" target="_blank" class="text-blue-400 underline">Open in new tab</a>
                </div>
              }
            } @else {
              <!-- Other file type — prompt open in tab -->
              <div class="text-center text-white/70 space-y-4">
                <svg class="w-16 h-16 mx-auto text-white/30" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5"
                    d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/>
                </svg>
                <p class="text-sm">This file type cannot be previewed in-app.</p>
                <div class="flex gap-3 justify-center">
                  <a [href]="url" target="_blank" rel="noopener"
                     class="px-4 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700">
                    Open in new tab
                  </a>
                  <a [href]="url" [download]="downloadName()"
                     class="px-4 py-2 bg-gray-600 text-white text-sm rounded-lg hover:bg-gray-700">
                    Download
                  </a>
                </div>
              </div>
            }
          </div>

        </div>
      }

      <!-- ── Share modal ────────────────────────────────────────── -->
      @if (showShare()) {
        <div class="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4"
             (click)="closeShare()">
          <div class="bg-white rounded-xl shadow-xl w-full max-w-sm p-6"
               (click)="$event.stopPropagation()">

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

            <label class="block text-xs font-medium text-gray-600 mb-1">
              Recipient Name <span class="text-gray-400 font-normal">(optional)</span>
            </label>
            <input type="text" [(ngModel)]="shareName" placeholder="e.g. John Doe"
                   class="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm mb-3
                          focus:outline-none focus:ring-2 focus:ring-emerald-500/30">

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
  @Input() url: string | null | undefined = null;
  @Input() shareUrl: string | null | undefined = null;
  @Input() label: string = 'receipt';

  private api       = inject(ApiService);
  private toast     = inject(ToastService);

  showViewer = signal(false);
  showShare  = signal(false);
  sending    = signal(false);
  emailError = signal('');
  imgError   = signal(false);

  shareEmail = '';
  shareName  = '';

  // ── Viewer helpers ───────────────────────────────────────────

  isPdf(): boolean {
    return !!this.url && (this.url.toLowerCase().includes('.pdf') || this.url.toLowerCase().includes('application/pdf'));
  }

  isImage(): boolean {
    if (!this.url) return false;
    return /\.(jpg|jpeg|png|gif|webp|svg|bmp)(\?|$)/i.test(this.url);
  }

  downloadName(): string {
    if (!this.url) return 'receipt';
    try {
      const parts = new URL(this.url).pathname.split('/');
      return decodeURIComponent(parts[parts.length - 1]) || 'receipt';
    } catch {
      return 'receipt';
    }
  }

  openViewer(): void {
    this.imgError.set(false);
    this.showViewer.set(true);
  }

  closeViewer(): void {
    this.showViewer.set(false);
  }

  // ── Share helpers ────────────────────────────────────────────

  openShare(): void {
    this.shareEmail = '';
    this.shareName  = '';
    this.emailError.set('');
    this.showShare.set(true);
  }

  closeShare(): void {
    if (this.sending()) return;
    this.showShare.set(false);
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
        this.showShare.set(false);
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

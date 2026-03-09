import {
  Component, EventEmitter, Input, Output, OnInit, OnDestroy,
  inject, signal, computed,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
import { ApiService } from '../../services/api.service';
import { UploadedFile } from './file-upload.component';
import { FileUploadComponent } from './file-upload.component';
import * as QRCode from 'qrcode';

export type QrUploadStatus = 'idle' | 'generating' | 'waiting' | 'uploading' | 'done' | 'expired' | 'error';

/**
 * QrFileUploadComponent — dual-mode file upload.
 *
 * Tab 1: Manual — standard FileUploadComponent (drag-and-drop / click)
 * Tab 2: QR     — generates a real scannable QR code via `qrcode` library;
 *                  staff scans with phone camera to upload directly.
 *                  The upload URL is also shown as copyable text.
 */
@Component({
  selector: 'ui-qr-file-upload',
  standalone: true,
  imports: [CommonModule, FileUploadComponent],
  template: `
    <div class="space-y-2">
      <!-- Label -->
      @if (label) {
        <label class="block text-xs font-medium text-gray-600">
          {{ label }}
          @if (required) { <span class="text-red-400 ml-0.5">*</span> }
        </label>
      }

      <!-- Already uploaded preview -->
      @if (resolvedUrl() && status() !== 'waiting' && status() !== 'generating') {
        <div class="border border-emerald-200 rounded-lg bg-emerald-50 p-3 flex items-center gap-3">
          @if (isImage(resolvedUrl()!)) {
            <img [src]="resolvedUrl()!" class="w-10 h-10 rounded object-cover border border-emerald-200" alt="Preview">
          } @else {
            <div class="w-10 h-10 flex items-center justify-center bg-red-100 rounded">
              <svg xmlns="http://www.w3.org/2000/svg" class="w-5 h-5 text-red-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
            </div>
          }
          <div class="flex-1 min-w-0">
            <p class="text-sm font-medium text-emerald-700 truncate">{{ uploadedOriginal() || 'File uploaded' }}</p>
            <p class="text-xs text-emerald-500">Uploaded successfully</p>
          </div>
          <div class="flex gap-2">
            <a [href]="resolvedUrl()!" target="_blank"
               class="text-xs text-emerald-700 border border-emerald-300 rounded px-2 py-1 hover:bg-emerald-100">View ↗</a>
            <button (click)="clearFile()"
                    class="text-xs text-red-600 border border-red-200 rounded px-2 py-1 hover:bg-red-50">Remove</button>
          </div>
        </div>
      } @else {

        <!-- Tab switcher -->
        <div class="flex border border-gray-200 rounded-lg overflow-hidden text-xs font-medium w-fit">
          <button
            (click)="activeTab.set('manual')"
            class="px-3 py-1.5 transition-colors"
            [class.bg-sage-600]="activeTab() === 'manual'"
            [class.text-white]="activeTab() === 'manual'"
            [class.bg-white]="activeTab() !== 'manual'"
            [class.text-gray-500]="activeTab() !== 'manual'">
            📎 Manual Upload
          </button>
          <button
            (click)="switchToQr()"
            class="px-3 py-1.5 border-l border-gray-200 transition-colors"
            [class.bg-sage-600]="activeTab() === 'qr'"
            [class.text-white]="activeTab() === 'qr'"
            [class.bg-white]="activeTab() !== 'qr'"
            [class.text-gray-500]="activeTab() !== 'qr'">
            📱 Scan QR
          </button>
        </div>

        <!-- Manual tab -->
        @if (activeTab() === 'manual') {
          <ui-file-upload
            [context]="context"
            [accept]="accept"
            [maxSizeMb]="maxSizeMb"
            [showPreview]="true"
            (uploaded)="onManualUpload($event)"
            (cleared)="clearFile()"
          />
        }

        <!-- QR tab -->
        @if (activeTab() === 'qr') {
          <div class="border border-gray-200 rounded-xl p-4 bg-gray-50">

            <!-- Idle -->
            @if (status() === 'idle') {
              <div class="text-center py-4">
                <div class="text-3xl mb-2">📱</div>
                <p class="text-sm font-medium text-gray-700 mb-1">Upload from your phone</p>
                <p class="text-xs text-gray-400 mb-4">Scan the QR code with your phone's camera to upload a photo directly.</p>
                <button (click)="generateToken()"
                        class="px-4 py-2 bg-sage-600 text-white text-sm rounded-lg hover:bg-sage-700 transition-colors">
                  Generate QR Code
                </button>
              </div>
            }

            <!-- Generating -->
            @if (status() === 'generating') {
              <div class="text-center py-6">
                <div class="w-6 h-6 border-2 border-sage-400 border-t-transparent rounded-full animate-spin mx-auto mb-3"></div>
                <p class="text-sm text-gray-500">Generating QR code…</p>
              </div>
            }

            <!-- Waiting for mobile upload -->
            @if (status() === 'waiting') {
              <div class="flex flex-col items-center gap-3">
                <p class="text-xs font-semibold text-gray-600 text-center">Scan with your phone's camera</p>

                <!-- QR code (rendered by qrcode library — guaranteed scannable) -->
                @if (qrSvg()) {
                  <div class="bg-white p-2 rounded-lg border border-gray-200 shadow-sm"
                       [innerHTML]="qrSvg()"></div>
                }

                <!-- Copyable URL fallback -->
                <div class="w-full bg-white border border-gray-200 rounded-lg px-3 py-2">
                  <p class="text-[10px] text-gray-400 mb-1">Or open this link on your phone:</p>
                  <div class="flex items-center gap-2">
                    <span class="text-xs text-gray-600 flex-1 font-mono select-all break-all">{{ uploadUrl() }}</span>
                    <button (click)="copyUploadUrl()"
                            class="flex-shrink-0 text-xs px-2 py-1 bg-gray-100 hover:bg-gray-200 rounded text-gray-600 transition-colors whitespace-nowrap">
                      {{ copied() ? '✓ Copied' : 'Copy' }}
                    </button>
                  </div>
                </div>

                <!-- Countdown -->
                <div class="text-center">
                  <p class="text-xs text-gray-400 mb-1">Waiting for upload…</p>
                  <div class="flex items-center justify-center gap-2">
                    <div class="w-4 h-4 border-2 border-sage-300 border-t-transparent rounded-full animate-spin"></div>
                    <span class="text-xs text-sage-600 font-medium tabular-nums">{{ countdown() }}s remaining</span>
                  </div>
                  <button (click)="generateToken()"
                          class="mt-2 text-xs text-gray-400 hover:text-gray-600 underline">
                    Regenerate
                  </button>
                </div>
              </div>
            }

            <!-- Done -->
            @if (status() === 'done') {
              <div class="text-center py-4">
                <div class="text-3xl mb-2">✅</div>
                <p class="text-sm font-medium text-emerald-700">Upload complete!</p>
              </div>
            }

            <!-- Expired -->
            @if (status() === 'expired') {
              <div class="text-center py-4">
                <div class="text-3xl mb-2">⏰</div>
                <p class="text-sm font-medium text-gray-700 mb-1">QR code expired</p>
                <p class="text-xs text-gray-400 mb-3">The 15-minute window has passed.</p>
                <button (click)="generateToken()"
                        class="px-4 py-2 bg-sage-600 text-white text-sm rounded-lg hover:bg-sage-700">
                  Generate New QR Code
                </button>
              </div>
            }

            <!-- Error -->
            @if (status() === 'error') {
              <div class="text-center py-4">
                <div class="text-3xl mb-2">❌</div>
                <p class="text-sm font-medium text-red-700 mb-1">Something went wrong</p>
                <p class="text-xs text-gray-400 mb-3">{{ errorMsg() }}</p>
                <button (click)="generateToken()"
                        class="px-4 py-2 bg-sage-600 text-white text-sm rounded-lg hover:bg-sage-700">
                  Try Again
                </button>
              </div>
            }

          </div>
        }

      }
    </div>
  `,
})
export class QrFileUploadComponent implements OnInit, OnDestroy {
  private api       = inject(ApiService);
  private sanitizer = inject(DomSanitizer);

  @Input() context: 'kyc' | 'document' | 'avatar' | 'resource' | 'other' = 'other';
  @Input() label     = '';
  @Input() accept    = 'image/jpeg,image/png,image/webp,application/pdf';
  @Input() maxSizeMb = 10;
  @Input() required  = false;
  @Input() currentUrl: string | null = null;
  @Input() mobileUploadBase = '';

  @Output() uploaded = new EventEmitter<UploadedFile>();
  @Output() cleared  = new EventEmitter<void>();

  activeTab        = signal<'manual' | 'qr'>('manual');
  status           = signal<QrUploadStatus>('idle');
  qrSvg            = signal<SafeHtml>('');
  uploadUrl        = signal('');
  copied           = signal(false);
  countdown        = signal(900);
  errorMsg         = signal('');
  uploadedUrl      = signal<string | null>(null);
  uploadedOriginal = signal('');

  resolvedUrl = computed(() => this.uploadedUrl() ?? (this.currentUrl || null));

  private token        = '';
  private expiresAt    = 0;
  private pollInterval: ReturnType<typeof setInterval> | null = null;
  private countdownInt: ReturnType<typeof setInterval> | null = null;

  ngOnInit(): void {
    if (!this.mobileUploadBase) {
      this.mobileUploadBase = window.location.origin;
    }
  }

  ngOnDestroy(): void {
    this.stopPolling();
  }

  switchToQr(): void {
    this.activeTab.set('qr');
    if (this.status() !== 'waiting') {
      this.status.set('idle');
    }
  }

  generateToken(): void {
    this.stopPolling();
    this.status.set('generating');
    this.errorMsg.set('');
    this.uploadUrl.set('');
    this.copied.set(false);
    this.qrSvg.set('');

    this.api.post('/upload/qr-token', {
      context: this.context,
      label:   this.label || 'File Upload',
    }).subscribe({
      next: async (r: any) => {
        this.token     = r.data?.token ?? '';
        this.expiresAt = Date.now() + (r.data?.expires_in ?? 900) * 1000;

        const url = `${this.mobileUploadBase}/mobile-upload/${this.token}`;
        this.uploadUrl.set(url);

        try {
          // qrcode npm package — battle-tested, generates RFC-compliant QR codes
          const svgString = await QRCode.toString(url, {
            type:                 'svg',
            errorCorrectionLevel: 'M',
            margin:               3,
            width:                220,
            color: { dark: '#111827', light: '#ffffff' },
          });
          this.qrSvg.set(this.sanitizer.bypassSecurityTrustHtml(svgString));
        } catch {
          // QR render failed — URL still shown for manual copy
          this.qrSvg.set('');
        }

        this.countdown.set(Math.round((this.expiresAt - Date.now()) / 1000));
        this.status.set('waiting');
        this.startPolling();
        this.startCountdown();
      },
      error: (e: any) => {
        this.status.set('error');
        this.errorMsg.set(e?.error?.message || 'Failed to generate QR code.');
      },
    });
  }

  onManualUpload(file: UploadedFile): void {
    this.uploadedUrl.set(file.url);
    this.uploadedOriginal.set(file.original || file.filename);
    this.uploaded.emit(file);
  }

  clearFile(): void {
    this.uploadedUrl.set(null);
    this.uploadedOriginal.set('');
    this.stopPolling();
    this.status.set('idle');
    this.activeTab.set('manual');
    this.cleared.emit();
  }

  copyUploadUrl(): void {
    const url = this.uploadUrl();
    if (!url) return;
    navigator.clipboard.writeText(url).then(() => {
      this.copied.set(true);
      setTimeout(() => this.copied.set(false), 2000);
    }).catch(() => {
      // clipboard API not available — text is selectable via select-all class
    });
  }

  isImage(url: string): boolean {
    return /\.(jpe?g|png|webp|gif)(\?.*)?$/i.test(url);
  }

  private startPolling(): void {
    this.pollInterval = setInterval(() => {
      if (!this.token) return;
      this.api.get(`/upload/qr-token/${this.token}/status`).subscribe({
        next: (r: any) => {
          if (r.data?.status === 'done') {
            this.stopPolling();
            this.uploadedUrl.set(r.data.url);
            this.uploadedOriginal.set(r.data.original || r.data.filename || 'Uploaded file');
            this.status.set('done');
            this.uploaded.emit({
              url:       r.data.url,
              filename:  r.data.filename,
              original:  r.data.original || r.data.filename,
              mime_type: r.data.mime_type,
              size:      r.data.size,
            });
          }
        },
        error: (e: any) => {
          if (e?.status === 410) {
            this.stopPolling();
            this.status.set('expired');
          }
        },
      });
    }, 2500);
  }

  private startCountdown(): void {
    this.countdownInt = setInterval(() => {
      const secs = Math.max(0, Math.round((this.expiresAt - Date.now()) / 1000));
      this.countdown.set(secs);
      if (secs === 0) {
        this.stopPolling();
        if (this.status() === 'waiting') this.status.set('expired');
      }
    }, 1000);
  }

  private stopPolling(): void {
    if (this.pollInterval) { clearInterval(this.pollInterval); this.pollInterval = null; }
    if (this.countdownInt) { clearInterval(this.countdownInt); this.countdownInt = null; }
  }
}

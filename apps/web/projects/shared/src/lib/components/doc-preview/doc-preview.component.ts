import { Component, Input, signal } from '@angular/core';

/**
 * Read-only document preview — used in admin portals to view uploaded files.
 *
 * Usage:
 *   <ui-doc-preview label="Government ID" [url]="kyc.government_id_url" />
 *
 * - Images: shown inline with zoom lightbox on click
 * - PDFs: icon card with "Open in new tab" button
 * - Missing: shows a grey "Not provided" badge
 */
@Component({
  selector: 'ui-doc-preview',
  standalone: true,
  template: `
    @if (url) {
      <div class="border border-gray-200 rounded-lg overflow-hidden">
        @if (label) {
          <div class="px-3 py-2 bg-gray-50 border-b border-gray-100 flex items-center justify-between">
            <span class="text-xs font-medium text-gray-600">{{ label }}</span>
            <span class="text-[10px] bg-green-100 text-green-700 px-1.5 py-0.5 rounded">Provided</span>
          </div>
        }
        @if (isImage()) {
          <div class="relative group cursor-zoom-in" (click)="lightbox.set(true)">
            <img [src]="url" class="w-full max-h-52 object-contain bg-gray-50 p-2"
                 [alt]="label || 'Document preview'"
                 (error)="imageError.set(true)">
            @if (!imageError()) {
              <div class="absolute inset-0 bg-black/0 group-hover:bg-black/10 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all">
                <span class="bg-black/50 text-white text-xs px-2 py-1 rounded">Click to enlarge</span>
              </div>
            }
            @if (imageError()) {
              <div class="flex items-center justify-center h-20 text-xs text-gray-400 gap-2">
                <svg xmlns="http://www.w3.org/2000/svg" class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
                Preview unavailable
              </div>
            }
          </div>
          <div class="px-3 py-2 border-t border-gray-100 flex justify-end">
            <a [href]="url" target="_blank"
               class="text-xs text-sage-600 hover:text-sage-800 font-medium hover:underline">
              Open original ↗
            </a>
          </div>
        } @else if (isPdf()) {
          <div class="flex items-center gap-3 p-3">
            <div class="w-10 h-10 flex-shrink-0 bg-red-50 rounded-lg flex items-center justify-center">
              <svg xmlns="http://www.w3.org/2000/svg" class="w-5 h-5 text-red-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="9" y1="13" x2="15" y2="13"/><line x1="9" y1="17" x2="15" y2="17"/></svg>
            </div>
            <div class="flex-1 min-w-0">
              <p class="text-sm font-medium text-gray-700">PDF Document</p>
              <p class="text-xs text-gray-400 truncate">{{ url }}</p>
            </div>
            <a [href]="url" target="_blank"
               class="flex-shrink-0 px-3 py-1.5 bg-red-50 text-red-700 text-xs font-medium rounded-lg hover:bg-red-100 transition-colors">
              Open ↗
            </a>
          </div>
        } @else {
          <!-- Generic file -->
          <div class="flex items-center gap-3 p-3">
            <div class="w-10 h-10 flex-shrink-0 bg-gray-100 rounded-lg flex items-center justify-center">
              <svg xmlns="http://www.w3.org/2000/svg" class="w-5 h-5 text-gray-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
            </div>
            <p class="text-sm text-gray-600 flex-1 truncate">{{ url }}</p>
            <a [href]="url" target="_blank"
               class="flex-shrink-0 px-3 py-1.5 border border-gray-200 text-xs text-gray-600 rounded-lg hover:bg-gray-50">
              Open ↗
            </a>
          </div>
        }
      </div>
    } @else {
      <div class="border border-dashed border-gray-200 rounded-lg px-3 py-2.5 flex items-center gap-2">
        @if (label) { <span class="text-xs text-gray-500 flex-1">{{ label }}</span> }
        <span class="text-[10px] bg-gray-100 text-gray-400 px-1.5 py-0.5 rounded">Not provided</span>
      </div>
    }

    <!-- Lightbox -->
    @if (lightbox()) {
      <div class="fixed inset-0 z-[9999] bg-black/85 flex items-center justify-center p-4"
           (click)="lightbox.set(false)">
        <div class="relative max-w-4xl w-full" (click)="$event.stopPropagation()">
          <img [src]="url!" class="w-full max-h-[85vh] object-contain rounded-lg shadow-2xl" [alt]="label || 'Document'">
          <div class="absolute top-3 right-3 flex gap-2">
            <a [href]="url!" target="_blank"
               class="px-3 py-1.5 bg-white/90 text-gray-800 text-xs font-medium rounded-lg hover:bg-white shadow">
              Open ↗
            </a>
            <button (click)="lightbox.set(false)"
                    class="w-8 h-8 bg-white/90 text-gray-700 rounded-lg hover:bg-white shadow flex items-center justify-center text-sm font-bold">
              ✕
            </button>
          </div>
        </div>
      </div>
    }
  `,
})
export class DocPreviewComponent {
  @Input() url: string | null | undefined = null;
  @Input() label = '';

  lightbox   = signal(false);
  imageError = signal(false);

  isImage(): boolean {
    return !!this.url && /\.(jpe?g|png|webp|gif)(\?.*)?$/i.test(this.url);
  }

  isPdf(): boolean {
    return !!this.url && /\.pdf(\?.*)?$/i.test(this.url);
  }
}

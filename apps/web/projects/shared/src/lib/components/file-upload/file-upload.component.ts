import {
  Component, EventEmitter, Input, Output, inject, signal, ViewChild, ElementRef,
} from '@angular/core';
import { ApiService } from '../../services/api.service';

export interface UploadedFile {
  url: string;
  filename: string;
  original: string;
  mime_type: string;
  size: number;
}

/**
 * Generic file upload component.
 *
 * Usage:
 *   <ui-file-upload
 *     context="kyc"
 *     label="Government ID Document"
 *     [required]="true"
 *     [currentUrl]="kycForm.government_id_url"
 *     (uploaded)="kycForm.government_id_url = $event.url"
 *   />
 *
 * Inputs:
 *   context      - storage context: kyc | document | avatar | resource | other
 *   label        - field label shown above the dropzone
 *   accept       - MIME types (default: images + PDF)
 *   maxSizeMb    - max file size in MB (default: 10)
 *   required     - whether a * is shown on the label
 *   currentUrl   - existing URL to show as already uploaded
 *   showPreview  - show inline preview of already-uploaded file (default: true)
 *
 * Outputs:
 *   uploaded     - emits UploadedFile when upload succeeds
 *   cleared      - emits when the user removes the current file
 */
@Component({
  selector: 'ui-file-upload',
  standalone: true,
  template: `
    <div class="space-y-1">
      @if (label) {
        <label class="block text-xs font-medium text-gray-600">
          {{ label }}
          @if (required) { <span class="text-red-400 ml-0.5">*</span> }
        </label>
      }

      <!-- Already uploaded — show preview + clear -->
      @if (effectiveUrl() && !uploading()) {
        <div class="border border-gray-200 rounded-lg overflow-hidden">
          @if (isImage(effectiveUrl()!)) {
            <div class="relative group">
              <img [src]="effectiveUrl()!" class="w-full max-h-48 object-contain bg-gray-50 p-2"
                   (click)="openLightbox()" style="cursor:zoom-in" [alt]="label || 'Preview'">
              <div class="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                <a [href]="effectiveUrl()!" target="_blank"
                   class="px-2 py-1 bg-black/50 text-white text-xs rounded hover:bg-black/70">
                  Open ↗
                </a>
                <button (click)="clear()"
                        class="px-2 py-1 bg-red-500/80 text-white text-xs rounded hover:bg-red-600">
                  Remove
                </button>
              </div>
            </div>
          } @else if (isPdf(effectiveUrl()!)) {
            <div class="flex items-center gap-3 p-3 bg-gray-50">
              <div class="w-10 h-10 flex-shrink-0 bg-red-100 rounded flex items-center justify-center">
                <svg xmlns="http://www.w3.org/2000/svg" class="w-5 h-5 text-red-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
              </div>
              <div class="flex-1 min-w-0">
                <p class="text-sm font-medium text-gray-700 truncate">{{ uploadedFilename() || 'Document' }}</p>
                <p class="text-xs text-gray-400">PDF Document</p>
              </div>
              <div class="flex gap-2">
                <a [href]="effectiveUrl()!" target="_blank"
                   class="px-3 py-1.5 text-xs text-sage-700 border border-sage-200 rounded hover:bg-sage-50">
                  View ↗
                </a>
                <button (click)="clear()"
                        class="px-3 py-1.5 text-xs text-red-600 border border-red-200 rounded hover:bg-red-50">
                  Remove
                </button>
              </div>
            </div>
          } @else {
            <!-- Generic file -->
            <div class="flex items-center gap-3 p-3">
              <span class="text-xs text-sage-600 underline truncate">{{ effectiveUrl() }}</span>
              <button (click)="clear()" class="text-xs text-red-500 whitespace-nowrap">Remove</button>
            </div>
          }
        </div>
      } @else if (!uploading()) {
        <!-- Dropzone -->
        <div
          class="border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-colors"
          [class]="dragOver() ? 'border-sage-400 bg-sage-50' : 'border-gray-200 hover:border-sage-300 hover:bg-gray-50'"
          (click)="fileInput.click()"
          (dragover)="onDragOver($event)"
          (dragleave)="dragOver.set(false)"
          (drop)="onDrop($event)">
          <svg xmlns="http://www.w3.org/2000/svg" class="w-8 h-8 mx-auto text-gray-300 mb-2" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>
          <p class="text-sm text-gray-500">
            <span class="text-sage-600 font-medium">Click to browse</span> or drag and drop
          </p>
          <p class="text-xs text-gray-400 mt-1">{{ acceptLabel() }} · Max {{ maxSizeMb }}MB</p>
        </div>
      } @else {
        <!-- Uploading state -->
        <div class="border border-gray-200 rounded-lg p-4 flex items-center gap-3">
          <div class="w-5 h-5 border-2 border-sage-400 border-t-transparent rounded-full animate-spin flex-shrink-0"></div>
          <span class="text-sm text-gray-600">Uploading...</span>
        </div>
      }

      @if (uploadError()) {
        <p class="text-xs text-red-500 mt-1">{{ uploadError() }}</p>
      }

      <!-- Hidden file input -->
      <input #fileInput type="file" [accept]="accept" class="hidden"
             (change)="onFileSelected($event)">
    </div>

    <!-- Lightbox -->
    @if (lightboxUrl()) {
      <div class="fixed inset-0 z-[9999] bg-black/80 flex items-center justify-center p-4"
           (click)="lightboxUrl.set(null)">
        <img [src]="lightboxUrl()!" class="max-w-full max-h-full rounded shadow-2xl object-contain"
             (click)="$event.stopPropagation()" alt="Document preview">
        <button (click)="lightboxUrl.set(null)"
                class="absolute top-4 right-4 text-white text-2xl hover:text-gray-300 leading-none">✕</button>
      </div>
    }
  `,
})
export class FileUploadComponent {
  private api = inject(ApiService);

  @ViewChild('fileInput') fileInput!: ElementRef<HTMLInputElement>;

  @Input() context: 'kyc' | 'document' | 'avatar' | 'resource' | 'other' = 'other';
  @Input() label = '';
  @Input() accept = 'image/jpeg,image/png,image/webp,application/pdf';
  @Input() maxSizeMb = 10;
  @Input() required = false;
  @Input() showPreview = true;
  @Input() currentUrl: string | null = null;

  @Output() uploaded = new EventEmitter<UploadedFile>();
  @Output() cleared  = new EventEmitter<void>();

  uploading       = signal(false);
  dragOver        = signal(false);
  uploadError     = signal('');
  uploadedUrl     = signal<string | null>(null);
  uploadedFilename = signal('');
  lightboxUrl     = signal<string | null>(null);

  /** Use component state URL if available, otherwise fall back to prop */
  effectiveUrl = () => this.uploadedUrl() ?? (this.currentUrl || null);

  acceptLabel(): string {
    const parts: string[] = [];
    if (this.accept.includes('image/jpeg') || this.accept.includes('image/png')) parts.push('Images');
    if (this.accept.includes('application/pdf')) parts.push('PDF');
    return parts.join(', ') || 'Files';
  }

  isImage(url: string): boolean {
    return /\.(jpe?g|png|webp|gif)(\?.*)?$/i.test(url);
  }

  isPdf(url: string): boolean {
    return /\.pdf(\?.*)?$/i.test(url) || url.includes('application/pdf');
  }

  openLightbox(): void {
    if (this.effectiveUrl()) this.lightboxUrl.set(this.effectiveUrl()!);
  }

  clear(): void {
    this.uploadedUrl.set(null);
    this.uploadedFilename.set('');
    this.uploadError.set('');
    if (this.fileInput?.nativeElement) {
      this.fileInput.nativeElement.value = '';
    }
    this.cleared.emit();
  }

  onDragOver(event: DragEvent): void {
    event.preventDefault();
    this.dragOver.set(true);
  }

  onDrop(event: DragEvent): void {
    event.preventDefault();
    this.dragOver.set(false);
    const file = event.dataTransfer?.files?.[0];
    if (file) this.processFile(file);
  }

  onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (file) this.processFile(file);
  }

  private processFile(file: File): void {
    this.uploadError.set('');

    // Client-side validation
    if (file.size > this.maxSizeMb * 1024 * 1024) {
      this.uploadError.set(`File is too large. Maximum size is ${this.maxSizeMb}MB.`);
      return;
    }
    const accepted = this.accept.split(',').map(t => t.trim());
    if (!accepted.includes(file.type)) {
      this.uploadError.set(`File type not allowed. Accepted: ${this.acceptLabel()}`);
      return;
    }

    this.uploading.set(true);
    const reader = new FileReader();
    reader.onload = () => {
      const base64 = reader.result as string;
      this.api.post('/upload', {
        file_base64: base64,
        filename: file.name,
        context: this.context,
      }).subscribe({
        next: (r: any) => {
          const data = r.data as UploadedFile;
          this.uploadedUrl.set(data.url);
          this.uploadedFilename.set(data.original || data.filename);
          this.uploading.set(false);
          this.uploaded.emit(data);
        },
        error: (err: any) => {
          this.uploading.set(false);
          this.uploadError.set(err?.error?.message || 'Upload failed. Please try again.');
        },
      });
    };
    reader.onerror = () => {
      this.uploading.set(false);
      this.uploadError.set('Could not read file.');
    };
    reader.readAsDataURL(file);
  }
}

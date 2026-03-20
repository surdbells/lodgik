import {
  Directive, ElementRef, HostListener, Input, OnInit, Renderer2, inject
} from '@angular/core';
import { NgControl } from '@angular/forms';

/**
 * AmountInputDirective
 *
 * Attach to any <input> to get:
 *   1. Real-time formatting with thousand separators (₦1,000,000)
 *   2. A "words" label below: "One Million Naira"
 *
 * Usage:
 *   <input uiAmount [(ngModel)]="amount" />
 *   OR in standalone forms:
 *   <input uiAmount [amountModel]="value" (amountChange)="value=$event" />
 *
 * The directive inserts a <p class="ui-amount-words"> sibling after the input.
 * To suppress words:  <input uiAmount [showWords]="false" />
 */
@Directive({ selector: '[uiAmount]', standalone: true })
export class AmountInputDirective implements OnInit {
  @Input() showWords = true;

  private el      = inject(ElementRef);
  private renderer = inject(Renderer2);
  private ngControl = inject(NgControl, { optional: true, self: true });

  private wordsEl: HTMLElement | null = null;

  ngOnInit(): void {
    if (this.showWords) {
      this.wordsEl = this.renderer.createElement('p') as HTMLElement;
      this.renderer.addClass(this.wordsEl, 'ui-amount-words');
      this.renderer.setStyle(this.wordsEl, 'font-size', '11px');
      this.renderer.setStyle(this.wordsEl, 'color', '#6b7280');
      this.renderer.setStyle(this.wordsEl, 'margin-top', '3px');
      this.renderer.setStyle(this.wordsEl, 'min-height', '16px');
      const parent = this.el.nativeElement.parentNode;
      this.renderer.insertBefore(parent, this.wordsEl, this.el.nativeElement.nextSibling);
    }
    // Format existing value
    const raw = this.el.nativeElement.value;
    if (raw) this.format(raw);
  }

  @HostListener('input', ['$event'])
  onInput(event: Event): void {
    this.format((event.target as HTMLInputElement).value);
  }

  @HostListener('blur')
  onBlur(): void {
    const raw = this.el.nativeElement.value.replace(/[^0-9.]/g, '');
    const num = parseFloat(raw) || 0;
    if (num === 0) {
      this.el.nativeElement.value = '';
      if (this.ngControl?.control) this.ngControl.control.setValue('', { emitEvent: false });
      this.setWords('');
    }
  }

  private format(value: string): void {
    // Strip non-numeric except decimal
    const stripped = value.replace(/[^0-9.]/g, '');
    const parts    = stripped.split('.');
    const intPart  = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ',');
    const decPart  = parts[1] !== undefined ? '.' + parts[1].slice(0, 2) : '';
    const formatted = intPart ? intPart + decPart : '';

    this.el.nativeElement.value = formatted;

    // Update ngModel/formControl with the raw numeric string
    const numericVal = stripped ? parseFloat(stripped) : '';
    if (this.ngControl?.control) {
      this.ngControl.control.setValue(numericVal, { emitEvent: true });
    }

    // Generate words
    const num = parseFloat(stripped) || 0;
    this.setWords(num > 0 ? this.toWords(num) + ' Naira' : '');
  }

  private setWords(text: string): void {
    if (this.wordsEl) {
      this.renderer.setProperty(this.wordsEl, 'textContent', text);
    }
  }

  // ── Number to words (Nigerian English) ────────────────────────────────────
  private toWords(n: number): string {
    if (n === 0) return 'Zero';
    if (!isFinite(n) || n < 0) return '';

    const ones = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven',
                  'Eight', 'Nine', 'Ten', 'Eleven', 'Twelve', 'Thirteen',
                  'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen'];
    const tens = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty',
                  'Sixty', 'Seventy', 'Eighty', 'Ninety'];

    const chunk = (num: number): string => {
      if (num === 0) return '';
      if (num < 20) return ones[num] + ' ';
      if (num < 100) return tens[Math.floor(num / 10)] + (num % 10 ? '-' + ones[num % 10] : '') + ' ';
      return ones[Math.floor(num / 100)] + ' Hundred ' + chunk(num % 100);
    };

    const int   = Math.floor(n);
    const dec   = Math.round((n - int) * 100);
    const tiers = [
      { value: 1_000_000_000, label: 'Billion' },
      { value: 1_000_000,     label: 'Million' },
      { value: 1_000,         label: 'Thousand' },
      { value: 1,             label: '' },
    ];

    let result = '';
    let rem = int;
    for (const tier of tiers) {
      const q = Math.floor(rem / tier.value);
      if (q > 0) {
        result += chunk(q) + (tier.label ? tier.label + ' ' : '');
        rem %= tier.value;
      }
    }

    if (dec > 0) result += `and ${chunk(dec)}Kobo`;

    return result.trim().replace(/\s+/g, ' ');
  }
}

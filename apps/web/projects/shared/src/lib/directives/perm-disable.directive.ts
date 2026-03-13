import {
  Directive,
  ElementRef,
  Input,
  Renderer2,
  effect,
  inject,
} from '@angular/core';
import { TokenService } from '../services/token.service';

/**
 * [permDisable] — attribute directive that disables its host element when
 * the current user lacks the specified permission.
 *
 * Unlike *hasPerm (which removes the element), permDisable keeps the element
 * in the DOM but disables it — preventing accidental "hidden feature" confusion
 * for users who need to know a feature exists but requires a higher role.
 *
 * Behaviours applied when permission is ABSENT:
 *   - Sets [disabled] = true on the element
 *   - Adds CSS class 'perm-disabled' (opacity-40, cursor-not-allowed)
 *   - Adds aria-disabled="true" for accessibility
 *   - Adds a title tooltip explaining the restriction
 *
 * Usage:
 *   <button [permDisable]="'bookings.cancel'">Cancel Booking</button>
 *   <button [permDisable]="'folios.apply_discount'">Apply Discount</button>
 *   <button [permDisable]="'payroll.approve'">Approve Payroll</button>
 *
 *   <!-- Custom tooltip when disabled -->
 *   <button [permDisable]="'invoices.void'"
 *           permDisableTitle="Only managers can void invoices">Void</button>
 *
 *   <!-- Hide entirely instead of disabling (opt-in) -->
 *   <button [permDisable]="'invoices.void'" [permDisableHide]="true">Void</button>
 */
@Directive({
  selector: '[permDisable]',
  standalone: true,
})
export class PermDisableDirective {
  private el    = inject(ElementRef);
  private r2    = inject(Renderer2);
  private token = inject(TokenService);

  private _key  = '';
  private _hide = false;
  private _title = 'You do not have permission to perform this action.';

  @Input() set permDisable(key: string) {
    this._key = key;
    this.apply();
  }

  @Input() set permDisableHide(hide: boolean) {
    this._hide = hide;
    this.apply();
  }

  @Input() set permDisableTitle(title: string) {
    this._title = title;
    this.apply();
  }

  constructor() {
    // Reactively re-apply when permissions change (login / property switch)
    effect(() => {
      this.token.permissions(); // subscribe to signal
      this.apply();
    });
  }

  private apply(): void {
    if (!this._key) return;

    const granted = this.token.can(this._key);
    const el: HTMLElement = this.el.nativeElement;

    if (granted) {
      // Restore element
      this.r2.removeAttribute(el, 'disabled');
      this.r2.removeAttribute(el, 'aria-disabled');
      this.r2.removeClass(el, 'perm-disabled');
      this.r2.removeAttribute(el, 'title');
      if (this._hide) {
        this.r2.setStyle(el, 'display', '');
      }
    } else {
      // Restrict element
      if (this._hide) {
        this.r2.setStyle(el, 'display', 'none');
      } else {
        this.r2.setAttribute(el, 'disabled', 'true');
        this.r2.setAttribute(el, 'aria-disabled', 'true');
        this.r2.addClass(el, 'perm-disabled');
        this.r2.setAttribute(el, 'title', this._title);
      }
    }
  }
}

import {
  Directive,
  Input,
  TemplateRef,
  ViewContainerRef,
  inject,
  effect,
} from '@angular/core';
import { TokenService } from '../services/token.service';

/**
 * *hasPerm — structural directive that conditionally renders its host
 * based on whether the current user holds the specified permission.
 *
 * Usage:
 *   <button *hasPerm="'bookings.cancel'">Cancel Booking</button>
 *   <div *hasPerm="'folios.apply_discount'">Discount section</div>
 *
 *   <!-- Multiple keys — show if ANY is granted (default) -->
 *   <button *hasPerm="'invoices.void'; mode: 'any'">Void</button>
 *
 *   <!-- Multiple keys — show only if ALL are granted -->
 *   <button *hasPerm="'payroll.run'; mode: 'all'">Run Payroll</button>
 *
 * The directive is reactive — if permissions are refreshed (e.g. after a
 * property switch), the view is automatically shown or hidden.
 */
@Directive({
  selector: '[hasPerm]',
  standalone: true,
})
export class HasPermDirective {
  private templateRef    = inject(TemplateRef<any>);
  private viewContainer  = inject(ViewContainerRef);
  private token          = inject(TokenService);
  private shown          = false;
  private _keys: string[] = [];
  private _mode: 'any' | 'all' = 'any';

  @Input() set hasPerm(key: string | string[]) {
    this._keys = Array.isArray(key) ? key : [key];
    this.update();
  }

  @Input() set hasPermMode(mode: 'any' | 'all') {
    this._mode = mode;
    this.update();
  }

  constructor() {
    // Re-evaluate when permission set changes (login, property switch)
    effect(() => {
      this.token.permissions(); // track signal
      this.update();
    });
  }

  private update(): void {
    if (!this._keys.length) return;

    const granted = this._mode === 'all'
      ? this.token.canAll(...this._keys)
      : this.token.canAny(...this._keys);

    if (granted && !this.shown) {
      this.viewContainer.createEmbeddedView(this.templateRef);
      this.shown = true;
    } else if (!granted && this.shown) {
      this.viewContainer.clear();
      this.shown = false;
    }
  }
}

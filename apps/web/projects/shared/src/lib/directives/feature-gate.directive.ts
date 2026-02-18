import { Directive, Input, TemplateRef, ViewContainerRef, inject, effect } from '@angular/core';
import { FeatureService } from '../services/feature.service';

/**
 * Structural directive to show/hide content based on feature modules.
 *
 * Usage:
 *   <div *featureGate="'room_management'">Only shows if room_management is enabled</div>
 *   <button *featureGate="['booking_engine', 'guest_management']">Needs both</button>
 */
@Directive({
  selector: '[featureGate]',
  standalone: true,
})
export class FeatureGateDirective {
  private templateRef = inject(TemplateRef<any>);
  private viewContainer = inject(ViewContainerRef);
  private featureService = inject(FeatureService);
  private shown = false;

  @Input() set featureGate(module: string | string[]) {
    this._module = module;
    this.update();
  }

  @Input() featureGateMode: 'all' | 'any' = 'all';

  private _module: string | string[] = '';

  constructor() {
    // Re-evaluate when features are loaded
    effect(() => {
      this.featureService.enabledModules();
      this.update();
    });
  }

  private update(): void {
    const modules = Array.isArray(this._module) ? this._module : [this._module];
    const enabled = this.featureGateMode === 'all'
      ? this.featureService.hasAll(...modules)
      : this.featureService.hasAny(...modules);

    if (enabled && !this.shown) {
      this.viewContainer.createEmbeddedView(this.templateRef);
      this.shown = true;
    } else if (!enabled && this.shown) {
      this.viewContainer.clear();
      this.shown = false;
    }
  }
}

import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { ToastContainerComponent, ConfirmDialogComponent } from '@lodgik/shared';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, ToastContainerComponent, ConfirmDialogComponent],
  template: `<router-outlet /><ui-toast-container /><ui-confirm-dialog />`,
})
export class AppComponent {}

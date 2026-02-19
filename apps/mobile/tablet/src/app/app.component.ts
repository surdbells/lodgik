import { Component, NO_ERRORS_SCHEMA, OnInit } from '@angular/core';
import { PageRouterOutlet, RouterExtensions } from '@nativescript/angular';
import { TabletApiService } from './services/tablet-api.service';

@Component({
  selector: 'ns-app',
  templateUrl: './app.component.html',
  imports: [PageRouterOutlet],
  schemas: [NO_ERRORS_SCHEMA],
})
export class AppComponent implements OnInit {
  constructor(private api: TabletApiService, private router: RouterExtensions) {}

  ngOnInit() {
    // If device is not registered, go to setup
    if (!this.api.isRegistered()) {
      setTimeout(() => this.router.navigate(['/setup'], { clearHistory: true }), 100);
    } else {
      // Start polling for guest context
      this.api.startPolling();
    }
  }
}

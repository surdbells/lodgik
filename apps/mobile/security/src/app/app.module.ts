import { NgModule, NO_ERRORS_SCHEMA } from '@angular/core';
import { NativeScriptModule, NativeScriptHttpClientModule, NativeScriptFormsModule } from '@nativescript/angular';
import { AppRoutingModule } from './app-routing.module';
import { AppComponent } from './app.component';
import { LoginComponent } from './pages/login.component';
import { SecurityDashboardComponent } from './pages/security-dashboard.component';
import { GateVerifyComponent } from './pages/gate-verify.component';
import { GateCardComponent } from './pages/gate-card.component';
import { SecurityExitComponent } from './pages/security-exit.component';
import { DiscrepanciesComponent } from './pages/discrepancies.component';
import { MovementComponent } from './pages/movement.component';
import { VisitorsComponent } from './pages/visitors.component';
import { IncidentReportComponent } from './pages/incident-report.component';
import { CheckoutVerifyComponent } from './pages/checkout-verify.component';
import { MusterComponent } from './pages/muster.component';
import { SecurityNotificationsComponent } from './pages/notifications.component';

@NgModule({
  bootstrap: [AppComponent],
  imports: [NativeScriptModule, NativeScriptHttpClientModule, NativeScriptFormsModule, AppRoutingModule],
  declarations: [
    AppComponent,
    LoginComponent,
    SecurityDashboardComponent,
    GateVerifyComponent,
    GateCardComponent,
    SecurityExitComponent,
    DiscrepanciesComponent,
    MovementComponent,
    VisitorsComponent,
    IncidentReportComponent,
    CheckoutVerifyComponent,
    MusterComponent,
    SecurityNotificationsComponent,
  ],
  schemas: [NO_ERRORS_SCHEMA],
})
export class AppModule {}

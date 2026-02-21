import { NgModule, NO_ERRORS_SCHEMA } from '@angular/core';
import { NativeScriptModule, NativeScriptHttpClientModule, NativeScriptFormsModule } from '@nativescript/angular';
import { AppRoutingModule } from './app-routing.module';
import { AppComponent } from './app.component';
import { LoginComponent } from './pages/login.component';
import { SecurityDashboardComponent } from './pages/security-dashboard.component';
import { GateVerifyComponent } from './pages/gate-verify.component';
import { MovementComponent } from './pages/movement.component';
import { VisitorsComponent } from './pages/visitors.component';
import { IncidentReportComponent } from './pages/incident-report.component';
import { CheckoutVerifyComponent } from './pages/checkout-verify.component';
import { MusterComponent } from './pages/muster.component';

@NgModule({
  bootstrap: [AppComponent],
  imports: [NativeScriptModule, NativeScriptHttpClientModule, NativeScriptFormsModule, AppRoutingModule],
  declarations: [
    AppComponent,
    LoginComponent,
    SecurityDashboardComponent,
    GateVerifyComponent,
    MovementComponent,
    VisitorsComponent,
    IncidentReportComponent,
    CheckoutVerifyComponent,
    MusterComponent,
  ],
  schemas: [NO_ERRORS_SCHEMA],
})
export class AppModule {}

import { NgModule } from '@angular/core';
import { Routes } from '@angular/router';
import { NativeScriptRouterModule } from '@nativescript/angular';
import { LoginComponent } from './pages/login.component';
import { SecurityNotificationsComponent } from './pages/notifications.component';
import { SecurityDashboardComponent } from './pages/security-dashboard.component';
import { GateVerifyComponent } from './pages/gate-verify.component';
import { MovementComponent } from './pages/movement.component';
import { VisitorsComponent } from './pages/visitors.component';
import { IncidentReportComponent } from './pages/incident-report.component';
import { CheckoutVerifyComponent } from './pages/checkout-verify.component';
import { MusterComponent } from './pages/muster.component';

const routes: Routes = [
  { path: '', redirectTo: '/login', pathMatch: 'full' },
  { path: 'login', component: LoginComponent },
  { path: 'notifications', component: SecurityNotificationsComponent },
  { path: 'dashboard', component: SecurityDashboardComponent },
  { path: 'gate-verify', component: GateVerifyComponent },
  { path: 'movement', component: MovementComponent },
  { path: 'visitors', component: VisitorsComponent },
  { path: 'incident-report', component: IncidentReportComponent },
  { path: 'checkout-verify', component: CheckoutVerifyComponent },
  { path: 'muster', component: MusterComponent },
];

@NgModule({
  imports: [NativeScriptRouterModule.forRoot(routes)],
  exports: [NativeScriptRouterModule],
})
export class AppRoutingModule {}

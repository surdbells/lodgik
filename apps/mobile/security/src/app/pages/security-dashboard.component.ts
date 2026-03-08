import { Component, OnInit, OnDestroy } from '@angular/core';
import { RouterExtensions } from '@nativescript/angular';
import { SecurityApiService } from '../services/security-api.service';

@Component({
  selector: 'ns-security-dashboard',
  template: `
    <ActionBar title="Security Dashboard"/>
    <ScrollView>
      <StackLayout class="p-4">

        <!-- Stats Grid -->
        <GridLayout columns="*,*" rows="auto,auto,auto" class="m-b-4">
          <StackLayout col="0" row="0" class="stat-card">
            <Label text="ON PREMISE" class="stat-label"/>
            <Label [text]="onPremiseCount" class="stat-value"/>
          </StackLayout>
          <StackLayout col="1" row="0" class="stat-card m-l-2">
            <Label text="PENDING PASSES" class="stat-label"/>
            <Label [text]="pendingPasses" class="stat-value" style="color:#f79009;"/>
          </StackLayout>
          <StackLayout col="0" row="1" class="stat-card m-t-2">
            <Label text="TODAY CHECK-INS" class="stat-label"/>
            <Label [text]="todayCheckIns" class="stat-value" style="color:#2563eb;"/>
          </StackLayout>
          <StackLayout col="1" row="1" class="stat-card m-l-2 m-t-2">
            <Label text="INCIDENTS" class="stat-label"/>
            <Label [text]="activeIncidents" class="stat-value" style="color:#dc2626;"/>
          </StackLayout>
          <StackLayout col="0" row="2" class="stat-card m-t-2">
            <Label text="DISCREPANCIES" class="stat-label"/>
            <Label [text]="discrepancyCount" class="stat-value"
              [style.color]="discrepancyCount > 0 ? '#dc2626' : '#16a34a'"/>
          </StackLayout>
          <StackLayout col="1" row="2" class="stat-card m-l-2 m-t-2">
            <Label text="PENDING EXITS" class="stat-label"/>
            <Label [text]="pendingCards" class="stat-value" style="color:#f79009;"/>
          </StackLayout>
        </GridLayout>

        <!-- ─── Card Operations ─────────────────────────── -->
        <Label text="CARD OPERATIONS" class="section-title"/>
        <GridLayout columns="*,*" rows="auto" class="m-b-3">
          <Button col="0" row="0" text="🪪  Issue Card at Gate" (tap)="nav('/gate-card')"
            class="action-btn m-1"/>
          <Button col="1" row="0" text="🚪  Security Exit"      (tap)="nav('/security-exit')"
            class="action-btn-red m-1"/>
        </GridLayout>
        <Button text="📋  Checkout Discrepancies"
          (tap)="nav('/discrepancies')"
          [style.background-color]="discrepancyCount > 0 ? '#dc2626' : '#6b7280'"
          class="btn-primary m-b-4"/>

        <!-- ─── General Operations ─────────────────────── -->
        <Label text="GENERAL OPERATIONS" class="section-title"/>
        <GridLayout columns="*,*" rows="auto,auto,auto">
          <Button col="0" row="0" text="Verify Pass"     (tap)="nav('/gate-verify')"    class="action-btn m-1"/>
          <Button col="1" row="0" text="Record Entry"    (tap)="nav('/movement')"       class="action-btn m-1"/>
          <Button col="0" row="1" text="Visitor Check"   (tap)="nav('/visitors')"       class="action-btn-amber m-1"/>
          <Button col="1" row="1" text="Report Incident" (tap)="nav('/incident-report')" class="action-btn-red m-1"/>
          <Button col="0" row="2" text="Checkout Verify" (tap)="nav('/checkout-verify')" class="action-btn m-1"/>
          <Button col="1" row="2" text="Muster List"     (tap)="nav('/muster')"         class="action-btn m-1"/>
        </GridLayout>

        <!-- Emergency -->
        <Button text="⚠ EMERGENCY PANIC" (tap)="triggerPanic()" class="btn-emergency"/>

      </StackLayout>
    </ScrollView>
  `
})
export class SecurityDashboardComponent implements OnInit, OnDestroy {
  onPremiseCount   = 0;
  pendingPasses    = 0;
  todayCheckIns    = 0;
  activeIncidents  = 0;
  discrepancyCount = 0;
  pendingCards     = 0;

  private refreshTimer: any;

  constructor(private api: SecurityApiService, private router: RouterExtensions) {}

  ngOnInit() { this.loadData(); this.refreshTimer = setInterval(() => this.loadData(), 15000); }
  ngOnDestroy() { if (this.refreshTimer) clearInterval(this.refreshTimer); }

  loadData() {
    this.api.getOnPremise().subscribe({ next: (r: any) => this.onPremiseCount = r?.data?.length || 0 });
    this.api.getGatePasses('pending').subscribe({ next: (r: any) => this.pendingPasses = r?.data?.length || 0 });
    this.api.getDashboard().subscribe({ next: (r: any) => { this.todayCheckIns = r?.data?.today_check_ins || 0; } });
    this.api.getIncidents().subscribe({ next: (r: any) => this.activeIncidents = (r?.data || []).filter((i: any) => ['new','assigned','in_progress'].includes(i.status)).length });
    this.api.getCheckoutDiscrepancies().subscribe({ next: (r: any) => this.discrepancyCount = r?.data?.length || 0 });
  }

  nav(path: string) { this.router.navigate([path]); }
  triggerPanic() { /* broadcast emergency alert */ }
}

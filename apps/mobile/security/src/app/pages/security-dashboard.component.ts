import { Component, OnInit, OnDestroy } from '@angular/core';
import { SecurityApiService } from '../services/security-api.service';

@Component({
  selector: 'ns-security-dashboard',
  template: `
    <ActionBar title="Security Dashboard" class="action-bar" style="background-color:#d32f2f; color:white;"/>
    <ScrollView>
      <StackLayout class="p-10">
        <!-- Stats Grid -->
        <GridLayout columns="*,*" rows="auto,auto" class="m-b-10">
          <StackLayout col="0" row="0" class="card" style="background-color:#fff; margin:5; padding:15; border-radius:8;">
            <Label text="ON PREMISE" style="font-size:11; color:#666;"/>
            <Label [text]="onPremiseCount" style="font-size:28; font-weight:bold; color:#2e7d32;"/>
          </StackLayout>
          <StackLayout col="1" row="0" class="card" style="background-color:#fff; margin:5; padding:15; border-radius:8;">
            <Label text="PENDING PASSES" style="font-size:11; color:#666;"/>
            <Label [text]="pendingPasses" style="font-size:28; font-weight:bold; color:#f57c00;"/>
          </StackLayout>
          <StackLayout col="0" row="1" class="card" style="background-color:#fff; margin:5; padding:15; border-radius:8;">
            <Label text="TODAY CHECK-INS" style="font-size:11; color:#666;"/>
            <Label [text]="todayCheckIns" style="font-size:28; font-weight:bold; color:#1565c0;"/>
          </StackLayout>
          <StackLayout col="1" row="1" class="card" style="background-color:#fff; margin:5; padding:15; border-radius:8;">
            <Label text="INCIDENTS" style="font-size:11; color:#666;"/>
            <Label [text]="activeIncidents" style="font-size:28; font-weight:bold; color:#d32f2f;"/>
          </StackLayout>
        </GridLayout>

        <!-- Quick Actions -->
        <Label text="QUICK ACTIONS" class="m-t-10 m-b-5" style="font-weight:bold; font-size:14; color:#666;"/>
        <GridLayout columns="*,*" rows="auto,auto,auto" class="m-b-10">
          <Button col="0" row="0" text="Verify Pass" (tap)="nav('/gate-verify')" class="m-5" style="background-color:#1565c0; color:white; border-radius:8; padding:18; font-weight:bold;"/>
          <Button col="1" row="0" text="Record Entry" (tap)="nav('/movement')" class="m-5" style="background-color:#2e7d32; color:white; border-radius:8; padding:18; font-weight:bold;"/>
          <Button col="0" row="1" text="Visitor Check" (tap)="nav('/visitors')" class="m-5" style="background-color:#f57c00; color:white; border-radius:8; padding:18; font-weight:bold;"/>
          <Button col="1" row="1" text="Report Incident" (tap)="nav('/incident-report')" class="m-5" style="background-color:#d32f2f; color:white; border-radius:8; padding:18; font-weight:bold;"/>
          <Button col="0" row="2" text="Checkout Verify" (tap)="nav('/checkout-verify')" class="m-5" style="background-color:#6a1b9a; color:white; border-radius:8; padding:18; font-weight:bold;"/>
          <Button col="1" row="2" text="Muster List" (tap)="nav('/muster')" class="m-5" style="background-color:#00695c; color:white; border-radius:8; padding:18; font-weight:bold;"/>
        </GridLayout>

        <!-- Emergency Panic Button -->
        <Button text="EMERGENCY PANIC" (tap)="triggerPanic()" style="background-color:#b71c1c; color:white; font-size:18; font-weight:bold; padding:20; border-radius:12; margin-top:20;"/>
      </StackLayout>
    </ScrollView>
  `
})
export class SecurityDashboardComponent implements OnInit, OnDestroy {
  onPremiseCount = 0; pendingPasses = 0; todayCheckIns = 0; activeIncidents = 0;
  private refreshTimer: any;
  constructor(private api: SecurityApiService, private router: any) {}
  ngOnInit() { this.loadData(); this.refreshTimer = setInterval(() => this.loadData(), 15000); }
  ngOnDestroy() { if (this.refreshTimer) clearInterval(this.refreshTimer); }
  loadData() {
    this.api.getOnPremise().subscribe({ next: (r: any) => this.onPremiseCount = r?.data?.length || 0 });
    this.api.getGatePasses('pending').subscribe({ next: (r: any) => this.pendingPasses = r?.data?.length || 0 });
    this.api.getDashboard().subscribe({ next: (r: any) => { this.todayCheckIns = r?.data?.today_check_ins || 0; } });
    this.api.getIncidents().subscribe({ next: (r: any) => this.activeIncidents = (r?.data || []).filter((i: any) => ['new','assigned','in_progress'].includes(i.status)).length });
  }
  nav(path: string) { this.router.navigate([path]); }
  triggerPanic() { /* TODO: broadcast emergency alert via notification API */ }
}

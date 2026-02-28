import { Component } from '@angular/core';
import { SecurityApiService } from '../services/security-api.service';

@Component({
  selector: 'ns-gate-verify',
  template: `
    <ActionBar title="Gate Pass Verification">
      <NavigationButton text="Back" android.systemIcon="ic_menu_back"/>
    </ActionBar>
    <ScrollView>
      <StackLayout class="p-4">

        <Label text="Enter PIN or scan QR code" class="page-subtitle"/>
        <TextField [(ngModel)]="pinCode" hint="Gate pass PIN" class="input m-b-3"
          style="font-size:20; text-align:center;"/>
        <Button text="VERIFY" (tap)="verify()" class="btn-primary m-b-4"/>

        <!-- Verification result -->
        <StackLayout *ngIf="result" class="card m-b-4"
          [style.border-left-width]="4"
          [style.border-left-color]="result.valid ? '#16a34a' : '#dc2626'">
          <Label [text]="result.valid ? '✓ VALID PASS' : '✗ INVALID / EXPIRED'"
            style="font-size:17; font-weight:bold;"
            [style.color]="result.valid ? '#16a34a' : '#dc2626'"/>
          <Label *ngIf="result.guest_name"   [text]="'Guest: '   + result.guest_name"   class="list-item-subtitle m-t-2"/>
          <Label *ngIf="result.visitor_name" [text]="'Visitor: ' + result.visitor_name" class="list-item-subtitle"/>
          <Label *ngIf="result.room_number"  [text]="'Room: '    + result.room_number"  class="list-item-subtitle"/>
          <Label *ngIf="result.expires_at"   [text]="'Expires: ' + result.expires_at"   class="list-item-meta"/>
          <GridLayout *ngIf="result.valid && result.gate_pass_id" columns="*,*" class="m-t-3">
            <Button col="0" text="CHECK IN" (tap)="checkIn(result.gate_pass_id)" class="btn-primary m-r-2"/>
            <Button col="1" text="DENY"     (tap)="deny(result.gate_pass_id)"    class="btn-danger"/>
          </GridLayout>
        </StackLayout>

        <!-- Pending passes -->
        <Label text="PENDING PASSES" class="section-title m-t-2"/>
        <StackLayout *ngFor="let pass of pendingPasses" class="list-item">
          <Label [text]="pass.visitor_name || pass.guest_name || 'Unknown'" class="list-item-title"/>
          <Label [text]="'Type: ' + pass.pass_type" class="list-item-subtitle"/>
          <GridLayout columns="*,*" class="m-t-2">
            <Button col="0" text="Approve" (tap)="approve(pass.id)" class="btn-primary-sm m-r-1"/>
            <Button col="1" text="Deny"    (tap)="deny(pass.id)"    class="btn-danger"/>
          </GridLayout>
        </StackLayout>
        <Label *ngIf="pendingPasses.length === 0" text="No pending passes" class="empty-state"/>
      </StackLayout>
    </ScrollView>
  `
})
export class GateVerifyComponent {
  pinCode = ''; result: any = null; pendingPasses: any[] = [];
  constructor(private api: SecurityApiService) { this.loadPending(); }
  verify() {
    if (!this.pinCode) return;
    this.api.validateVisitorCode(this.pinCode).subscribe({ next: (r: any) => this.result = r?.data || { valid: false }, error: () => this.result = { valid: false } });
  }
  loadPending() { this.api.getGatePasses('pending').subscribe({ next: (r: any) => this.pendingPasses = r?.data || [] }); }
  approve(id: string) { this.api.approveGatePass(id).subscribe({ next: () => this.loadPending() }); }
  deny(id: string) { this.api.denyGatePass(id).subscribe({ next: () => { this.result = null; this.pinCode = ''; this.loadPending(); } }); }
  checkIn(id: string) { this.api.checkInGatePass(id).subscribe({ next: () => { this.result = null; this.pinCode = ''; this.loadPending(); } }); }
}

import { Component } from '@angular/core';
import { SecurityApiService } from '../services/security-api.service';

@Component({
  selector: 'ns-gate-verify',
  template: `
    <ActionBar title="Gate Pass Verification" class="action-bar" style="background-color:#1565c0; color:white;">
      <NavigationButton text="Back" android.systemIcon="ic_menu_back"/>
    </ActionBar>
    <ScrollView>
      <StackLayout class="p-15">
        <Label text="Enter PIN or Scan QR Code" class="m-b-10" style="font-size:16; color:#666;"/>
        <TextField [(ngModel)]="pinCode" hint="Enter gate pass PIN" class="m-b-10" style="border-width:1; border-color:#ccc; padding:15; border-radius:8; font-size:20; text-align:center;"/>
        <Button text="VERIFY" (tap)="verify()" style="background-color:#1565c0; color:white; padding:15; border-radius:8; font-weight:bold; margin-bottom:20;"/>

        <StackLayout *ngIf="result" style="background-color:#fff; padding:15; border-radius:8; border-left-width:4;" [style.border-left-color]="result.valid ? '#2e7d32' : '#d32f2f'">
          <Label [text]="result.valid ? 'VALID PASS' : 'INVALID / EXPIRED'" style="font-weight:bold; font-size:18;" [style.color]="result.valid ? '#2e7d32' : '#d32f2f'"/>
          <Label *ngIf="result.guest_name" [text]="'Guest: ' + result.guest_name" class="m-t-5"/>
          <Label *ngIf="result.visitor_name" [text]="'Visitor: ' + result.visitor_name" class="m-t-5"/>
          <Label *ngIf="result.room_number" [text]="'Room: ' + result.room_number" class="m-t-5"/>
          <Label *ngIf="result.expires_at" [text]="'Expires: ' + result.expires_at" class="m-t-5"/>
          <GridLayout *ngIf="result.valid && result.gate_pass_id" columns="*,*" class="m-t-10">
            <Button col="0" text="CHECK IN" (tap)="checkIn(result.gate_pass_id)" style="background-color:#2e7d32; color:white; border-radius:8; padding:12; margin-right:5;"/>
            <Button col="1" text="DENY" (tap)="deny(result.gate_pass_id)" style="background-color:#d32f2f; color:white; border-radius:8; padding:12; margin-left:5;"/>
          </GridLayout>
        </StackLayout>

        <!-- Pending Passes List -->
        <Label text="PENDING PASSES" class="m-t-20 m-b-10" style="font-weight:bold; color:#666;"/>
        <StackLayout *ngFor="let pass of pendingPasses" style="background-color:#fff; padding:12; margin-bottom:8; border-radius:8;">
          <Label [text]="pass.visitor_name || pass.guest_name || 'Unknown'" style="font-weight:bold;"/>
          <Label [text]="'Type: ' + pass.pass_type" style="color:#666; font-size:13;"/>
          <GridLayout columns="*,*" class="m-t-5">
            <Button col="0" text="Approve" (tap)="approve(pass.id)" style="background-color:#2e7d32; color:white; border-radius:6; padding:8; font-size:13; margin-right:3;"/>
            <Button col="1" text="Deny" (tap)="deny(pass.id)" style="background-color:#d32f2f; color:white; border-radius:6; padding:8; font-size:13; margin-left:3;"/>
          </GridLayout>
        </StackLayout>
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
  deny(id: string) { this.api.denyGatePass(id).subscribe({ next: () => this.loadPending() }); }
  checkIn(id: string) { this.api.checkInGatePass(id).subscribe({ next: () => { this.result = null; this.pinCode = ''; this.loadPending(); } }); }
}

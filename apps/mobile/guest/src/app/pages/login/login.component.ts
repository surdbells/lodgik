import { Component, NO_ERRORS_SCHEMA } from '@angular/core';
import { NativeScriptCommonModule } from '@nativescript/angular';
import { NativeScriptFormsModule } from '@nativescript/angular';
import { RouterExtensions } from '@nativescript/angular';
import { ApiService } from '../../services/api.service';

@Component({
  selector: 'Login',
  standalone: true,
  imports: [NativeScriptCommonModule, NativeScriptFormsModule],
  schemas: [NO_ERRORS_SCHEMA],
  template: `
    <ActionBar title="Lodgik Guest" flat="true" class="bg-blue-600"></ActionBar>
    <FlexboxLayout flexDirection="column" class="p-6">
      <Image src="res://logo" height="80" class="m-b-4" stretch="aspectFit"></Image>
      <Label text="Welcome" class="text-2xl font-bold text-center m-b-2"></Label>
      <Label text="Sign in to access your room services" class="text-sm text-gray-500 text-center m-b-6"></Label>

      <!-- Tab Selector -->
      <FlexboxLayout class="m-b-4" justifyContent="center">
        <Button [text]="'📱 Phone OTP'" (tap)="tab='otp'" [class]="tab==='otp' ? 'bg-blue-600 text-white p-2 m-r-2 rounded-lg' : 'bg-gray-200 p-2 m-r-2 rounded-lg'"></Button>
        <Button [text]="'🔑 Access Code'" (tap)="tab='code'" [class]="tab==='code' ? 'bg-blue-600 text-white p-2 rounded-lg' : 'bg-gray-200 p-2 rounded-lg'"></Button>
      </FlexboxLayout>

      <!-- OTP Tab -->
      <StackLayout *ngIf="tab==='otp'">
        <Label text="Phone Number" class="text-sm font-medium m-b-1"></Label>
        <TextField [(ngModel)]="phone" hint="08012345678" keyboardType="phone" class="input border rounded-lg p-3 m-b-3"></TextField>

        <Button *ngIf="!otpSent" text="Send OTP" (tap)="sendOtp()" [isEnabled]="!loading" class="bg-blue-600 text-white p-4 rounded-lg font-bold"></Button>

        <StackLayout *ngIf="otpSent">
          <Label text="Enter OTP" class="text-sm font-medium m-b-1"></Label>
          <TextField [(ngModel)]="otp" hint="123456" keyboardType="number" maxLength="6" class="input border rounded-lg p-3 m-b-3 text-center text-2xl tracking-widest"></TextField>
          <Button text="Verify & Login" (tap)="verifyOtp()" [isEnabled]="!loading" class="bg-green-600 text-white p-4 rounded-lg font-bold"></Button>
          <Label [text]="'Resend OTP'" (tap)="sendOtp()" class="text-blue-600 text-center m-t-2 text-sm"></Label>
        </StackLayout>
      </StackLayout>

      <!-- Access Code Tab -->
      <StackLayout *ngIf="tab==='code'">
        <Label text="Enter your 6-digit access code" class="text-sm text-gray-500 text-center m-b-3"></Label>
        <Label text="You received this code at check-in" class="text-xs text-gray-400 text-center m-b-4"></Label>
        <TextField [(ngModel)]="accessCode" hint="000000" keyboardType="number" maxLength="6" class="input border-2 border-blue-300 rounded-xl p-4 m-b-4 text-center text-3xl tracking-widest font-bold"></TextField>
        <Button text="Login" (tap)="loginWithCode()" [isEnabled]="!loading" class="bg-blue-600 text-white p-4 rounded-lg font-bold"></Button>
      </StackLayout>

      <!-- Server URL (hidden, long-press logo) -->
      <StackLayout *ngIf="showConfig" class="m-t-4 bg-gray-100 p-3 rounded-lg">
        <Label text="API URL" class="text-xs text-gray-500"></Label>
        <TextField [(ngModel)]="apiUrl" class="input border rounded p-2 text-sm m-b-2"></TextField>
        <Label text="Tenant ID" class="text-xs text-gray-500"></Label>
        <TextField [(ngModel)]="tenantId" class="input border rounded p-2 text-sm m-b-2"></TextField>
        <Button text="Save" (tap)="saveConfig()" class="bg-gray-600 text-white p-2 rounded"></Button>
      </StackLayout>

      <Label *ngIf="error" [text]="error" class="text-red-500 text-center m-t-3 text-sm"></Label>
      <ActivityIndicator *ngIf="loading" busy="true" class="m-t-4"></ActivityIndicator>
    </FlexboxLayout>
  `,
})
export class LoginComponent {
  tab: 'otp' | 'code' = 'code';
  phone = '';
  otp = '';
  otpSent = false;
  accessCode = '';
  loading = false;
  error = '';
  showConfig = false;
  apiUrl = '';
  tenantId = '';

  constructor(private api: ApiService, private router: RouterExtensions) {
    this.apiUrl = this.api.getBaseUrl();
    const session = this.api.getSession();
    this.tenantId = session?.tenant_id || '';
  }

  sendOtp() {
    if (!this.phone) { this.error = 'Enter your phone number'; return; }
    this.loading = true; this.error = '';
    this.api.post('/guest-auth/otp/send', { phone: this.phone, tenant_id: this.tenantId }).subscribe({
      next: (r: any) => { this.otpSent = true; this.loading = false; if (r.data?.dev_otp) this.otp = r.data.dev_otp; },
      error: (e) => { this.error = e.error?.message || 'Failed to send OTP'; this.loading = false; },
    });
  }

  verifyOtp() {
    if (!this.otp || this.otp.length < 6) { this.error = 'Enter the 6-digit OTP'; return; }
    this.loading = true; this.error = '';
    this.api.post('/guest-auth/otp/verify', { phone: this.phone, otp: this.otp, tenant_id: this.tenantId }).subscribe({
      next: (r: any) => { this.handleLogin(r.data); },
      error: (e) => { this.error = e.error?.message || 'Invalid OTP'; this.loading = false; },
    });
  }

  loginWithCode() {
    if (!this.accessCode || this.accessCode.length < 6) { this.error = 'Enter your 6-digit code'; return; }
    this.loading = true; this.error = '';
    this.api.post('/guest-auth/access-code', { code: this.accessCode, tenant_id: this.tenantId }).subscribe({
      next: (r: any) => { this.handleLogin(r.data); },
      error: (e) => { this.error = e.error?.message || 'Invalid access code'; this.loading = false; },
    });
  }

  private handleLogin(data: any) {
    this.api.setToken(data.token);
    this.api.setSession(data);
    this.loading = false;
    this.router.navigate(['/dashboard'], { clearHistory: true });
  }

  saveConfig() {
    if (this.apiUrl) this.api.setBaseUrl(this.apiUrl);
    this.showConfig = false;
  }
}

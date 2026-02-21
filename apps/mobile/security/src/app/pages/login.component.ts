import { Component } from '@angular/core';
import { Router } from '@angular/router';
import { ApplicationSettings } from '@nativescript/core';
import { SecurityApiService } from '../services/security-api.service';

@Component({
  selector: 'ns-login',
  template: `
    <FlexboxLayout flexDirection="column" justifyContent="center" class="p-20">
      <Label text="LODGIK SECURITY" class="h1 text-center m-b-20" style="font-weight:bold; color:#d32f2f;"/>
      <Label text="Gate & Security Post" class="text-center m-b-30" style="color:#666;"/>
      <TextField [(ngModel)]="email" hint="Email" keyboardType="email" class="input m-b-10" style="border-bottom-width:1; padding:12;"/>
      <TextField [(ngModel)]="password" hint="Password" secure="true" class="input m-b-20" style="border-bottom-width:1; padding:12;"/>
      <Button text="LOGIN" (tap)="onLogin()" class="btn btn-primary m-b-10" style="background-color:#d32f2f; color:white; border-radius:8; padding:14; font-weight:bold;"/>
      <Label *ngIf="error" [text]="error" class="text-center" style="color:red; margin-top:10;"/>
    </FlexboxLayout>
  `
})
export class LoginComponent {
  email = ''; password = ''; error = '';
  constructor(private api: SecurityApiService, private router: Router) {}
  onLogin() {
    this.error = '';
    this.api.login(this.email, this.password).subscribe({
      next: (r: any) => {
        ApplicationSettings.setString('auth_token', r.token);
        ApplicationSettings.setString('property_id', r.user?.property_id || '');
        this.router.navigate(['/dashboard']);
      },
      error: () => this.error = 'Invalid credentials'
    });
  }
}

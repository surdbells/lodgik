import { Component } from '@angular/core';
import { Router } from '@angular/router';
import { ApplicationSettings } from '@nativescript/core';
import { SecurityApiService } from '../services/security-api.service';

@Component({
  selector: 'ns-login',
  template: `
    <FlexboxLayout flexDirection="column" justifyContent="center" class="p-6">
      <Label text="LODGIK" class="page-title text-primary text-center m-b-1" style="font-size:28;"/>
      <Label text="Security & Gate Post" class="page-subtitle text-center m-b-6"/>
      <Label text="EMAIL" class="input-label"/>
      <TextField [(ngModel)]="email" hint="your@email.com" keyboardType="email" class="input m-b-3"/>
      <Label text="PASSWORD" class="input-label"/>
      <TextField [(ngModel)]="password" hint="Password" secure="true" class="input m-b-4"/>
      <Button text="LOGIN" (tap)="onLogin()" class="btn-primary"/>
      <Label *ngIf="error" [text]="error" class="text-danger text-center m-t-3"/>
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

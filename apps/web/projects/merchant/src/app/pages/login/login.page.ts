import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '@lodgik/shared';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [FormsModule],
  template: `
    <div class="min-h-screen flex items-center justify-center bg-gradient-to-br from-emerald-50 to-emerald-100">
      <div class="bg-white rounded-xl shadow-lg p-8 w-full max-w-sm">
        <div class="text-center mb-6">
          <h1 class="text-2xl font-bold text-emerald-900">Lodgik</h1>
          <p class="text-sm text-gray-500 mt-1">Merchant Portal</p>
        </div>
        @if (error()) { <div class="bg-red-50 text-red-600 text-sm p-3 rounded-lg mb-4">{{ error() }}</div> }
        <div class="space-y-4">
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">Email</label>
            <input [(ngModel)]="email" type="email" class="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500" placeholder="merchant@example.com">
          </div>
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">Password</label>
            <input [(ngModel)]="password" type="password" class="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500" placeholder="••••••••" (keyup.enter)="login()">
          </div>
          <button (click)="login()" [disabled]="loading()" class="w-full py-2.5 bg-emerald-600 text-white text-sm font-medium rounded-lg hover:bg-emerald-700 disabled:opacity-50">
            {{ loading() ? 'Signing in...' : 'Sign In' }}
          </button>
        </div>
      </div>
    </div>
  `,
})
export class LoginPage {
  private auth = inject(AuthService);
  private router = inject(Router);
  email = ''; password = '';
  loading = signal(false); error = signal('');

  login(): void {
    this.loading.set(true); this.error.set('');
    this.auth.login({ email: this.email, password: this.password }).subscribe({
      next: () => { this.loading.set(false); this.router.navigate(['/']); },
      error: (e: any) => { this.loading.set(false); this.error.set(e?.error?.message || 'Login failed'); },
    });
  }
}

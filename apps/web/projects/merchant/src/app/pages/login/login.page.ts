import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '@lodgik/shared';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [FormsModule],
  template: `
    <div class="min-h-screen flex">
      <!-- Brand panel -->
      <div class="hidden lg:flex lg:w-1/2 items-center justify-center p-12"
           style="background: linear-gradient(135deg, #293929 0%, #3a543a 40%, #5a825a 100%)">
        <div class="max-w-md text-center">
          <div class="w-16 h-16 rounded-2xl bg-white/10 backdrop-blur-sm flex items-center justify-center mx-auto mb-8">
            <span class="text-3xl font-bold text-white font-heading">L</span>
          </div>
          <h1 class="text-4xl font-bold text-white font-heading">Lodgik</h1>
          <p class="text-lg text-white/50 mt-2">Merchant Portal</p>
          <div class="mt-10 space-y-3 text-left">
            <div class="flex items-center gap-3 text-white/80">
              <span class="w-8 h-8 rounded-lg bg-white/10 flex items-center justify-center text-sm">✓</span>
              <span class="text-sm">Track hotel referrals & commissions</span>
            </div>
            <div class="flex items-center gap-3 text-white/80">
              <span class="w-8 h-8 rounded-lg bg-white/10 flex items-center justify-center text-sm">✓</span>
              <span class="text-sm">Manage leads & payouts</span>
            </div>
            <div class="flex items-center gap-3 text-white/80">
              <span class="w-8 h-8 rounded-lg bg-white/10 flex items-center justify-center text-sm">✓</span>
              <span class="text-sm">Access resources & support</span>
            </div>
          </div>
        </div>
      </div>

      <!-- Form -->
      <div class="flex-1 flex items-center justify-center p-8 bg-gray-50">
        <div class="w-full max-w-md">
          <div class="lg:hidden text-center mb-8">
            <h1 class="text-2xl font-bold text-gray-900 font-heading">Lodgik</h1>
            <p class="text-gray-400 text-sm mt-1">Merchant Portal</p>
          </div>
          <div class="bg-white rounded-2xl shadow-lg border border-gray-100 p-8">
            <h2 class="text-xl font-bold text-gray-900 font-heading">Sign in</h2>
            <p class="text-sm text-gray-500 mt-1">Access your merchant dashboard</p>
            @if (error()) { <div class="bg-red-50 text-red-600 text-sm p-3 rounded-lg mt-4">{{ error() }}</div> }
            <div class="space-y-4 mt-6">
              <div>
                <label class="block text-sm font-medium text-gray-700 mb-1.5">Email</label>
                <input [(ngModel)]="email" type="email" placeholder="merchant&#64;example.com"
                       class="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm bg-gray-50 focus:ring-2 focus:ring-sage-200 focus:border-sage-400 focus:bg-white outline-none transition-all">
              </div>
              <div>
                <label class="block text-sm font-medium text-gray-700 mb-1.5">Password</label>
                <input [(ngModel)]="password" type="password" placeholder="••••••••" (keyup.enter)="login()"
                       class="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm bg-gray-50 focus:ring-2 focus:ring-sage-200 focus:border-sage-400 focus:bg-white outline-none transition-all">
              </div>
              <button (click)="login()" [disabled]="loading()"
                      class="w-full py-3 text-white rounded-xl text-sm font-semibold hover:opacity-90 disabled:opacity-50 transition-all shadow-sm"
                      style="background: linear-gradient(135deg, #3a543a 0%, #5a825a 100%)">
                {{ loading() ? 'Signing in...' : 'Sign In' }}
              </button>
            </div>
          </div>
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

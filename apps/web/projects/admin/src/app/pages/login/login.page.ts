import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService, ToastService } from '@lodgik/shared';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [FormsModule],
  template: `
    <div class="min-h-screen flex">
      <!-- Brand panel -->
      <div class="hidden lg:flex lg:w-1/2 items-center justify-center p-12"
           style="background: linear-gradient(135deg, #1a2a1a 0%, #293929 40%, #3a543a 100%)">
        <div class="max-w-md text-center">
          <div class="w-16 h-16 rounded-2xl bg-white/10 backdrop-blur-sm flex items-center justify-center mx-auto mb-8">
            <span class="text-3xl font-bold text-white font-heading">L</span>
          </div>
          <h1 class="text-4xl font-bold text-white font-heading">Lodgik</h1>
          <p class="text-lg text-white/50 mt-2">Super Admin Console</p>
          <div class="mt-10 grid grid-cols-3 gap-4">
            <div class="bg-white/5 rounded-xl p-4 backdrop-blur-sm">
              <p class="text-2xl font-bold text-white font-heading">SaaS</p>
              <p class="text-[11px] text-white/40 mt-1">Platform</p>
            </div>
            <div class="bg-white/5 rounded-xl p-4 backdrop-blur-sm">
              <p class="text-2xl font-bold text-white font-heading">Multi</p>
              <p class="text-[11px] text-white/40 mt-1">Tenant</p>
            </div>
            <div class="bg-white/5 rounded-xl p-4 backdrop-blur-sm">
              <p class="text-2xl font-bold text-white font-heading">100%</p>
              <p class="text-[11px] text-white/40 mt-1">Cloud</p>
            </div>
          </div>
        </div>
      </div>

      <!-- Form -->
      <div class="flex-1 flex items-center justify-center p-8 bg-gray-50">
        <div class="w-full max-w-md">
          <div class="lg:hidden text-center mb-8">
            <h1 class="text-2xl font-bold text-gray-900 font-heading">Lodgik</h1>
            <p class="text-gray-400 text-sm mt-1">Super Admin Console</p>
          </div>
          <div class="bg-white rounded-2xl shadow-lg border border-gray-100 p-8">
            <h2 class="text-xl font-bold text-gray-900 font-heading">Sign in</h2>
            <p class="text-sm text-gray-500 mt-1">Access the admin dashboard</p>
            <form (ngSubmit)="login()" class="space-y-4 mt-6">
              <div>
                <label class="block text-sm font-medium text-gray-700 mb-1.5">Email</label>
                <input type="email" [(ngModel)]="email" name="email" required placeholder="admin&#64;lodgik.co"
                       class="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm bg-gray-50 focus:ring-2 focus:ring-sage-200 focus:border-sage-400 focus:bg-white outline-none transition-all">
              </div>
              <div>
                <label class="block text-sm font-medium text-gray-700 mb-1.5">Password</label>
                <div class="relative">
                  <input [type]="showPassword ? 'text' : 'password'" [(ngModel)]="password" name="password" required placeholder="••••••••"
                         class="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm bg-gray-50 focus:ring-2 focus:ring-sage-200 focus:border-sage-400 focus:bg-white outline-none transition-all pr-10">
                  <button type="button" (click)="showPassword = !showPassword" class="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                    {{ showPassword ? '🙈' : '👁️' }}
                  </button>
                </div>
              </div>
              @if (error()) {
                <p class="text-sm text-red-600 bg-red-50 px-3 py-2 rounded-lg">{{ error() }}</p>
              }
              <button type="submit" [disabled]="loading()"
                      class="w-full py-3 text-white rounded-xl text-sm font-semibold hover:opacity-90 disabled:opacity-50 transition-all shadow-sm"
                      style="background: linear-gradient(135deg, #293929 0%, #3a543a 100%)">
                {{ loading() ? 'Signing in...' : 'Sign in' }}
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  `,
})
export class LoginPage {
  private auth = inject(AuthService);
  private router = inject(Router);
  private toast = inject(ToastService);

  email = '';
  password = ''; showPassword = false;
  loading = signal(false);
  error = signal('');

  login(): void {
    this.loading.set(true);
    this.error.set('');
    this.auth.login({ email: this.email, password: this.password }).subscribe({
      next: res => {
        this.loading.set(false);
        if (res.success) {
          if (res.data.user.role !== 'super_admin') { this.error.set('Access denied. Super admin only.'); return; }
          this.toast.success('Welcome back!');
          this.router.navigate(['/dashboard']);
        } else { this.error.set(res.message || 'Invalid credentials'); }
      },
      error: () => { this.loading.set(false); this.error.set('Login failed. Please try again.'); },
    });
  }
}

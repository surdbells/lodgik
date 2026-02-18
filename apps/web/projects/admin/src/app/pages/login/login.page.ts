import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService, ToastService } from '@lodgik/shared';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [FormsModule],
  template: `
    <div class="min-h-screen bg-gradient-to-br from-slate-900 to-slate-700 flex items-center justify-center p-4">
      <div class="w-full max-w-md">
        <div class="text-center mb-8">
          <h1 class="text-3xl font-bold text-white">Lodgik</h1>
          <p class="text-slate-300 mt-1">Super Admin Console</p>
        </div>
        <div class="bg-white rounded-xl shadow-2xl p-8">
          <h2 class="text-xl font-semibold text-gray-800 mb-6">Sign in</h2>
          <form (ngSubmit)="login()" class="space-y-4">
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1">Email</label>
              <input type="email" [(ngModel)]="email" name="email" required
                     class="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                     placeholder="admin&#64;lodgik.com">
            </div>
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1">Password</label>
              <input type="password" [(ngModel)]="password" name="password" required
                     class="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                     placeholder="••••••••">
            </div>
            @if (error()) {
              <p class="text-sm text-red-600 bg-red-50 px-3 py-2 rounded">{{ error() }}</p>
            }
            <button type="submit" [disabled]="loading()"
                    class="w-full py-2.5 bg-slate-800 text-white rounded-lg text-sm font-medium hover:bg-slate-700 disabled:opacity-50 transition-colors">
              {{ loading() ? 'Signing in...' : 'Sign in' }}
            </button>
          </form>
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
  password = '';
  loading = signal(false);
  error = signal('');

  login(): void {
    this.loading.set(true);
    this.error.set('');

    this.auth.login({ email: this.email, password: this.password }).subscribe({
      next: res => {
        this.loading.set(false);
        if (res.success) {
          if (res.data.user.role !== 'super_admin') {
            this.error.set('Access denied. Super admin only.');
            return;
          }
          this.toast.success('Welcome back!');
          this.router.navigate(['/dashboard']);
        } else {
          this.error.set(res.message || 'Invalid credentials');
        }
      },
      error: () => {
        this.loading.set(false);
        this.error.set('Login failed. Please try again.');
      },
    });
  }
}

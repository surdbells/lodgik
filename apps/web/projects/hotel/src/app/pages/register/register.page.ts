import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { ApiService, ToastService } from '@lodgik/shared';

@Component({
  selector: 'app-register',
  standalone: true,
  imports: [FormsModule, RouterLink],
  template: `
    <div class="min-h-screen bg-gradient-to-br from-blue-900 via-blue-800 to-indigo-900 flex items-center justify-center p-4">
      <div class="w-full max-w-lg">
        <div class="text-center mb-8">
          <h1 class="text-3xl font-bold text-white">Lodgik</h1>
          <p class="text-blue-200 mt-1">Start your 14-day free trial</p>
        </div>
        <div class="bg-white rounded-xl shadow-2xl p-8">
          <h2 class="text-xl font-semibold text-gray-800 mb-6">Register your hotel</h2>
          <form (ngSubmit)="register()" class="space-y-4">
            <input [(ngModel)]="form.hotel_name" name="hotel_name" placeholder="Hotel name" required
                   class="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none">
            <div class="grid grid-cols-2 gap-3">
              <input [(ngModel)]="form.admin_first_name" name="fn" placeholder="First name" required
                     class="px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none">
              <input [(ngModel)]="form.admin_last_name" name="ln" placeholder="Last name" required
                     class="px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none">
            </div>
            <input [(ngModel)]="form.admin_email" name="email" type="email" placeholder="Email address" required
                   class="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none">
            <input [(ngModel)]="form.admin_password" name="pw" type="password" placeholder="Password (min 8 chars)" required
                   class="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none">
            @if (error()) {
              <p class="text-sm text-red-600 bg-red-50 px-3 py-2 rounded">{{ error() }}</p>
            }
            <button type="submit" [disabled]="loading()"
                    class="w-full py-2.5 bg-blue-700 text-white rounded-lg text-sm font-medium hover:bg-blue-600 disabled:opacity-50">
              {{ loading() ? 'Creating...' : 'Create Account & Start Trial' }}
            </button>
          </form>
          <p class="mt-4 text-center text-sm text-gray-500">
            Already have an account? <a routerLink="/login" class="text-blue-600 hover:underline">Sign in</a>
          </p>
        </div>
      </div>
    </div>
  `,
})
export class RegisterPage {
  private api = inject(ApiService);
  private router = inject(Router);
  private toast = inject(ToastService);
  form: any = { hotel_name: '', admin_first_name: '', admin_last_name: '', admin_email: '', admin_password: '' };
  loading = signal(false); error = signal('');

  register(): void {
    this.loading.set(true); this.error.set('');
    this.api.post('/onboarding/register', this.form).subscribe({
      next: res => {
        this.loading.set(false);
        if (res.success) {
          // Auto-login after registration
          this.api.post('/auth/login', { email: this.form.admin_email, password: this.form.admin_password }).subscribe(lr => {
            if (lr.success) {
              localStorage.setItem('lodgik_access_token', lr.data.access_token);
              localStorage.setItem('lodgik_refresh_token', lr.data.refresh_token);
              localStorage.setItem('lodgik_user', JSON.stringify(lr.data.user));
              this.toast.success('Welcome to Lodgik! Complete your setup.');
              this.router.navigate(['/onboarding']);
            }
          });
        } else this.error.set(res.message || 'Registration failed');
      },
      error: () => { this.loading.set(false); this.error.set('Registration failed'); },
    });
  }
}

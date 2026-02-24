import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { ApiService, ToastService } from '@lodgik/shared';

@Component({
  selector: 'app-register',
  standalone: true,
  imports: [FormsModule, RouterLink],
  template: `
    <div class="min-h-screen flex">
      <!-- Left: Brand panel -->
      <div class="hidden lg:flex lg:w-1/2 items-center justify-center p-12"
           style="background: linear-gradient(135deg, #293929 0%, #3a543a 40%, #5a825a 100%)">
        <div class="max-w-md text-center">
          <div class="w-16 h-16 rounded-2xl bg-white/15 backdrop-blur-sm flex items-center justify-center mx-auto mb-8">
            <span class="text-3xl font-bold text-white font-heading">L</span>
          </div>
          <h1 class="text-4xl font-bold text-white font-heading">Lodgik</h1>
          <p class="text-lg text-white/60 mt-3">Start your 14-day free trial</p>
          <div class="mt-12 space-y-4 text-left">
            <div class="flex items-center gap-3 text-white/80">
              <span class="w-8 h-8 rounded-lg bg-white/10 flex items-center justify-center text-sm">✓</span>
              <span class="text-sm">Full access to all modules</span>
            </div>
            <div class="flex items-center gap-3 text-white/80">
              <span class="w-8 h-8 rounded-lg bg-white/10 flex items-center justify-center text-sm">✓</span>
              <span class="text-sm">No credit card required</span>
            </div>
            <div class="flex items-center gap-3 text-white/80">
              <span class="w-8 h-8 rounded-lg bg-white/10 flex items-center justify-center text-sm">✓</span>
              <span class="text-sm">Cancel anytime</span>
            </div>
          </div>
        </div>
      </div>

      <!-- Right: Register form -->
      <div class="flex-1 flex items-center justify-center p-8 bg-gray-50">
        <div class="w-full max-w-md">
          <div class="lg:hidden text-center mb-8">
            <h1 class="text-2xl font-bold text-gray-900 font-heading">Lodgik</h1>
            <p class="text-gray-400 text-sm mt-1">Start your 14-day free trial</p>
          </div>
          <div class="bg-white rounded-2xl shadow-lg border border-gray-100 p-8">
            <h2 class="text-xl font-bold text-gray-900 font-heading">Register your hotel</h2>
            <p class="text-sm text-gray-500 mt-1">Create your account to get started</p>
            <form (ngSubmit)="register()" class="space-y-4 mt-6">
              <input [(ngModel)]="form.hotel_name" name="hotel_name" placeholder="Hotel name" required
                     class="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm bg-gray-50 focus:ring-2 focus:ring-sage-200 focus:border-sage-400 focus:bg-white outline-none transition-all">
              <div class="grid grid-cols-2 gap-3">
                <input [(ngModel)]="form.admin_first_name" name="fn" placeholder="First name" required
                       class="px-4 py-2.5 border border-gray-200 rounded-xl text-sm bg-gray-50 focus:ring-2 focus:ring-sage-200 focus:border-sage-400 focus:bg-white outline-none transition-all">
                <input [(ngModel)]="form.admin_last_name" name="ln" placeholder="Last name" required
                       class="px-4 py-2.5 border border-gray-200 rounded-xl text-sm bg-gray-50 focus:ring-2 focus:ring-sage-200 focus:border-sage-400 focus:bg-white outline-none transition-all">
              </div>
              <input [(ngModel)]="form.admin_email" name="email" type="email" placeholder="Email address" required
                     class="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm bg-gray-50 focus:ring-2 focus:ring-sage-200 focus:border-sage-400 focus:bg-white outline-none transition-all">
              <input [(ngModel)]="form.admin_password" name="pw" type="password" placeholder="Password (min 8 chars)" required
                     class="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm bg-gray-50 focus:ring-2 focus:ring-sage-200 focus:border-sage-400 focus:bg-white outline-none transition-all">
              @if (error()) {
                <p class="text-sm text-red-600 bg-red-50 px-3 py-2 rounded-lg">{{ error() }}</p>
              }
              <button type="submit" [disabled]="loading()"
                      class="w-full py-3 text-white rounded-xl text-sm font-semibold hover:opacity-90 disabled:opacity-50 transition-all shadow-sm"
                      style="background: linear-gradient(135deg, #3a543a 0%, #5a825a 100%)">
                {{ loading() ? 'Creating...' : 'Create Account & Start Trial' }}
              </button>
            </form>
            <p class="mt-5 text-center text-sm text-gray-500">
              Already have an account? <a routerLink="/login" class="text-sage-600 font-semibold hover:text-sage-700">Sign in</a>
            </p>
          </div>
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

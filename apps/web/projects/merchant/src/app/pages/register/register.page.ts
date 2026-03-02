import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { ApiService, TokenService, ToastService } from '@lodgik/shared';

@Component({
  selector: 'app-register',
  standalone: true,
  imports: [FormsModule, RouterLink],
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
              <span class="w-8 h-8 rounded-lg bg-white/10 flex items-center justify-center text-sm">1</span>
              <span class="text-sm">Refer hotels to the Lodgik platform</span>
            </div>
            <div class="flex items-center gap-3 text-white/80">
              <span class="w-8 h-8 rounded-lg bg-white/10 flex items-center justify-center text-sm">2</span>
              <span class="text-sm">Earn commissions on every subscription</span>
            </div>
            <div class="flex items-center gap-3 text-white/80">
              <span class="w-8 h-8 rounded-lg bg-white/10 flex items-center justify-center text-sm">3</span>
              <span class="text-sm">Track earnings and get paid monthly</span>
            </div>
          </div>
        </div>
      </div>

      <!-- Form -->
      <div class="flex-1 flex items-center justify-center p-8 bg-gray-50">
        <div class="w-full max-w-md">
          <div class="lg:hidden text-center mb-6">
            <h1 class="text-2xl font-bold text-gray-900 font-heading">Lodgik</h1>
            <p class="text-gray-400 text-sm mt-1">Merchant Portal</p>
          </div>

          <div class="bg-white rounded-2xl shadow-lg border border-gray-100 p-8">
            <!-- Step indicator -->
            <div class="flex items-center gap-2 mb-6">
              @for (s of [1, 2]; track s) {
                <div class="flex-1 h-1.5 rounded-full transition-colors"
                     [class]="step() >= s ? 'bg-sage-500' : 'bg-gray-200'"></div>
              }
            </div>
            <p class="text-xs text-gray-400 mb-4 -mt-3">Step {{ step() }} of 2</p>

            @if (error()) {
              <div class="bg-red-50 border border-red-100 text-red-600 text-sm p-3 rounded-lg mb-4">{{ error() }}</div>
            }

            <!-- ── Step 1: Personal Details ─────────────── -->
            @if (step() === 1) {
              <h2 class="text-xl font-bold text-gray-900 font-heading">Create Your Account</h2>
              <p class="text-sm text-gray-500 mt-1 mb-6">Personal details and login credentials</p>
              <div class="space-y-4">
                <div class="grid grid-cols-2 gap-3">
                  <div>
                    <label class="block text-sm font-medium text-gray-700 mb-1">
                      First Name <span class="text-red-400">*</span>
                    </label>
                    <input [(ngModel)]="form.first_name"
                      class="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm bg-gray-50 focus:ring-2 focus:ring-sage-200 focus:border-sage-400 focus:bg-white outline-none transition-all"
                      placeholder="John">
                  </div>
                  <div>
                    <label class="block text-sm font-medium text-gray-700 mb-1">
                      Last Name <span class="text-red-400">*</span>
                    </label>
                    <input [(ngModel)]="form.last_name"
                      class="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm bg-gray-50 focus:ring-2 focus:ring-sage-200 focus:border-sage-400 focus:bg-white outline-none transition-all"
                      placeholder="Doe">
                  </div>
                </div>
                <div>
                  <label class="block text-sm font-medium text-gray-700 mb-1">
                    Email Address <span class="text-red-400">*</span>
                  </label>
                  <input type="email" [(ngModel)]="form.email"
                    class="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm bg-gray-50 focus:ring-2 focus:ring-sage-200 focus:border-sage-400 focus:bg-white outline-none transition-all"
                    placeholder="you@example.com">
                </div>
                <div>
                  <label class="block text-sm font-medium text-gray-700 mb-1">
                    Phone Number <span class="text-red-400">*</span>
                  </label>
                  <input [(ngModel)]="form.phone" type="tel"
                    class="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm bg-gray-50 focus:ring-2 focus:ring-sage-200 focus:border-sage-400 focus:bg-white outline-none transition-all"
                    placeholder="+2348012345678">
                </div>
                <div>
                  <label class="block text-sm font-medium text-gray-700 mb-1">
                    Password <span class="text-red-400">*</span>
                  </label>
                  <input type="password" [(ngModel)]="form.password"
                    class="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm bg-gray-50 focus:ring-2 focus:ring-sage-200 focus:border-sage-400 focus:bg-white outline-none transition-all"
                    placeholder="Minimum 8 characters">
                </div>
                <div>
                  <label class="block text-sm font-medium text-gray-700 mb-1">
                    Confirm Password <span class="text-red-400">*</span>
                  </label>
                  <input type="password" [(ngModel)]="confirmPassword" (keyup.enter)="nextStep()"
                    class="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm bg-gray-50 focus:ring-2 focus:ring-sage-200 focus:border-sage-400 focus:bg-white outline-none transition-all"
                    placeholder="Repeat password">
                </div>
                <button (click)="nextStep()"
                  class="w-full py-3 text-white rounded-xl text-sm font-semibold hover:opacity-90 transition-all shadow-sm"
                  style="background: linear-gradient(135deg, #3a543a 0%, #5a825a 100%)">
                  Continue →
                </button>
              </div>
            }

            <!-- ── Step 2: Business Details ─────────────── -->
            @if (step() === 2) {
              <h2 class="text-xl font-bold text-gray-900 font-heading">Business Details</h2>
              <p class="text-sm text-gray-500 mt-1 mb-6">Tell us about your business</p>
              <div class="space-y-4">
                <div>
                  <label class="block text-sm font-medium text-gray-700 mb-1">
                    Business / Trading Name <span class="text-red-400">*</span>
                  </label>
                  <input [(ngModel)]="form.business_name"
                    class="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm bg-gray-50 focus:ring-2 focus:ring-sage-200 focus:border-sage-400 focus:bg-white outline-none transition-all"
                    placeholder="Your business name">
                </div>
                <div>
                  <label class="block text-sm font-medium text-gray-700 mb-1">Registered Legal Name</label>
                  <input [(ngModel)]="form.legal_name"
                    class="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm bg-gray-50 focus:ring-2 focus:ring-sage-200 focus:border-sage-400 focus:bg-white outline-none transition-all"
                    placeholder="Optional — defaults to business name">
                </div>
                <div class="grid grid-cols-2 gap-3">
                  <div>
                    <label class="block text-sm font-medium text-gray-700 mb-1">Category <span class="text-red-400">*</span></label>
                    <select [(ngModel)]="form.category"
                      class="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm bg-gray-50 focus:ring-2 focus:ring-sage-200 focus:border-sage-400 focus:bg-white outline-none transition-all">
                      <option value="">— Select —</option>
                      <option value="sales_agent">Sales Agent</option>
                      <option value="channel_partner">Channel Partner</option>
                      <option value="consultant">Consultant</option>
                    </select>
                  </div>
                  <div>
                    <label class="block text-sm font-medium text-gray-700 mb-1">Type <span class="text-red-400">*</span></label>
                    <select [(ngModel)]="form.type"
                      class="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm bg-gray-50 focus:ring-2 focus:ring-sage-200 focus:border-sage-400 focus:bg-white outline-none transition-all">
                      <option value="individual">Individual</option>
                      <option value="company">Company</option>
                    </select>
                  </div>
                </div>
                <div>
                  <label class="block text-sm font-medium text-gray-700 mb-1">
                    Operating Region <span class="text-red-400">*</span>
                  </label>
                  <input [(ngModel)]="form.operating_region"
                    class="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm bg-gray-50 focus:ring-2 focus:ring-sage-200 focus:border-sage-400 focus:bg-white outline-none transition-all"
                    placeholder="e.g. Lagos, Nigeria">
                </div>
                <div class="flex gap-3 pt-1">
                  <button (click)="step.set(1)"
                    class="px-4 py-3 text-sm text-gray-600 hover:text-gray-800 rounded-xl border border-gray-200 hover:bg-gray-50 transition-colors">
                    ← Back
                  </button>
                  <button (click)="submit()" [disabled]="loading()"
                    class="flex-1 py-3 text-white rounded-xl text-sm font-semibold hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-sm"
                    style="background: linear-gradient(135deg, #3a543a 0%, #5a825a 100%)">
                    {{ loading() ? 'Creating account...' : 'Create Merchant Account' }}
                  </button>
                </div>
              </div>
            }

            <p class="text-center text-sm text-gray-500 mt-6">
              Already have an account?
              <a routerLink="/login" class="text-sage-600 hover:underline font-medium">Sign in</a>
            </p>
          </div>
        </div>
      </div>
    </div>
  `,
})
export class RegisterPage {
  private api   = inject(ApiService);
  private token = inject(TokenService);
  private toast = inject(ToastService);
  private router = inject(Router);

  step    = signal(1);
  loading = signal(false);
  error   = signal('');
  confirmPassword = '';

  form: any = {
    first_name: '', last_name: '', email: '', phone: '', password: '',
    business_name: '', legal_name: '', category: '', type: 'individual',
    operating_region: '', settlement_currency: 'NGN',
  };

  nextStep(): void {
    this.error.set('');

    if (!this.form.first_name?.trim() || !this.form.last_name?.trim()) {
      this.error.set('First and last name are required.'); return;
    }
    if (!this.form.email?.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(this.form.email.trim())) {
      this.error.set('A valid email address is required.'); return;
    }
    if (!this.form.phone?.trim()) {
      this.error.set('Phone number is required.'); return;
    }
    if (!/^\+?[\d\s\-()]{7,20}$/.test(this.form.phone.trim())) {
      this.error.set('Enter a valid phone number (e.g. +2348012345678).'); return;
    }
    if (!this.form.password || this.form.password.length < 8) {
      this.error.set('Password must be at least 8 characters.'); return;
    }
    if (this.form.password !== this.confirmPassword) {
      this.error.set('Passwords do not match.'); return;
    }

    this.step.set(2);
  }

  submit(): void {
    this.error.set('');

    if (!this.form.business_name?.trim()) {
      this.error.set('Business name is required.'); return;
    }
    if (!this.form.category) {
      this.error.set('Please select a category.'); return;
    }
    if (!this.form.operating_region?.trim()) {
      this.error.set('Operating region is required.'); return;
    }

    if (!this.form.legal_name?.trim()) {
      this.form.legal_name = this.form.business_name;
    }

    this.loading.set(true);
    this.api.post('/merchants/self-register', this.form).subscribe({
      next: (r: any) => {
        const data = r.data;
        if (data?.access_token) {
          this.token.setTokens(data.access_token, data.refresh_token);
          if (data.user) this.token.setUser(data.user);
        }
        this.toast.success('Welcome! Your merchant account has been created.');
        this.loading.set(false);
        this.router.navigate(['/']);
      },
      error: (err: any) => {
        this.loading.set(false);
        const msg = err?.error?.message
          || (err?.error?.errors ? Object.values(err.error.errors).join(', ') : null)
          || 'Registration failed. Please try again.';
        this.error.set(typeof msg === 'string' ? msg : 'Registration failed.');
      },
    });
  }
}

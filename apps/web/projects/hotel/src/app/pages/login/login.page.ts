import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { AuthService, ToastService, ApiService } from '@lodgik/shared';

type ResetStep = 'login' | 'forgot' | 'otp' | 'new-password' | 'done';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [FormsModule, RouterLink],
  template: `
    <div class="min-h-screen flex">
      <!-- Brand panel -->
      <div class="hidden lg:flex lg:w-1/2 items-center justify-center p-12"
           style="background: linear-gradient(135deg, #293929 0%, #3a543a 40%, #5a825a 100%)">
        <div class="max-w-md text-center">
          <div class="w-16 h-16 rounded-2xl bg-white/15 backdrop-blur-sm flex items-center justify-center mx-auto mb-8">
            <span class="text-3xl font-bold text-white font-heading">L</span>
          </div>
          <h1 class="text-4xl font-bold text-white font-heading">Lodgik</h1>
          <p class="text-lg text-white/60 mt-3">Modern hotel management, simplified.</p>
          <div class="mt-12 grid grid-cols-3 gap-6 text-center">
            <div><p class="text-2xl font-bold text-white">40+</p><p class="text-xs text-white/40 mt-1">Modules</p></div>
            <div><p class="text-2xl font-bold text-white">24/7</p><p class="text-xs text-white/40 mt-1">Monitoring</p></div>
            <div><p class="text-2xl font-bold text-white">100%</p><p class="text-xs text-white/40 mt-1">Cloud</p></div>
          </div>
        </div>
      </div>

      <!-- Right panel -->
      <div class="flex-1 flex items-center justify-center p-8 bg-gray-50">
        <div class="w-full max-w-md">
          <div class="lg:hidden text-center mb-8">
            <h1 class="text-2xl font-bold text-gray-900 font-heading">Lodgik</h1>
            <p class="text-gray-400 text-sm mt-1">Hotel Management Platform</p>
          </div>

          <!-- ── LOGIN ────────────────────────────────────────────────── -->
          @if (step() === 'login') {
            <div class="bg-white rounded-2xl shadow-lg border border-gray-100 p-8">
              <h2 class="text-xl font-bold text-gray-900 font-heading">Welcome back</h2>
              <p class="text-sm text-gray-500 mt-1">Sign in to your account</p>
              <div class="space-y-5 mt-6">
                <div>
                  <label class="block text-sm font-medium text-gray-700 mb-1.5">Email</label>
                  <input type="email" [(ngModel)]="email" name="mail"
                    class="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-sage-200 focus:border-sage-400 outline-none transition-all bg-gray-50 focus:bg-white"
                    placeholder="you@hotel.com" (keydown.enter)="login()">
                </div>
                <div>
                  <label class="block text-sm font-medium text-gray-700 mb-1.5">Password</label>
                  <div class="relative">
                    <input [type]="showPw ? 'text' : 'password'" [(ngModel)]="password" name="lock"
                      class="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-sage-200 focus:border-sage-400 outline-none transition-all bg-gray-50 focus:bg-white pr-10"
                      (keydown.enter)="login()">
                    <button type="button" (click)="showPw=!showPw" class="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 text-base">{{ showPw ? '🙈' : '👁️' }}</button>
                  </div>
                </div>
                @if (error()) {
                  <p class="text-sm text-red-600 bg-red-50 px-3 py-2 rounded-lg">{{ error() }}</p>
                }
                <button (click)="login()" [disabled]="loading()"
                  class="w-full py-3 text-white rounded-xl text-sm font-semibold hover:opacity-90 disabled:opacity-50 transition-all shadow-sm"
                  style="background: linear-gradient(135deg, #3a543a 0%, #5a825a 100%)">
                  {{ loading() ? 'Signing in…' : 'Sign in' }}
                </button>
                <div class="flex items-center justify-between text-sm">
                  <button (click)="goForgot()" class="text-sage-600 hover:text-sage-700 font-medium">Forgot password?</button>
                  <a routerLink="/register" class="text-sage-600 hover:text-sage-700 font-medium">Register hotel</a>
                </div>
              </div>
            </div>
          }

          <!-- ── STEP 1: ENTER EMAIL ───────────────────────────────────── -->
          @if (step() === 'forgot') {
            <div class="bg-white rounded-2xl shadow-lg border border-gray-100 p-8">
              <button (click)="step.set('login')" class="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700 mb-5">
                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7"/></svg>
                Back to login
              </button>
              <div class="w-12 h-12 bg-sage-50 border border-sage-200 rounded-2xl flex items-center justify-center mb-4">
                <svg class="w-6 h-6 text-sage-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"/></svg>
              </div>
              <h2 class="text-xl font-bold text-gray-900 font-heading">Reset your password</h2>
              <p class="text-sm text-gray-500 mt-1">Enter your email and we'll send a 6-digit code.</p>
              <div class="mt-5 space-y-4">
                <div>
                  <label class="block text-sm font-medium text-gray-700 mb-1.5">Email address</label>
                  <input type="email" [(ngModel)]="resetEmail"
                    class="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-sage-200 focus:border-sage-400 outline-none transition-all bg-gray-50 focus:bg-white"
                    placeholder="you@hotel.com" (keydown.enter)="sendOtp()">
                </div>
                @if (error()) {
                  <p class="text-sm text-red-600 bg-red-50 px-3 py-2 rounded-lg">{{ error() }}</p>
                }
                <button (click)="sendOtp()" [disabled]="loading()"
                  class="w-full py-3 text-white rounded-xl text-sm font-semibold hover:opacity-90 disabled:opacity-50 transition-all shadow-sm"
                  style="background: linear-gradient(135deg, #3a543a 0%, #5a825a 100%)">
                  {{ loading() ? 'Sending…' : 'Send code' }}
                </button>
              </div>
            </div>
          }

          <!-- ── STEP 2: ENTER OTP ────────────────────────────────────── -->
          @if (step() === 'otp') {
            <div class="bg-white rounded-2xl shadow-lg border border-gray-100 p-8">
              <button (click)="step.set('forgot')" class="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700 mb-5">
                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7"/></svg>
                Change email
              </button>
              <div class="w-12 h-12 bg-amber-50 border border-amber-200 rounded-2xl flex items-center justify-center mb-4">
                <svg class="w-6 h-6 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"/></svg>
              </div>
              <h2 class="text-xl font-bold text-gray-900 font-heading">Enter your code</h2>
              <p class="text-sm text-gray-500 mt-1">
                We sent a 6-digit code to <strong class="text-gray-700">{{ resetEmail }}</strong>.<br>
                Check your inbox (and spam folder).
              </p>
              <div class="mt-5 space-y-4">
                <div>
                  <label class="block text-sm font-medium text-gray-700 mb-1.5">6-digit code</label>
                  <input type="text" [(ngModel)]="otp" maxlength="6" inputmode="numeric"
                    class="w-full px-4 py-3 border border-gray-200 rounded-xl text-2xl font-bold tracking-[0.4em] text-center focus:ring-2 focus:ring-sage-200 focus:border-sage-400 outline-none transition-all bg-gray-50 focus:bg-white"
                    placeholder="000000" (keydown.enter)="verifyOtp()">
                </div>
                @if (error()) {
                  <p class="text-sm text-red-600 bg-red-50 px-3 py-2 rounded-lg">{{ error() }}</p>
                }
                <button (click)="verifyOtp()" [disabled]="loading() || otp.length < 6"
                  class="w-full py-3 text-white rounded-xl text-sm font-semibold hover:opacity-90 disabled:opacity-50 transition-all shadow-sm"
                  style="background: linear-gradient(135deg, #3a543a 0%, #5a825a 100%)">
                  {{ loading() ? 'Verifying…' : 'Verify code' }}
                </button>
                <div class="text-center">
                  <button (click)="sendOtp()" [disabled]="loading()" class="text-sm text-sage-600 hover:text-sage-700">
                    Didn't receive it? Resend
                  </button>
                </div>
              </div>
            </div>
          }

          <!-- ── STEP 3: NEW PASSWORD ─────────────────────────────────── -->
          @if (step() === 'new-password') {
            <div class="bg-white rounded-2xl shadow-lg border border-gray-100 p-8">
              <div class="w-12 h-12 bg-emerald-50 border border-emerald-200 rounded-2xl flex items-center justify-center mb-4">
                <svg class="w-6 h-6 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z"/></svg>
              </div>
              <h2 class="text-xl font-bold text-gray-900 font-heading">Create new password</h2>
              <p class="text-sm text-gray-500 mt-1">Your code was verified. Choose a strong new password.</p>
              <div class="mt-5 space-y-4">
                <div>
                  <label class="block text-sm font-medium text-gray-700 mb-1.5">New password</label>
                  <div class="relative">
                    <input [type]="showNewPw ? 'text' : 'password'" [(ngModel)]="newPassword"
                      class="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-sage-200 focus:border-sage-400 outline-none transition-all bg-gray-50 focus:bg-white pr-10"
                      placeholder="Min. 8 characters">
                    <button type="button" (click)="showNewPw=!showNewPw" class="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">{{ showNewPw ? '🙈' : '👁️' }}</button>
                  </div>
                </div>
                <div>
                  <label class="block text-sm font-medium text-gray-700 mb-1.5">Confirm password</label>
                  <input [type]="showNewPw ? 'text' : 'password'" [(ngModel)]="confirmPassword"
                    class="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-sage-200 focus:border-sage-400 outline-none transition-all bg-gray-50 focus:bg-white"
                    placeholder="Repeat new password" (keydown.enter)="resetPassword()">
                </div>
                <!-- Strength indicator -->
                @if (newPassword) {
                  <div class="space-y-1.5">
                    <div class="flex gap-1">
                      @for (bar of [1,2,3,4]; track bar) {
                        <div class="h-1.5 flex-1 rounded-full transition-colors"
                          [class]="bar <= pwStrength() ? strengthColor() : 'bg-gray-100'"></div>
                      }
                    </div>
                    <p class="text-xs" [class]="strengthColor().replace('bg-','text-')">{{ strengthLabel() }}</p>
                  </div>
                }
                @if (error()) {
                  <p class="text-sm text-red-600 bg-red-50 px-3 py-2 rounded-lg">{{ error() }}</p>
                }
                <button (click)="resetPassword()" [disabled]="loading() || newPassword.length < 8 || newPassword !== confirmPassword"
                  class="w-full py-3 text-white rounded-xl text-sm font-semibold hover:opacity-90 disabled:opacity-50 transition-all shadow-sm"
                  style="background: linear-gradient(135deg, #3a543a 0%, #5a825a 100%)">
                  {{ loading() ? 'Saving…' : 'Set new password' }}
                </button>
              </div>
            </div>
          }

          <!-- ── DONE ────────────────────────────────────────────────── -->
          @if (step() === 'done') {
            <div class="bg-white rounded-2xl shadow-lg border border-gray-100 p-8 text-center">
              <div class="w-16 h-16 bg-emerald-50 border-2 border-emerald-200 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg class="w-8 h-8 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"/></svg>
              </div>
              <h2 class="text-xl font-bold text-gray-900 font-heading">Password updated!</h2>
              <p class="text-sm text-gray-500 mt-2 mb-6">Your password has been changed. Please sign in with your new password.</p>
              <button (click)="goLogin()"
                class="w-full py-3 text-white rounded-xl text-sm font-semibold hover:opacity-90 transition-all shadow-sm"
                style="background: linear-gradient(135deg, #3a543a 0%, #5a825a 100%)">
                Go to login
              </button>
            </div>
          }
        </div>
      </div>
    </div>
  `,
})
export class LoginPage {
  private auth   = inject(AuthService);
  private api    = inject(ApiService);
  private router = inject(Router);
  private toast  = inject(ToastService);

  // Login
  email = ''; password = ''; showPw = false;
  loading = signal(false);
  error   = signal('');
  step    = signal<ResetStep>('login');

  // Password reset
  resetEmail    = '';
  otp           = '';
  resetToken    = '';
  newPassword   = '';
  confirmPassword = '';
  showNewPw     = false;

  login(): void {
    if (!this.email || !this.password) { this.error.set('Email and password are required'); return; }
    this.loading.set(true); this.error.set('');
    this.auth.login({ email: this.email, password: this.password }).subscribe({
      next: res => {
        this.loading.set(false);
        if (res.success) { this.router.navigate(['/dashboard']); }
        else this.error.set(res.message || 'Invalid credentials');
      },
      error: () => { this.loading.set(false); this.error.set('Login failed. Please check your credentials.'); },
    });
  }

  goForgot() { this.error.set(''); this.resetEmail = this.email; this.step.set('forgot'); }
  goLogin()  { this.error.set(''); this.step.set('login'); }

  sendOtp(): void {
    if (!this.resetEmail.includes('@')) { this.error.set('Enter a valid email address'); return; }
    this.loading.set(true); this.error.set('');
    this.api.post('/auth/forgot-password', { email: this.resetEmail }).subscribe({
      next: () => { this.loading.set(false); this.otp = ''; this.step.set('otp'); this.toast.success('Code sent — check your email'); },
      error: () => { this.loading.set(false); this.step.set('otp'); this.toast.success('Code sent if account exists'); },
    });
  }

  verifyOtp(): void {
    if (this.otp.length !== 6) { this.error.set('Enter the 6-digit code from your email'); return; }
    this.loading.set(true); this.error.set('');
    this.api.post('/auth/verify-otp', { email: this.resetEmail, otp: this.otp }).subscribe({
      next: (r: any) => {
        this.loading.set(false);
        if (r?.success) { this.resetToken = r.data?.reset_token ?? ''; this.newPassword = ''; this.confirmPassword = ''; this.step.set('new-password'); }
        else this.error.set(r?.message || 'Invalid code. Please try again.');
      },
      error: (e: any) => { this.loading.set(false); this.error.set(e?.error?.message || 'Invalid or expired code.'); },
    });
  }

  resetPassword(): void {
    if (this.newPassword.length < 8)             { this.error.set('Password must be at least 8 characters'); return; }
    if (this.newPassword !== this.confirmPassword){ this.error.set('Passwords do not match'); return; }
    this.loading.set(true); this.error.set('');
    this.api.post('/auth/reset-password', { email: this.resetEmail, token: this.resetToken, password: this.newPassword }).subscribe({
      next: (r: any) => {
        this.loading.set(false);
        if (r?.success) { this.step.set('done'); }
        else this.error.set(r?.message || 'Failed to reset password.');
      },
      error: (e: any) => { this.loading.set(false); this.error.set(e?.error?.message || 'Reset failed. Please start over.'); },
    });
  }

  pwStrength(): number {
    const p = this.newPassword;
    let score = 0;
    if (p.length >= 8)  score++;
    if (p.length >= 12) score++;
    if (/[A-Z]/.test(p) && /[a-z]/.test(p)) score++;
    if (/[0-9]/.test(p) || /[^A-Za-z0-9]/.test(p)) score++;
    return score;
  }
  strengthColor(): string { return ['bg-red-400','bg-red-400','bg-amber-400','bg-emerald-400','bg-emerald-500'][this.pwStrength()]; }
  strengthLabel(): string { return ['','Weak','Fair','Good','Strong'][this.pwStrength()]; }
}

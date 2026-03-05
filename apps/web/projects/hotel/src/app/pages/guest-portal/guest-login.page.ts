import { Component, signal, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { ApiService } from '@lodgik/shared';

type Step = 'phone' | 'otp' | 'done';

@Component({
  selector: 'app-guest-login',
  standalone: true,
  imports: [FormsModule],
  template: `
    <div class="min-h-screen flex flex-col items-center justify-center px-6 py-10">
      <div class="w-full max-w-sm">
        <!-- Logo -->
        <div class="text-center mb-8">
          <div class="inline-flex items-center justify-center w-16 h-16 bg-amber-400 rounded-2xl shadow-lg mb-4">
            <span class="text-slate-900 text-2xl font-black">L</span>
          </div>
          <h1 class="text-2xl font-bold text-white">Welcome</h1>
          <p class="text-white/50 text-sm mt-1">Sign in to access your stay</p>
        </div>

        <!-- Phone step -->
        @if (step() === 'phone') {
          <div class="space-y-4">
            <div>
              <label class="block text-xs font-medium text-white/60 mb-2">Your phone number</label>
              <input
                [(ngModel)]="phone"
                type="tel"
                placeholder="+234 800 000 0000"
                class="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-2xl text-white placeholder-white/30
                       focus:outline-none focus:ring-2 focus:ring-amber-400 focus:border-transparent text-sm"
              >
            </div>
            @if (error()) {
              <p class="text-red-400 text-xs px-1">{{ error() }}</p>
            }
            <button
              (click)="sendOtp()"
              [disabled]="loading() || !phone.trim()"
              class="w-full py-3 bg-amber-400 text-slate-900 font-semibold rounded-2xl hover:bg-amber-300
                     disabled:opacity-40 disabled:cursor-not-allowed transition-colors text-sm">
              {{ loading() ? 'Sending…' : 'Send Verification Code' }}
            </button>
            <p class="text-center text-white/40 text-xs">
              A 6-digit code will be sent via SMS
            </p>
          </div>
        }

        <!-- OTP step -->
        @if (step() === 'otp') {
          <div class="space-y-4">
            <div class="text-center mb-2">
              <p class="text-white/70 text-sm">We sent a code to</p>
              <p class="text-white font-medium">{{ phone }}</p>
            </div>
            <div>
              <label class="block text-xs font-medium text-white/60 mb-2">Verification code</label>
              <input
                [(ngModel)]="otp"
                type="text"
                inputmode="numeric"
                maxlength="6"
                placeholder="000000"
                class="w-full px-4 py-4 bg-white/10 border border-white/20 rounded-2xl text-white text-center
                       text-2xl tracking-widest font-mono placeholder-white/20
                       focus:outline-none focus:ring-2 focus:ring-amber-400 focus:border-transparent"
              >
            </div>
            @if (error()) {
              <p class="text-red-400 text-xs px-1 text-center">{{ error() }}</p>
            }
            <button
              (click)="verifyOtp()"
              [disabled]="loading() || otp.length < 6"
              class="w-full py-3 bg-amber-400 text-slate-900 font-semibold rounded-2xl hover:bg-amber-300
                     disabled:opacity-40 disabled:cursor-not-allowed transition-colors text-sm">
              {{ loading() ? 'Verifying…' : 'Verify & Sign In' }}
            </button>
            <button
              (click)="step.set('phone'); otp = ''; error.set(null)"
              class="w-full py-2 text-white/50 hover:text-white text-sm transition-colors">
              ← Change number
            </button>
          </div>
        }
      </div>
    </div>
  `,
})
export default class GuestLoginPage {
  private api    = inject(ApiService);
  private router = inject(Router);

  phone   = '';
  otp     = '';
  step    = signal<Step>('phone');
  loading = signal(false);
  error   = signal<string | null>(null);

  // Tenant ID is resolved from subdomain or stored config
  private get tenantId(): string {
    return localStorage.getItem('lodgik_tenant_id') ?? '';
  }

  sendOtp(): void {
    const phone = this.phone.trim();
    if (!phone) return;
    this.error.set(null);
    this.loading.set(true);
    this.api.post<any>('/guest-auth/otp/send', { phone, tenant_id: this.tenantId }).subscribe({
      next: r => {
        this.loading.set(false);
        if (r.success) this.step.set('otp');
        else this.error.set(r.message ?? 'Failed to send OTP');
      },
      error: err => {
        this.loading.set(false);
        this.error.set(err?.error?.error?.message ?? 'Failed to send OTP');
      },
    });
  }

  verifyOtp(): void {
    if (this.otp.length < 6) return;
    this.error.set(null);
    this.loading.set(true);
    this.api.post<any>('/guest-auth/otp/verify', {
      phone: this.phone.trim(),
      otp: this.otp.trim(),
      tenant_id: this.tenantId,
    }).subscribe({
      next: r => {
        this.loading.set(false);
        if (r.success && r.data?.token) {
          localStorage.setItem('guest_token', r.data.token);
          localStorage.setItem('guest_session', JSON.stringify(r.data));
          this.router.navigate(['/guest/home']);
        } else {
          this.error.set(r.message ?? 'Verification failed');
        }
      },
      error: err => {
        this.loading.set(false);
        this.error.set(err?.error?.error?.message ?? 'Invalid or expired code');
      },
    });
  }
}

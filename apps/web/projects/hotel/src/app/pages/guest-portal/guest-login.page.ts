import { Component, inject, OnInit, signal } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { ApiService } from '@lodgik/shared';

type LoginMethod = 'code' | 'otp';
type OtpStep     = 'phone' | 'verify';

@Component({
  selector: 'app-guest-login',
  standalone: true,
  imports: [FormsModule],
  template: `
    <div class="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900
                flex items-center justify-center px-4 py-10">
      <div class="w-full max-w-sm">

        <!-- Logo / Branding -->
        <div class="text-center mb-8">
          <div class="w-16 h-16 bg-sage-600 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg">
            <svg class="w-9 h-9 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.75"
                d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z"/>
              <polyline stroke-linecap="round" stroke-linejoin="round" stroke-width="1.75"
                points="9 22 9 12 15 12 15 22"/>
            </svg>
          </div>
          <h1 class="text-2xl font-bold text-white">Welcome</h1>
          <p class="text-sm text-white/50 mt-1">Sign in to access your stay</p>
        </div>

        <!-- Card -->
        <div class="bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl p-6 shadow-xl">

          <!-- Method tabs -->
          <div class="flex bg-white/5 rounded-xl p-0.5 mb-6">
            <button (click)="setMethod('code')"
              class="flex-1 py-2 text-sm font-medium rounded-lg transition-all"
              [class]="method() === 'code'
                ? 'bg-sage-600 text-white shadow-sm'
                : 'text-white/50 hover:text-white/70'">
              🔑 Access Code
            </button>
            <button (click)="setMethod('otp')"
              class="flex-1 py-2 text-sm font-medium rounded-lg transition-all"
              [class]="method() === 'otp'
                ? 'bg-sage-600 text-white shadow-sm'
                : 'text-white/50 hover:text-white/70'">
              📱 Phone / OTP
            </button>
          </div>

          <!-- ── Access Code Method ───────────────────────────── -->
          @if (method() === 'code') {
            <div>
              <p class="text-xs text-white/40 mb-4 text-center">
                Enter the 6-digit code from your check-in receipt or room card.
              </p>

              <!-- 6 individual digit boxes -->
              <div class="flex gap-2 justify-center mb-5">
                @for (i of digitIndices; track i) {
                  <input
                    [id]="'d' + i"
                    type="text"
                    inputmode="numeric"
                    maxlength="1"
                    [(ngModel)]="codeDigits[i]"
                    (input)="onDigitInput($event, i)"
                    (keydown)="onDigitKeydown($event, i)"
                    (paste)="onCodePaste($event)"
                    class="w-11 h-14 text-center text-xl font-bold rounded-xl border-2 transition-colors outline-none
                           bg-white/10 text-white caret-sage-400
                           border-white/20 focus:border-sage-400">
                }
              </div>

              @if (error()) {
                <p class="text-red-400 text-xs text-center mb-3">{{ error() }}</p>
              }

              <button
                (click)="submitCode()"
                [disabled]="loading() || codeValue().length < 6"
                class="w-full py-3 bg-sage-600 text-white font-semibold rounded-xl
                       hover:bg-sage-700 disabled:opacity-40 transition-colors">
                @if (loading()) { Signing in… } @else { Sign In }
              </button>
            </div>
          }

          <!-- ── Phone / OTP Method ──────────────────────────── -->
          @if (method() === 'otp') {
            <div>
              @if (otpStep() === 'phone') {
                <p class="text-xs text-white/40 mb-4 text-center">
                  Enter the phone number you registered with.
                </p>
                <label class="block text-xs font-medium text-white/60 mb-2">Phone number</label>
                <input
                  [(ngModel)]="phone"
                  type="tel"
                  placeholder="+2348012345678"
                  (keydown.enter)="sendOtp()"
                  class="w-full px-4 py-3 rounded-xl bg-white/10 border border-white/20
                         text-white placeholder-white/30 focus:outline-none focus:border-sage-400
                         focus:ring-2 focus:ring-sage-400/30 mb-4">

                @if (error()) {
                  <p class="text-red-400 text-xs mb-3">{{ error() }}</p>
                }

                <button
                  (click)="sendOtp()"
                  [disabled]="loading() || !phone.trim()"
                  class="w-full py-3 bg-sage-600 text-white font-semibold rounded-xl
                         hover:bg-sage-700 disabled:opacity-40 transition-colors">
                  @if (loading()) { Sending… } @else { Send OTP }
                </button>
              }

              @if (otpStep() === 'verify') {
                <div class="text-center mb-4">
                  <p class="text-xs text-white/40">Code sent to</p>
                  <p class="text-white font-semibold mt-0.5">{{ phone }}</p>
                </div>

                <div class="flex gap-2 justify-center mb-5">
                  @for (i of digitIndices; track i) {
                    <input
                      [id]="'o' + i"
                      type="text"
                      inputmode="numeric"
                      maxlength="1"
                      [(ngModel)]="otpDigits[i]"
                      (input)="onOtpDigitInput($event, i)"
                      (keydown)="onOtpDigitKeydown($event, i)"
                      (paste)="onOtpPaste($event)"
                      class="w-11 h-14 text-center text-xl font-bold rounded-xl border-2 transition-colors
                             outline-none bg-white/10 text-white caret-sage-400
                             border-white/20 focus:border-sage-400">
                  }
                </div>

                @if (error()) {
                  <p class="text-red-400 text-xs text-center mb-3">{{ error() }}</p>
                }

                <button
                  (click)="verifyOtp()"
                  [disabled]="loading() || otpValue().length < 6"
                  class="w-full py-3 bg-sage-600 text-white font-semibold rounded-xl
                         hover:bg-sage-700 disabled:opacity-40 transition-colors mb-3">
                  @if (loading()) { Verifying… } @else { Verify & Sign In }
                </button>

                <button
                  (click)="resetOtp()"
                  class="w-full py-2 text-xs text-white/40 hover:text-white/60 transition-colors">
                  ← Use a different number
                </button>
              }
            </div>
          }

        </div>

        <!-- Help text -->
        <p class="text-center text-xs text-white/25 mt-6">
          Your access code was provided at check-in.<br>
          Need help? Contact the front desk.
        </p>

      </div>
    </div>
  `,
})
export class GuestLoginPage implements OnInit {
  private api    = inject(ApiService);
  private route  = inject(ActivatedRoute);
  private router = inject(Router);

  // ── State ───────────────────────────────────────────────────
  method  = signal<LoginMethod>('code');
  otpStep = signal<OtpStep>('phone');
  loading = signal(false);
  error   = signal<string | null>(null);

  // Access code digits
  readonly digitIndices = [0, 1, 2, 3, 4, 5];
  codeDigits: string[] = ['', '', '', '', '', ''];
  codeValue = () => this.codeDigits.join('');

  // OTP digits
  otpDigits: string[] = ['', '', '', '', '', ''];
  otpValue = () => this.otpDigits.join('');

  // Phone input
  phone = '';

  // Resolved from ?t= query param
  private tenantSlug = '';

  // ── Lifecycle ───────────────────────────────────────────────
  ngOnInit(): void {
    this.route.queryParams.subscribe(params => {
      // ?t=hotel-slug  — identifies the hotel property
      if (params['t']) {
        this.tenantSlug = params['t'];
        localStorage.setItem('lodgik_tenant_slug', this.tenantSlug);
      } else {
        this.tenantSlug = localStorage.getItem('lodgik_tenant_slug') ?? '';
      }

      // ?c=123456  — access code deep-link (e.g. from QR scan)
      if (params['c'] && params['c'].length === 6) {
        // Pre-fill and auto-submit
        const digits = params['c'].split('');
        this.codeDigits = [...digits];
        this.method.set('code');
        // Small delay so the view renders before auto-submit
        setTimeout(() => this.submitCode(), 150);
      }
    });
  }

  // ── Method switching ────────────────────────────────────────
  setMethod(m: LoginMethod): void {
    this.method.set(m);
    this.error.set(null);
    this.codeDigits = ['', '', '', '', '', ''];
    this.otpDigits  = ['', '', '', '', '', ''];
  }

  // ── Access Code flow ─────────────────────────────────────────
  onDigitInput(event: Event, index: number): void {
    const input = event.target as HTMLInputElement;
    const val   = input.value.replace(/\D/g, '');
    this.codeDigits[index] = val ? val[0] : '';
    if (val && index < 5) this.focusDigit('d', index + 1);
    if (this.codeValue().length === 6) this.submitCode();
  }

  onDigitKeydown(event: KeyboardEvent, index: number): void {
    if (event.key === 'Backspace' && !this.codeDigits[index] && index > 0) {
      this.focusDigit('d', index - 1);
    }
  }

  onCodePaste(event: ClipboardEvent): void {
    event.preventDefault();
    const pasted = event.clipboardData?.getData('text').replace(/\D/g, '').slice(0, 6) ?? '';
    pasted.split('').forEach((c, i) => { this.codeDigits[i] = c; });
    if (pasted.length === 6) setTimeout(() => this.submitCode(), 50);
  }

  submitCode(): void {
    const code = this.codeValue();
    if (code.length < 6 || this.loading()) return;

    this.loading.set(true);
    this.error.set(null);

    this.api.post<any>('/guest-auth/access-code', {
      code,
      tenant_slug: this.tenantSlug,
    }).subscribe({
      next: (r: any) => {
        if (r.success) {
          this.storeSession(r.data);
          this.router.navigate(['/guest/home']);
        } else {
          this.error.set(r.message ?? 'Invalid access code. Please check and try again.');
          this.codeDigits = ['', '', '', '', '', ''];
          this.focusDigit('d', 0);
        }
        this.loading.set(false);
      },
      error: () => {
        this.error.set('Something went wrong. Please try again.');
        this.loading.set(false);
      },
    });
  }

  // ── OTP flow ─────────────────────────────────────────────────
  onOtpDigitInput(event: Event, index: number): void {
    const input = event.target as HTMLInputElement;
    const val   = input.value.replace(/\D/g, '');
    this.otpDigits[index] = val ? val[0] : '';
    if (val && index < 5) this.focusDigit('o', index + 1);
    if (this.otpValue().length === 6) this.verifyOtp();
  }

  onOtpDigitKeydown(event: KeyboardEvent, index: number): void {
    if (event.key === 'Backspace' && !this.otpDigits[index] && index > 0) {
      this.focusDigit('o', index - 1);
    }
  }

  onOtpPaste(event: ClipboardEvent): void {
    event.preventDefault();
    const pasted = event.clipboardData?.getData('text').replace(/\D/g, '').slice(0, 6) ?? '';
    pasted.split('').forEach((c, i) => { this.otpDigits[i] = c; });
    if (pasted.length === 6) setTimeout(() => this.verifyOtp(), 50);
  }

  sendOtp(): void {
    const phone = this.phone.trim();
    if (!phone || this.loading()) return;

    this.loading.set(true);
    this.error.set(null);

    this.api.post<any>('/guest-auth/otp/send', {
      phone,
      tenant_slug: this.tenantSlug,
    }).subscribe({
      next: (r: any) => {
        if (r.success) {
          this.otpStep.set('verify');
          this.focusDigit('o', 0);
        } else {
          this.error.set(r.message ?? 'Failed to send OTP. Please try again.');
        }
        this.loading.set(false);
      },
      error: () => {
        this.error.set('Failed to send OTP. Please try again.');
        this.loading.set(false);
      },
    });
  }

  verifyOtp(): void {
    const otp = this.otpValue();
    if (otp.length < 6 || this.loading()) return;

    this.loading.set(true);
    this.error.set(null);

    this.api.post<any>('/guest-auth/otp/verify', {
      phone:       this.phone.trim(),
      otp,
      tenant_slug: this.tenantSlug,
    }).subscribe({
      next: (r: any) => {
        if (r.success) {
          this.storeSession(r.data);
          this.router.navigate(['/guest/home']);
        } else {
          this.error.set(r.message ?? 'Incorrect OTP. Please try again.');
          this.otpDigits = ['', '', '', '', '', ''];
          this.focusDigit('o', 0);
        }
        this.loading.set(false);
      },
      error: () => {
        this.error.set('Verification failed. Please try again.');
        this.loading.set(false);
      },
    });
  }

  resetOtp(): void {
    this.otpStep.set('phone');
    this.otpDigits = ['', '', '', '', '', ''];
    this.error.set(null);
  }

  // ── Helpers ──────────────────────────────────────────────────
  private storeSession(data: any): void {
    localStorage.setItem('guest_token',   data.token   ?? data.session?.token ?? '');
    localStorage.setItem('guest_session', JSON.stringify(data));
    if (this.tenantSlug) {
      localStorage.setItem('lodgik_tenant_slug', this.tenantSlug);
    }
  }

  private focusDigit(prefix: 'd' | 'o', index: number): void {
    setTimeout(() => {
      const el = document.getElementById(`${prefix}${index}`) as HTMLInputElement | null;
      el?.focus();
      el?.select();
    }, 0);
  }
}

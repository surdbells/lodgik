import { Component, inject, signal, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, ActivatedRoute, RouterLink } from '@angular/router';
import { AuthService, ApiService } from '@lodgik/shared';

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
          <div class="w-16 h-16 rounded-2xl bg-white/10 backdrop-blur-sm flex items-center justify-center mx-auto mb-8">
            <span class="text-3xl font-bold text-white font-heading">L</span>
          </div>
          <h1 class="text-4xl font-bold text-white font-heading">Lodgik</h1>
          <p class="text-lg text-white/50 mt-2">Merchant Portal</p>
          <div class="mt-10 space-y-3 text-left">
            <div class="flex items-center gap-3 text-white/80">
              <span class="w-8 h-8 rounded-lg bg-white/10 flex items-center justify-center text-sm">&#10003;</span>
              <span class="text-sm">Track hotel referrals & commissions</span>
            </div>
            <div class="flex items-center gap-3 text-white/80">
              <span class="w-8 h-8 rounded-lg bg-white/10 flex items-center justify-center text-sm">&#10003;</span>
              <span class="text-sm">Manage leads & payouts</span>
            </div>
            <div class="flex items-center gap-3 text-white/80">
              <span class="w-8 h-8 rounded-lg bg-white/10 flex items-center justify-center text-sm">&#10003;</span>
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

          @if (mode() === 'invite') {
            <!-- Accept Invitation -->
            <div class="bg-white rounded-2xl shadow-lg border border-gray-100 p-8">
              <h2 class="text-xl font-bold text-gray-900 font-heading">Set Up Your Account</h2>
              <p class="text-sm text-gray-500 mt-1">Create a password to access your merchant dashboard</p>
              @if (error()) { <div class="bg-red-50 text-red-600 text-sm p-3 rounded-lg mt-4">{{ error() }}</div> }
              @if (inviteSuccess()) {
                <div class="bg-green-50 text-green-700 text-sm p-3 rounded-lg mt-4">
                  Password set successfully! You can now sign in.
                </div>
                <button (click)="mode.set('login')" class="w-full mt-4 py-3 text-white rounded-xl text-sm font-semibold hover:opacity-90 transition-all shadow-sm"
                        style="background: linear-gradient(135deg, #3a543a 0%, #5a825a 100%)">
                  Sign In
                </button>
              } @else {
                <div class="space-y-4 mt-6">
                  <div>
                    <label class="block text-sm font-medium text-gray-700 mb-1.5">New Password</label>
                    <input [(ngModel)]="newPassword" type="password" placeholder="Minimum 8 characters"
                           class="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm bg-gray-50 focus:ring-2 focus:ring-sage-200 focus:border-sage-400 focus:bg-white outline-none transition-all">
                  </div>
                  <div>
                    <label class="block text-sm font-medium text-gray-700 mb-1.5">Confirm Password</label>
                    <input [(ngModel)]="confirmPassword" type="password" placeholder="Repeat password" (keyup.enter)="acceptInvite()"
                           class="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm bg-gray-50 focus:ring-2 focus:ring-sage-200 focus:border-sage-400 focus:bg-white outline-none transition-all">
                  </div>
                  <button (click)="acceptInvite()" [disabled]="loading()"
                          class="w-full py-3 text-white rounded-xl text-sm font-semibold hover:opacity-90 disabled:opacity-50 transition-all shadow-sm"
                          style="background: linear-gradient(135deg, #3a543a 0%, #5a825a 100%)">
                    {{ loading() ? 'Setting up...' : 'Set Password & Continue' }}
                  </button>
                </div>
              }
            </div>
          } @else {
            <!-- Normal Login -->
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
                  <div class="relative">
                    <input [(ngModel)]="password" [type]="showPassword ? 'text' : 'password'" placeholder="••••••••" (keyup.enter)="login()"
                           class="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm bg-gray-50 focus:ring-2 focus:ring-sage-200 focus:border-sage-400 focus:bg-white outline-none transition-all pr-10">
                    <button type="button" (click)="showPassword = !showPassword" class="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                      {{ showPassword ? '🙈' : '👁️' }}
                    </button>
                  </div>
                </div>
                <button (click)="login()" [disabled]="loading()"
                        class="w-full py-3 text-white rounded-xl text-sm font-semibold hover:opacity-90 disabled:opacity-50 transition-all shadow-sm"
                        style="background: linear-gradient(135deg, #3a543a 0%, #5a825a 100%)">
                  {{ loading() ? 'Signing in...' : 'Sign In' }}
                </button>
              </div>
              <p class="text-center text-sm text-gray-500 mt-6">
                Don't have an account? <a routerLink="/register" class="text-sage-600 hover:underline font-medium">Register as a merchant</a>
              </p>
            </div>
          }
        </div>
      </div>
    </div>
  `,
})
export class LoginPage implements OnInit {
  private auth = inject(AuthService);
  private api = inject(ApiService);
  private router = inject(Router);
  private route = inject(ActivatedRoute);

  email = ''; password = ''; showPassword = false;
  newPassword = ''; confirmPassword = '';
  loading = signal(false); error = signal('');
  mode = signal<'login' | 'invite'>('login');
  inviteToken = '';
  inviteSuccess = signal(false);

  ngOnInit(): void {
    const token = this.route.snapshot.queryParamMap.get('invite');
    if (token) {
      this.inviteToken = token;
      this.mode.set('invite');
    }
  }

  login(): void {
    this.loading.set(true); this.error.set('');
    this.auth.login({ email: this.email, password: this.password }).subscribe({
      next: () => { this.loading.set(false); this.router.navigate(['/']); },
      error: (e: any) => { this.loading.set(false); this.error.set(e?.error?.message || 'Login failed'); },
    });
  }

  acceptInvite(): void {
    if (this.newPassword.length < 8) { this.error.set('Password must be at least 8 characters'); return; }
    if (this.newPassword !== this.confirmPassword) { this.error.set('Passwords do not match'); return; }

    this.loading.set(true); this.error.set('');
    this.api.post('/auth/accept-invite', { token: this.inviteToken, password: this.newPassword }).subscribe({
      next: () => {
        this.loading.set(false);
        this.inviteSuccess.set(true);
      },
      error: (e: any) => {
        this.loading.set(false);
        this.error.set(e?.error?.message || 'Invalid or expired invitation link');
      },
    });
  }
}

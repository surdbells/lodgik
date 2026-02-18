import { Component, inject, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ApiService, PageHeaderComponent, LoadingSpinnerComponent, ToastService, TokenService } from '@lodgik/shared';

@Component({
  selector: 'app-settings',
  standalone: true,
  imports: [PageHeaderComponent, LoadingSpinnerComponent, FormsModule],
  template: `
    <ui-page-header title="Settings" subtitle="Manage your hotel settings"></ui-page-header>
    <ui-loading [loading]="loading()"></ui-loading>

    @if (!loading()) {
      <!-- Profile -->
      <div class="bg-white rounded-lg border border-gray-200 p-5 mb-6">
        <h3 class="text-sm font-semibold text-gray-700 mb-4">Your Profile</h3>
        <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label class="block text-xs text-gray-500 mb-1">First Name</label>
            <input [value]="user()?.first_name" readonly class="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm bg-gray-50">
          </div>
          <div>
            <label class="block text-xs text-gray-500 mb-1">Last Name</label>
            <input [value]="user()?.last_name" readonly class="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm bg-gray-50">
          </div>
          <div>
            <label class="block text-xs text-gray-500 mb-1">Email</label>
            <input [value]="user()?.email" readonly class="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm bg-gray-50">
          </div>
          <div>
            <label class="block text-xs text-gray-500 mb-1">Role</label>
            <input [value]="user()?.role" readonly class="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm bg-gray-50">
          </div>
        </div>
      </div>

      <!-- Change password -->
      <div class="bg-white rounded-lg border border-gray-200 p-5 mb-6">
        <h3 class="text-sm font-semibold text-gray-700 mb-4">Change Password</h3>
        <div class="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <input [(ngModel)]="pw.current" type="password" placeholder="Current password" class="px-3 py-2 border border-gray-300 rounded-lg text-sm">
          <input [(ngModel)]="pw.new_password" type="password" placeholder="New password" class="px-3 py-2 border border-gray-300 rounded-lg text-sm">
          <input [(ngModel)]="pw.confirm" type="password" placeholder="Confirm password" class="px-3 py-2 border border-gray-300 rounded-lg text-sm">
        </div>
        <button (click)="changePassword()" class="mt-3 px-4 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700">Update Password</button>
      </div>

      <!-- Hotel branding -->
      <div class="bg-white rounded-lg border border-gray-200 p-5">
        <h3 class="text-sm font-semibold text-gray-700 mb-4">Hotel Branding</h3>
        <div class="grid grid-cols-2 gap-4">
          <div>
            <label class="block text-xs text-gray-500 mb-1">Primary Color</label>
            <input [(ngModel)]="brand.primary_color" type="color" class="w-full h-10 rounded-lg cursor-pointer">
          </div>
          <div>
            <label class="block text-xs text-gray-500 mb-1">Secondary Color</label>
            <input [(ngModel)]="brand.secondary_color" type="color" class="w-full h-10 rounded-lg cursor-pointer">
          </div>
        </div>
        <button (click)="saveBranding()" class="mt-3 px-4 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700">Save Branding</button>
      </div>
    }
  `,
})
export class SettingsPage implements OnInit {
  private api = inject(ApiService);
  private toast = inject(ToastService);
  protected user = inject(TokenService).user;
  loading = signal(false);
  pw: any = { current: '', new_password: '', confirm: '' };
  brand: any = { primary_color: '#1e3a5f', secondary_color: '#f59e0b' };

  ngOnInit(): void {}

  changePassword(): void {
    if (this.pw.new_password !== this.pw.confirm) { this.toast.error('Passwords do not match'); return; }
    this.api.post('/auth/change-password', this.pw).subscribe(r => {
      if (r.success) this.toast.success('Password updated');
      else this.toast.error(r.message || 'Failed');
    });
  }

  saveBranding(): void {
    this.api.post('/onboarding/branding', this.brand).subscribe(r => {
      if (r.success) this.toast.success('Branding updated');
    });
  }
}

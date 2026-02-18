import { Component } from '@angular/core';
import { PageHeaderComponent } from '@lodgik/shared';

@Component({
  selector: 'app-settings',
  standalone: true,
  imports: [PageHeaderComponent],
  template: `
    <ui-page-header title="Platform Settings" subtitle="Configure platform-wide settings"></ui-page-header>
    <div class="space-y-6">
      @for (section of sections; track section.title) {
        <div class="bg-white rounded-lg border border-gray-200 p-5">
          <h3 class="text-sm font-semibold text-gray-700 mb-1">{{ section.icon }} {{ section.title }}</h3>
          <p class="text-xs text-gray-500 mb-4">{{ section.description }}</p>
          <div class="bg-gray-50 rounded-lg p-4 text-sm text-gray-400 text-center">
            Configuration UI — coming soon
          </div>
        </div>
      }
    </div>
  `,
})
export class SettingsPage {
  sections = [
    { icon: '📧', title: 'ZeptoMail Configuration', description: 'Transactional email settings' },
    { icon: '📱', title: 'Termii SMS Configuration', description: 'SMS OTP and alerts' },
    { icon: '💳', title: 'Paystack Configuration', description: 'Subscription billing keys' },
    { icon: '⏱️', title: 'Trial Settings', description: 'Default trial duration and limits' },
    { icon: '🚩', title: 'Feature Flags', description: 'Global platform feature toggles' },
  ];
}

import { Component } from '@angular/core';

@Component({
  selector: 'app-settings',
  standalone: true,
  template: `
    <div>
      <h1 class="text-2xl font-bold text-gray-800 mb-2">Settings</h1>
      <p class="text-gray-500 mb-6">Platform settings</p>
      <div class="bg-white rounded-lg border border-gray-200 p-8 text-center text-gray-400">
        Coming soon
      </div>
    </div>
  `,
})
export class SettingsPage {}

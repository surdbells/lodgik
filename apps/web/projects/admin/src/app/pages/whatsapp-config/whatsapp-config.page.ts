import { Component, inject, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ApiService, PageHeaderComponent, LoadingSpinnerComponent, ToastService } from '@lodgik/shared';

@Component({
  selector: 'app-whatsapp-config',
  standalone: true,
  imports: [PageHeaderComponent, LoadingSpinnerComponent, FormsModule],
  template: `
    <ui-page-header title="WhatsApp Configuration" subtitle="Termii WhatsApp API settings and message templates"></ui-page-header>
    <ui-loading [loading]="loading()"></ui-loading>

    @if (!loading()) {
      <div class="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        <!-- Config -->
        <div class="bg-white rounded-lg border p-5">
          <h3 class="text-sm font-semibold text-gray-700 mb-3">Termii API Settings</h3>
          <div class="space-y-3">
            <div><label class="block text-xs font-medium text-gray-600 mb-1">API Key</label>
              <input [(ngModel)]="config.api_key" type="password" class="w-full px-3 py-2 border rounded-lg text-sm"></div>
            <div><label class="block text-xs font-medium text-gray-600 mb-1">Sender ID</label>
              <input [(ngModel)]="config.sender_id" class="w-full px-3 py-2 border rounded-lg text-sm"></div>
            <div><label class="block text-xs font-medium text-gray-600 mb-1">Webhook URL</label>
              <input value="/api/webhooks/whatsapp" disabled class="w-full px-3 py-2 border rounded-lg text-sm bg-gray-50 text-gray-500"></div>
            <div class="flex gap-2">
              <button (click)="saveConfig()" class="px-4 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700">Save</button>
              <button (click)="testMessage()" class="px-4 py-2 border border-green-200 text-green-600 text-sm rounded-lg hover:bg-green-50">📱 Send Test</button>
            </div>
          </div>
        </div>

        <!-- Stats -->
        <div class="bg-white rounded-lg border p-5">
          <h3 class="text-sm font-semibold text-gray-700 mb-3">Messaging Stats</h3>
          <div class="grid grid-cols-2 gap-3">
            <div class="p-3 bg-green-50 rounded-lg"><p class="text-xs text-gray-500">Total Sent</p><p class="text-xl font-bold text-green-700">{{ stats().total_sent || 0 }}</p></div>
            <div class="p-3 bg-blue-50 rounded-lg"><p class="text-xs text-gray-500">Delivered</p><p class="text-xl font-bold text-blue-700">{{ stats().delivered || 0 }}</p></div>
            <div class="p-3 bg-red-50 rounded-lg"><p class="text-xs text-gray-500">Failed</p><p class="text-xl font-bold text-red-700">{{ stats().failed || 0 }}</p></div>
            <div class="p-3 bg-purple-50 rounded-lg"><p class="text-xs text-gray-500">This Month</p><p class="text-xl font-bold text-purple-700">{{ stats().this_month || 0 }}</p></div>
          </div>
        </div>
      </div>

      <!-- Message Templates -->
      <div class="bg-white rounded-lg border p-5">
        <h3 class="text-sm font-semibold text-gray-700 mb-3">Message Templates</h3>
        <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          @for (t of templates(); track t.type) {
            <div class="border rounded-lg p-3">
              <div class="flex items-center gap-2 mb-2">
                <span class="w-2 h-2 rounded-full" [class]="t.is_active ? 'bg-green-500' : 'bg-gray-300'"></span>
                <span class="text-xs font-medium">{{ t.type }}</span>
              </div>
              <p class="text-xs text-gray-500 line-clamp-3">{{ t.body || 'Default template' }}</p>
              <div class="mt-2 flex justify-between items-center">
                <span class="text-xs text-gray-400">{{ t.send_count || 0 }} sent</span>
                <button class="text-xs text-blue-600 hover:underline">Edit</button>
              </div>
            </div>
          }
        </div>
      </div>
    }
  `,
})
export class WhatsAppConfigPage implements OnInit {
  private api = inject(ApiService);
  private toast = inject(ToastService);
  loading = signal(true);
  config: any = { api_key: '', sender_id: 'Lodgik' };
  stats = signal<any>({});
  templates = signal<any[]>([
    { type: 'booking_confirmation', is_active: true, send_count: 0 },
    { type: 'check_in_welcome', is_active: true, send_count: 0 },
    { type: 'check_out_thanks', is_active: true, send_count: 0 },
    { type: 'payment_receipt', is_active: true, send_count: 0 },
    { type: 'visitor_code', is_active: true, send_count: 0 },
    { type: 'otp', is_active: true, send_count: 0 },
    { type: 'reminder', is_active: true, send_count: 0 },
    { type: 'custom', is_active: false, send_count: 0 },
  ]);

  ngOnInit(): void {
    this.api.get('/admin/whatsapp/config').subscribe({
      next: r => { if (r.success) { this.config = { ...this.config, ...r.data?.config }; this.stats.set(r.data?.stats || {}); if (r.data?.templates) this.templates.set(r.data.templates); } this.loading.set(false); },
      error: () => this.loading.set(false),
    });
  }

  saveConfig(): void {
    this.api.put('/admin/whatsapp/config', this.config).subscribe({ next: r => { if (r.success) this.toast.success('Config saved'); }, error: () => this.toast.error('Failed') });
  }

  testMessage(): void {
    this.api.post('/admin/whatsapp/test', {}).subscribe({ next: r => { if (r.success) this.toast.success('Test message sent'); else this.toast.error(r.message || 'Failed'); } });
  }
}

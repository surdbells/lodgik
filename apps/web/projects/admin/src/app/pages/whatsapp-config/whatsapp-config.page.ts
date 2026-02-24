import { Component, inject, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ApiService, PageHeaderComponent, LoadingSpinnerComponent, ToastService, DataTableComponent, TableColumn } from '@lodgik/shared';

@Component({
  selector: 'app-whatsapp-config',
  standalone: true,
  imports: [PageHeaderComponent, LoadingSpinnerComponent, FormsModule, DataTableComponent],
  template: `
    <ui-page-header title="WhatsApp & SMS" subtitle="Termii messaging configuration and logs">
      <div class="flex gap-2">
        <button (click)="tab = 'config'" [class]="tab === 'config' ? 'bg-green-600 text-white' : 'bg-gray-200 text-gray-700'" class="px-3 py-2 text-sm rounded-lg">Configuration</button>
        <button (click)="tab = 'templates'" [class]="tab === 'templates' ? 'bg-green-600 text-white' : 'bg-gray-200 text-gray-700'" class="px-3 py-2 text-sm rounded-lg">Templates</button>
        <button (click)="tab = 'logs'; loadLogs()" [class]="tab === 'logs' ? 'bg-green-600 text-white' : 'bg-gray-200 text-gray-700'" class="px-3 py-2 text-sm rounded-lg">Message Logs</button>
      </div>
    </ui-page-header>
    <ui-loading [loading]="loading()"></ui-loading>

    @if (!loading() && tab === 'config') {
      <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div class="bg-white rounded-lg border p-5">
          <h3 class="text-sm font-semibold text-gray-700 mb-3">Termii API Settings</h3>
          <div class="space-y-3">
            <div><label class="block text-xs font-medium text-gray-600 mb-1">API Key</label>
              <input [(ngModel)]="cfg.api_key" type="password" class="w-full px-3 py-2 border rounded-lg text-sm font-mono" placeholder="TL****"></div>
            <div><label class="block text-xs font-medium text-gray-600 mb-1">Sender ID</label>
              <input [(ngModel)]="cfg.sender_id" class="w-full px-3 py-2 border rounded-lg text-sm" placeholder="Lodgik"></div>
            <div><label class="block text-xs font-medium text-gray-600 mb-1">Default Channel</label>
              <select [(ngModel)]="cfg.channel" class="w-full px-3 py-2 border rounded-lg text-sm">
                <option value="whatsapp">WhatsApp</option><option value="dnd">SMS (DND)</option><option value="generic">SMS (Generic)</option>
              </select></div>
            <div><label class="block text-xs font-medium text-gray-600 mb-1">Webhook URL</label>
              <input [value]="cfg.webhook_url || '/api/webhooks/whatsapp'" disabled class="w-full px-3 py-2 border rounded-lg text-sm bg-gray-50 font-mono"></div>
          </div>
          <div class="flex gap-2 mt-4">
            <button (click)="saveConfig()" class="px-4 py-2 bg-green-600 text-white text-sm rounded-lg hover:bg-green-700">Save</button>
            <button (click)="sendTest()" class="px-4 py-2 bg-gray-200 text-gray-700 text-sm rounded-lg">📱 Test Message</button>
          </div>
        </div>

        <div class="bg-white rounded-lg border p-5">
          <h3 class="text-sm font-semibold text-gray-700 mb-3">Status & Stats</h3>
          <div class="grid grid-cols-2 gap-3 mb-4">
            <div class="p-3 rounded-lg" [class]="cfg.is_configured ? 'bg-emerald-50' : 'bg-red-50'">
              <p class="text-xs text-gray-500">Connection</p>
              <p class="text-lg font-bold" [class]="cfg.is_configured ? 'text-emerald-700' : 'text-red-700'">{{ cfg.is_configured ? 'Active' : 'Inactive' }}</p></div>
            <div class="p-3 bg-sage-50 rounded-lg"><p class="text-xs text-gray-500">Messages Sent (30d)</p>
              <p class="text-lg font-bold text-sage-700">{{ stats().messages_30d || 0 }}</p></div>
            <div class="p-3 bg-green-50 rounded-lg"><p class="text-xs text-gray-500">Delivered</p>
              <p class="text-lg font-bold text-green-700">{{ stats().delivered || 0 }}</p></div>
            <div class="p-3 bg-red-50 rounded-lg"><p class="text-xs text-gray-500">Failed</p>
              <p class="text-lg font-bold text-red-700">{{ stats().failed || 0 }}</p></div>
          </div>
          <h4 class="text-xs font-medium text-gray-500 mb-2">Supported Message Types</h4>
          <div class="flex flex-wrap gap-1">
            @for (t of messageTypes; track t) {
              <span class="px-2 py-1 bg-gray-100 rounded text-xs">{{ t }}</span>
            }
          </div>
        </div>
      </div>
    }

    @if (!loading() && tab === 'templates') {
      <div class="bg-white rounded-lg border p-5 mb-4">
        <h3 class="text-sm font-semibold text-gray-700 mb-3">Create Template</h3>
        <div class="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-3">
          <div><label class="block text-xs font-medium text-gray-600 mb-1">Name</label>
            <input [(ngModel)]="newTemplate.name" class="w-full px-3 py-2 border rounded-lg text-sm" placeholder="booking_confirmed"></div>
          <div><label class="block text-xs font-medium text-gray-600 mb-1">Type</label>
            <select [(ngModel)]="newTemplate.message_type" class="w-full px-3 py-2 border rounded-lg text-sm">
              @for (t of messageTypes; track t) { <option [value]="t">{{ t }}</option> }
            </select></div>
          <div><label class="block text-xs font-medium text-gray-600 mb-1">Channel</label>
            <select [(ngModel)]="newTemplate.channel" class="w-full px-3 py-2 border rounded-lg text-sm">
              <option value="whatsapp">WhatsApp</option><option value="sms">SMS</option>
            </select></div>
        </div>
        <div><label class="block text-xs font-medium text-gray-600 mb-1">Body (use :param_name for variables)</label>
          <textarea [(ngModel)]="newTemplate.body" rows="3" class="w-full px-3 py-2 border rounded-lg text-sm font-mono" placeholder="Hello :guest_name, your booking #:booking_ref is confirmed."></textarea></div>
        <button (click)="createTemplate()" class="mt-3 px-4 py-2 bg-sage-600 text-white text-sm rounded-lg hover:bg-sage-700">Create Template</button>
      </div>

      <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
        @for (t of templates(); track t.id) {
          <div class="bg-white rounded-lg border p-4">
            <div class="flex justify-between mb-2"><span class="text-sm font-semibold">{{ t.name }}</span>
              <span class="text-xs px-2 py-0.5 rounded-full bg-gray-100">{{ t.message_type }}</span></div>
            <pre class="text-xs bg-gray-50 p-3 rounded font-mono whitespace-pre-wrap mb-2">{{ t.body }}</pre>
            <div class="text-xs text-gray-400">Channel: {{ t.channel || 'whatsapp' }} · Params: {{ (t.param_names || []).join(', ') || 'none' }}</div>
          </div>
        } @empty { <p class="col-span-2 text-center text-gray-400 py-8">No templates configured</p> }
      </div>
    }

    @if (!loading() && tab === 'logs') {
      <ui-data-table [columns]="logColumns" [data]="logs()" [totalItems]="logs().length"></ui-data-table>
    }
  `,
})
export class WhatsAppConfigPage implements OnInit {
  private api = inject(ApiService);
  private toast = inject(ToastService);
  loading = signal(true);
  stats = signal<any>({});
  templates = signal<any[]>([]);
  logs = signal<any[]>([]);
  tab = 'config';

  cfg: any = { api_key: '', sender_id: 'Lodgik', channel: 'whatsapp', webhook_url: '', is_configured: false };
  newTemplate: any = { name: '', message_type: 'booking_confirmation', channel: 'whatsapp', body: '' };

  messageTypes = ['booking_confirmation', 'check_in_welcome', 'check_out_thanks', 'payment_receipt', 'visitor_code', 'otp', 'reminder', 'custom'];

  logColumns: TableColumn[] = [
    { key: 'recipient_phone', label: 'Recipient' },
    { key: 'message_type', label: 'Type' },
    { key: 'channel', label: 'Channel' },
    { key: 'status', label: 'Status', render: (v: string) => v === 'delivered' ? '✅ Delivered' : v === 'sent' ? '📤 Sent' : v === 'failed' ? '❌ Failed' : '⏳ ' + v },
    { key: 'created_at', label: 'Sent' },
  ];

  ngOnInit(): void {
    this.api.get('/admin/whatsapp/config').subscribe({
      next: r => { if (r.success) { this.cfg = { ...this.cfg, ...r.data }; } this.loading.set(false); },
      error: () => this.loading.set(false),
    });
    this.api.get('/admin/whatsapp/stats').subscribe(r => { if (r.success) this.stats.set(r.data); });
    this.api.get('/admin/whatsapp/templates').subscribe(r => { if (r.success) this.templates.set(r.data || []); });
  }

  loadLogs(): void {
    this.api.get('/admin/whatsapp/logs').subscribe(r => { if (r.success) this.logs.set(r.data || []); });
  }

  saveConfig(): void {
    this.api.patch('/admin/whatsapp/config', this.cfg).subscribe({
      next: r => { r.success ? this.toast.success('WhatsApp config saved') : this.toast.error(r.message || 'Failed'); },
      error: () => this.toast.error('Failed'),
    });
  }

  sendTest(): void {
    this.api.post('/admin/whatsapp/test', {}).subscribe({
      next: r => { r.success ? this.toast.success('Test message sent') : this.toast.error(r.message || 'Failed'); },
      error: () => this.toast.error('Failed'),
    });
  }

  createTemplate(): void {
    this.api.post('/admin/whatsapp/templates', this.newTemplate).subscribe({
      next: r => { if (r.success) { this.toast.success('Template created'); this.newTemplate = { name: '', message_type: 'booking_confirmation', channel: 'whatsapp', body: '' }; this.ngOnInit(); } },
      error: () => this.toast.error('Failed'),
    });
  }
}

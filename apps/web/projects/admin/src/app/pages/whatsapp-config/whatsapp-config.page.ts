import { Component, signal } from '@angular/core';
import { PageHeaderComponent } from '@lodgik/shared';
@Component({
  selector: 'app-whatsapp-config', standalone: true, imports: [PageHeaderComponent],
  template: `<ui-page-header title="WhatsApp Configuration" subtitle="Termii API settings across tenants"></ui-page-header>
    <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
      <div class="bg-white rounded-lg border p-6"><h3 class="font-semibold mb-4">Termii API</h3>
        <div class="space-y-2 text-sm"><p><span class="text-gray-500">API Key:</span> ****configured****</p><p><span class="text-gray-500">Sender ID:</span> Lodgik</p><p><span class="text-gray-500">Channel:</span> WhatsApp (fallback: SMS)</p><p><span class="text-gray-500">Webhook:</span> /webhooks/whatsapp</p></div></div>
      <div class="bg-white rounded-lg border p-6"><h3 class="font-semibold mb-4">Message Types</h3>
        <div class="space-y-2 text-sm">@for (t of types; track t) { <div class="flex items-center gap-2"><span class="w-2 h-2 bg-green-500 rounded-full"></span>{{t}}</div> }</div></div>
    </div>`
})
export class WhatsAppConfigPage { types = ['booking_confirmation', 'check_in_welcome', 'check_out_thanks', 'payment_receipt', 'visitor_code', 'otp', 'reminder', 'custom']; }

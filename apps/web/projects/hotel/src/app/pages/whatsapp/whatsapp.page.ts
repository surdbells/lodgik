import { Component, inject, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ApiService, PageHeaderComponent, LoadingSpinnerComponent } from '@lodgik/shared';
@Component({
  selector: 'app-whatsapp', standalone: true, imports: [FormsModule, PageHeaderComponent, LoadingSpinnerComponent],
  template: `
    <ui-page-header title="WhatsApp Messaging" subtitle="Send messages to guests via Termii WhatsApp API">
      <div class="flex gap-2">
        <button (click)="tab = 'messages'" [class]="tab === 'messages' ? 'bg-green-600 text-white' : 'bg-gray-200'" class="px-3 py-2 text-sm rounded-lg">Messages</button>
        <button (click)="tab = 'templates'" [class]="tab === 'templates' ? 'bg-green-600 text-white' : 'bg-gray-200'" class="px-3 py-2 text-sm rounded-lg">Templates</button>
        <button (click)="tab = 'send'" [class]="tab === 'send' ? 'bg-green-600 text-white' : 'bg-gray-200'" class="px-3 py-2 text-sm rounded-lg">Send</button>
      </div>
    </ui-page-header>
    <ui-loading [loading]="loading()"></ui-loading>
    @if (tab === 'messages') {
      <div class="bg-white rounded-lg border overflow-x-auto"><table class="w-full text-sm"><thead class="bg-gray-50"><tr>
        <th class="px-4 py-3 text-left">Recipient</th><th class="px-4 py-3 text-left">Type</th><th class="px-4 py-3 text-left">Body</th>
        <th class="px-4 py-3 text-center">Status</th><th class="px-4 py-3 text-left">Sent</th>
      </tr></thead><tbody>
        @for (m of messages(); track m.id) {
          <tr class="border-t hover:bg-gray-50"><td class="px-4 py-3">{{m.recipient_name || m.recipient_phone}}</td><td class="px-4 py-3 text-xs">{{m.message_type}}</td>
            <td class="px-4 py-3 text-sm max-w-xs truncate">{{m.body}}</td>
            <td class="px-4 py-3 text-center"><span [class]="'px-2 py-0.5 rounded text-xs font-medium ' + msgStatClass(m.status)">{{m.status}}</span></td>
            <td class="px-4 py-3 text-xs text-gray-500">{{m.sent_at || m.created_at}}</td></tr>
        } @empty { <tr><td colspan="5" class="px-4 py-8 text-center text-gray-400">No messages</td></tr> }
      </tbody></table></div>
    }
    @if (tab === 'templates') {
      <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
        @for (t of templates(); track t.id) {
          <div class="bg-white rounded-lg border p-4"><div class="flex justify-between"><p class="font-semibold">{{t.name}}</p><span class="text-xs text-gray-400">{{t.message_type}}</span></div>
            <p class="text-sm text-gray-600 mt-2 bg-gray-50 p-3 rounded font-mono whitespace-pre-wrap">{{t.body}}</p>
            <p class="text-xs text-gray-400 mt-2">Params: {{(t.param_names || []).join(', ')}}</p></div>
        } @empty { <p class="col-span-2 text-center text-gray-400 py-8">No templates</p> }
      </div>
    }
    @if (tab === 'send') {
      <div class="bg-white rounded-lg border p-6 max-w-lg">
        <div class="space-y-4">
          <div><label class="block text-sm font-medium mb-1">Phone</label><input type="tel" [(ngModel)]="sendForm.phone" class="w-full border rounded-lg px-3 py-2 text-sm" placeholder="+234..."></div>
          <div><label class="block text-sm font-medium mb-1">Recipient Name</label><input type="text" [(ngModel)]="sendForm.recipient_name" class="w-full border rounded-lg px-3 py-2 text-sm"></div>
          <div><label class="block text-sm font-medium mb-1">Message</label><textarea [(ngModel)]="sendForm.message" rows="4" class="w-full border rounded-lg px-3 py-2 text-sm" placeholder="Type your message..."></textarea></div>
          <button (click)="send()" class="px-4 py-2 bg-green-600 text-white text-sm rounded-lg hover:bg-green-700">📱 Send via WhatsApp</button>
        </div>
      </div>
    }
  `
})
export default class WhatsAppPage implements OnInit {
  private api = inject(ApiService); loading = signal(true); messages = signal<any[]>([]); templates = signal<any[]>([]); tab = 'messages';
  sendForm: any = { phone: '', recipient_name: '', message: '' };
  ngOnInit() { this.api.get('/whatsapp/messages').subscribe((r: any) => { this.messages.set(r?.data || []); this.loading.set(false); });
    this.api.get('/whatsapp/templates').subscribe((r: any) => this.templates.set(r?.data || [])); }
  send() { this.api.post('/whatsapp/send', this.sendForm).subscribe(() => { this.tab = 'messages'; this.ngOnInit(); }); }
  msgStatClass(s: string): string { return { pending: 'bg-yellow-100 text-yellow-700', sent: 'bg-blue-100 text-blue-700', delivered: 'bg-green-100 text-green-700', read: 'bg-green-200 text-green-800', failed: 'bg-red-100 text-red-700' }[s] || ''; }
}

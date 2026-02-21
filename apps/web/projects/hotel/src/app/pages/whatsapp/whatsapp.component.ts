import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../environments/environment';

@Component({
  selector: 'app-whatsapp',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="page-header"><h1>WhatsApp Messaging</h1></div>
    <div class="tab-bar">
      <button [class.active]="tab==='send'" (click)="tab='send'">Send Message</button>
      <button [class.active]="tab==='templates'" (click)="tab='templates';loadTemplates()">Templates</button>
      <button [class.active]="tab==='history'" (click)="tab='history';loadHistory()">History</button>
      <button [class.active]="tab==='stats'" (click)="tab='stats';loadStats()">Stats</button>
    </div>

    <div *ngIf="tab==='send'" class="card form-card">
      <h3>Send WhatsApp Message</h3>
      <div class="form-grid">
        <div><label>Phone</label><input [(ngModel)]="msgForm.phone" placeholder="+234..."></div>
        <div><label>Recipient Name</label><input [(ngModel)]="msgForm.recipient_name" placeholder="Name"></div>
        <div><label>Type</label><select [(ngModel)]="msgForm.template_type"><option value="">Custom Message</option><option value="booking_confirmation">Booking Confirmation</option><option value="check_in_welcome">Check-in Welcome</option><option value="check_out_thanks">Check-out Thanks</option><option value="visitor_code">Visitor Code</option></select></div>
        <div class="full" *ngIf="!msgForm.template_type"><label>Message</label><textarea [(ngModel)]="msgForm.message" rows="3" placeholder="Type your message..."></textarea></div>
      </div>
      <div class="form-actions"><button (click)="sendMessage()" class="btn-primary">Send via WhatsApp</button></div>
      <div *ngIf="sendResult" class="mt-2" [class]="sendResult.success ? 'text-success' : 'text-danger'">{{sendResult.success ? 'Sent!' : 'Failed: ' + sendResult.error}}</div>
    </div>

    <div *ngIf="tab==='templates'">
      <table class="data-table"><thead><tr><th>Name</th><th>Type</th><th>Language</th><th>Active</th></tr></thead>
        <tbody><tr *ngFor="let t of templates"><td>{{t.name}}</td><td>{{t.message_type}}</td><td>{{t.language}}</td><td>{{t.is_active ? '✅' : '❌'}}</td></tr></tbody>
      </table>
    </div>

    <div *ngIf="tab==='history'">
      <table class="data-table"><thead><tr><th>Time</th><th>To</th><th>Type</th><th>Status</th><th>Body</th></tr></thead>
        <tbody><tr *ngFor="let m of messages"><td>{{m.sent_at || m.created_at}}</td><td>{{m.recipient_name || m.recipient_phone}}</td><td>{{m.message_type}}</td>
          <td><span class="badge" [class]="'badge-'+m.status">{{m.status}}</span></td><td class="text-truncate" style="max-width:300px">{{m.body}}</td></tr></tbody>
      </table>
    </div>

    <div *ngIf="tab==='stats'" class="stats-grid">
      <div class="stat-card" *ngFor="let s of stats | keyvalue"><div class="stat-label">{{s.key}}</div><div class="stat-value">{{s.value}}</div></div>
    </div>
  `
})
export class WhatsappComponent implements OnInit {
  tab = 'send'; templates: any[] = []; messages: any[] = []; stats: any = {}; sendResult: any = null;
  msgForm: any = { phone: '', recipient_name: '', template_type: '', message: '' };
  constructor(private http: HttpClient) {}
  ngOnInit() {}
  loadTemplates() { this.http.get<any>(`${environment.apiUrl}/whatsapp/templates`).subscribe(r => this.templates = r.data || []); }
  loadHistory() { this.http.get<any>(`${environment.apiUrl}/whatsapp/messages`).subscribe(r => this.messages = r.data || []); }
  loadStats() { this.http.get<any>(`${environment.apiUrl}/whatsapp/stats`).subscribe(r => this.stats = r.data || {}); }
  sendMessage() { this.http.post<any>(`${environment.apiUrl}/whatsapp/send`, this.msgForm).subscribe(r => this.sendResult = r, e => this.sendResult = { success: false, error: 'Send failed' }); }
}

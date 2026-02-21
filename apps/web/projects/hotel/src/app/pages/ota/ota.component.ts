import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../environments/environment';

@Component({
  selector: 'app-ota',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="page-header"><h1>OTA Channel Manager</h1><button (click)="showForm=!showForm" class="btn-primary">+ Connect Channel</button></div>
    <div *ngIf="showForm" class="card form-card mb-3">
      <div class="form-grid">
        <div><label>Channel</label><select [(ngModel)]="form.channel_name"><option value="booking_com">Booking.com</option><option value="expedia">Expedia</option><option value="agoda">Agoda</option><option value="airbnb">Airbnb</option></select></div>
        <div><label>Display Name</label><input [(ngModel)]="form.display_name"></div>
        <div><label>Commission %</label><input type="number" [(ngModel)]="form.commission_percentage"></div>
      </div>
      <div class="form-actions"><button (click)="createChannel()" class="btn-primary">Connect</button></div>
    </div>
    <div class="tab-bar"><button [class.active]="tab==='channels'" (click)="tab='channels'">Channels</button><button [class.active]="tab==='reservations'" (click)="tab='reservations';loadReservations()">Reservations</button></div>
    <div *ngIf="tab==='channels'" class="channel-grid">
      <div *ngFor="let c of channels" class="card channel-card">
        <h3>{{c.display_name}}</h3>
        <p>Commission: {{c.commission_percentage}}%</p>
        <p>Status: <span class="badge" [class]="'badge-'+c.sync_status">{{c.sync_status}}</span></p>
        <p *ngIf="c.last_sync_at">Last sync: {{c.last_sync_at}}</p>
        <div class="card-actions">
          <button *ngIf="c.sync_status!=='active'" (click)="activate(c.id)" class="btn-sm btn-success">Activate</button>
          <button *ngIf="c.sync_status==='active'" (click)="pause(c.id)" class="btn-sm btn-warning">Pause</button>
          <button (click)="sync(c.id)" class="btn-sm btn-primary">Sync</button>
        </div>
      </div>
    </div>
    <div *ngIf="tab==='reservations'">
      <table class="data-table"><thead><tr><th>Channel</th><th>Ext ID</th><th>Guest</th><th>Dates</th><th>Amount</th><th>Status</th><th>Actions</th></tr></thead>
        <tbody><tr *ngFor="let r of reservations"><td>{{r.channel_name}}</td><td>{{r.external_id}}</td><td>{{r.guest_name}}</td><td>{{r.check_in}} — {{r.check_out}}</td><td>₦{{(r.amount||0)/100 | number:'1.0-0'}}</td>
          <td><span class="badge" [class]="'badge-'+r.sync_status">{{r.sync_status}}</span></td><td><button *ngIf="r.sync_status==='pending'" (click)="confirmRes(r.id)" class="btn-sm btn-success">Confirm</button></td></tr></tbody>
      </table>
    </div>
  `
})
export class OtaComponent implements OnInit {
  tab = 'channels'; channels: any[] = []; reservations: any[] = []; showForm = false;
  form: any = { channel_name: 'booking_com', display_name: '', commission_percentage: 15 };
  constructor(private http: HttpClient) {}
  ngOnInit() { this.loadChannels(); }
  loadChannels() { this.http.get<any>(`${environment.apiUrl}/ota/channels`).subscribe(r => this.channels = r.data || []); }
  loadReservations() { this.http.get<any>(`${environment.apiUrl}/ota/reservations`).subscribe(r => this.reservations = r.data || []); }
  createChannel() { this.http.post(`${environment.apiUrl}/ota/channels`, this.form).subscribe(() => { this.showForm = false; this.loadChannels(); }); }
  activate(id: string) { this.http.post(`${environment.apiUrl}/ota/channels/${id}/activate`, {}).subscribe(() => this.loadChannels()); }
  pause(id: string) { this.http.post(`${environment.apiUrl}/ota/channels/${id}/pause`, {}).subscribe(() => this.loadChannels()); }
  sync(id: string) { this.http.post(`${environment.apiUrl}/ota/channels/${id}/sync`, {}).subscribe(() => this.loadChannels()); }
  confirmRes(id: string) { this.http.post(`${environment.apiUrl}/ota/reservations/${id}/confirm`, {}).subscribe(() => this.loadReservations()); }
}

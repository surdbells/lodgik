import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../environments/environment';

@Component({
  selector: 'app-night-audit',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="page-header"><h1>Night Audit</h1><button (click)="runAudit()" class="btn-primary" [disabled]="running">{{running ? 'Running...' : 'Run Night Audit'}}</button></div>
    <div *ngIf="currentAudit" class="card">
      <h3>Audit: {{currentAudit.audit_date}}</h3>
      <div class="stats-grid">
        <div class="stat-card"><div class="stat-label">Rooms Occupied</div><div class="stat-value">{{currentAudit.rooms_occupied}} / {{currentAudit.total_rooms}}</div></div>
        <div class="stat-card"><div class="stat-label">Occupancy Rate</div><div class="stat-value">{{currentAudit.occupancy_rate}}%</div></div>
        <div class="stat-card"><div class="stat-label">Room Revenue</div><div class="stat-value">₦{{currentAudit.room_revenue/100 | number:'1.2-2'}}</div></div>
        <div class="stat-card"><div class="stat-label">F&B Revenue</div><div class="stat-value">₦{{currentAudit.fnb_revenue/100 | number:'1.2-2'}}</div></div>
        <div class="stat-card"><div class="stat-label">Total Revenue</div><div class="stat-value">₦{{currentAudit.total_revenue/100 | number:'1.2-2'}}</div></div>
        <div class="stat-card"><div class="stat-label">ADR</div><div class="stat-value">₦{{currentAudit.adr/100 | number:'1.2-2'}}</div></div>
        <div class="stat-card"><div class="stat-label">RevPAR</div><div class="stat-value">₦{{currentAudit.revpar/100 | number:'1.2-2'}}</div></div>
        <div class="stat-card"><div class="stat-label">Status</div><div class="stat-value"><span class="badge" [class]="'badge-'+currentAudit.status">{{currentAudit.status}}</span></div></div>
      </div>
      <div *ngIf="currentAudit.discrepancies?.length" class="mt-4"><h4>Discrepancies</h4><ul><li *ngFor="let d of currentAudit.discrepancies">{{d}}</li></ul></div>
      <div class="form-actions mt-4" *ngIf="currentAudit.status==='open'"><button (click)="closeAudit(currentAudit.id)" class="btn-primary">Close Audit</button></div>
    </div>
    <h3 class="mt-4">Audit History</h3>
    <table class="data-table"><thead><tr><th>Date</th><th>Occupancy</th><th>Revenue</th><th>ADR</th><th>Status</th></tr></thead>
      <tbody><tr *ngFor="let a of audits" (click)="currentAudit=a" style="cursor:pointer"><td>{{a.audit_date}}</td><td>{{a.occupancy_rate}}%</td><td>₦{{a.total_revenue/100 | number:'1.2-2'}}</td><td>₦{{a.adr/100 | number:'1.2-2'}}</td><td><span class="badge" [class]="'badge-'+a.status">{{a.status}}</span></td></tr></tbody>
    </table>
  `
})
export class NightAuditComponent implements OnInit {
  audits: any[] = []; currentAudit: any = null; running = false;
  constructor(private http: HttpClient) {}
  ngOnInit() { this.loadAudits(); }
  loadAudits() { this.http.get<any>(`${environment.apiUrl}/finance/night-audits`).subscribe(r => { this.audits = r.data || []; if (this.audits.length) this.currentAudit = this.audits[0]; }); }
  runAudit() { this.running = true; this.http.post<any>(`${environment.apiUrl}/finance/night-audits/run`, {}).subscribe(r => { this.currentAudit = r.data; this.running = false; this.loadAudits(); }, () => this.running = false); }
  closeAudit(id: string) { this.http.post(`${environment.apiUrl}/finance/night-audits/${id}/close`, {}).subscribe(() => this.loadAudits()); }
}

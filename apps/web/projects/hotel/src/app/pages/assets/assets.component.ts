import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../environments/environment';

@Component({
  selector: 'app-assets',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="page-header"><h1>Asset Management</h1><button (click)="tab='register'" class="btn-primary">+ Register Asset</button></div>
    <div class="tab-bar">
      <button [class.active]="tab==='list'" (click)="tab='list'">Assets</button>
      <button [class.active]="tab==='incidents'" (click)="tab='incidents';loadIncidents()">Incidents</button>
      <button [class.active]="tab==='pm'" (click)="tab='pm';loadPM()">Preventive Maintenance</button>
      <button [class.active]="tab==='engineers'" (click)="tab='engineers';loadEngineers()">Engineers</button>
      <button [class.active]="tab==='logs'" (click)="tab='logs';loadLogs()">Maintenance Logs</button>
    </div>
    <div class="stats-grid" *ngIf="tab==='list'">
      <div class="stat-card" *ngFor="let s of statusCounts | keyvalue"><div class="stat-label">{{s.key}}</div><div class="stat-value">{{s.value}}</div></div>
    </div>

    <!-- ASSETS LIST -->
    <div *ngIf="tab==='list'">
      <table class="data-table"><thead><tr><th>QR Code</th><th>Name</th><th>Category</th><th>Location</th><th>Status</th><th>Criticality</th></tr></thead>
        <tbody><tr *ngFor="let a of assets"><td><code>{{a.qr_code}}</code></td><td>{{a.name}}</td><td>{{a.category_name}}</td><td>{{a.block}} {{a.floor}} {{a.room_number}}</td>
          <td><span class="badge" [class]="'badge-'+a.status">{{a.status}}</span></td><td><span class="badge" [class]="'crit-'+a.criticality">{{a.criticality}}</span></td></tr></tbody>
      </table>
    </div>

    <!-- REGISTER FORM -->
    <div *ngIf="tab==='register'" class="card form-card">
      <h3>Register New Asset</h3>
      <div class="form-grid">
        <div><label>Name</label><input [(ngModel)]="assetForm.name" placeholder="Asset name"></div>
        <div><label>Category</label><select [(ngModel)]="assetForm.category_id"><option *ngFor="let c of categories" [value]="c.id">{{c.name}}</option></select></div>
        <div><label>Brand</label><input [(ngModel)]="assetForm.brand"></div>
        <div><label>Model</label><input [(ngModel)]="assetForm.model"></div>
        <div><label>Serial #</label><input [(ngModel)]="assetForm.serial_number"></div>
        <div><label>Location (Block)</label><input [(ngModel)]="assetForm.block"></div>
        <div><label>Floor</label><input [(ngModel)]="assetForm.floor"></div>
        <div><label>Room</label><input [(ngModel)]="assetForm.room_number"></div>
        <div><label>Criticality</label><select [(ngModel)]="assetForm.criticality"><option value="low">Low</option><option value="medium">Medium</option><option value="high">High</option><option value="critical">Critical</option></select></div>
        <div><label>Purchase Cost (₦)</label><input type="number" [(ngModel)]="assetForm.purchase_cost_display"></div>
      </div>
      <div class="form-actions"><button (click)="registerAsset()" class="btn-primary">Register</button><button (click)="tab='list'" class="btn-secondary">Cancel</button></div>
    </div>

    <!-- INCIDENTS -->
    <div *ngIf="tab==='incidents'">
      <table class="data-table"><thead><tr><th>Date</th><th>Asset</th><th>Type</th><th>Priority</th><th>Assigned</th><th>Status</th><th>Actions</th></tr></thead>
        <tbody><tr *ngFor="let i of incidents"><td>{{i.created_at?.split(' ')[0]}}</td><td>{{i.asset_name}}</td><td>{{i.incident_type}}</td><td><span class="badge" [class]="'crit-'+i.priority">{{i.priority}}</span></td><td>{{i.assigned_engineer_name || 'Unassigned'}}</td>
          <td><span class="badge" [class]="'badge-'+i.status">{{i.status}}</span></td><td><button *ngIf="i.status==='assigned'" (click)="startIncident(i.id)" class="btn-sm">Start</button><button *ngIf="i.status==='in_progress'" (click)="resolveIncident(i.id)" class="btn-sm btn-success">Resolve</button></td></tr></tbody>
      </table>
    </div>

    <!-- PM -->
    <div *ngIf="tab==='pm'">
      <table class="data-table"><thead><tr><th>Asset</th><th>Schedule</th><th>Next Due</th><th>Assigned</th><th>Status</th><th>Actions</th></tr></thead>
        <tbody><tr *ngFor="let p of pmList"><td>{{p.asset_name}}</td><td>{{p.schedule_type}}</td><td>{{p.next_due}}</td><td>{{p.assigned_engineer_name}}</td>
          <td><span class="badge" [class]="'badge-'+(p.status==='overdue' ? 'danger' : p.status)">{{p.status}}</span></td><td><button *ngIf="p.status!=='completed'" (click)="completePM(p.id)" class="btn-sm btn-success">Complete</button></td></tr></tbody>
      </table>
    </div>

    <!-- ENGINEERS -->
    <div *ngIf="tab==='engineers'">
      <table class="data-table"><thead><tr><th>Name</th><th>Type</th><th>Specialization</th><th>Phone</th><th>SLA Response</th><th>Availability</th><th>Active</th></tr></thead>
        <tbody><tr *ngFor="let e of engineers"><td>{{e.name}}</td><td>{{e.type}}</td><td>{{e.specialization}}</td><td>{{e.phone}}</td><td>{{e.sla_response_minutes}}min</td><td>{{e.availability}}</td><td>{{e.is_active ? '✅' : '❌'}}</td></tr></tbody>
      </table>
    </div>

    <!-- LOGS -->
    <div *ngIf="tab==='logs'">
      <table class="data-table"><thead><tr><th>Date</th><th>Engineer</th><th>Action</th><th>Parts</th><th>Cost</th><th>Downtime</th></tr></thead>
        <tbody><tr *ngFor="let l of logs"><td>{{l.log_date}}</td><td>{{l.engineer_name}}</td><td>{{l.action_taken}}</td><td>{{l.parts_replaced}}</td><td>₦{{(l.cost||0)/100 | number:'1.2-2'}}</td><td>{{l.downtime_minutes}}min</td></tr></tbody>
      </table>
    </div>
  `
})
export class AssetsComponent implements OnInit {
  tab = 'list'; assets: any[] = []; categories: any[] = []; incidents: any[] = []; pmList: any[] = []; engineers: any[] = []; logs: any[] = []; statusCounts: any = {};
  assetForm: any = { name: '', category_id: '', brand: '', model: '', serial_number: '', block: '', floor: '', room_number: '', criticality: 'medium', purchase_cost_display: 0 };
  constructor(private http: HttpClient) {}
  ngOnInit() { this.loadAssets(); this.loadCategories(); }
  loadAssets() { this.http.get<any>(`${environment.apiUrl}/assets`).subscribe(r => this.assets = r.data || []); this.http.get<any>(`${environment.apiUrl}/assets/status-counts`).subscribe(r => this.statusCounts = r.data || {}); }
  loadCategories() { this.http.get<any>(`${environment.apiUrl}/assets/categories`).subscribe(r => this.categories = r.data || []); }
  loadIncidents() { this.http.get<any>(`${environment.apiUrl}/asset-incidents`).subscribe(r => this.incidents = r.data || []); }
  loadPM() { this.http.get<any>(`${environment.apiUrl}/preventive-maintenance`).subscribe(r => this.pmList = r.data || []); }
  loadEngineers() { this.http.get<any>(`${environment.apiUrl}/engineers`).subscribe(r => this.engineers = r.data || []); }
  loadLogs() { this.http.get<any>(`${environment.apiUrl}/maintenance-logs`).subscribe(r => this.logs = r.data || []); }
  registerAsset() { const body = { ...this.assetForm, purchase_cost: Math.round(this.assetForm.purchase_cost_display * 100) }; this.http.post(`${environment.apiUrl}/assets`, body).subscribe(() => { this.tab = 'list'; this.loadAssets(); }); }
  startIncident(id: string) { this.http.post(`${environment.apiUrl}/asset-incidents/${id}/start`, {}).subscribe(() => this.loadIncidents()); }
  resolveIncident(id: string) { this.http.post(`${environment.apiUrl}/asset-incidents/${id}/resolve`, { resolution_notes: 'Resolved' }).subscribe(() => this.loadIncidents()); }
  completePM(id: string) { this.http.post(`${environment.apiUrl}/preventive-maintenance/${id}/complete`, {}).subscribe(() => this.loadPM()); }
}

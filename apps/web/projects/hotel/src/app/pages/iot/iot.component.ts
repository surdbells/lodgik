import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../environments/environment';

@Component({
  selector: 'app-iot',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="page-header"><h1>IoT Smart Room</h1></div>
    <div class="tab-bar">
      <button [class.active]="tab==='devices'" (click)="tab='devices'">Devices</button>
      <button [class.active]="tab==='automations'" (click)="tab='automations';loadAutomations()">Automations</button>
      <button [class.active]="tab==='energy'" (click)="tab='energy';loadEnergy()">Energy</button>
    </div>
    <div *ngIf="tab==='devices'">
      <div class="stats-grid"><div class="stat-card" *ngFor="let s of statusSummary | keyvalue"><div class="stat-label">{{s.key}}</div><div class="stat-value">{{s.value}}</div></div></div>
      <table class="data-table"><thead><tr><th>Room</th><th>Device</th><th>Type</th><th>State</th><th>Status</th><th>Actions</th></tr></thead>
        <tbody><tr *ngFor="let d of devices"><td>{{d.room_number || 'Lobby'}}</td><td>{{d.name}}</td><td>{{d.device_type}}</td><td><code>{{d.current_state | json}}</code></td>
          <td><span class="badge" [class]="'badge-'+d.status">{{d.status}}</span></td>
          <td><button (click)="controlDevice(d.id, 'on')" class="btn-sm btn-success">On</button><button (click)="controlDevice(d.id, 'off')" class="btn-sm btn-danger">Off</button></td></tr></tbody>
      </table>
    </div>
    <div *ngIf="tab==='automations'">
      <button (click)="showAutoForm=!showAutoForm" class="btn-primary mb-3">+ New Automation</button>
      <div *ngIf="showAutoForm" class="card form-card mb-3">
        <div class="form-grid">
          <div><label>Name</label><input [(ngModel)]="autoForm.name" placeholder="e.g. Welcome Lights"></div>
          <div><label>Trigger</label><select [(ngModel)]="autoForm.trigger_type"><option value="check_in">Check-in</option><option value="check_out">Check-out</option><option value="time_based">Time Based</option></select></div>
        </div>
        <div class="form-actions"><button (click)="createAutomation()" class="btn-primary">Save</button></div>
      </div>
      <table class="data-table"><thead><tr><th>Name</th><th>Trigger</th><th>Actions</th><th>Active</th><th>Toggle</th></tr></thead>
        <tbody><tr *ngFor="let a of automations"><td>{{a.name}}</td><td>{{a.trigger_type}}</td><td>{{a.actions?.length}} actions</td><td>{{a.is_active ? '✅' : '❌'}}</td>
          <td><button (click)="toggleAuto(a.id, !a.is_active)" class="btn-sm">{{a.is_active ? 'Disable' : 'Enable'}}</button></td></tr></tbody>
      </table>
    </div>
    <div *ngIf="tab==='energy'">
      <table class="data-table"><thead><tr><th>Room</th><th>Device</th><th>Type</th><th>Energy (kWh)</th><th>Status</th></tr></thead>
        <tbody><tr *ngFor="let e of energyReport"><td>{{e.roomNumber || '-'}}</td><td>{{e.name}}</td><td>{{e.deviceType}}</td><td>{{e.energyKwh}}</td><td>{{e.status}}</td></tr></tbody>
      </table>
    </div>
  `
})
export class IoTComponent implements OnInit {
  tab = 'devices'; devices: any[] = []; automations: any[] = []; energyReport: any[] = []; statusSummary: any = {}; showAutoForm = false;
  autoForm: any = { name: '', trigger_type: 'check_in', trigger_config: {}, actions: [{ device_type: 'light', action: 'on' }] };
  constructor(private http: HttpClient) {}
  ngOnInit() { this.loadDevices(); }
  loadDevices() { this.http.get<any>(`${environment.apiUrl}/iot/devices`).subscribe(r => this.devices = r.data || []); this.http.get<any>(`${environment.apiUrl}/iot/status-summary`).subscribe(r => this.statusSummary = r.data || {}); }
  loadAutomations() { this.http.get<any>(`${environment.apiUrl}/iot/automations`).subscribe(r => this.automations = r.data || []); }
  loadEnergy() { this.http.get<any>(`${environment.apiUrl}/iot/energy`).subscribe(r => this.energyReport = r.data || []); }
  controlDevice(id: string, action: string) { this.http.post(`${environment.apiUrl}/iot/devices/${id}/control`, { action }).subscribe(() => this.loadDevices()); }
  createAutomation() { this.http.post(`${environment.apiUrl}/iot/automations`, this.autoForm).subscribe(() => { this.showAutoForm = false; this.loadAutomations(); }); }
  toggleAuto(id: string, active: boolean) { this.http.post(`${environment.apiUrl}/iot/automations/${id}/toggle`, { active }).subscribe(() => this.loadAutomations()); }
}

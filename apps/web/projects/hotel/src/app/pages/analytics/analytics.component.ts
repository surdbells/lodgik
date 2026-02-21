import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../environments/environment';

@Component({
  selector: 'app-analytics',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="page-header"><h1>Analytics & BI</h1></div>
    <div class="filter-bar">
      <label>From:</label><input type="date" [(ngModel)]="from">
      <label>To:</label><input type="date" [(ngModel)]="to">
      <button (click)="loadAll()" class="btn-primary">Refresh</button>
    </div>

    <div class="stats-grid">
      <div class="stat-card"><div class="stat-label">Total Revenue</div><div class="stat-value">₦{{(revenue.total || 0)/100 | number:'1.0-0'}}</div></div>
      <div class="stat-card"><div class="stat-label">Room Revenue</div><div class="stat-value">₦{{(revenue.room || 0)/100 | number:'1.0-0'}}</div></div>
      <div class="stat-card"><div class="stat-label">F&B Revenue</div><div class="stat-value">₦{{(revenue.fnb || 0)/100 | number:'1.0-0'}}</div></div>
      <div class="stat-card"><div class="stat-label">Net Profit</div><div class="stat-value" [class]="profitLoss.net_profit >= 0 ? 'text-success' : 'text-danger'">₦{{(profitLoss.net_profit || 0)/100 | number:'1.0-0'}}</div></div>
    </div>

    <div class="grid-2">
      <div class="card">
        <h3>RevPAR Trend</h3>
        <div *ngFor="let r of revpar" class="bar-row"><span class="bar-label">{{r.date}}</span><div class="bar" [style.width.%]="r.revpar / maxRevpar * 100">₦{{r.revpar/100 | number:'1.0-0'}}</div></div>
      </div>
      <div class="card">
        <h3>ADR by Day of Week</h3>
        <div *ngFor="let d of adrByDay" class="bar-row"><span class="bar-label">{{d.day}}</span><div class="bar bar-blue" [style.width.%]="d.avg_adr / maxAdr * 100">₦{{d.avg_adr/100 | number:'1.0-0'}}</div></div>
      </div>
    </div>

    <div class="grid-2 mt-3">
      <div class="card">
        <h3>Top Rooms</h3>
        <table class="data-table"><thead><tr><th>Room</th><th>Bookings</th><th>Revenue</th></tr></thead>
          <tbody><tr *ngFor="let r of topRooms"><td>{{r.roomNumber}}</td><td>{{r.bookings}}</td><td>₦{{(r.revenue||0)/100 | number:'1.0-0'}}</td></tr></tbody>
        </table>
      </div>
      <div class="card">
        <h3>Guest Demographics</h3>
        <table class="data-table"><thead><tr><th>Nationality</th><th>Count</th></tr></thead>
          <tbody><tr *ngFor="let d of demographics"><td>{{d.nationality || 'Unknown'}}</td><td>{{d.cnt}}</td></tr></tbody>
        </table>
      </div>
    </div>
  `
})
export class AnalyticsComponent implements OnInit {
  from = new Date(new Date().getFullYear(), 0, 1).toISOString().split('T')[0];
  to = new Date().toISOString().split('T')[0];
  revenue: any = {}; profitLoss: any = {}; revpar: any[] = []; adrByDay: any[] = []; topRooms: any[] = []; demographics: any[] = [];
  maxRevpar = 1; maxAdr = 1;
  constructor(private http: HttpClient) {}
  ngOnInit() { this.loadAll(); }
  loadAll() {
    const q = `from=${this.from}&to=${this.to}`;
    this.http.get<any>(`${environment.apiUrl}/analytics/revenue?${q}`).subscribe(r => this.revenue = r.data || {});
    this.http.get<any>(`${environment.apiUrl}/analytics/profit-loss?${q}`).subscribe(r => this.profitLoss = r.data || {});
    this.http.get<any>(`${environment.apiUrl}/analytics/revpar?${q}`).subscribe(r => { this.revpar = r.data || []; this.maxRevpar = Math.max(1, ...this.revpar.map((x: any) => x.revpar)); });
    this.http.get<any>(`${environment.apiUrl}/analytics/adr-by-day?${q}`).subscribe(r => { this.adrByDay = r.data || []; this.maxAdr = Math.max(1, ...this.adrByDay.map((x: any) => x.avg_adr)); });
    this.http.get<any>(`${environment.apiUrl}/analytics/top-rooms?${q}`).subscribe(r => this.topRooms = r.data || []);
    this.http.get<any>(`${environment.apiUrl}/analytics/demographics?${q}`).subscribe(r => this.demographics = r.data || []);
  }
}

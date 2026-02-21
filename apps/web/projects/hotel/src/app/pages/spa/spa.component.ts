import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../environments/environment';

@Component({
  selector: 'app-spa',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="page-header"><h1>Spa & Pool</h1></div>
    <div class="tab-bar">
      <button [class.active]="tab==='services'" (click)="tab='services'">Services</button>
      <button [class.active]="tab==='bookings'" (click)="tab='bookings';loadBookings()">Bookings</button>
      <button [class.active]="tab==='pool'" (click)="tab='pool';loadPool()">Pool Access</button>
    </div>
    <div *ngIf="tab==='services'">
      <button (click)="showSvcForm=!showSvcForm" class="btn-primary mb-3">+ New Service</button>
      <div *ngIf="showSvcForm" class="card form-card mb-3">
        <div class="form-grid">
          <div><label>Name</label><input [(ngModel)]="svcForm.name"></div>
          <div><label>Category</label><select [(ngModel)]="svcForm.category"><option value="massage">Massage</option><option value="facial">Facial</option><option value="body_treatment">Body Treatment</option><option value="sauna">Sauna</option></select></div>
          <div><label>Duration (min)</label><input type="number" [(ngModel)]="svcForm.duration_minutes"></div>
          <div><label>Price (₦)</label><input type="number" [(ngModel)]="svcForm.price_display"></div>
        </div>
        <div class="form-actions"><button (click)="createService()" class="btn-primary">Save</button></div>
      </div>
      <table class="data-table"><thead><tr><th>Name</th><th>Category</th><th>Duration</th><th>Price</th><th>Active</th></tr></thead>
        <tbody><tr *ngFor="let s of services"><td>{{s.name}}</td><td>{{s.category}}</td><td>{{s.duration_minutes}}min</td><td>₦{{s.price/100 | number:'1.2-2'}}</td><td>{{s.is_active ? '✅' : '❌'}}</td></tr></tbody>
      </table>
    </div>
    <div *ngIf="tab==='bookings'">
      <table class="data-table"><thead><tr><th>Date</th><th>Time</th><th>Service</th><th>Guest</th><th>Therapist</th><th>Status</th><th>Actions</th></tr></thead>
        <tbody><tr *ngFor="let b of bookings"><td>{{b.booking_date}}</td><td>{{b.start_time}}</td><td>{{b.service_name}}</td><td>{{b.guest_name}}</td><td>{{b.therapist_name || '-'}}</td>
          <td><span class="badge" [class]="'badge-'+b.status">{{b.status}}</span></td>
          <td><button *ngIf="b.status==='booked'" (click)="startSpaBooking(b.id)" class="btn-sm">Start</button><button *ngIf="b.status==='in_progress'" (click)="completeSpaBooking(b.id)" class="btn-sm btn-success">Done</button></td></tr></tbody>
      </table>
    </div>
    <div *ngIf="tab==='pool'">
      <div class="stats-grid"><div class="stat-card"><div class="stat-label">Current Occupancy</div><div class="stat-value">{{poolOccupancy}}</div></div></div>
      <table class="data-table"><thead><tr><th>Guest</th><th>Area</th><th>In</th><th>Out</th></tr></thead>
        <tbody><tr *ngFor="let p of poolAccess"><td>{{p.guest_name}}</td><td>{{p.area}}</td><td>{{p.check_in_time}}</td><td>{{p.check_out_time || 'Still in pool'}}</td></tr></tbody>
      </table>
    </div>
  `
})
export class SpaComponent implements OnInit {
  tab = 'services'; services: any[] = []; bookings: any[] = []; poolAccess: any[] = []; poolOccupancy = 0; showSvcForm = false;
  svcForm: any = { name: '', category: 'massage', duration_minutes: 60, price_display: 0 };
  constructor(private http: HttpClient) {}
  ngOnInit() { this.loadServices(); }
  loadServices() { this.http.get<any>(`${environment.apiUrl}/spa/services`).subscribe(r => this.services = r.data || []); }
  loadBookings() { this.http.get<any>(`${environment.apiUrl}/spa/bookings`).subscribe(r => this.bookings = r.data || []); }
  loadPool() { this.http.get<any>(`${environment.apiUrl}/spa/pool`).subscribe(r => this.poolAccess = r.data || []); this.http.get<any>(`${environment.apiUrl}/spa/pool/occupancy`).subscribe(r => this.poolOccupancy = r.data?.current_occupancy || 0); }
  createService() { const body = { ...this.svcForm, price: Math.round(this.svcForm.price_display * 100) }; this.http.post(`${environment.apiUrl}/spa/services`, body).subscribe(() => { this.showSvcForm = false; this.loadServices(); }); }
  startSpaBooking(id: string) { this.http.post(`${environment.apiUrl}/spa/bookings/${id}/start`, {}).subscribe(() => this.loadBookings()); }
  completeSpaBooking(id: string) { this.http.post(`${environment.apiUrl}/spa/bookings/${id}/complete`, {}).subscribe(() => this.loadBookings()); }
}

import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../environments/environment';

@Component({
  selector: 'app-group-bookings',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="page-header"><h1>Group Bookings</h1><button (click)="showForm=!showForm" class="btn-primary">+ New Group</button></div>
    <div *ngIf="showForm" class="card form-card">
      <h3>Create Group Booking</h3>
      <div class="form-grid">
        <div><label>Group Name</label><input [(ngModel)]="form.group_name" placeholder="e.g. Acme Corp Retreat"></div>
        <div><label>Contact Person</label><input [(ngModel)]="form.contact_person" placeholder="Name"></div>
        <div><label>Contact Phone</label><input [(ngModel)]="form.contact_phone" placeholder="Phone"></div>
        <div><label>Contact Email</label><input [(ngModel)]="form.contact_email" placeholder="Email"></div>
        <div><label>Rooms Blocked</label><input type="number" [(ngModel)]="form.rooms_blocked"></div>
        <div><label>Check-in</label><input type="date" [(ngModel)]="form.check_in"></div>
        <div><label>Check-out</label><input type="date" [(ngModel)]="form.check_out"></div>
        <div><label>Discount %</label><input type="number" [(ngModel)]="form.discount_percentage"></div>
      </div>
      <div class="form-actions"><button (click)="submitGroup()" class="btn-primary">Create</button><button (click)="showForm=false" class="btn-secondary">Cancel</button></div>
    </div>
    <table class="data-table"><thead><tr><th>Group</th><th>Contact</th><th>Rooms</th><th>Dates</th><th>Discount</th><th>Status</th><th>Actions</th></tr></thead>
      <tbody><tr *ngFor="let g of groups"><td>{{g.group_name}}</td><td>{{g.contact_person}}</td><td>{{g.rooms_blocked}}</td><td>{{g.check_in}} — {{g.check_out}}</td><td>{{g.discount_percentage}}%</td>
        <td><span class="badge" [class]="'badge-'+g.status">{{g.status}}</span></td><td><button *ngIf="g.status==='tentative'" (click)="confirm(g.id)" class="btn-sm btn-success">Confirm</button></td></tr></tbody>
    </table>
  `
})
export class GroupBookingsComponent implements OnInit {
  groups: any[] = []; showForm = false;
  form: any = { group_name: '', contact_person: '', contact_phone: '', contact_email: '', rooms_blocked: 5, check_in: '', check_out: '', discount_percentage: 0 };
  constructor(private http: HttpClient) {}
  ngOnInit() { this.load(); }
  load() { this.http.get<any>(`${environment.apiUrl}/group-bookings`).subscribe(r => this.groups = r.data || []); }
  submitGroup() { this.http.post(`${environment.apiUrl}/group-bookings`, this.form).subscribe(() => { this.showForm = false; this.load(); }); }
  confirm(id: string) { this.http.post(`${environment.apiUrl}/group-bookings/${id}/confirm`, {}).subscribe(() => this.load()); }
}

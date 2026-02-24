import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../environments/environment';

@Component({
  selector: 'app-police-reports',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="page-header"><h1>Police Reports (CAC Form)</h1></div>
    <p class="text-muted">Auto-generated on guest check-in per Nigeria Immigration regulations.</p>
    <table class="data-table"><thead><tr><th>Date</th><th>Guest</th><th>Nationality</th><th>Passport</th><th>Room</th><th>Arrival</th><th>Departure</th><th>Status</th><th>Actions</th></tr></thead>
      <tbody><tr *ngFor="let r of reports"><td>{{r.created_at?.split(' ')[0]}}</td><td>{{r.guest_name}}</td><td>{{r.nationality}}</td><td>{{r.passport_number || 'N/A'}}</td><td>{{r.room_number}}</td><td>{{r.arrival_date}}</td><td>{{r.departure_date}}</td>
        <td><span class="badge" [class]="'badge-'+r.status">{{r.status}}</span></td><td><button *ngIf="r.status==='pending'" (click)="submit(r.id)" class="btn-sm btn-primary">Submit</button></td></tr></tbody>
    </table>
  `
})
export class PoliceReportsComponent implements OnInit {
  reports: any[] = [];
  constructor(private http: HttpClient) {}
  ngOnInit() { this.load(); }
  load() { this.http.get<any>(`${environment.apiUrl}/police-reports`).subscribe(r => this.reports = r.data || []); }
  submit(id: string) { this.http.post(`${environment.apiUrl}/police-reports/${id}/submit`, {}).subscribe(() => this.load()); }
}

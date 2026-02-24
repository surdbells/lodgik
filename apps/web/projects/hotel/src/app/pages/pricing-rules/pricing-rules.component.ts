import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../environments/environment';

@Component({
  selector: 'app-pricing-rules',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="page-header"><h1>Dynamic Pricing Rules</h1><button (click)="showForm=!showForm" class="btn-primary">+ New Rule</button></div>
    <div *ngIf="showForm" class="card form-card">
      <h3>New Pricing Rule</h3>
      <div class="form-grid">
        <div><label>Name</label><input [(ngModel)]="form.name" placeholder="Rule name"></div>
        <div><label>Type</label><select [(ngModel)]="form.rule_type"><option value="occupancy">Occupancy Based</option><option value="seasonal">Seasonal</option><option value="day_of_week">Day of Week</option><option value="early_bird">Early Bird</option><option value="last_minute">Last Minute</option></select></div>
        <div><label>Modifier (%)</label><input type="number" [(ngModel)]="form.modifier_percentage" placeholder="+15 or -10"></div>
        <div><label>Priority</label><input type="number" [(ngModel)]="form.priority"></div>
        <div><label>Start Date</label><input type="date" [(ngModel)]="form.start_date"></div>
        <div><label>End Date</label><input type="date" [(ngModel)]="form.end_date"></div>
      </div>
      <div class="form-actions"><button (click)="submitRule()" class="btn-primary">Save</button><button (click)="showForm=false" class="btn-secondary">Cancel</button></div>
    </div>
    <table class="data-table"><thead><tr><th>Name</th><th>Type</th><th>Modifier</th><th>Priority</th><th>Dates</th><th>Active</th></tr></thead>
      <tbody><tr *ngFor="let r of rules"><td>{{r.name}}</td><td><span class="badge badge-info">{{r.rule_type}}</span></td><td [class]="r.modifier_percentage > 0 ? 'text-danger' : 'text-success'">{{r.modifier_percentage > 0 ? '+' : ''}}{{r.modifier_percentage}}%</td><td>{{r.priority}}</td><td>{{r.start_date || 'Always'}} — {{r.end_date || 'Always'}}</td><td><span class="badge" [class]="r.is_active ? 'badge-active' : 'badge-inactive'">{{r.is_active ? 'Active' : 'Off'}}</span></td></tr></tbody>
    </table>
  `
})
export class PricingRulesComponent implements OnInit {
  rules: any[] = []; showForm = false;
  form: any = { name: '', rule_type: 'occupancy', modifier_percentage: 0, priority: 0, start_date: '', end_date: '' };
  constructor(private http: HttpClient) {}
  ngOnInit() { this.load(); }
  load() { this.http.get<any>(`${environment.apiUrl}/pricing-rules`).subscribe(r => this.rules = r.data || []); }
  submitRule() { this.http.post(`${environment.apiUrl}/pricing-rules`, this.form).subscribe(() => { this.showForm = false; this.load(); }); }
}

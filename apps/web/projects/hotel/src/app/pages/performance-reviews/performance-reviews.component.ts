import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../environments/environment';

@Component({
  selector: 'app-performance-reviews',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="page-header"><h1>Performance Reviews</h1><button (click)="showForm=!showForm" class="btn-primary">+ New Review</button></div>
    <div *ngIf="showForm" class="card form-card">
      <h3>Create Review</h3>
      <div class="form-grid">
        <div><label>Employee</label><input [(ngModel)]="form.employee_name" placeholder="Employee name"></div>
        <div><label>Reviewer</label><input [(ngModel)]="form.reviewer_name" placeholder="Reviewer"></div>
        <div><label>Period</label><input [(ngModel)]="form.review_period" placeholder="e.g. Q1 2026"></div>
        <div><label>Rating (1-5)</label><input type="number" min="1" max="5" [(ngModel)]="form.rating"></div>
        <div class="full"><label>Strengths</label><textarea [(ngModel)]="form.strengths" rows="2"></textarea></div>
        <div class="full"><label>Improvements</label><textarea [(ngModel)]="form.improvements" rows="2"></textarea></div>
        <div class="full"><label>Goals</label><textarea [(ngModel)]="form.goals" rows="2"></textarea></div>
      </div>
      <div class="form-actions"><button (click)="submitReview()" class="btn-primary">Save</button><button (click)="showForm=false" class="btn-secondary">Cancel</button></div>
    </div>
    <table class="data-table"><thead><tr><th>Period</th><th>Employee</th><th>Reviewer</th><th>Rating</th><th>Status</th></tr></thead>
      <tbody><tr *ngFor="let r of reviews"><td>{{r.review_period}}</td><td>{{r.employee_name}}</td><td>{{r.reviewer_name}}</td><td>{{r.rating}}/5</td><td><span class="badge" [class]="'badge-'+r.status">{{r.status}}</span></td></tr></tbody>
    </table>
  `
})
export class PerformanceReviewsComponent implements OnInit {
  reviews: any[] = []; showForm = false;
  form: any = { employee_name: '', reviewer_name: '', review_period: '', rating: 3, strengths: '', improvements: '', goals: '' };
  constructor(private http: HttpClient) {}
  ngOnInit() { this.load(); }
  load() { this.http.get<any>(`${environment.apiUrl}/performance-reviews`).subscribe(r => this.reviews = r.data || []); }
  submitReview() { this.http.post(`${environment.apiUrl}/performance-reviews`, this.form).subscribe(() => { this.showForm = false; this.load(); }); }
}

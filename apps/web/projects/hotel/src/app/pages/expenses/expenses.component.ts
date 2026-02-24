import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../environments/environment';

@Component({
  selector: 'app-expenses',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="page-header"><h1>Expenses</h1><button (click)="showForm=!showForm" class="btn-primary">+ New Expense</button></div>
    <div *ngIf="showForm" class="card form-card">
      <h3>Record Expense</h3>
      <div class="form-grid">
        <div><label>Category</label><select [(ngModel)]="form.category_id"><option *ngFor="let c of categories" [value]="c.id">{{c.name}}</option></select></div>
        <div><label>Vendor</label><input [(ngModel)]="form.vendor_name" placeholder="Vendor name"></div>
        <div><label>Amount (₦)</label><input type="number" [(ngModel)]="form.amount_display" placeholder="0.00"></div>
        <div><label>Date</label><input type="date" [(ngModel)]="form.expense_date"></div>
        <div class="full"><label>Description</label><input [(ngModel)]="form.description" placeholder="Description"></div>
        <div><label>Payment Method</label><select [(ngModel)]="form.payment_method"><option value="cash">Cash</option><option value="bank_transfer">Bank Transfer</option><option value="card">Card</option><option value="petty_cash">Petty Cash</option></select></div>
        <div><label>Receipt #</label><input [(ngModel)]="form.receipt_number" placeholder="Receipt number"></div>
      </div>
      <div class="form-actions"><button (click)="submitExpense()" class="btn-primary">Save</button><button (click)="showForm=false" class="btn-secondary">Cancel</button></div>
    </div>
    <div class="stats-grid">
      <div class="stat-card"><div class="stat-label">Total Expenses</div><div class="stat-value">₦{{totalExpenses | number}}</div></div>
      <div class="stat-card"><div class="stat-label">Pending Approval</div><div class="stat-value">{{pendingCount}}</div></div>
      <div class="stat-card"><div class="stat-label">This Month</div><div class="stat-value">₦{{monthTotal | number}}</div></div>
    </div>
    <div class="filter-bar">
      <select [(ngModel)]="filter.status" (change)="loadExpenses()"><option value="">All Status</option><option value="pending">Pending</option><option value="approved">Approved</option><option value="paid">Paid</option><option value="rejected">Rejected</option></select>
    </div>
    <table class="data-table">
      <thead><tr><th>Date</th><th>Category</th><th>Vendor</th><th>Description</th><th>Amount</th><th>Status</th><th>Actions</th></tr></thead>
      <tbody><tr *ngFor="let e of expenses"><td>{{e.expense_date}}</td><td>{{e.category_name}}</td><td>{{e.vendor_name}}</td><td>{{e.description}}</td><td>₦{{e.amount/100 | number:'1.2-2'}}</td>
        <td><span class="badge" [class]="'badge-'+e.status">{{e.status}}</span></td><td><button *ngIf="e.status==='pending'" (click)="approve(e.id)" class="btn-sm btn-success">Approve</button></td></tr></tbody>
    </table>
  `
})
export class ExpensesComponent implements OnInit {
  expenses: any[] = []; categories: any[] = []; showForm = false; totalExpenses = 0; pendingCount = 0; monthTotal = 0;
  form: any = { category_id: '', vendor_name: '', amount_display: 0, expense_date: new Date().toISOString().split('T')[0], description: '', payment_method: 'cash', receipt_number: '' };
  filter = { status: '' };
  constructor(private http: HttpClient) {}
  ngOnInit() { this.loadExpenses(); this.loadCategories(); }
  loadExpenses() { this.http.get<any>(`${environment.apiUrl}/expenses?status=${this.filter.status}`).subscribe(r => { this.expenses = r.data || []; this.pendingCount = this.expenses.filter((e: any) => e.status === 'pending').length; this.totalExpenses = this.expenses.reduce((s: number, e: any) => s + (e.amount || 0), 0) / 100; }); }
  loadCategories() { this.http.get<any>(`${environment.apiUrl}/finance/expense-categories`).subscribe(r => this.categories = r.data || []); }
  submitExpense() { const body = { ...this.form, amount: Math.round(this.form.amount_display * 100) }; this.http.post(`${environment.apiUrl}/expenses`, body).subscribe(() => { this.showForm = false; this.loadExpenses(); }); }
  approve(id: string) { this.http.post(`${environment.apiUrl}/expenses/${id}/approve`, {}).subscribe(() => this.loadExpenses()); }
}

import { Component, inject, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { DatePipe, CurrencyPipe } from '@angular/common';
import { ApiService, PageHeaderComponent, LoadingSpinnerComponent } from '@lodgik/shared';

@Component({
  selector: 'app-expenses',
  standalone: true,
  imports: [FormsModule, DatePipe, CurrencyPipe, PageHeaderComponent, LoadingSpinnerComponent],
  template: `
    <ui-page-header title="Expenses" icon="💸" [breadcrumbs]="['Finance', 'Expenses']" subtitle="Track and approve operational expenses">
      <button (click)="showForm = !showForm" class="px-4 py-2 bg-sage-600 text-white text-sm rounded-xl hover:bg-sage-700 transition-colors">+ New Expense</button>
    </ui-page-header>
    <ui-loading [loading]="loading()"></ui-loading>

    @if (showForm) {
      <div class="bg-white rounded-lg border p-6 mb-6">
        <h3 class="text-lg font-semibold mb-4">Submit Expense</h3>
        <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div><label class="block text-sm font-medium text-gray-700 mb-1">Category</label>
            <select [(ngModel)]="form.category_id" class="w-full border rounded-lg px-3 py-2 text-sm">
              <option value="">Select category</option>
              @for (c of categories(); track c.id) { <option [value]="c.id">{{c.name}}</option> }
            </select></div>
          <div><label class="block text-sm font-medium text-gray-700 mb-1">Amount (₦)</label>
            <input type="number" [(ngModel)]="form.amount" class="w-full border rounded-lg px-3 py-2 text-sm" placeholder="0.00"></div>
          <div><label class="block text-sm font-medium text-gray-700 mb-1">Date</label>
            <input type="date" [(ngModel)]="form.expense_date" class="w-full border rounded-lg px-3 py-2 text-sm"></div>
          <div><label class="block text-sm font-medium text-gray-700 mb-1">Vendor</label>
            <input type="text" [(ngModel)]="form.vendor" class="w-full border rounded-lg px-3 py-2 text-sm" placeholder="Vendor name"></div>
          <div class="md:col-span-2"><label class="block text-sm font-medium text-gray-700 mb-1">Description</label>
            <input type="text" [(ngModel)]="form.description" class="w-full border rounded-lg px-3 py-2 text-sm" placeholder="What was purchased"></div>
        </div>
        <div class="flex gap-2 mt-4">
          <button (click)="submitExpense()" class="px-4 py-2 bg-sage-600 text-white text-sm rounded-xl hover:bg-sage-700 transition-colors">Submit</button>
          <button (click)="showForm = false" class="px-4 py-2 bg-gray-200 text-gray-700 text-sm rounded-lg">Cancel</button>
        </div>
      </div>
    }

    <!-- Stats -->
    <div class="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
      @for (s of statusCounts(); track s.status) {
        <div class="bg-white rounded-lg border p-4"><p class="text-xs text-gray-500 uppercase">{{s.status}}</p><p class="text-2xl font-bold">{{s.count}}</p></div>
      }
    </div>

    <!-- List -->
    <div class="bg-white rounded-lg border">
      <div class="overflow-x-auto">
        <table class="w-full text-sm">
          <thead class="bg-gray-50"><tr>
            <th class="px-4 py-3 text-left font-medium text-gray-600">Date</th><th class="px-4 py-3 text-left font-medium text-gray-600">Category</th>
            <th class="px-4 py-3 text-left font-medium text-gray-600">Description</th><th class="px-4 py-3 text-left font-medium text-gray-600">Vendor</th>
            <th class="px-4 py-3 text-right font-medium text-gray-600">Amount</th><th class="px-4 py-3 text-center font-medium text-gray-600">Status</th>
            <th class="px-4 py-3 text-center font-medium text-gray-600">Actions</th>
          </tr></thead>
          <tbody>
            @for (e of expenses(); track e.id) {
              <tr class="border-t hover:bg-gray-50">
                <td class="px-4 py-3">{{e.expense_date}}</td><td class="px-4 py-3">{{e.category_name}}</td>
                <td class="px-4 py-3">{{e.description}}</td><td class="px-4 py-3">{{e.vendor || '-'}}</td>
                <td class="px-4 py-3 text-right font-medium">₦{{(e.amount / 100).toLocaleString()}}</td>
                <td class="px-4 py-3 text-center"><span [class]="'px-2 py-1 rounded-full text-xs font-medium ' + statusClass(e.status)">{{e.status}}</span></td>
                <td class="px-4 py-3 text-center">
                  @if (e.status === 'pending') { <button (click)="approve(e.id)" class="text-green-600 hover:underline text-xs mr-2">Approve</button><button (click)="reject(e.id)" class="text-red-600 hover:underline text-xs">Reject</button> }
                </td>
              </tr>
            } @empty { <tr><td colspan="7" class="px-4 py-8 text-center text-gray-400">No expenses found</td></tr> }
          </tbody>
        </table>
      </div>
    </div>
  `
})
export default class ExpensesPage implements OnInit {
  private api = inject(ApiService);
  loading = signal(true); expenses = signal<any[]>([]); categories = signal<any[]>([]); statusCounts = signal<any[]>([]);
  showForm = false; form: any = { category_id: '', amount: '', expense_date: new Date().toISOString().split('T')[0], vendor: '', description: '' };

  ngOnInit() { this.load(); }
  async load() { this.loading.set(true);
    this.api.get('/finance/expenses').subscribe((r: any) => { this.expenses.set(r?.data || []); this.loading.set(false); });
    this.api.get('/finance/expense-categories').subscribe((r: any) => this.categories.set(r?.data || []));
  }
  submitExpense() { this.api.post('/finance/expenses', { ...this.form, amount: Math.round(+this.form.amount * 100) }).subscribe(() => { this.showForm = false; this.load(); }); }
  approve(id: string) { this.api.post(`/finance/expenses/${id}/approve`, {}).subscribe(() => this.load()); }
  reject(id: string) { this.api.post(`/finance/expenses/${id}/reject`, {}).subscribe(() => this.load()); }
  statusClass(s: string): string { return { pending: 'bg-yellow-100 text-yellow-800', approved: 'bg-green-100 text-green-800', rejected: 'bg-red-100 text-red-800', paid: 'bg-sage-100 text-sage-800' }[s] || 'bg-gray-100 text-gray-800'; }
}

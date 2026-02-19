import { Component, inject, OnInit, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { ApiService, PageHeaderComponent, DataTableComponent, TableColumn, TableAction, LoadingSpinnerComponent, StatsCardComponent } from '@lodgik/shared';
import { AuthService } from '@lodgik/shared';

@Component({
  selector: 'app-employees',
  standalone: true,
  imports: [FormsModule, RouterLink, PageHeaderComponent, DataTableComponent, LoadingSpinnerComponent, StatsCardComponent],
  template: `
    <ui-page-header title="Employees" subtitle="Employee directory and management">
      <button (click)="showAdd = true" class="bg-blue-600 text-white px-4 py-2 text-sm rounded-lg hover:bg-blue-700">+ Add Employee</button>
    </ui-page-header>
    <ui-loading [loading]="loading()"></ui-loading>

    @if (!loading()) {
      <div class="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-5">
        <ui-stats-card label="Total Employees" [value]="stats().total" icon="👥"></ui-stats-card>
        <ui-stats-card label="Active" [value]="stats().active" icon="✅"></ui-stats-card>
        <ui-stats-card label="On Probation" [value]="stats().probation" icon="⏳"></ui-stats-card>
        <ui-stats-card label="Departments" [value]="departments().length" icon="🏢"></ui-stats-card>
      </div>

      <div class="flex flex-wrap gap-2 mb-4">
        <input [(ngModel)]="search" (input)="load()" placeholder="Search name, staff ID..." class="border rounded-lg px-3 py-1.5 text-sm flex-1 min-w-[180px]" />
        <select [(ngModel)]="filterDept" (change)="load()" class="border rounded-lg px-3 py-1.5 text-sm">
          <option value="">All Departments</option>
          @for (d of departments(); track d.id) { <option [value]="d.id">{{ d.name }} ({{ d.employee_count }})</option> }
        </select>
        <select [(ngModel)]="filterStatus" (change)="load()" class="border rounded-lg px-3 py-1.5 text-sm">
          <option value="">All Status</option>
          <option value="active">Active</option>
          <option value="probation">Probation</option>
          <option value="suspended">Suspended</option>
          <option value="terminated">Terminated</option>
        </select>
      </div>

      <ui-data-table [columns]="columns" [data]="employees()" [actions]="actions"></ui-data-table>
    }

    @if (showAdd) {
      <div class="fixed inset-0 bg-black/50 flex items-center justify-center z-50" (click)="showAdd = false">
        <div class="bg-white rounded-xl shadow-xl p-6 w-full max-w-lg max-h-[90vh] overflow-y-auto" (click)="$event.stopPropagation()">
          <h3 class="text-lg font-semibold mb-4">Add Employee</h3>
          <div class="grid grid-cols-2 gap-3">
            <input [(ngModel)]="form.first_name" placeholder="First Name *" class="border rounded-lg px-3 py-2 text-sm" />
            <input [(ngModel)]="form.last_name" placeholder="Last Name *" class="border rounded-lg px-3 py-2 text-sm" />
            <input [(ngModel)]="form.email" placeholder="Email" class="border rounded-lg px-3 py-2 text-sm" />
            <input [(ngModel)]="form.phone" placeholder="Phone" class="border rounded-lg px-3 py-2 text-sm" />
            <input [(ngModel)]="form.job_title" placeholder="Job Title *" class="border rounded-lg px-3 py-2 text-sm" />
            <select [(ngModel)]="form.department_id" class="border rounded-lg px-3 py-2 text-sm">
              <option value="">No Department</option>
              @for (d of departments(); track d.id) { <option [value]="d.id">{{ d.name }}</option> }
            </select>
            <input [(ngModel)]="form.gross_salary" placeholder="Monthly Gross (₦)" type="number" class="border rounded-lg px-3 py-2 text-sm" />
            <input [(ngModel)]="form.hire_date" type="date" class="border rounded-lg px-3 py-2 text-sm" />
          </div>
          <div class="flex justify-end gap-2 mt-4">
            <button (click)="showAdd = false" class="px-4 py-2 text-sm border rounded-lg">Cancel</button>
            <button (click)="addEmployee()" class="px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700">Add</button>
          </div>
        </div>
      </div>
    }
  `,
})
export class EmployeesPage implements OnInit {
  private api = inject(ApiService);
  private auth = inject(AuthService);
  private router = inject(Router);

  loading = signal(true);
  employees = signal<any[]>([]);
  departments = signal<any[]>([]);
  stats = signal({ total: 0, active: 0, probation: 0 });
  search = '';
  filterDept = '';
  filterStatus = '';
  showAdd = false;
  form: any = { first_name: '', last_name: '', job_title: '', department_id: '', gross_salary: '', hire_date: '', email: '', phone: '' };

  columns: TableColumn[] = [
    { key: 'staff_id', label: 'Staff ID' },
    { key: 'full_name', label: 'Name' },
    { key: 'job_title', label: 'Job Title' },
    { key: 'employment_status_label', label: 'Status' },
    { key: 'phone', label: 'Phone' },
  ];
  actions: TableAction[] = [{ label: 'View', handler: (r: any) => this.router.navigate(['/employees', r.id]) }];

  get propertyId() { return this.auth.currentUser?.property_id ?? ''; }

  ngOnInit() { this.loadDepartments(); this.load(); }

  loadDepartments() {
    this.api.get('/departments').subscribe({ next: (r: any) => this.departments.set(r.data || []) });
  }

  load() {
    this.loading.set(true);
    const params: any = { property_id: this.propertyId };
    if (this.search) params.search = this.search;
    if (this.filterDept) params.department_id = this.filterDept;
    if (this.filterStatus) params.status = this.filterStatus;
    this.api.get('/employees', params).subscribe({
      next: (r: any) => {
        const items = r.data || [];
        this.employees.set(items);
        this.stats.set({
          total: r.meta?.total || items.length,
          active: items.filter((e: any) => e.employment_status === 'active').length,
          probation: items.filter((e: any) => e.employment_status === 'probation').length,
        });
        this.loading.set(false);
      },
      error: () => this.loading.set(false),
    });
  }

  addEmployee() {
    const data = { ...this.form, property_id: this.propertyId };
    if (data.gross_salary) data.gross_salary = String(Math.round(Number(data.gross_salary) * 100));
    this.api.post('/employees', data).subscribe({ next: () => { this.showAdd = false; this.load(); } });
  }
}

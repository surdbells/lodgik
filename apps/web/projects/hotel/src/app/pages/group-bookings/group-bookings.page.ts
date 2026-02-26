import { Component, inject, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ApiService, PageHeaderComponent, LoadingSpinnerComponent } from '@lodgik/shared';

@Component({
  selector: 'app-group-bookings',
  standalone: true,
  imports: [FormsModule, PageHeaderComponent, LoadingSpinnerComponent],
  template: `
    <ui-page-header title="Group Bookings" subtitle="Manage conference groups, tours, and block bookings">
      <button (click)="showForm = !showForm" class="px-4 py-2 bg-sage-600 text-white text-sm rounded-xl hover:bg-sage-700 transition-colors">+ New Group</button>
    </ui-page-header>
    <ui-loading [loading]="loading()"></ui-loading>

    @if (showForm) {
      <div class="bg-white rounded-lg border p-6 mb-6">
        <h3 class="text-lg font-semibold mb-4">Create Group Booking</h3>
        <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div><label class="block text-sm font-medium mb-1">Group Name</label><input type="text" [(ngModel)]="form.group_name" class="w-full border rounded-lg px-3 py-2 text-sm" placeholder="Company ABC Conference"></div>
          <div><label class="block text-sm font-medium mb-1">Organizer</label><input type="text" [(ngModel)]="form.organizer_name" class="w-full border rounded-lg px-3 py-2 text-sm"></div>
          <div><label class="block text-sm font-medium mb-1">Rooms Blocked <span class="text-xs text-gray-400 font-normal">(rooms reserved for this group)</span></label><input type="number" [(ngModel)]="form.rooms_blocked" class="w-full border rounded-lg px-3 py-2 text-sm"></div>
          <div><label class="block text-sm font-medium mb-1">Check-in</label><input type="date" [(ngModel)]="form.check_in" class="w-full border rounded-lg px-3 py-2 text-sm"></div>
          <div><label class="block text-sm font-medium mb-1">Check-out</label><input type="date" [(ngModel)]="form.check_out" class="w-full border rounded-lg px-3 py-2 text-sm"></div>
          <div><label class="block text-sm font-medium mb-1">Negotiated Rate (₦)</label><input type="number" [(ngModel)]="form.negotiated_rate" class="w-full border rounded-lg px-3 py-2 text-sm"></div>
        </div>
        <div class="flex gap-2 mt-4">
          <button (click)="create()" class="px-4 py-2 bg-sage-600 text-white text-sm rounded-lg">Create</button>
          <button (click)="showForm = false" class="px-4 py-2 bg-gray-200 text-sm rounded-lg">Cancel</button>
        </div>
      </div>
    }

    <div class="bg-white rounded-lg border overflow-x-auto">
      <table class="w-full text-sm">
        <thead class="bg-gray-50"><tr>
          <th class="px-4 py-3 text-left font-medium text-gray-600">Group</th><th class="px-4 py-3 text-left font-medium text-gray-600">Organizer</th>
          <th class="px-4 py-3 text-center font-medium text-gray-600">Rooms</th><th class="px-4 py-3 text-left font-medium text-gray-600">Period</th>
          <th class="px-4 py-3 text-right font-medium text-gray-600">Rate</th><th class="px-4 py-3 text-center font-medium text-gray-600">Status</th>
        </tr></thead>
        <tbody>
          @for (g of groups(); track g.id) {
            <tr class="border-t hover:bg-gray-50">
              <td class="px-4 py-3 font-medium">{{g.group_name}}</td><td class="px-4 py-3">{{g.organizer_name}}</td>
              <td class="px-4 py-3 text-center">{{g.rooms_blocked}}</td><td class="px-4 py-3">{{g.check_in}} → {{g.check_out}}</td>
              <td class="px-4 py-3 text-right">₦{{((g.negotiated_rate || 0) / 100).toLocaleString()}}</td>
              <td class="px-4 py-3 text-center"><span [class]="'px-2 py-1 rounded-full text-xs font-medium ' + groupStatusClass(g.status)">{{g.status}}</span></td>
            </tr>
          } @empty { <tr><td colspan="6" class="px-4 py-8 text-center text-gray-400">No group bookings</td></tr> }
        </tbody>
      </table>
    </div>
  `
})
export default class GroupBookingsPage implements OnInit {
  private api = inject(ApiService);
  loading = signal(true); groups = signal<any[]>([]);
  showForm = false; form: any = { group_name: '', organizer_name: '', rooms_blocked: '', check_in: '', check_out: '', negotiated_rate: '' };
  ngOnInit() { this.api.get('/group-bookings').subscribe((r: any) => { this.groups.set(r?.data || []); this.loading.set(false); }); }
  create() { this.api.post('/group-bookings', { ...this.form, negotiated_rate: Math.round(+this.form.negotiated_rate * 100) }).subscribe(() => { this.showForm = false; this.ngOnInit(); }); }
  groupStatusClass(s: string): string { return { provisional: 'bg-yellow-100 text-yellow-800', confirmed: 'bg-green-100 text-green-800', cancelled: 'bg-red-100 text-red-800', completed: 'bg-sage-100 text-sage-800' }[s] || 'bg-gray-100'; }
}

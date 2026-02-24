import { Component, inject, OnInit, signal } from '@angular/core';
import { ApiService, PageHeaderComponent, LoadingSpinnerComponent } from '@lodgik/shared';
@Component({
  selector: 'app-spa', standalone: true, imports: [PageHeaderComponent, LoadingSpinnerComponent],
  template: `
    <ui-page-header title="Spa & Pool" subtitle="Manage spa services, bookings, and pool access">
      <div class="flex gap-2">
        <button (click)="tab = 'services'" [class]="tab === 'services' ? 'bg-sage-600 text-white' : 'bg-gray-200'" class="px-3 py-2 text-sm rounded-lg">Services</button>
        <button (click)="tab = 'bookings'" [class]="tab === 'bookings' ? 'bg-sage-600 text-white' : 'bg-gray-200'" class="px-3 py-2 text-sm rounded-lg">Bookings</button>
        <button (click)="tab = 'pool'" [class]="tab === 'pool' ? 'bg-cyan-600 text-white' : 'bg-gray-200'" class="px-3 py-2 text-sm rounded-lg">Pool ({{poolOccupancy()}})</button>
      </div>
    </ui-page-header>
    <ui-loading [loading]="loading()"></ui-loading>
    @if (tab === 'services') {
      <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        @for (s of services(); track s.id) {
          <div class="bg-white rounded-lg border p-4"><p class="font-semibold">{{s.name}}</p><p class="text-sm text-gray-500">{{s.category}} • {{s.duration_minutes}} min</p>
            <p class="text-lg font-bold text-sage-600 mt-2">₦{{((+s.price)/100).toLocaleString()}}</p>
            <p class="text-xs text-gray-400 mt-1">{{s.description || ''}}</p></div>
        } @empty { <p class="col-span-3 text-center text-gray-400 py-8">No spa services</p> }
      </div>
    }
    @if (tab === 'bookings') {
      <div class="bg-white rounded-lg border overflow-x-auto"><table class="w-full text-sm"><thead class="bg-gray-50"><tr>
        <th class="px-4 py-3 text-left">Guest</th><th class="px-4 py-3 text-left">Service</th><th class="px-4 py-3 text-left">Date</th>
        <th class="px-4 py-3 text-left">Time</th><th class="px-4 py-3 text-left">Therapist</th><th class="px-4 py-3 text-center">Status</th>
      </tr></thead><tbody>
        @for (b of bookings(); track b.id) {
          <tr class="border-t hover:bg-gray-50"><td class="px-4 py-3">{{b.guest_name}}</td><td class="px-4 py-3">{{b.service_name}}</td>
            <td class="px-4 py-3">{{b.booking_date}}</td><td class="px-4 py-3">{{b.start_time}}</td><td class="px-4 py-3">{{b.therapist_name || '-'}}</td>
            <td class="px-4 py-3 text-center"><span [class]="'px-2 py-0.5 rounded text-xs font-medium ' + spaStatClass(b.status)">{{b.status}}</span></td></tr>
        } @empty { <tr><td colspan="6" class="px-4 py-8 text-center text-gray-400">No spa bookings</td></tr> }
      </tbody></table></div>
    }
    @if (tab === 'pool') {
      <div class="bg-white rounded-lg border p-6 mb-6 text-center"><p class="text-sm text-gray-500">Current Pool Occupancy</p><p class="text-4xl font-bold text-cyan-600">{{poolOccupancy()}}</p><p class="text-sm text-gray-400">guests in pool area</p></div>
      <div class="bg-white rounded-lg border overflow-x-auto"><table class="w-full text-sm"><thead class="bg-gray-50"><tr>
        <th class="px-4 py-3 text-left">Guest</th><th class="px-4 py-3 text-left">Area</th><th class="px-4 py-3 text-left">In</th><th class="px-4 py-3 text-left">Out</th>
      </tr></thead><tbody>
        @for (p of poolLogs(); track p.id) {
          <tr class="border-t"><td class="px-4 py-3">{{p.guest_name}}</td><td class="px-4 py-3">{{p.area}}</td><td class="px-4 py-3">{{p.check_in_time}}</td><td class="px-4 py-3">{{p.check_out_time || '—'}}</td></tr>
        } @empty { <tr><td colspan="4" class="px-4 py-8 text-center text-gray-400">No pool activity today</td></tr> }
      </tbody></table></div>
    }
  `
})
export default class SpaPage implements OnInit {
  private api = inject(ApiService); loading = signal(true); services = signal<any[]>([]); bookings = signal<any[]>([]); poolLogs = signal<any[]>([]); poolOccupancy = signal(0); tab = 'services';
  ngOnInit() { this.api.get('/spa/services').subscribe((r: any) => { this.services.set(r?.data || []); this.loading.set(false); });
    this.api.get('/spa/bookings').subscribe((r: any) => this.bookings.set(r?.data || []));
    this.api.get('/spa/pool').subscribe((r: any) => this.poolLogs.set(r?.data || []));
    this.api.get('/spa/pool/occupancy').subscribe((r: any) => this.poolOccupancy.set(r?.data?.current_occupancy || 0)); }
  spaStatClass(s: string): string { return { booked: 'bg-sage-100 text-sage-700', in_progress: 'bg-purple-100 text-purple-700', completed: 'bg-green-100 text-green-700', cancelled: 'bg-red-100 text-red-700' }[s] || ''; }
}

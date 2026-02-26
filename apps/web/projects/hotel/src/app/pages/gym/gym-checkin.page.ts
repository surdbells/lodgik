import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ApiService, PageHeaderComponent, AuthService, ActivePropertyService} from '@lodgik/shared';

@Component({
  selector: 'app-gym-checkin',
  standalone: true,
  imports: [FormsModule, PageHeaderComponent],
  template: `
    <ui-page-header title="Gym Check-in" subtitle="QR scan or name search to check members in"></ui-page-header>

    <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <!-- Check-in Panel -->
      <div class="bg-white border rounded-xl p-6">
        <div class="flex gap-2 mb-4">
          <button (click)="mode = 'qr'" [class]="mode === 'qr' ? 'bg-sage-600 text-white px-4 py-2 rounded-lg text-sm font-medium' : 'bg-gray-100 px-4 py-2 rounded-lg text-sm'">📷 QR Code</button>
          <button (click)="mode = 'search'" [class]="mode === 'search' ? 'bg-sage-600 text-white px-4 py-2 rounded-lg text-sm font-medium' : 'bg-gray-100 px-4 py-2 rounded-lg text-sm'">🔍 Name Search</button>
        </div>

        @if (mode === 'qr') {
          <div class="text-center">
            <label class="text-sm text-gray-600 mb-2 block">Enter or scan QR code value</label>
            <input [(ngModel)]="qrCode" placeholder="GYM-XXXXXXXX" class="border-2 border-blue-300 rounded-xl px-4 py-3 text-center text-lg font-mono w-full mb-3 focus:ring-2 focus:ring-sage-200"/>
            <button (click)="checkInByQr()" [disabled]="!qrCode || loading()" class="w-full bg-green-600 text-white py-3 rounded-lg font-semibold text-lg hover:bg-green-700 disabled:opacity-50">✅ Check In</button>
          </div>
        }

        @if (mode === 'search') {
          <input [(ngModel)]="search" (ngModelChange)="searchMembers()" placeholder="Search by name or phone..." class="w-full border rounded-lg px-4 py-2 text-sm mb-3"/>
          <div class="max-h-60 overflow-y-auto space-y-2">
            @for (m of searchResults(); track m.id) {
              <div class="flex items-center justify-between p-3 border rounded-lg hover:bg-sage-50 cursor-pointer" (click)="checkInMember(m.id)">
                <div>
                  <div class="font-medium text-sm">{{ m.full_name }}</div>
                  <div class="text-xs text-gray-400">{{ m.phone }} · {{ m.qr_code }}</div>
                </div>
                <button class="bg-green-600 text-white px-3 py-1 rounded text-xs font-medium">Check In</button>
              </div>
            }
          </div>
        }

        @if (error()) { <div class="mt-3 p-3 bg-red-50 border border-red-200 text-red-600 rounded-lg text-sm">{{ error() }}</div> }
        @if (successMsg()) {
          <div class="mt-3 p-4 bg-green-50 border border-green-200 rounded-lg">
            <div class="text-green-700 font-semibold text-lg">✅ {{ successMsg() }}</div>
            @if (checkedInMember()) {
              <div class="text-sm text-green-600 mt-1">{{ checkedInMember().full_name }} · {{ checkedInMember().qr_code }}</div>
            }
          </div>
        }
      </div>

      <!-- Today's Visits -->
      <div class="bg-white border rounded-xl p-6">
        <div class="flex items-center justify-between mb-4">
          <h3 class="font-semibold text-gray-700">Today's Visits</h3>
          <span class="bg-sage-100 text-sage-700 px-2 py-0.5 rounded text-xs font-medium">{{ visits().length }}</span>
        </div>
        <div class="space-y-2 max-h-[500px] overflow-y-auto">
          @for (v of visits(); track v.id) {
            <div class="flex items-center justify-between p-3 border rounded-lg">
              <div>
                <div class="text-sm font-medium">{{ v.member_id }}</div>
                <div class="text-xs text-gray-400">{{ v.check_in_method }} · {{ v.checked_in_at }}</div>
              </div>
              @if (!v.checked_out_at) {
                <button (click)="checkOutVisit(v.id)" class="bg-orange-500 text-white px-3 py-1 rounded text-xs">Check Out</button>
              } @else {
                <span class="text-xs text-gray-400">{{ v.duration_minutes }}min</span>
              }
            </div>
          }
          @if (visits().length === 0) {
            <div class="text-center text-gray-400 py-8">No visits today yet</div>
          }
        </div>
      </div>
    </div>
  `,
})
export class GymCheckinPage {
  private api = inject(ApiService);
  private auth = inject(AuthService);
  private activeProperty = inject(ActivePropertyService);
  mode: 'qr' | 'search' = 'qr';
  qrCode = '';
  search = '';
  loading = signal(false);
  error = signal('');
  successMsg = signal('');
  checkedInMember = signal<any>(null);
  searchResults = signal<any[]>([]);
  visits = signal<any[]>([]);

  constructor() { this.loadVisits(); }

  checkInByQr() {
    this.loading.set(true); this.error.set(''); this.successMsg.set('');
    this.api.post('/gym/check-in', { qr_code: this.qrCode }).subscribe({
      next: (r: any) => {
        this.successMsg.set('Checked in successfully!');
        this.checkedInMember.set(r.data?.member);
        this.qrCode = '';
        this.loading.set(false);
        this.loadVisits();
      },
      error: (e: any) => { this.error.set(e.error?.message || 'Check-in failed'); this.loading.set(false); },
    });
  }

  checkInMember(memberId: string) {
    this.loading.set(true); this.error.set(''); this.successMsg.set('');
    this.api.post('/gym/check-in', { member_id: memberId, method: 'name_search' }).subscribe({
      next: (r: any) => {
        this.successMsg.set('Checked in successfully!');
        this.checkedInMember.set(r.data?.member);
        this.search = '';
        this.searchResults.set([]);
        this.loading.set(false);
        this.loadVisits();
      },
      error: (e: any) => { this.error.set(e.error?.message || 'Check-in failed'); this.loading.set(false); },
    });
  }

  searchMembers() {
    if (this.search.length < 2) { this.searchResults.set([]); return; }
    this.api.get(`/gym/members?property_id=${this.activeProperty.propertyId()}&search=${this.search}`).subscribe({
      next: (r: any) => this.searchResults.set(r.data || []),
    });
  }

  checkOutVisit(visitId: string) {
    this.api.post(`/gym/check-out/${visitId}`, {}).subscribe({ next: () => this.loadVisits() });
  }

  loadVisits() {
    this.api.get(`/gym/visits/today?property_id=${this.activeProperty.propertyId()}`).subscribe({
      next: (r: any) => this.visits.set(r.data || []),
    });
  }
}

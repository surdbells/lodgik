import { Component, inject, OnInit, signal, computed } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { DatePipe, DecimalPipe } from '@angular/common';
import { ApiService, PageHeaderComponent, LoadingSpinnerComponent, ToastService } from '@lodgik/shared';
import { AuthService } from '@lodgik/shared';

@Component({
  selector: 'app-new-booking',
  standalone: true,
  imports: [FormsModule, DatePipe, DecimalPipe, RouterLink, PageHeaderComponent, LoadingSpinnerComponent],
  template: `
    <ui-page-header title="New Booking" subtitle="Create a reservation">
      <a routerLink="/bookings" class="px-4 py-2 text-sm border border-gray-300 rounded-lg hover:bg-gray-50">← Cancel</a>
    </ui-page-header>

    <!-- Step Indicator -->
    <div class="flex items-center gap-1 mb-6">
      @for (s of steps; track s.num; let i = $index) {
        <div class="flex items-center gap-1">
          <div class="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-colors"
               [class]="step() >= s.num ? 'bg-sage-600 text-white' : 'bg-gray-200 text-gray-500'">{{ s.num }}</div>
          <span class="text-xs font-medium mr-2" [class]="step() >= s.num ? 'text-sage-600' : 'text-gray-400'">{{ s.label }}</span>
          @if (i < steps.length - 1) { <div class="w-6 h-px bg-gray-300 mr-1"></div> }
        </div>
      }
    </div>

    <!-- Step 1: Select Guest -->
    @if (step() === 1) {
      <div class="bg-white rounded-xl border border-gray-100 shadow-card p-6">
        <h3 class="text-base font-semibold text-gray-700 mb-4">Select Guest</h3>
        <div class="relative mb-4">
          <input [(ngModel)]="guestSearch" (ngModelChange)="searchGuests()" placeholder="Search by name, phone, or email..." class="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm bg-gray-50" autofocus>
          @if (guestResults().length > 0) {
            <div class="absolute z-10 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-xl max-h-64 overflow-y-auto">
              @for (g of guestResults(); track g.id) {
                <button (click)="selectGuest(g)" class="w-full text-left px-4 py-3 text-sm hover:bg-sage-50 border-b border-gray-50 flex justify-between items-center">
                  <div><span class="font-medium">{{ g.full_name }}</span><br><span class="text-gray-400 text-xs">{{ g.phone || g.email || '' }}</span></div>
                  <span class="px-2 py-0.5 rounded-full text-[10px] font-medium bg-gray-100 text-gray-500">{{ g.vip_status }}</span>
                </button>
              }
            </div>
          }
        </div>
        @if (booking.guest_id) {
          <div class="p-4 bg-sage-50 rounded-lg flex items-center justify-between">
            <div><span class="font-medium text-sage-800">{{ selectedGuestName }}</span><p class="text-xs text-sage-500 mt-0.5">Guest selected</p></div>
            <button (click)="booking.guest_id = ''; selectedGuestName = ''" class="text-xs text-sage-600 hover:underline">Change</button>
          </div>
        }
        <div class="flex justify-end mt-6">
          <button (click)="nextStep()" [disabled]="!booking.guest_id" class="px-6 py-2.5 bg-sage-600 text-white text-sm font-medium rounded-lg hover:bg-sage-700 disabled:opacity-40">Next →</button>
        </div>
      </div>
    }

    <!-- Step 2: Dates & Type -->
    @if (step() === 2) {
      <div class="bg-white rounded-xl border border-gray-100 shadow-card p-6">
        <h3 class="text-base font-semibold text-gray-700 mb-4">Dates & Booking Type</h3>
        <div class="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div>
            <label class="block text-xs font-medium text-gray-500 mb-1">Booking Type</label>
            <select [(ngModel)]="booking.booking_type" class="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm bg-gray-50">
              <option value="overnight">Overnight</option>
              <option value="short_rest_3hr">Short Rest (3hrs)</option>
              <option value="short_rest_6hr">Short Rest (6hrs)</option>
              <option value="half_day">Half Day (12hrs)</option>
              <option value="full_day">Full Day (24hrs)</option>
              <option value="walk_in">Walk-In</option>
              <option value="corporate">Corporate</option>
            </select>
          </div>
          <div>
            <label class="block text-xs font-medium text-gray-500 mb-1">Check-in</label>
            <input [(ngModel)]="booking.check_in" type="date" class="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm bg-gray-50">
          </div>
          <div>
            <label class="block text-xs font-medium text-gray-500 mb-1">Check-out</label>
            <input [(ngModel)]="booking.check_out" type="date" class="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm bg-gray-50">
          </div>
        </div>
        <div class="grid grid-cols-2 gap-4 mt-4">
          <div>
            <label class="block text-xs font-medium text-gray-500 mb-1">Adults</label>
            <input [(ngModel)]="booking.adults" type="number" min="1" class="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm bg-gray-50">
          </div>
          <div>
            <label class="block text-xs font-medium text-gray-500 mb-1">Children</label>
            <input [(ngModel)]="booking.children" type="number" min="0" class="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm bg-gray-50">
          </div>
        </div>
        <div class="flex justify-between mt-6">
          <button (click)="prevStep()" class="px-6 py-2.5 text-sm text-gray-500 border border-gray-300 rounded-lg hover:bg-gray-50">← Back</button>
          <button (click)="nextStep()" [disabled]="!booking.check_in || !booking.check_out" class="px-6 py-2.5 bg-sage-600 text-white text-sm font-medium rounded-lg hover:bg-sage-700 disabled:opacity-40">Next →</button>
        </div>
      </div>
    }

    <!-- Step 3: Select Room -->
    @if (step() === 3) {
      <div class="bg-white rounded-xl border border-gray-100 shadow-card p-6">
        <h3 class="text-base font-semibold text-gray-700 mb-4">Select Room</h3>
        @if (availableRooms().length === 0) {
          <p class="text-gray-400 py-8 text-center">No rooms available for selected dates</p>
        } @else {
          <div class="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-3">
            @for (r of availableRooms(); track r.id) {
              <button (click)="selectRoom(r)" class="p-3 rounded-lg border-2 text-center transition-all hover:shadow-md"
                      [class.border-sage-500]="booking.room_id === r.id" [class.bg-sage-50]="booking.room_id === r.id"
                      [class.border-gray-200]="booking.room_id !== r.id">
                <div class="text-sm font-bold">{{ r.room_number }}</div>
                <div class="text-[10px] text-gray-500">{{ getRoomTypeName(r.room_type_id) }}</div>
                <div class="text-xs text-emerald-600 font-medium mt-1">₦{{ (+getRoomRate(r.room_type_id)).toLocaleString() }}</div>
              </button>
            }
          </div>
        }
        <div class="flex justify-between mt-6">
          <button (click)="prevStep()" class="px-6 py-2.5 text-sm text-gray-500 border border-gray-300 rounded-lg hover:bg-gray-50">← Back</button>
          <button (click)="nextStep(); previewRate()" [disabled]="!booking.room_id" class="px-6 py-2.5 bg-sage-600 text-white text-sm font-medium rounded-lg hover:bg-sage-700 disabled:opacity-40">Next →</button>
        </div>
      </div>
    }

    <!-- Step 4: Addons -->
    @if (step() === 4) {
      <div class="bg-white rounded-xl border border-gray-100 shadow-card p-6">
        <h3 class="text-base font-semibold text-gray-700 mb-4">Add-ons (Optional)</h3>
        <div class="space-y-3">
          @for (addon of addons; track $index; let i = $index) {
            <div class="flex items-center gap-3">
              <input [(ngModel)]="addon.name" placeholder="Add-on name" class="flex-1 px-3 py-2 border border-gray-200 rounded-xl text-sm bg-gray-50">
              <input [(ngModel)]="addon.amount" type="number" placeholder="₦ Amount" class="w-32 px-3 py-2 border border-gray-200 rounded-xl text-sm bg-gray-50">
              <input [(ngModel)]="addon.quantity" type="number" min="1" class="w-20 px-3 py-2 border border-gray-200 rounded-xl text-sm bg-gray-50">
              <button (click)="removeAddon(i)" class="text-red-400 hover:text-red-600 text-lg">✕</button>
            </div>
          }
        </div>
        <button (click)="addAddon()" class="mt-3 px-4 py-2 text-sm text-sage-600 border border-sage-200 rounded-lg hover:bg-sage-50">+ Add Item</button>
        <div class="flex justify-between mt-6">
          <button (click)="prevStep()" class="px-6 py-2.5 text-sm text-gray-500 border border-gray-300 rounded-lg hover:bg-gray-50">← Back</button>
          <button (click)="nextStep(); previewRate()" class="px-6 py-2.5 bg-sage-600 text-white text-sm font-medium rounded-lg hover:bg-sage-700">Next →</button>
        </div>
      </div>
    }

    <!-- Step 5: Pricing -->
    @if (step() === 5) {
      <div class="bg-white rounded-xl border border-gray-100 shadow-card p-6">
        <h3 class="text-base font-semibold text-gray-700 mb-4">Pricing Summary</h3>
        <div class="space-y-3 text-sm max-w-md">
          <div class="flex justify-between py-2 border-b border-gray-100"><span class="text-gray-500">Rate</span><span class="font-medium">₦{{ (+ratePreview().rate || 0).toLocaleString() }} {{ ratePreview().hours ? '/hr' : '/night' }}</span></div>
          <div class="flex justify-between py-2 border-b border-gray-100"><span class="text-gray-500">Duration</span><span class="font-medium">{{ ratePreview().hours ? ratePreview().hours + ' hours' : ratePreview().nights + ' night(s)' }}</span></div>
          <div class="flex justify-between py-2 border-b border-gray-100"><span class="text-gray-500">Subtotal</span><span class="font-medium">₦{{ (+ratePreview().subtotal || 0).toLocaleString() }}</span></div>
          @for (addon of addons; track $index) {
            @if (addon.name && addon.amount) {
              <div class="flex justify-between py-2 border-b border-gray-100"><span class="text-gray-500">{{ addon.name }} ×{{ addon.quantity }}</span><span class="font-medium">₦{{ (addon.amount * addon.quantity).toLocaleString() }}</span></div>
            }
          }
          <div>
            <label class="block text-xs font-medium text-gray-500 mb-1">Discount (₦)</label>
            <input [(ngModel)]="booking.discount_amount" type="number" min="0" (ngModelChange)="previewRate()" class="w-48 px-3 py-2 border border-gray-200 rounded-xl text-sm bg-gray-50">
          </div>
          @if (+booking.discount_amount > 0) {
            <div class="flex justify-between py-2 border-b border-gray-100 text-red-500"><span>Discount</span><span>-₦{{ (+booking.discount_amount).toLocaleString() }}</span></div>
          }
          <div class="flex justify-between py-3 text-lg font-bold"><span>Total</span><span class="text-emerald-600">₦{{ grandTotal().toLocaleString() }}</span></div>
        </div>
        <div class="flex justify-between mt-6">
          <button (click)="prevStep()" class="px-6 py-2.5 text-sm text-gray-500 border border-gray-300 rounded-lg hover:bg-gray-50">← Back</button>
          <button (click)="nextStep()" class="px-6 py-2.5 bg-sage-600 text-white text-sm font-medium rounded-lg hover:bg-sage-700">Next →</button>
        </div>
      </div>
    }

    <!-- Step 6: Confirm -->
    @if (step() === 6) {
      <div class="bg-white rounded-xl border border-gray-100 shadow-card p-6">
        <h3 class="text-base font-semibold text-gray-700 mb-4">Confirm Booking</h3>
        <div class="grid grid-cols-2 gap-4 text-sm max-w-lg">
          <div><span class="text-gray-400">Guest</span><p class="font-medium mt-0.5">{{ selectedGuestName }}</p></div>
          <div><span class="text-gray-400">Room</span><p class="font-medium mt-0.5">{{ selectedRoomNumber }}</p></div>
          <div><span class="text-gray-400">Type</span><p class="font-medium mt-0.5">{{ booking.booking_type }}</p></div>
          <div><span class="text-gray-400">Dates</span><p class="font-medium mt-0.5">{{ booking.check_in }} → {{ booking.check_out }}</p></div>
          <div><span class="text-gray-400">Guests</span><p class="font-medium mt-0.5">{{ booking.adults }} adults, {{ booking.children }} children</p></div>
          <div><span class="text-gray-400">Total</span><p class="font-bold text-lg text-emerald-600 mt-0.5">₦{{ grandTotal().toLocaleString() }}</p></div>
        </div>
        <div>
          <label class="block text-xs font-medium text-gray-500 mb-1 mt-4">Special Requests</label>
          <textarea [(ngModel)]="booking.special_requests" rows="2" class="w-full max-w-lg px-3 py-2 border border-gray-200 rounded-xl text-sm bg-gray-50" placeholder="Any special requests..."></textarea>
        </div>
        <div class="flex justify-between mt-6">
          <button (click)="prevStep()" class="px-6 py-2.5 text-sm text-gray-500 border border-gray-300 rounded-lg hover:bg-gray-50">← Back</button>
          <button (click)="submitBooking()" [disabled]="submitting()" class="px-8 py-2.5 bg-emerald-600 text-white text-sm font-bold rounded-lg hover:bg-emerald-700 disabled:opacity-40">
            {{ submitting() ? 'Creating...' : 'Confirm Booking' }}
          </button>
        </div>
      </div>
    }
  `,
})
export class NewBookingPage implements OnInit {
  private api = inject(ApiService);
  private auth = inject(AuthService);
  private toast = inject(ToastService);
  private router = inject(Router);

  step = signal(1);
  submitting = signal(false);
  availableRooms = signal<any[]>([]);
  roomTypes = signal<any[]>([]);
  guestResults = signal<any[]>([]);
  ratePreview = signal<any>({});
  propertyId = '';
  guestSearch = '';
  selectedGuestName = '';
  selectedRoomNumber = '';
  private searchTimer: any;

  steps = [
    { num: 1, label: 'Guest' }, { num: 2, label: 'Dates' }, { num: 3, label: 'Room' },
    { num: 4, label: 'Addons' }, { num: 5, label: 'Pricing' }, { num: 6, label: 'Confirm' },
  ];

  booking: any = { guest_id: '', room_id: '', booking_type: 'overnight', check_in: '', check_out: '', adults: 1, children: 0, discount_amount: 0, special_requests: '', source: 'front_desk' };
  addons: any[] = [];

  grandTotal = computed(() => {
    const rate = +(this.ratePreview()?.total || 0);
    const addonTotal = this.addons.reduce((s, a) => s + (a.amount || 0) * (a.quantity || 1), 0);
    return rate + addonTotal;
  });

  ngOnInit(): void {
    const user = this.auth.currentUser;
    if (user?.property_id) this.propertyId = user.property_id;
    this.loadRoomTypes();
    this.loadAvailableRooms();
  }

  nextStep(): void { if (this.step() < 6) this.step.update(s => s + 1); }
  prevStep(): void { if (this.step() > 1) this.step.update(s => s - 1); }

  searchGuests(): void {
    clearTimeout(this.searchTimer);
    this.searchTimer = setTimeout(() => {
      if (this.guestSearch.length < 2) { this.guestResults.set([]); return; }
      this.api.get('/guests/search', { q: this.guestSearch }).subscribe(r => {
        if (r.success) this.guestResults.set(r.data ?? []);
      });
    }, 300);
  }

  selectGuest(g: any): void {
    this.booking.guest_id = g.id;
    this.selectedGuestName = g.full_name;
    this.guestSearch = g.full_name;
    this.guestResults.set([]);
  }

  selectRoom(r: any): void {
    this.booking.room_id = r.id;
    this.selectedRoomNumber = r.room_number;
  }

  loadRoomTypes(): void {
    if (!this.propertyId) return;
    this.api.get('/room-types', { property_id: this.propertyId, limit: 50 }).subscribe(r => {
      if (r.success) this.roomTypes.set(r.data ?? []);
    });
  }

  loadAvailableRooms(): void {
    if (!this.propertyId) return;
    this.api.get('/rooms/available', { property_id: this.propertyId }).subscribe(r => {
      if (r.success) this.availableRooms.set(r.data ?? []);
    });
  }

  getRoomTypeName(id: string): string {
    return this.roomTypes().find((rt: any) => rt.id === id)?.name ?? '—';
  }

  getRoomRate(roomTypeId: string): string {
    return this.roomTypes().find((rt: any) => rt.id === roomTypeId)?.base_rate ?? '0';
  }

  previewRate(): void {
    const room = this.availableRooms().find((r: any) => r.id === this.booking.room_id);
    if (!room) return;
    this.api.post('/bookings/preview-rate', {
      room_type_id: room.room_type_id,
      booking_type: this.booking.booking_type,
      check_in: this.booking.check_in,
      check_out: this.booking.check_out,
      discount_amount: String(this.booking.discount_amount || 0),
    }).subscribe(r => { if (r.success) this.ratePreview.set(r.data); });
  }

  addAddon(): void { this.addons.push({ name: '', amount: null, quantity: 1 }); }
  removeAddon(i: number): void { this.addons.splice(i, 1); }

  submitBooking(): void {
    this.submitting.set(true);
    const body = {
      ...this.booking,
      property_id: this.propertyId,
      discount_amount: String(this.booking.discount_amount || 0),
      addons: this.addons.filter(a => a.name && a.amount).map(a => ({ name: a.name, amount: String(a.amount), quantity: a.quantity || 1 })),
    };
    this.api.post('/bookings', body).subscribe({
      next: r => {
        this.submitting.set(false);
        if (r.success) {
          this.toast.success(`Booking created: ${r.data?.booking_ref}`);
          this.router.navigate(['/bookings', r.data?.id]);
        } else {
          this.toast.error(r.message || 'Failed to create booking');
        }
      },
      error: () => { this.submitting.set(false); this.toast.error('Error creating booking'); },
    });
  }
}

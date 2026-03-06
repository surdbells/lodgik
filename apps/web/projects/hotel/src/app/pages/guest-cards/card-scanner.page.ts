import { Component, inject, OnInit, OnDestroy, signal, computed } from '@angular/core';
import { NgClass, DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { ApiService, ToastService, ActivePropertyService } from '@lodgik/shared';

type ScanContext = 'reception_lookup' | 'checkout' | 'security_exit' | 'facility_access' | 'pos_charge';

@Component({
  selector: 'app-card-scanner',
  standalone: true,
  imports: [NgClass, DatePipe, FormsModule, RouterLink],
  template: `
    <div class="min-h-screen bg-gray-950 text-white flex flex-col">

      <!-- Header bar -->
      <div class="flex items-center justify-between px-6 py-4 bg-gray-900 border-b border-gray-800">
        <div class="flex items-center gap-3">
          <span class="text-2xl">💳</span>
          <div>
            <h1 class="font-bold text-white">Card Scanner</h1>
            <p class="text-xs text-gray-400">{{ selectedScanPointName() || 'No scan point selected' }}</p>
          </div>
        </div>
        <div class="flex items-center gap-3">
          <!-- Scan point selector -->
          <select [(ngModel)]="scanPointId" (change)="onScanPointChange()" class="bg-gray-800 border border-gray-700 text-white text-sm rounded-lg px-3 py-2">
            <option value="">— Select Scan Point —</option>
            @for (sp of scanPoints(); track sp.id) {
              <option [value]="sp.id">{{ sp.name }}</option>
            }
          </select>
          <!-- Context selector -->
          <select [(ngModel)]="context" class="bg-gray-800 border border-gray-700 text-white text-sm rounded-lg px-3 py-2">
            <option value="reception_lookup">🔍 Reception Lookup</option>
            <option value="checkout">🚪 Checkout</option>
            <option value="security_exit">🛡️ Security Exit</option>
            <option value="facility_access">🏊 Facility Access</option>
            <option value="pos_charge">💳 POS Charge</option>
          </select>
          <a routerLink="/guest-cards" class="text-sm text-gray-400 hover:text-white px-3 py-2 border border-gray-700 rounded-lg">← Back</a>
        </div>
      </div>

      <div class="flex-1 flex gap-0">

        <!-- Scan Panel -->
        <div class="w-full max-w-lg mx-auto flex flex-col justify-center px-6 py-8">

          <!-- Scan input area -->
          <div class="bg-gray-900 rounded-2xl border border-gray-700 p-6 mb-6">
            <p class="text-center text-sm text-gray-400 mb-4">Scan RFID card or type/paste Card UID</p>

            <div class="relative">
              <input
                #scanInput
                [(ngModel)]="cardUid"
                (keyup.enter)="scan()"
                (input)="onUidInput()"
                placeholder="Scan card or type UID..."
                autofocus
                class="w-full bg-gray-800 border border-gray-600 text-white text-xl font-mono rounded-xl px-4 py-4 text-center focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                [ngClass]="{ 'border-green-500': lastResult()?.allowed, 'border-red-500': lastResult() && !lastResult()?.allowed }">
              @if (cardUid) {
                <button (click)="clearScan()" class="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white text-lg">✕</button>
              }
            </div>

            <!-- POS charge amount (only shown for pos_charge context) -->
            @if (context === 'pos_charge') {
              <div class="mt-4 space-y-2">
                <input [(ngModel)]="chargeAmount" type="number" placeholder="Amount (₦)" min="1"
                  class="w-full bg-gray-800 border border-gray-600 text-white rounded-xl px-4 py-3 text-center text-lg font-mono focus:outline-none focus:border-blue-500">
                <input [(ngModel)]="chargeDesc" placeholder="Description (e.g. Bar order)"
                  class="w-full bg-gray-800 border border-gray-600 text-white rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-blue-500">
              </div>
            }

            <button (click)="scan()" [disabled]="!cardUid || scanning()"
              class="w-full mt-4 py-3 rounded-xl text-sm font-semibold transition-all"
              [ngClass]="scanning() ? 'bg-gray-700 text-gray-400' : 'bg-blue-600 hover:bg-blue-500 text-white'">
              {{ scanning() ? 'Scanning...' : 'Scan Card' }}
            </button>
          </div>

          <!-- Scan result -->
          @if (lastResult()) {
            <div class="rounded-2xl border p-5 transition-all"
              [ngClass]="lastResult()!.allowed ? 'bg-green-900/30 border-green-700' : 'bg-red-900/30 border-red-700'">

              <!-- Status badge -->
              <div class="flex items-center gap-3 mb-4">
                <span class="text-3xl">{{ lastResult()!.allowed ? '✅' : '⛔' }}</span>
                <div>
                  <p class="font-bold text-lg" [ngClass]="lastResult()!.allowed ? 'text-green-400' : 'text-red-400'">
                    {{ lastResult()!.allowed ? 'ACCESS GRANTED' : 'ACCESS DENIED' }}
                  </p>
                  <p class="text-sm text-gray-300">{{ lastResult()!.message }}</p>
                </div>
              </div>

              <!-- Alert banner for outstanding balance -->
              @if (lastResult()!.alert) {
                <div class="bg-amber-900/50 border border-amber-600 rounded-xl p-3 mb-4">
                  <p class="text-amber-300 text-sm font-medium">{{ lastResult()!.alert }}</p>
                </div>
              }

              <!-- Guest info -->
              @if (lastResult()!.guest) {
                <div class="bg-gray-800/60 rounded-xl p-4 mb-3">
                  <p class="text-xs text-gray-400 mb-1">GUEST</p>
                  <p class="font-bold text-white text-lg">{{ lastResult()!.guest.name }}</p>
                  @if (lastResult()!.guest.phone) {
                    <p class="text-sm text-gray-400">{{ lastResult()!.guest.phone }}</p>
                  }
                </div>
              }

              <!-- Booking info -->
              @if (lastResult()!.booking) {
                <div class="bg-gray-800/60 rounded-xl p-4 mb-3 grid grid-cols-2 gap-3">
                  <div>
                    <p class="text-xs text-gray-400">BOOKING REF</p>
                    <p class="font-mono font-bold text-white">{{ lastResult()!.booking.booking_ref }}</p>
                  </div>
                  <div>
                    <p class="text-xs text-gray-400">STATUS</p>
                    <p class="font-semibold text-white capitalize">{{ lastResult()!.booking.status }}</p>
                  </div>
                  <div>
                    <p class="text-xs text-gray-400">CHECK-OUT</p>
                    <p class="text-white text-sm">{{ lastResult()!.booking.check_out | date:'dd MMM y HH:mm' }}</p>
                  </div>
                  @if (lastResult()!.booking.total_amount) {
                    <div>
                      <p class="text-xs text-gray-400">TOTAL</p>
                      <p class="text-white text-sm font-semibold">₦{{ (+lastResult()!.booking.total_amount).toLocaleString() }}</p>
                    </div>
                  }
                </div>
              }

              <!-- Folio summary -->
              @if (lastResult()!.folio_summary) {
                <div class="bg-gray-800/60 rounded-xl p-4 mb-3">
                  <p class="text-xs text-gray-400 mb-2">FOLIO BALANCE</p>
                  <p class="text-2xl font-bold" [ngClass]="(+lastResult()!.folio_summary.balance) > 0 ? 'text-amber-400' : 'text-green-400'">
                    ₦{{ (+lastResult()!.folio_summary.balance).toLocaleString() }}
                  </p>
                  @if (lastResult()!.action_required === 'confirm_checkout') {
                    <a [routerLink]="['/bookings', lastResult()!.booking?.id]"
                      class="mt-3 block w-full text-center py-2 bg-blue-600 hover:bg-blue-500 rounded-lg text-sm font-medium text-white">
                      Open Booking to Confirm Checkout →
                    </a>
                  }
                </div>
              }

              <!-- POS charge result -->
              @if (lastResult()!.context === 'pos_charge' && lastResult()!.charge) {
                <div class="bg-gray-800/60 rounded-xl p-4">
                  <p class="text-xs text-gray-400 mb-2">CHARGE POSTED</p>
                  <p class="text-xl font-bold text-green-400">₦{{ (+lastResult()!.charge.amount).toLocaleString() }}</p>
                  <p class="text-sm text-gray-300">{{ lastResult()!.charge.description }}</p>
                  <p class="text-xs text-gray-400 mt-2">New balance: ₦{{ (+lastResult()!.folio_balance).toLocaleString() }}</p>
                </div>
              }

              <p class="text-xs text-gray-500 text-center mt-3">{{ scanTime() }}</p>
            </div>
          }
        </div>

        <!-- Right sidebar: Recent scans -->
        <div class="w-80 hidden xl:flex flex-col bg-gray-900 border-l border-gray-800">
          <div class="px-4 py-3 border-b border-gray-800">
            <p class="text-sm font-semibold text-gray-300">Recent Scans</p>
          </div>
          <div class="flex-1 overflow-y-auto">
            @for (event of recentScans(); track event.id) {
              <div class="px-4 py-3 border-b border-gray-800/50 hover:bg-gray-800/50 transition-colors">
                <div class="flex items-center gap-2 mb-1">
                  <span class="text-sm">{{ event.event_icon }}</span>
                  <span class="text-xs font-medium" [ngClass]="event.event_type === 'access_denied' ? 'text-red-400' : 'text-gray-300'">
                    {{ event.event_label }}
                  </span>
                </div>
                @if (event.metadata?.['guest_name'] || event.guestName) {
                  <p class="text-sm text-white font-medium">{{ event.guestName ?? event.metadata?.['guest_name'] }}</p>
                }
                <p class="text-xs text-gray-500">{{ event.scanned_at | date:'HH:mm:ss' }}</p>
              </div>
            }
            @if (!recentScans().length) {
              <div class="p-6 text-center text-gray-500 text-sm">No scans yet this session</div>
            }
          </div>
        </div>

      </div>
    </div>
  `,
})
export class CardScannerPage implements OnInit, OnDestroy {
  private api   = inject(ApiService);
  private toast = inject(ToastService);
  private activeProperty = inject(ActivePropertyService);

  cardUid      = '';
  context: ScanContext = 'reception_lookup';
  chargeAmount = '';
  chargeDesc   = '';
  propertyId   = '';
  scanPointId  = '';

  scanning     = signal(false);
  lastResult   = signal<any>(null);
  scanTime     = signal('');
  scanPoints   = signal<any[]>([]);
  recentScans  = signal<any[]>([]);

  selectedScanPointName = computed(() => {
    const sp = this.scanPoints().find(s => s.id === this.scanPointId);
    return sp ? sp.name : '';
  });

  private autoScanTimer: any = null;

  ngOnInit(): void {
    this.propertyId = this.activeProperty.propertyId();
    this.scanPointId = localStorage.getItem('selectedScanPointId') ?? '';
    if (this.propertyId) this.loadScanPoints();
  }

  loadScanPoints(): void {
    this.api.get(`/scan-points?property_id=${this.propertyId}&limit=100`).subscribe({
      next: (r: any) => {
        this.scanPoints.set(r.data?.items ?? r.data ?? []);
        // If we had a stored scanPointId, keep it; otherwise pick the first
        if (!this.scanPointId && this.scanPoints().length) {
          this.scanPointId = this.scanPoints()[0].id;
          localStorage.setItem('selectedScanPointId', this.scanPointId);
        }
      },
      error: () => {},
    });
  }

  onScanPointChange(): void {
    localStorage.setItem('selectedScanPointId', this.scanPointId);
  }

  ngOnDestroy(): void {
    clearTimeout(this.autoScanTimer);
  }

  onUidInput(): void {
    // Auto-scan when input is exactly 8+ chars and ends (simulates RFID reader behavior)
    clearTimeout(this.autoScanTimer);
    if (this.cardUid.length >= 6) {
      this.autoScanTimer = setTimeout(() => this.scan(), 300);
    }
  }

  scan(): void {
    if (!this.cardUid.trim() || this.scanning()) return;
    if (this.context === 'pos_charge' && !this.chargeAmount) {
      this.toast.error('Enter a charge amount for POS scan');
      return;
    }

    this.scanning.set(true);
    const body: any = {
      card_uid:          this.cardUid.trim(),
      context:           this.context,
      scan_point_id:     this.scanPointId || undefined,
      charge_amount:     this.chargeAmount || undefined,
      charge_description: this.chargeDesc || undefined,
    };

    this.api.post('/cards/scan', body).subscribe({
      next: (r: any) => {
        const result = r.data ?? r;
        this.lastResult.set(result);
        this.scanTime.set(new Date().toLocaleTimeString());
        this.scanning.set(false);

        // Push to local recent scans sidebar
        const scanEntry: any = {
          id:          Date.now(),
          event_type:  result.context ?? (result.allowed ? 'entry' : 'access_denied'),
          event_label: result.message?.slice(0, 40),
          event_icon:  result.allowed ? '✅' : '⛔',
          guestName:   result.guest?.name,
          scanned_at:  new Date().toISOString(),
        };
        this.recentScans.update(prev => [scanEntry, ...prev.slice(0, 49)]);

        // Play audio cue (browser permitting)
        this.playBeep(result.allowed);

        // Auto-clear uid after scan
        setTimeout(() => { this.cardUid = ''; this.chargeAmount = ''; this.chargeDesc = ''; }, 1500);
      },
      error: (e: any) => {
        this.scanning.set(false);
        this.lastResult.set({ allowed: false, message: e?.error?.message ?? 'Scan error' });
        this.playBeep(false);
      },
    });
  }

  clearScan(): void {
    this.cardUid = '';
    this.lastResult.set(null);
  }

  private playBeep(success: boolean): void {
    try {
      const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain); gain.connect(ctx.destination);
      osc.frequency.value = success ? 880 : 220;
      osc.type = 'sine';
      gain.gain.setValueAtTime(0.3, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.3);
      osc.start(); osc.stop(ctx.currentTime + 0.3);
    } catch (_) {}
  }
}

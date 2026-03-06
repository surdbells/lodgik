import { Component, inject, OnInit, signal, computed } from '@angular/core';
import { DatePipe, NgClass } from '@angular/common';
import { RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import {
  ApiService,
  PageHeaderComponent,
  LoadingSpinnerComponent,
  ToastService,
  ConfirmDialogService,
  ActivePropertyService,
} from '@lodgik/shared';

@Component({
  selector: 'app-guest-cards',
  standalone: true,
  imports: [DatePipe, NgClass, RouterLink, FormsModule, PageHeaderComponent, LoadingSpinnerComponent],
  template: `
    <ui-page-header title="Guest Cards" subtitle="Card inventory — RFID/QR dual-interface cards">
      <button (click)="openRegisterModal()" class="px-4 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 flex items-center gap-2">
        + Register Cards
      </button>
    </ui-page-header>

    <!-- Inventory Summary Tiles -->
    @if (report()) {
      <div class="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
        @for (tile of summaryTiles(); track tile.label) {
          <div class="bg-white rounded-xl border border-gray-100 p-4 text-center shadow-sm">
            <p class="text-2xl font-bold" [style.color]="tile.color">{{ tile.value }}</p>
            <p class="text-xs text-gray-500 mt-1">{{ tile.label }}</p>
          </div>
        }
      </div>
    }

    <!-- Filters -->
    <div class="bg-white rounded-xl border border-gray-100 p-4 mb-4 flex flex-wrap gap-3 items-center">
      <select [(ngModel)]="propertyId" class="border rounded-lg px-3 py-2 text-sm w-56" (change)="load()">
        @for (p of activeProperty.properties(); track p.id) {
          <option [value]="p.id">{{ p.name }}</option>
        }
      </select>
      <select [(ngModel)]="statusFilter" (change)="load()" class="border rounded-lg px-3 py-2 text-sm">
        <option value="">All Statuses</option>
        <option value="available">Available</option>
        <option value="active">Active (Issued)</option>
        <option value="deactivated">Deactivated</option>
        <option value="lost">Lost</option>
        <option value="replaced">Replaced</option>
      </select>
      <button (click)="load()" class="px-4 py-2 bg-gray-800 text-white text-sm rounded-lg hover:bg-gray-700">Refresh</button>
    </div>

    <ui-loading [loading]="loading()"></ui-loading>

    <!-- Cards Table -->
    @if (!loading() && cards().length) {
      <div class="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
        <table class="w-full text-sm">
          <thead class="bg-gray-50 border-b border-gray-100">
            <tr>
              <th class="px-4 py-3 text-left font-medium text-gray-500">Card #</th>
              <th class="px-4 py-3 text-left font-medium text-gray-500">UID</th>
              <th class="px-4 py-3 text-left font-medium text-gray-500">Status</th>
              <th class="px-4 py-3 text-left font-medium text-gray-500">Booking</th>
              <th class="px-4 py-3 text-left font-medium text-gray-500">Issued At</th>
              <th class="px-4 py-3 text-right font-medium text-gray-500">Actions</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-gray-50">
            @for (card of cards(); track card.id) {
              <tr class="hover:bg-gray-50 transition-colors">
                <td class="px-4 py-3 font-mono font-semibold text-gray-800">{{ card.card_number }}</td>
                <td class="px-4 py-3 font-mono text-xs text-gray-500">{{ card.card_uid }}</td>
                <td class="px-4 py-3">
                  <span class="px-2 py-1 rounded-full text-xs font-medium text-white"
                        [style.background-color]="card.status_color">
                    {{ card.status_label }}
                  </span>
                </td>
                <td class="px-4 py-3 text-gray-600 text-xs">
                  {{ card.booking_id ? card.booking_id.slice(0,8) + '...' : '—' }}
                </td>
                <td class="px-4 py-3 text-gray-500 text-xs">
                  {{ card.issued_at ? (card.issued_at | date:'dd MMM y, HH:mm') : '—' }}
                </td>
                <td class="px-4 py-3 text-right">
                  <div class="flex gap-2 justify-end">
                    <button (click)="viewCard(card)" class="text-blue-600 hover:text-blue-800 text-xs font-medium">View</button>
                    @if (card.status === 'active' || card.status === 'issued') {
                      <button (click)="openReportLost(card)" class="text-amber-600 hover:text-amber-800 text-xs font-medium">Lost</button>
                      <button (click)="confirmDeactivate(card)" class="text-red-600 hover:text-red-800 text-xs font-medium">Deactivate</button>
                    }
                    @if (card.status === 'deactivated') {
                      <span class="text-gray-400 text-xs">Inactive</span>
                    }
                  </div>
                </td>
              </tr>
            }
          </tbody>
        </table>

        <!-- Pagination -->
        <div class="px-4 py-3 border-t border-gray-100 flex items-center justify-between">
          <span class="text-sm text-gray-500">{{ total() }} total cards</span>
          <div class="flex gap-2">
            <button (click)="prevPage()" [disabled]="page() === 1" class="px-3 py-1 border rounded text-sm disabled:opacity-40">← Prev</button>
            <span class="px-3 py-1 text-sm text-gray-600">Page {{ page() }}</span>
            <button (click)="nextPage()" [disabled]="page() * limit >= total()" class="px-3 py-1 border rounded text-sm disabled:opacity-40">Next →</button>
          </div>
        </div>
      </div>
    }

    @if (!loading() && !cards().length && propertyId) {
      <div class="bg-white rounded-xl border border-gray-100 p-12 text-center">
        <p class="text-4xl mb-3">💳</p>
        <p class="text-gray-600 font-medium">No cards found</p>
        <p class="text-gray-400 text-sm mt-1">Register cards to start managing guest card inventory.</p>
        <button (click)="openRegisterModal()" class="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700">Register Cards</button>
      </div>
    }

    <!-- ── Register Card Modal ───────────────────────────────── -->
    @if (showRegisterModal()) {
      <div class="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
        <div class="bg-white rounded-2xl shadow-2xl w-full max-w-lg">
          <div class="p-6 border-b border-gray-100">
            <h2 class="text-lg font-bold text-gray-900">Register Cards</h2>
            <p class="text-sm text-gray-500 mt-1">Add new RFID/QR cards to inventory</p>
          </div>
          <div class="p-6 space-y-4">
            <!-- Mode toggle -->
            <div class="flex gap-2 bg-gray-100 rounded-lg p-1">
              <button (click)="registerMode.set('single')" class="flex-1 py-2 text-sm rounded-md font-medium transition-all"
                [ngClass]="registerMode() === 'single' ? 'bg-white shadow text-gray-900' : 'text-gray-500'">Single Card</button>
              <button (click)="registerMode.set('bulk')" class="flex-1 py-2 text-sm rounded-md font-medium transition-all"
                [ngClass]="registerMode() === 'bulk' ? 'bg-white shadow text-gray-900' : 'text-gray-500'">Bulk (CSV)</button>
            </div>

            @if (registerMode() === 'single') {
              <div class="space-y-3">
                <div>
                  <label class="text-xs font-medium text-gray-700 block mb-1">Card UID (RFID/QR value)</label>
                  <input [(ngModel)]="newCardUid" placeholder="e.g. A3F2B1C4D5" class="w-full border rounded-lg px-3 py-2 text-sm font-mono">
                </div>
                <div>
                  <label class="text-xs font-medium text-gray-700 block mb-1">Card Number (printed label)</label>
                  <input [(ngModel)]="newCardNumber" placeholder="e.g. CARD-0042" class="w-full border rounded-lg px-3 py-2 text-sm font-mono">
                </div>
              </div>
            } @else {
              <div>
                <label class="text-xs font-medium text-gray-700 block mb-1">CSV: card_uid,card_number (one per line)</label>
                <textarea [(ngModel)]="bulkCsv" rows="8"
                  placeholder="A3F2B1C4,CARD-001&#10;B4C3D2E1,CARD-002&#10;C5D4E3F2,CARD-003"
                  class="w-full border rounded-lg px-3 py-2 text-sm font-mono text-xs resize-none"></textarea>
                <p class="text-xs text-gray-400 mt-1">{{ bulkCsvRows() }} rows detected</p>
              </div>
            }
          </div>
          <div class="p-6 border-t border-gray-100 flex gap-3 justify-end">
            <button (click)="showRegisterModal.set(false)" class="px-4 py-2 border border-gray-300 text-sm rounded-lg hover:bg-gray-50">Cancel</button>
            <button (click)="submitRegister()" [disabled]="saving()"
              class="px-4 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 disabled:opacity-50">
              {{ saving() ? 'Registering...' : 'Register' }}
            </button>
          </div>
        </div>
      </div>
    }

    <!-- ── Report Lost Modal ─────────────────────────────────── -->
    @if (showLostModal() && selectedCard()) {
      <div class="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
        <div class="bg-white rounded-2xl shadow-2xl w-full max-w-md">
          <div class="p-6 border-b border-gray-100">
            <h2 class="text-lg font-bold text-red-600">Report Card Lost</h2>
            <p class="text-sm text-gray-500 mt-1">Card: <span class="font-mono font-semibold">{{ selectedCard()!.card_number }}</span></p>
          </div>
          <div class="p-6 space-y-4">
            <div>
              <label class="text-xs font-medium text-gray-700 block mb-1">Replacement Card UID (optional)</label>
              <input [(ngModel)]="replacementUid" placeholder="Scan or type replacement card UID"
                class="w-full border rounded-lg px-3 py-2 text-sm font-mono">
              <p class="text-xs text-gray-400 mt-1">If provided, a replacement card will be issued to the same booking.</p>
            </div>
            <div>
              <label class="text-xs font-medium text-gray-700 block mb-1">Notes</label>
              <textarea [(ngModel)]="lostNotes" rows="3" placeholder="Where was it lost? Any context..."
                class="w-full border rounded-lg px-3 py-2 text-sm resize-none"></textarea>
            </div>
          </div>
          <div class="p-6 border-t border-gray-100 flex gap-3 justify-end">
            <button (click)="showLostModal.set(false)" class="px-4 py-2 border border-gray-300 text-sm rounded-lg hover:bg-gray-50">Cancel</button>
            <button (click)="submitReportLost()" [disabled]="saving()"
              class="px-4 py-2 bg-red-600 text-white text-sm rounded-lg hover:bg-red-700 disabled:opacity-50">
              {{ saving() ? 'Reporting...' : 'Report Lost' }}
            </button>
          </div>
        </div>
      </div>
    }
  `,
})
export class GuestCardsPage implements OnInit {
  private api     = inject(ApiService);
  private toast   = inject(ToastService);
  private confirm = inject(ConfirmDialogService);
  readonly activeProperty = inject(ActivePropertyService);

  cards    = signal<any[]>([]);
  total    = signal(0);
  loading  = signal(false);
  saving   = signal(false);
  report   = signal<any>(null);
  page     = signal(1);
  limit    = 30;

  propertyId   = '';
  statusFilter = '';

  // Register modal
  showRegisterModal = signal(false);
  registerMode      = signal<'single' | 'bulk'>('single');
  newCardUid        = '';
  newCardNumber     = '';
  bulkCsv           = '';

  // Lost modal
  showLostModal  = signal(false);
  selectedCard   = signal<any>(null);
  replacementUid = '';
  lostNotes      = '';

  bulkCsvRows = computed(() => {
    return this.bulkCsv.trim().split('\n').filter(l => l.trim()).length;
  });

  summaryTiles = computed(() => {
    const r = this.report();
    if (!r) return [];
    return [
      { label: 'Total Cards',    value: r.total,       color: '#374151' },
      { label: 'Available',      value: r.available,   color: '#6b7280' },
      { label: 'In Use',         value: r.in_use,      color: '#22c55e' },
      { label: 'Deactivated',    value: r.deactivated, color: '#f59e0b' },
      { label: 'Lost',           value: r.lost,        color: '#ef4444' },
    ];
  });

  ngOnInit(): void {
    this.propertyId = this.activeProperty.propertyId();
    if (this.propertyId) this.load();
  }

  load(): void {
    if (!this.propertyId) return;
    this.loading.set(true);
    const params = `?property_id=${this.propertyId}&status=${this.statusFilter}&page=${this.page()}&limit=${this.limit}`;
    this.api.get(`/cards${params}`).subscribe({
      next: (r: any) => {
        this.cards.set(r.data?.items ?? []);
        this.total.set(r.data?.total ?? 0);
        this.loading.set(false);
      },
      error: () => this.loading.set(false),
    });
    this.loadReport();
  }

  loadReport(): void {
    this.api.get(`/card-inventory/report?property_id=${this.propertyId}`).subscribe({
      next: (r: any) => this.report.set(r.data),
    });
  }

  prevPage(): void { if (this.page() > 1) { this.page.update(p => p - 1); this.load(); } }
  nextPage(): void { this.page.update(p => p + 1); this.load(); }

  openRegisterModal(): void {
    this.newCardUid = ''; this.newCardNumber = ''; this.bulkCsv = '';
    this.registerMode.set('single');
    this.showRegisterModal.set(true);
  }

  submitRegister(): void {
    if (!this.propertyId) { this.toast.error('Select a property first'); return; }
    this.saving.set(true);

    if (this.registerMode() === 'single') {
      if (!this.newCardUid || !this.newCardNumber) { this.toast.error('Card UID and Number required'); this.saving.set(false); return; }
      this.api.post('/card-inventory/register', {
        property_id: this.propertyId,
        card_uid: this.newCardUid,
        card_number: this.newCardNumber,
      }).subscribe({
        next: () => { this.toast.success('Card registered'); this.showRegisterModal.set(false); this.saving.set(false); this.load(); },
        error: (e: any) => { this.toast.error(e?.error?.message ?? 'Failed to register'); this.saving.set(false); },
      });
    } else {
      const lines = this.bulkCsv.trim().split('\n').filter(l => l.trim());
      const cards = lines.map(l => {
        const [uid, num] = l.split(',').map(s => s.trim());
        return { card_uid: uid, card_number: num };
      }).filter(c => c.card_uid && c.card_number);

      if (!cards.length) { this.toast.error('No valid rows found'); this.saving.set(false); return; }

      this.api.post('/card-inventory/register-bulk', { property_id: this.propertyId, cards }).subscribe({
        next: (r: any) => {
          this.toast.success(`Registered ${r.data.registered_count} cards, skipped ${r.data.skipped_count}`);
          this.showRegisterModal.set(false); this.saving.set(false); this.load();
        },
        error: (e: any) => { this.toast.error(e?.error?.message ?? 'Bulk registration failed'); this.saving.set(false); },
      });
    }
  }

  viewCard(card: any): void {
    // Navigate to card detail
    window.location.href = `/guest-cards/${card.id}`;
  }

  openReportLost(card: any): void {
    this.selectedCard.set(card);
    this.replacementUid = '';
    this.lostNotes = '';
    this.showLostModal.set(true);
  }

  submitReportLost(): void {
    const card = this.selectedCard();
    if (!card) return;
    this.saving.set(true);
    this.api.post(`/cards/${card.id}/report-lost`, {
      replace_with_uid: this.replacementUid || null,
      notes: this.lostNotes || null,
    }).subscribe({
      next: () => { this.toast.success('Card marked as lost'); this.showLostModal.set(false); this.saving.set(false); this.load(); },
      error: (e: any) => { this.toast.error(e?.error?.message ?? 'Failed'); this.saving.set(false); },
    });
  }

  confirmDeactivate(card: any): void {
    this.confirm.confirm({
      title: 'Deactivate Card',
      message: `Deactivate card ${card.card_number}? The guest will lose access immediately.`,
      confirmLabel: 'Deactivate',
      variant: 'danger',
    }).then(confirmed => {
      if (!confirmed) return;
      this.api.post(`/cards/${card.id}/deactivate`, { reason: 'manual' }).subscribe({
        next: () => { this.toast.success('Card deactivated'); this.load(); },
        error: (e: any) => this.toast.error(e?.error?.message ?? 'Failed'),
      });
    });
  }
}

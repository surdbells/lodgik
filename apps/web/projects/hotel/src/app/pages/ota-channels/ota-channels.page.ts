import {
  Component, inject, OnInit, signal, computed, OnDestroy,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { DecimalPipe, DatePipe } from '@angular/common';
import {
  ApiService, PageHeaderComponent, LoadingSpinnerComponent,
  ToastService, StatsCardComponent, BadgeComponent, EmptyStateComponent,
} from '@lodgik/shared';
import { ActivePropertyService } from '@lodgik/shared';
import { BarChartComponent, ChartDataPoint } from '@lodgik/charts';
import { Subscription } from 'rxjs';

interface OtaChannel {
  id: string;
  property_id: string;
  channel_name: string;
  display_name: string;
  commission_percentage: string;
  sync_status: string;
  last_sync_at: string | null;
  is_active: boolean;
  room_type_mapping: Record<string, string> | null;
  rate_plan_mapping: Record<string, string> | null;
}

interface OtaReservation {
  id: string;
  channel_id: string;
  channel_name: string;
  external_id: string;
  booking_id: string | null;
  guest_name: string;
  check_in: string;
  check_out: string;
  amount: string;
  commission: string | null;
  sync_status: string;
}

interface RoomType { id: string; name: string; }

const CHANNEL_OPTIONS = [
  { value: 'booking_com',    label: 'Booking.com' },
  { value: 'expedia',        label: 'Expedia' },
  { value: 'agoda',          label: 'Agoda' },
  { value: 'airbnb',         label: 'Airbnb' },
  { value: 'jumia_travel',   label: 'Jumia Travel' },
  { value: 'hotels_ng',      label: 'Hotels.ng' },
  { value: 'tripadvisor',    label: 'TripAdvisor' },
  { value: 'direct',         label: 'Direct / Website' },
];

@Component({
  selector: 'app-ota-channels',
  standalone: true,
  imports: [
    FormsModule, DecimalPipe, DatePipe,
    PageHeaderComponent, LoadingSpinnerComponent, StatsCardComponent,
    BadgeComponent, EmptyStateComponent, BarChartComponent,
  ],
  template: `
    <ui-page-header
      title="OTA Channel Manager"
      icon="globe"
      subtitle="Manage Booking.com, Expedia, and other distribution channels">
      <button (click)="openAddModal()"
        class="px-4 py-2 bg-sage-600 text-white text-sm font-medium rounded-lg hover:bg-sage-700 transition-colors">
        + Connect Channel
      </button>
    </ui-page-header>

    <ui-loading [loading]="loading()"></ui-loading>

    @if (!loading()) {
      <!-- Stats row -->
      <div class="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
        <ui-stats-card label="Total OTA Revenue" [value]="'₦' + (revenue().total_revenue | number:'1.0-0')" icon="banknote"></ui-stats-card>
        <ui-stats-card label="Total Bookings" [value]="revenue().total_bookings ?? 0" icon="calendar-check"></ui-stats-card>
        <ui-stats-card label="Active Channels" [value]="activeChannelCount()" icon="wifi"></ui-stats-card>
        <ui-stats-card label="Pending Reservations" [value]="pendingCount()" icon="clock"></ui-stats-card>
      </div>

      <!-- Revenue bar chart -->
      @if (channelRevData().length) {
        <div class="bg-white rounded-xl border border-gray-100 shadow-card p-5 mb-6">
          <h3 class="text-sm font-semibold text-gray-700 mb-4">Revenue by Channel (Year to date)</h3>
          <chart-bar [data]="channelRevData()" [height]="200" [showValues]="true"></chart-bar>
        </div>
      }

      <!-- Tabs -->
      <div class="flex gap-1 mb-5 border-b border-gray-200">
        @for (t of tabs; track t.key) {
          <button (click)="tab.set(t.key)"
            class="px-4 py-2 text-sm font-medium border-b-2 transition-colors"
            [class.border-sage-600]="tab() === t.key"
            [class.text-sage-700]="tab() === t.key"
            [class.border-transparent]="tab() !== t.key"
            [class.text-gray-500]="tab() !== t.key">
            {{ t.label }}
            @if (t.key === 'reservations' && pendingCount() > 0) {
              <span class="ml-1.5 px-1.5 py-0.5 bg-amber-100 text-amber-700 text-xs rounded-full font-bold">{{ pendingCount() }}</span>
            }
          </button>
        }
      </div>

      <!-- Channels tab -->
      @if (tab() === 'channels') {
        @if (channels().length === 0) {
          <ui-empty-state
            icon="globe"
            title="No channels connected"
            description="Connect your first OTA channel to start distributing your inventory">
          </ui-empty-state>
        } @else {
          <div class="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            @for (c of channels(); track c.id) {
              <div class="bg-white rounded-xl border border-gray-100 shadow-card p-5">
                <!-- Header -->
                <div class="flex items-start justify-between mb-3">
                  <div>
                    <p class="text-base font-bold text-gray-900">{{ c.display_name }}</p>
                    <p class="text-xs text-gray-400 mt-0.5 capitalize">{{ c.channel_name.replace('_',' ') }}</p>
                    <p class="text-xs text-gray-500 mt-0.5">{{ c.commission_percentage }}% commission</p>
                  </div>
                  <span class="px-2 py-0.5 rounded-full text-xs font-medium" [class]="syncClass(c.sync_status)">
                    {{ c.sync_status }}
                  </span>
                </div>

                <p class="text-xs text-gray-400 mb-4">
                  Last sync: {{ c.last_sync_at ? (c.last_sync_at | date:'dd MMM yyyy HH:mm') : 'Never' }}
                </p>

                <!-- Room type mapping summary -->
                @if (c.room_type_mapping && objectKeys(c.room_type_mapping).length > 0) {
                  <p class="text-xs text-sage-600 mb-3">
                    {{ objectKeys(c.room_type_mapping).length }} room type(s) mapped
                  </p>
                }

                <!-- Actions -->
                <div class="flex flex-wrap gap-2">
                  @if (c.sync_status !== 'active') {
                    <button (click)="activate(c.id)"
                      class="px-3 py-1.5 bg-emerald-600 text-white text-xs rounded-lg hover:bg-emerald-700 transition-colors">
                      Activate
                    </button>
                  }
                  @if (c.sync_status === 'active') {
                    <button (click)="pause(c.id)"
                      class="px-3 py-1.5 bg-amber-500 text-white text-xs rounded-lg hover:bg-amber-600 transition-colors">
                      Pause
                    </button>
                  }
                  <button (click)="openMappingModal(c)"
                    class="px-3 py-1.5 bg-blue-50 text-blue-700 text-xs rounded-lg hover:bg-blue-100 transition-colors">
                    Mapping
                  </button>
                  <button (click)="sync(c.id)"
                    class="px-3 py-1.5 bg-sage-50 text-sage-700 text-xs rounded-lg hover:bg-sage-100 transition-colors">
                    Sync
                  </button>
                  <button (click)="confirmDisconnect(c)"
                    class="px-3 py-1.5 bg-gray-100 text-gray-600 text-xs rounded-lg hover:bg-red-50 hover:text-red-600 transition-colors">
                    Disconnect
                  </button>
                </div>
              </div>
            }
          </div>
        }
      }

      <!-- Reservations tab -->
      @if (tab() === 'reservations') {
        <!-- Filters -->
        <div class="flex flex-wrap gap-3 mb-4">
          <select [(ngModel)]="filterChannel" (ngModelChange)="applyFilters()"
            class="px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white">
            <option value="">All Channels</option>
            @for (c of channels(); track c.id) {
              <option [value]="c.id">{{ c.display_name }}</option>
            }
          </select>
          <select [(ngModel)]="filterStatus" (ngModelChange)="applyFilters()"
            class="px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white">
            <option value="">All Statuses</option>
            <option value="pending">Pending</option>
            <option value="confirmed">Confirmed</option>
            <option value="cancelled">Cancelled</option>
          </select>
          <button (click)="openIngestModal()"
            class="px-4 py-2 border border-sage-300 text-sage-700 text-sm rounded-lg hover:bg-sage-50 transition-colors">
            + Manual Entry
          </button>
        </div>

        <div class="bg-white rounded-xl border border-gray-100 shadow-card overflow-hidden">
          <div class="overflow-x-auto">
            <table class="w-full text-sm">
              <thead class="bg-gray-50">
                <tr>
                  @for (h of ['Channel','External ID','Guest','Dates','Amount','Commission','Status','Actions']; track h) {
                    <th class="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">{{ h }}</th>
                  }
                </tr>
              </thead>
              <tbody>
                @for (r of filteredReservations(); track r.id) {
                  <tr class="border-t border-gray-50 hover:bg-gray-50 transition-colors">
                    <td class="px-4 py-3 font-medium capitalize">{{ r.channel_name.replace('_',' ') }}</td>
                    <td class="px-4 py-3 font-mono text-xs text-gray-500">{{ r.external_id }}</td>
                    <td class="px-4 py-3">{{ r.guest_name }}</td>
                    <td class="px-4 py-3 text-gray-500 text-xs">
                      {{ r.check_in | date:'dd MMM' }} → {{ r.check_out | date:'dd MMM yyyy' }}
                    </td>
                    <td class="px-4 py-3 font-medium">₦{{ +r.amount | number:'1.0-0' }}</td>
                    <td class="px-4 py-3 text-gray-500">
                      @if (r.commission) { ₦{{ +r.commission | number:'1.0-0' }} }
                      @else { — }
                    </td>
                    <td class="px-4 py-3">
                      <span class="px-2 py-0.5 rounded-full text-xs font-medium" [class]="rStatClass(r.sync_status)">
                        {{ r.sync_status }}
                      </span>
                    </td>
                    <td class="px-4 py-3">
                      @if (r.sync_status === 'pending') {
                        <div class="flex gap-1.5">
                          <button (click)="confirmRes(r.id)"
                            class="px-2.5 py-1 bg-emerald-600 text-white text-xs rounded-lg hover:bg-emerald-700 transition-colors">
                            Confirm
                          </button>
                          <button (click)="cancelRes(r.id)"
                            class="px-2.5 py-1 bg-red-500 text-white text-xs rounded-lg hover:bg-red-600 transition-colors">
                            Cancel
                          </button>
                        </div>
                      }
                    </td>
                  </tr>
                } @empty {
                  <tr>
                    <td colspan="8" class="px-4 py-10 text-center text-gray-400">
                      No reservations match your filters
                    </td>
                  </tr>
                }
              </tbody>
            </table>
          </div>
        </div>
      }
    }

    <!-- ── ADD CHANNEL MODAL ─────────────────────────────────── -->
    @if (showAdd()) {
      <div class="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4" (click)="closeAdd()">
        <div class="bg-white rounded-2xl shadow-xl w-full max-w-lg p-6" (click)="$event.stopPropagation()">
          <h2 class="text-lg font-bold text-gray-900 mb-5">Connect OTA Channel</h2>

          <div class="space-y-4">
            <div>
              <label class="block text-xs font-semibold text-gray-600 mb-1.5">Channel *</label>
              <select [(ngModel)]="addForm.channel_name"
                class="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-sage-400 focus:border-sage-400 outline-none">
                @for (opt of channelOptions; track opt.value) {
                  <option [value]="opt.value">{{ opt.label }}</option>
                }
              </select>
            </div>

            <div>
              <label class="block text-xs font-semibold text-gray-600 mb-1.5">Display Name *</label>
              <input [(ngModel)]="addForm.display_name"
                placeholder="e.g. Booking.com — Grand Hotel"
                class="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-sage-400 outline-none">
            </div>

            <div>
              <label class="block text-xs font-semibold text-gray-600 mb-1.5">Commission % *</label>
              <input type="number" min="0" max="100" step="0.5" [(ngModel)]="addForm.commission_percentage"
                placeholder="15"
                class="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-sage-400 outline-none">
            </div>

            <div>
              <label class="block text-xs font-semibold text-gray-600 mb-1.5">API Key / Hotel ID</label>
              <input [(ngModel)]="addForm.api_key"
                placeholder="Channel-provided API key or hotel ID"
                class="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-sage-400 outline-none">
              <p class="text-xs text-gray-400 mt-1">Optional — used for automated sync when integration is configured.</p>
            </div>
          </div>

          <div class="flex gap-3 mt-6">
            <button (click)="createChannel()" [disabled]="saving()"
              class="flex-1 py-2.5 bg-sage-600 text-white text-sm font-medium rounded-lg hover:bg-sage-700 disabled:opacity-50 transition-colors">
              @if (saving()) { Connecting… } @else { Connect Channel }
            </button>
            <button (click)="closeAdd()"
              class="px-5 py-2.5 border border-gray-200 text-sm text-gray-600 rounded-lg hover:bg-gray-50 transition-colors">
              Cancel
            </button>
          </div>
        </div>
      </div>
    }

    <!-- ── ROOM TYPE MAPPING MODAL ──────────────────────────── -->
    @if (mappingChannel()) {
      <div class="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4" (click)="closeMappingModal()">
        <div class="bg-white rounded-2xl shadow-xl w-full max-w-2xl p-6 max-h-[90vh] overflow-y-auto" (click)="$event.stopPropagation()">
          <h2 class="text-lg font-bold text-gray-900 mb-1">Room Type Mapping</h2>
          <p class="text-sm text-gray-500 mb-5">
            Map your room types to {{ mappingChannel()!.display_name }} IDs
          </p>

          @if (loadingRoomTypes()) {
            <div class="py-6 text-center text-gray-400 text-sm">Loading room types…</div>
          } @else {
            <div class="space-y-3 mb-5">
              @for (rt of roomTypes(); track rt.id) {
                <div class="flex items-center gap-3">
                  <span class="w-48 text-sm text-gray-700 font-medium truncate">{{ rt.name }}</span>
                  <input
                    [ngModel]="mappingForm[rt.id] ?? ''"
                    (ngModelChange)="mappingForm[rt.id] = $event"
                    placeholder="{{ mappingChannel()!.channel_name }} room type ID"
                    class="flex-1 px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-sage-400 outline-none">
                </div>
              } @empty {
                <p class="text-sm text-gray-400 text-center py-4">No room types found for this property.</p>
              }
            </div>

            <div class="border-t border-gray-100 pt-4 mt-2">
              <h3 class="text-sm font-semibold text-gray-700 mb-3">Rate Plan Mapping</h3>
              <div class="space-y-3 mb-5">
                @for (plan of defaultRatePlans; track plan.key) {
                  <div class="flex items-center gap-3">
                    <span class="w-48 text-sm text-gray-700 font-medium">{{ plan.label }}</span>
                    <input
                      [ngModel]="rateMappingForm[plan.key] ?? ''"
                      (ngModelChange)="rateMappingForm[plan.key] = $event"
                      placeholder="{{ mappingChannel()!.channel_name }} rate plan ID"
                      class="flex-1 px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-sage-400 outline-none">
                  </div>
                }
              </div>
            </div>
          }

          <div class="flex gap-3">
            <button (click)="saveMapping()" [disabled]="saving()"
              class="flex-1 py-2.5 bg-sage-600 text-white text-sm font-medium rounded-lg hover:bg-sage-700 disabled:opacity-50 transition-colors">
              @if (saving()) { Saving… } @else { Save Mapping }
            </button>
            <button (click)="closeMappingModal()"
              class="px-5 py-2.5 border border-gray-200 text-sm text-gray-600 rounded-lg hover:bg-gray-50 transition-colors">
              Cancel
            </button>
          </div>
        </div>
      </div>
    }

    <!-- ── MANUAL RESERVATION INGEST MODAL ─────────────────── -->
    @if (showIngest()) {
      <div class="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4" (click)="showIngest.set(false)">
        <div class="bg-white rounded-2xl shadow-xl w-full max-w-lg p-6" (click)="$event.stopPropagation()">
          <h2 class="text-lg font-bold text-gray-900 mb-5">Add Manual OTA Reservation</h2>

          <div class="space-y-4">
            <div>
              <label class="block text-xs font-semibold text-gray-600 mb-1.5">Channel *</label>
              <select [(ngModel)]="ingestForm.channel_id"
                class="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-sage-400 outline-none">
                <option value="">Select channel</option>
                @for (c of channels(); track c.id) {
                  <option [value]="c.id">{{ c.display_name }}</option>
                }
              </select>
            </div>
            <div class="grid grid-cols-2 gap-3">
              <div>
                <label class="block text-xs font-semibold text-gray-600 mb-1.5">External Booking ID *</label>
                <input [(ngModel)]="ingestForm.external_id" placeholder="OTA reference"
                  class="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-sage-400 outline-none">
              </div>
              <div>
                <label class="block text-xs font-semibold text-gray-600 mb-1.5">Guest Name *</label>
                <input [(ngModel)]="ingestForm.guest_name" placeholder="John Doe"
                  class="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-sage-400 outline-none">
              </div>
              <div>
                <label class="block text-xs font-semibold text-gray-600 mb-1.5">Check-in *</label>
                <input type="date" [(ngModel)]="ingestForm.check_in"
                  class="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-sage-400 outline-none">
              </div>
              <div>
                <label class="block text-xs font-semibold text-gray-600 mb-1.5">Check-out *</label>
                <input type="date" [(ngModel)]="ingestForm.check_out"
                  class="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-sage-400 outline-none">
              </div>
              <div>
                <label class="block text-xs font-semibold text-gray-600 mb-1.5">Amount (₦)</label>
                <input type="number" min="0" [(ngModel)]="ingestForm.amount" placeholder="50000"
                  class="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-sage-400 outline-none">
              </div>
              <div>
                <label class="block text-xs font-semibold text-gray-600 mb-1.5">Commission (₦)</label>
                <input type="number" min="0" [(ngModel)]="ingestForm.commission" placeholder="7500"
                  class="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-sage-400 outline-none">
              </div>
            </div>
          </div>

          <div class="flex gap-3 mt-6">
            <button (click)="submitIngest()" [disabled]="saving()"
              class="flex-1 py-2.5 bg-sage-600 text-white text-sm font-medium rounded-lg hover:bg-sage-700 disabled:opacity-50 transition-colors">
              @if (saving()) { Adding… } @else { Add Reservation }
            </button>
            <button (click)="showIngest.set(false)"
              class="px-5 py-2.5 border border-gray-200 text-sm text-gray-600 rounded-lg hover:bg-gray-50 transition-colors">
              Cancel
            </button>
          </div>
        </div>
      </div>
    }
  `,
})
export default class OtaChannelsPage implements OnInit, OnDestroy {
  private api      = inject(ApiService);
  private toast    = inject(ToastService);
  private propSvc  = inject(ActivePropertyService);
  private sub!: Subscription;

  // ── state ────────────────────────────────────────────────────
  loading          = signal(true);
  saving           = signal(false);
  loadingRoomTypes = signal(false);
  channels         = signal<OtaChannel[]>([]);
  reservations     = signal<OtaReservation[]>([]);
  revenue          = signal<any>({ total_revenue: 0, total_bookings: 0, by_channel: [] });
  roomTypes        = signal<RoomType[]>([]);
  tab              = signal<string>('channels');
  showAdd          = signal(false);
  showIngest       = signal(false);
  mappingChannel   = signal<OtaChannel | null>(null);

  // ── filters ──────────────────────────────────────────────────
  filterChannel = '';
  filterStatus  = '';

  // ── forms ────────────────────────────────────────────────────
  addForm: any = { channel_name: 'booking_com', display_name: '', commission_percentage: 15, api_key: '' };
  ingestForm: any = { channel_id: '', external_id: '', guest_name: '', check_in: '', check_out: '', amount: '', commission: '' };
  mappingForm: Record<string, string>     = {};
  rateMappingForm: Record<string, string> = {};

  // ── computed ─────────────────────────────────────────────────
  activeChannelCount = computed(() => this.channels().filter(c => c.sync_status === 'active').length);
  pendingCount       = computed(() => this.reservations().filter(r => r.sync_status === 'pending').length);
  channelRevData     = computed<ChartDataPoint[]>(() =>
    (this.revenue().by_channel || []).map((c: any) => ({ label: c.channel_name.replace('_', ' '), value: c.revenue }))
  );
  filteredReservations = computed(() => {
    let list = this.reservations();
    if (this.filterChannel) list = list.filter(r => r.channel_id === this.filterChannel);
    if (this.filterStatus)  list = list.filter(r => r.sync_status === this.filterStatus);
    return list;
  });

  // ── constants ────────────────────────────────────────────────
  readonly tabs = [
    { key: 'channels',     label: 'Channels' },
    { key: 'reservations', label: 'Reservations' },
  ];
  readonly channelOptions = CHANNEL_OPTIONS;
  readonly defaultRatePlans = [
    { key: 'standard',    label: 'Standard Rate' },
    { key: 'advance',     label: 'Early Bird / Advance' },
    { key: 'non_refund',  label: 'Non-Refundable' },
    { key: 'breakfast',   label: 'Bed & Breakfast' },
    { key: 'all_incl',    label: 'All Inclusive' },
  ];

  readonly objectKeys = Object.keys;

  ngOnInit(): void {
    this.load();
    this.sub = this.propSvc.propertySwitched$.subscribe(() => this.load());
  }

  ngOnDestroy(): void { this.sub?.unsubscribe(); }

  private load(): void {
    const pid = this.propSvc.propertyId();
    this.loading.set(true);
    let done = 0;
    const finish = () => { if (++done === 3) this.loading.set(false); };

    this.api.get('/ota/channels', { property_id: pid }).subscribe({
      next: (r: any) => { this.channels.set(r?.data || []); finish(); },
      error: () => { this.toast.error('Failed to load channels'); finish(); },
    });
    this.api.get('/ota/reservations').subscribe({
      next: (r: any) => { this.reservations.set(r?.data || []); finish(); },
      error: () => finish(),
    });
    this.api.get('/ota/revenue').subscribe({
      next: (r: any) => { this.revenue.set(r?.data || { total_revenue: 0, total_bookings: 0, by_channel: [] }); finish(); },
      error: () => finish(),
    });
  }

  // ── channel actions ──────────────────────────────────────────
  openAddModal(): void {
    this.addForm = { channel_name: 'booking_com', display_name: '', commission_percentage: 15, api_key: '' };
    this.showAdd.set(true);
  }

  closeAdd(): void { this.showAdd.set(false); }

  createChannel(): void {
    if (!this.addForm.display_name?.trim()) { this.toast.error('Display name is required'); return; }
    if (!this.addForm.commission_percentage && this.addForm.commission_percentage !== 0) {
      this.toast.error('Commission % is required'); return;
    }
    this.saving.set(true);
    const payload = {
      property_id:            this.propSvc.propertyId(),
      channel_name:           this.addForm.channel_name,
      display_name:           this.addForm.display_name.trim(),
      commission_percentage:  this.addForm.commission_percentage,
      credentials:            this.addForm.api_key ? { api_key: this.addForm.api_key } : null,
    };
    this.api.post('/ota/channels', payload).subscribe({
      next: (r: any) => {
        this.saving.set(false);
        if (r?.success) { this.toast.success('Channel connected'); this.closeAdd(); this.load(); }
        else this.toast.error(r?.message || 'Failed to connect channel');
      },
      error: (e: any) => { this.saving.set(false); this.toast.error(e?.error?.message || 'Failed to connect channel'); },
    });
  }

  activate(id: string): void {
    this.api.post(`/ota/channels/${id}/activate`, {}).subscribe({
      next: (r: any) => { if (r?.success) { this.toast.success('Channel activated'); this.load(); } },
      error: () => this.toast.error('Failed to activate channel'),
    });
  }

  pause(id: string): void {
    this.api.post(`/ota/channels/${id}/pause`, {}).subscribe({
      next: (r: any) => { if (r?.success) { this.toast.success('Channel paused'); this.load(); } },
      error: () => this.toast.error('Failed to pause channel'),
    });
  }

  sync(id: string): void {
    this.toast.success('Sync triggered');
    this.api.post(`/ota/channels/${id}/sync`, {}).subscribe({
      next: () => this.load(),
      error: () => this.toast.error('Sync failed'),
    });
  }

  confirmDisconnect(c: OtaChannel): void {
    if (!confirm(`Disconnect "${c.display_name}"? This will remove all sync settings.`)) return;
    this.api.post(`/ota/channels/${c.id}/disconnect`, {}).subscribe({
      next: (r: any) => { if (r?.success) { this.toast.success('Channel disconnected'); this.load(); } },
      error: () => this.toast.error('Failed to disconnect channel'),
    });
  }

  // ── room type mapping ────────────────────────────────────────
  openMappingModal(c: OtaChannel): void {
    this.mappingChannel.set(c);
    this.mappingForm     = { ...(c.room_type_mapping     || {}) };
    this.rateMappingForm = { ...(c.rate_plan_mapping     || {}) };
    this.loadRoomTypes();
  }

  closeMappingModal(): void { this.mappingChannel.set(null); }

  private loadRoomTypes(): void {
    this.loadingRoomTypes.set(true);
    this.api.get('/room-types', { property_id: this.propSvc.propertyId() }).subscribe({
      next: (r: any) => { this.roomTypes.set(r?.data || []); this.loadingRoomTypes.set(false); },
      error: () => { this.loadingRoomTypes.set(false); },
    });
  }

  saveMapping(): void {
    const c = this.mappingChannel();
    if (!c) return;
    this.saving.set(true);
    this.api.put(`/ota/channels/${c.id}`, {
      room_type_mapping: this.mappingForm,
      rate_plan_mapping: this.rateMappingForm,
    }).subscribe({
      next: (r: any) => {
        this.saving.set(false);
        if (r?.success) { this.toast.success('Mapping saved'); this.closeMappingModal(); this.load(); }
        else this.toast.error(r?.message || 'Failed to save mapping');
      },
      error: (e: any) => { this.saving.set(false); this.toast.error(e?.error?.message || 'Failed to save mapping'); },
    });
  }

  // ── reservations ─────────────────────────────────────────────
  applyFilters(): void { /* Reactive via computed signal */ }

  openIngestModal(): void {
    this.ingestForm = { channel_id: '', external_id: '', guest_name: '', check_in: '', check_out: '', amount: '', commission: '' };
    this.showIngest.set(true);
  }

  submitIngest(): void {
    const f = this.ingestForm;
    if (!f.channel_id || !f.external_id || !f.guest_name || !f.check_in || !f.check_out) {
      this.toast.error('Please fill in all required fields'); return;
    }
    const selected = this.channels().find(c => c.id === f.channel_id);
    if (!selected) { this.toast.error('Select a channel'); return; }
    this.saving.set(true);
    this.api.post('/ota/reservations', {
      channel_id:   f.channel_id,
      channel_name: selected.channel_name,
      external_id:  f.external_id,
      guest_name:   f.guest_name,
      check_in:     f.check_in,
      check_out:    f.check_out,
      amount:       f.amount || '0',
      commission:   f.commission || null,
    }).subscribe({
      next: (r: any) => {
        this.saving.set(false);
        if (r?.success) { this.toast.success('Reservation added'); this.showIngest.set(false); this.load(); }
        else this.toast.error(r?.message || 'Failed to add reservation');
      },
      error: (e: any) => { this.saving.set(false); this.toast.error(e?.error?.message || 'Failed to add reservation'); },
    });
  }

  confirmRes(id: string): void {
    this.api.post(`/ota/reservations/${id}/confirm`, {}).subscribe({
      next: (r: any) => { if (r?.success) { this.toast.success('Reservation confirmed'); this.load(); } else this.toast.error(r?.message || 'Failed'); },
      error: () => this.toast.error('Failed to confirm reservation'),
    });
  }

  cancelRes(id: string): void {
    if (!confirm('Cancel this OTA reservation?')) return;
    this.api.post(`/ota/reservations/${id}/cancel`, {}).subscribe({
      next: (r: any) => { if (r?.success) { this.toast.success('Reservation cancelled'); this.load(); } else this.toast.error(r?.message || 'Failed'); },
      error: () => this.toast.error('Failed to cancel reservation'),
    });
  }

  // ── helpers ──────────────────────────────────────────────────
  syncClass(s: string): string {
    return ({
      active:       'bg-emerald-100 text-emerald-700',
      paused:       'bg-amber-100 text-amber-700',
      disconnected: 'bg-gray-100 text-gray-500',
      error:        'bg-red-100 text-red-700',
    } as any)[s] ?? 'bg-gray-100 text-gray-500';
  }

  rStatClass(s: string): string {
    return ({
      pending:   'bg-amber-100 text-amber-700',
      confirmed: 'bg-emerald-100 text-emerald-700',
      cancelled: 'bg-red-100 text-red-700',
    } as any)[s] ?? 'bg-gray-100 text-gray-500';
  }
}

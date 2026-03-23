import { PAGE_TOURS } from '../../services/page-tours';
import { Component, inject, OnInit, OnDestroy, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { TitleCasePipe } from '@angular/common';
import { ApiService, PageHeaderComponent, StatsCardComponent, AuthService, ActivePropertyService, ToastService , TourService} from '@lodgik/shared';

@Component({
  selector: 'app-security',
  standalone: true,
  imports: [FormsModule, TitleCasePipe, PageHeaderComponent, StatsCardComponent],
  template: `
    <ui-page-header title="Security & Gate Pass" icon="shield" [breadcrumbs]="['Operations', 'Security']"
      subtitle="Visitor management, gate passes, and guest movement tracking"
      tourKey="security" (tourClick)="startTour()">
      <div class="flex gap-2">
        @if (activeTab === 'passes') {
          <button (click)="openCreatePass()" class="px-4 py-2 bg-sage-600 text-white text-sm font-medium rounded-lg hover:bg-sage-700">+ Gate Pass</button>
        }
        @if (activeTab === 'movements') {
          <button (click)="openRecordMovement()" class="px-4 py-2 bg-sage-600 text-white text-sm font-medium rounded-lg hover:bg-sage-700">+ Record Movement</button>
        }
        @if (activeTab === 'codes') {
          <button (click)="openCreateCode()" class="px-4 py-2 bg-sage-600 text-white text-sm font-medium rounded-lg hover:bg-sage-700">+ Visitor Code</button>
        }
        @if (activeTab === 'gate_card') {
          <span class="text-xs text-gray-400">Search card by number, UID, or type to filter</span>
        }
        @if (activeTab === 'exit') {
          <span class="text-xs text-amber-600 bg-amber-50 px-3 py-1.5 rounded-lg">Scan card or enter card number/UID to process exit</span>
        }
      </div>
    </ui-page-header>

    <!-- ── Create Gate Pass Modal ─────────────────────────── -->
    @if (showPassForm) {
      <div class="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50" (click)="showPassForm = false">
        <div class="bg-white rounded-2xl shadow-2xl w-full max-w-lg p-6" (click)="$event.stopPropagation()">
          <div class="flex justify-between items-center mb-4">
            <h3 class="text-base font-semibold text-gray-800">Create Gate Pass</h3>
            <button (click)="showPassForm = false" class="text-gray-400 hover:text-gray-600 text-xl">&times;</button>
          </div>
          <div class="grid grid-cols-2 gap-3">
            <div>
              <label class="text-xs font-medium text-gray-500 mb-1 block">Visitor Name *</label>
              <input [(ngModel)]="passForm.person_name" placeholder="Full name" class="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm bg-gray-50">
            </div>
            <div>
              <label class="text-xs font-medium text-gray-500 mb-1 block">Phone</label>
              <input [(ngModel)]="passForm.person_phone" placeholder="Phone number" class="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm bg-gray-50">
            </div>
            <div>
              <label class="text-xs font-medium text-gray-500 mb-1 block">Pass Type</label>
              <select [(ngModel)]="passForm.pass_type" class="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm bg-gray-50">
                <option value="visitor">Visitor</option>
                <option value="delivery">Delivery</option>
                <option value="contractor">Contractor</option>
                <option value="emergency">Emergency</option>
              </select>
            </div>
            <div>
              <label class="text-xs font-medium text-gray-500 mb-1 block">Guest Name / Room</label>
              <input [(ngModel)]="passForm.guest_name" placeholder="Who are they visiting?" class="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm bg-gray-50">
            </div>
            <div>
              <label class="text-xs font-medium text-gray-500 mb-1 block">Room Number</label>
              <input [(ngModel)]="passForm.room_number" placeholder="e.g. 204" class="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm bg-gray-50">
            </div>
            <div>
              <label class="text-xs font-medium text-gray-500 mb-1 block">Expected Arrival</label>
              <input type="datetime-local" [(ngModel)]="passForm.expected_at" class="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm bg-gray-50">
            </div>
            <div class="col-span-2">
              <label class="text-xs font-medium text-gray-500 mb-1 block">Purpose</label>
              <input [(ngModel)]="passForm.purpose" placeholder="Purpose of visit" class="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm bg-gray-50">
            </div>
          </div>
          <div class="flex gap-2 mt-4">
            <button (click)="savePass()" [disabled]="savingPass" class="px-5 py-2 bg-sage-600 text-white text-sm font-medium rounded-xl hover:bg-sage-700 disabled:opacity-50">
              {{ savingPass ? 'Creating...' : 'Create Gate Pass' }}
            </button>
            <button (click)="showPassForm = false" class="px-4 py-2 text-sm text-gray-500 border border-gray-200 rounded-xl hover:bg-gray-50">Cancel</button>
          </div>
        </div>
      </div>
    }

    <!-- ── Record Movement Modal ──────────────────────────── -->
    @if (showMovementForm) {
      <div class="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50" (click)="showMovementForm = false">
        <div class="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6" (click)="$event.stopPropagation()">
          <div class="flex justify-between items-center mb-4">
            <h3 class="text-base font-semibold text-gray-800">Record Movement</h3>
            <button (click)="showMovementForm = false" class="text-gray-400 hover:text-gray-600 text-xl">&times;</button>
          </div>
          <div class="space-y-3">
            <div>
              <label class="text-xs font-medium text-gray-500 mb-1 block">Guest Name *</label>
              <input [(ngModel)]="movForm.guest_name" placeholder="Guest name" class="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm bg-gray-50">
            </div>
            <div>
              <label class="text-xs font-medium text-gray-500 mb-1 block">Room Number</label>
              <input [(ngModel)]="movForm.room_number" placeholder="e.g. 204" class="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm bg-gray-50">
            </div>
            <div>
              <label class="text-xs font-medium text-gray-500 mb-1 block">Direction</label>
              <div class="grid grid-cols-2 gap-2">
                <button (click)="movForm.direction = 'step_out'"
                  [class]="movForm.direction === 'step_out' ? 'py-2 rounded-xl text-sm font-medium bg-orange-100 text-orange-700 border border-orange-200' : 'py-2 rounded-xl text-sm border border-gray-200 text-gray-600 hover:bg-gray-50'">
                  🚶 Stepping Out
                </button>
                <button (click)="movForm.direction = 'return'"
                  [class]="movForm.direction === 'return' ? 'py-2 rounded-xl text-sm font-medium bg-green-100 text-green-700 border border-green-200' : 'py-2 rounded-xl text-sm border border-gray-200 text-gray-600 hover:bg-gray-50'">
                  🏠 Returning
                </button>
              </div>
            </div>
          </div>
          <div class="flex gap-2 mt-4">
            <button (click)="saveMovement()" [disabled]="savingMovement || !movForm.guest_name" class="flex-1 py-2 bg-sage-600 text-white text-sm font-medium rounded-xl hover:bg-sage-700 disabled:opacity-50">
              {{ savingMovement ? 'Recording...' : 'Record' }}
            </button>
            <button (click)="showMovementForm = false" class="px-4 py-2 text-sm text-gray-500 border border-gray-200 rounded-xl hover:bg-gray-50">Cancel</button>
          </div>
        </div>
      </div>
    }

    <!-- ── Create Visitor Code Modal ──────────────────────── -->
    @if (showCodeForm) {
      <div class="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50" (click)="showCodeForm = false">
        <div class="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6" (click)="$event.stopPropagation()">
          <div class="flex justify-between items-center mb-4">
            <h3 class="text-base font-semibold text-gray-800">Create Visitor Code</h3>
            <button (click)="showCodeForm = false" class="text-gray-400 hover:text-gray-600 text-xl">&times;</button>
          </div>
          <div class="space-y-3">
            <div>
              <label class="text-xs font-medium text-gray-500 mb-1 block">Booking ID *</label>
              <input [(ngModel)]="codeForm.booking_id" placeholder="Booking ID" class="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm bg-gray-50">
            </div>
            <div>
              <label class="text-xs font-medium text-gray-500 mb-1 block">Guest ID *</label>
              <input [(ngModel)]="codeForm.guest_id" placeholder="Guest ID" class="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm bg-gray-50">
            </div>
            <div>
              <label class="text-xs font-medium text-gray-500 mb-1 block">Room Number</label>
              <input [(ngModel)]="codeForm.room_number" placeholder="e.g. 204" class="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm bg-gray-50">
            </div>
            <div>
              <label class="text-xs font-medium text-gray-500 mb-1 block">Expires At</label>
              <input type="datetime-local" [(ngModel)]="codeForm.expires_at" class="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm bg-gray-50">
            </div>
          </div>
          <div class="flex gap-2 mt-4">
            <button (click)="saveCode()" [disabled]="savingCode" class="flex-1 py-2 bg-sage-600 text-white text-sm font-medium rounded-xl hover:bg-sage-700 disabled:opacity-50">
              {{ savingCode ? 'Creating...' : 'Create Code' }}
            </button>
            <button (click)="showCodeForm = false" class="px-4 py-2 text-sm text-gray-500 border border-gray-200 rounded-xl hover:bg-gray-50">Cancel</button>
          </div>
        </div>
      </div>
    }

    <!-- Stats -->
    <div class="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
      <ui-stats-card label="On Premise" [value]="stats().onPremise" icon="users"></ui-stats-card>
      <ui-stats-card label="Pending Passes" [value]="stats().pendingPasses" icon="clock"></ui-stats-card>
      <ui-stats-card label="Visitors Today" [value]="stats().todayVisitors" icon="user-check"></ui-stats-card>
      <ui-stats-card label="Active Codes" [value]="stats().activeCodes" icon="key"></ui-stats-card>
    </div>

    <!-- Tabs -->
    <div class="flex gap-2 mb-4 flex-wrap">
      @for (tab of tabs; track tab.key) {
        <button (click)="activeTab = tab.key; onTabChange()"
          [class]="activeTab === tab.key ? 'px-4 py-2 bg-sage-600 text-white rounded-lg text-sm font-medium' : 'px-4 py-2 bg-white border border-gray-200 rounded-lg text-sm text-gray-600 hover:bg-gray-50'">
          {{ tab.label }}
        </button>
      }
    </div>

    <!-- ── Gate Passes ──────────────────────────────────────── -->
    @if (activeTab === 'passes') {
      <!-- Status filter -->
      <div class="flex gap-2 mb-3 flex-wrap">
        @for (f of passFilters; track f.value) {
          <button (click)="passFilter = f.value; applyPassFilter()"
            [class]="passFilter === f.value ? 'px-3 py-1 text-xs font-medium bg-gray-800 text-white rounded-lg' : 'px-3 py-1 text-xs bg-white border border-gray-200 text-gray-500 rounded-lg hover:bg-gray-50'">
            {{ f.label }}
          </button>
        }
      </div>
      <div class="space-y-2">
        @for (gp of filteredPasses(); track gp.id) {
          <div class="bg-white border border-gray-100 rounded-xl p-4 shadow-sm">
            <div class="flex items-start justify-between gap-3">
              <div class="min-w-0">
                <div class="flex items-center gap-2 flex-wrap">
                  <span class="font-semibold text-gray-800">{{ gp.person_name }}</span>
                  <span class="text-xs bg-gray-100 text-gray-500 rounded-full px-2 py-0.5">{{ gp.pass_type }}</span>
                </div>
                <div class="text-sm text-gray-500 mt-0.5">
                  Visiting {{ gp.guest_name || '—' }}
                  @if (gp.room_number) { · Room {{ gp.room_number }} }
                </div>
                <div class="text-xs text-gray-400 mt-0.5">
                  {{ gp.purpose || '' }}
                  @if (gp.expected_at) { · Expected {{ formatTime(gp.expected_at) }} }
                  @if (gp.person_phone) { · {{ gp.person_phone }} }
                </div>
              </div>
              <div class="flex flex-col items-end gap-2 shrink-0">
                <span class="text-xs font-semibold px-2.5 py-1 rounded-full" [class]="statusBadge(gp.status)">{{ gp.status }}</span>
                <div class="flex gap-1">
                  @if (gp.status === 'pending') {
                    <button (click)="approvePass(gp.id)" class="text-xs px-2.5 py-1 bg-green-100 text-green-700 rounded-lg font-medium hover:bg-green-200">Approve</button>
                    <button (click)="denyPass(gp.id)" class="text-xs px-2.5 py-1 bg-red-100 text-red-600 rounded-lg font-medium hover:bg-red-200">Deny</button>
                  }
                  @if (gp.status === 'approved') {
                    <button (click)="passCheckIn(gp.id)" class="text-xs px-2.5 py-1 bg-sage-100 text-sage-700 rounded-lg font-medium hover:bg-sage-200">Check In</button>
                  }
                  @if (gp.status === 'checked_in') {
                    <button (click)="passCheckOut(gp.id)" class="text-xs px-2.5 py-1 bg-orange-100 text-orange-700 rounded-lg font-medium hover:bg-orange-200">Check Out</button>
                  }
                </div>
              </div>
            </div>
          </div>
        } @empty {
          <div class="text-center py-12 text-gray-400">
            <div class="text-3xl mb-2">🔒</div>
            <p class="text-sm font-medium">No gate passes {{ passFilter ? 'with status: ' + passFilter : '' }}</p>
          </div>
        }
      </div>
    }

    <!-- ── Movements ──────────────────────────────────────── -->
    @if (activeTab === 'movements') {
      <div class="space-y-1">
        @for (m of movements(); track m.id) {
          <div class="bg-white border border-gray-100 rounded-xl p-3 flex justify-between items-center shadow-sm">
            <div class="flex items-center gap-3">
              <span class="text-xl">{{ m.direction === 'step_out' ? '🚶' : '🏠' }}</span>
              <div>
                <span class="font-medium text-gray-800">{{ m.guest_name }}</span>
                @if (m.room_number) { <span class="text-xs text-gray-400 ml-2">Room {{ m.room_number }}</span> }
                <div class="text-xs mt-0.5" [class]="m.direction === 'step_out' ? 'text-orange-500' : 'text-green-600'">
                  {{ m.direction === 'step_out' ? 'Stepped Out' : 'Returned' }}
                </div>
              </div>
            </div>
            <div class="text-xs text-gray-400 text-right">
              <div>{{ m.created_at?.substring(11, 16) }}</div>
              @if (m.recorded_by) { <div>{{ m.recorded_by }}</div> }
            </div>
          </div>
        } @empty {
          <div class="text-center py-12 text-gray-400">
            <div class="text-3xl mb-2">🚶</div>
            <p class="text-sm font-medium">No movements recorded today</p>
          </div>
        }
      </div>
    }

    <!-- ── On Premise ─────────────────────────────────────── -->
    @if (activeTab === 'onpremise') {
      <div class="space-y-1">
        @for (m of onPremise(); track m.id) {
          <div class="bg-white border border-gray-100 rounded-xl p-3 flex justify-between items-center shadow-sm">
            <div class="flex items-center gap-3">
              <div class="w-2 h-2 rounded-full bg-green-400 shrink-0"></div>
              <div>
                <span class="font-medium text-gray-800">{{ m.guest_name }}</span>
                @if (m.room_number) { <span class="text-xs text-gray-400 ml-2">Room {{ m.room_number }}</span> }
              </div>
            </div>
            <div class="text-xs text-gray-400">Since {{ m.created_at?.substring(11, 16) }}</div>
          </div>
        } @empty {
          <div class="text-center py-12 text-gray-400">
            <div class="text-3xl mb-2">🟢</div>
            <p class="text-sm font-medium">No tracking data available</p>
          </div>
        }
      </div>
    }

    <!-- ── Visitor Codes ──────────────────────────────────── -->
    @if (activeTab === 'codes') {
      <div class="space-y-2">
        @for (c of visitorCodes(); track c.id) {
          <div class="bg-white border border-gray-100 rounded-xl p-4 shadow-sm flex justify-between items-center">
            <div>
              <div class="flex items-center gap-2">
                <span class="font-mono font-bold text-sage-600 text-lg tracking-widest">{{ c.code }}</span>
                <span class="text-xs px-2 py-0.5 rounded-full" [class]="c.is_active && !isExpired(c.expires_at) ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-400'">
                  {{ c.is_active && !isExpired(c.expires_at) ? 'Active' : 'Inactive' }}
                </span>
              </div>
              <div class="text-xs text-gray-400 mt-1">
                Room {{ c.room_number || '—' }}
                @if (c.expires_at) { · Expires {{ formatTime(c.expires_at) }} }
                @if (c.used_at) { · Used {{ formatTime(c.used_at) }} }
              </div>
            </div>
            @if (c.is_active && !isExpired(c.expires_at)) {
              <button (click)="revokeCode(c.id)" class="text-xs px-2.5 py-1 border border-red-200 text-red-500 rounded-lg hover:bg-red-50">Revoke</button>
            }
          </div>
        } @empty {
          <div class="text-center py-12 text-gray-400">
            <div class="text-3xl mb-2">🔑</div>
            <p class="text-sm font-medium">No visitor codes issued</p>
          </div>
        }
      </div>
    }

    <!-- ── Gate Card Issue Tab ────────────────────────────── -->
    @if (activeTab === 'gate_card') {
      <div class="space-y-4">
        <!-- Search bar — supports RFID scanner input -->
        <div class="bg-white border border-gray-100 rounded-xl p-4 shadow-sm">
          <label class="block text-xs font-medium text-gray-500 mb-1">Search Card (number, UID, or RFID scan)</label>
          <input [(ngModel)]="cardSearch" (ngModelChange)="searchCards()"
            placeholder="Type card number / UID, or connect RFID scanner for auto-input..."
            class="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm font-mono bg-gray-50 focus:outline-none focus:border-sage-400"
            id="rfid-input" autocomplete="off">
          <p class="text-xs text-gray-400 mt-1">If a USB RFID scanner is connected it will populate this field automatically on card tap.</p>
        </div>

        <!-- Card results -->
        @if (cardResults().length > 0) {
          <div class="space-y-2">
            @for (card of cardResults(); track card.id) {
              <div class="bg-white border border-gray-200 rounded-xl p-4 shadow-sm">
                <div class="flex items-start justify-between gap-4">
                  <div class="flex-1 min-w-0">
                    <div class="flex items-center gap-2 flex-wrap">
                      <span class="font-mono font-bold text-sage-700">{{ card.card_number }}</span>
                      <span class="text-xs px-2 py-0.5 rounded-full" [class]="card.status === 'active' ? 'bg-green-100 text-green-700' : card.status === 'pending_gate' ? 'bg-amber-100 text-amber-700' : 'bg-gray-100 text-gray-500'">
                        {{ card.status }}
                      </span>
                      @if (card.card_uid) { <span class="text-xs text-gray-400 font-mono">UID: {{ card.card_uid }}</span> }
                    </div>
                    @if (card.guest_name) { <p class="text-sm text-gray-700 mt-1">{{ card.guest_name }}</p> }
                    @if (card.room_number) { <p class="text-xs text-gray-400">Room {{ card.room_number }}</p> }
                    @if (card.plate_number) { <p class="text-xs text-gray-500 mt-0.5">🚗 {{ card.plate_number }}</p> }
                  </div>
                  @if (card.status === 'available') {
                    <button (click)="openGateIssueModal(card)"
                      class="shrink-0 px-3 py-1.5 bg-sage-600 text-white text-xs font-medium rounded-lg hover:bg-sage-700">
                      Issue at Gate
                    </button>
                  }
                  @if (card.status === 'pending_gate') {
                    <span class="shrink-0 text-xs text-amber-600 bg-amber-50 px-2 py-1.5 rounded-lg">Issued — awaiting booking link</span>
                  }
                </div>
              </div>
            }
          </div>
        } @else if (cardSearch.length > 0) {
          <div class="text-center py-8 text-gray-400">
            <div class="text-3xl mb-2">🃏</div>
            <p class="text-sm">No cards found for "{{ cardSearch }}"</p>
          </div>
        } @else {
          <div class="text-center py-8 text-gray-400">
            <div class="text-3xl mb-2">🃏</div>
            <p class="text-sm">Search for a card to issue at the gate</p>
          </div>
        }
      </div>

      <!-- Gate Issue Modal -->
      @if (showGateIssueModal) {
        <div class="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div class="bg-white rounded-2xl shadow-2xl w-full max-w-sm mx-4 p-6">
            <div class="flex items-center gap-3 mb-5">
              <div class="w-10 h-10 bg-sage-100 rounded-full flex items-center justify-center shrink-0">
                <svg class="w-5 h-5 text-sage-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"/>
                </svg>
              </div>
              <div>
                <h3 class="text-sm font-bold text-gray-800">Issue at Gate</h3>
                <p class="text-xs text-gray-400">Card: <span class="font-mono font-semibold text-sage-700">{{ gateIssueCard?.card_number }}</span></p>
              </div>
            </div>
            <div class="space-y-3">
              <div>
                <label class="block text-xs font-medium text-gray-500 mb-1">Vehicle Plate Number <span class="text-gray-300">(optional)</span></label>
                <input [(ngModel)]="gateIssueForm.plate_number"
                  placeholder="e.g. LND-123-AA"
                  class="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm font-mono uppercase tracking-widest bg-gray-50">
              </div>
              <div class="p-3 bg-amber-50 border border-amber-100 rounded-lg text-xs text-amber-700 leading-relaxed">
                <span class="font-semibold">What happens next:</span> Card enters the <em>Pending at Gate</em> pool.
                Reception will see it highlighted and must attach it to a booking before check-in can proceed.
              </div>
            </div>
            <div class="flex gap-2 mt-5">
              <button (click)="showGateIssueModal = false" class="flex-1 py-2.5 border border-gray-200 text-sm text-gray-600 rounded-xl hover:bg-gray-50">Cancel</button>
              <button (click)="submitGateIssue()" [disabled]="savingGateIssue"
                class="flex-1 py-2.5 bg-sage-600 text-white text-sm font-medium rounded-xl hover:bg-sage-700 disabled:opacity-50 flex items-center justify-center gap-2">
                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"/>
                </svg>
                {{ savingGateIssue ? 'Issuing...' : 'Issue at Gate' }}
              </button>
            </div>
          </div>
        </div>
      }
    }

    <!-- ── Exit Checkout Tab ──────────────────────────────── -->
    @if (activeTab === 'exit') {
      <div class="space-y-4">
        <div class="bg-white border border-gray-200 rounded-xl p-4 shadow-sm">
          <label class="block text-xs font-medium text-gray-500 mb-1">Scan / Enter Card Number or UID</label>
          <div class="flex gap-2">
            <input [(ngModel)]="exitCardSearch"
              placeholder="Card number, UID, or RFID scan..."
              class="flex-1 px-3 py-2 border border-gray-200 rounded-lg text-sm font-mono bg-gray-50"
              id="exit-rfid-input" autocomplete="off"
              (keydown.enter)="lookupCardForExit()">
            <button (click)="lookupCardForExit()" class="px-4 py-2 bg-gray-800 text-white text-sm rounded-lg hover:bg-gray-700">
              Look Up
            </button>
          </div>
        </div>

        @if (exitCardFound()) {
          <div class="bg-white border-2 rounded-xl p-5 shadow-sm" [class.border-green-300]="exitCardFound()?.status === 'active'" [class.border-red-300]="exitCardFound()?.status !== 'active'">
            <div class="flex items-start justify-between">
              <div>
                <p class="font-mono font-bold text-lg text-gray-800">{{ exitCardFound()?.card_number }}</p>
                <p class="text-sm text-gray-700 mt-1">{{ exitCardFound()?.guest_name || '—' }}</p>
                @if (exitCardFound()?.room_number) { <p class="text-xs text-gray-400">Room {{ exitCardFound()?.room_number }}</p> }
                @if (exitCardFound()?.plate_number) { <p class="text-xs text-gray-500 mt-0.5">🚗 {{ exitCardFound()?.plate_number }}</p> }
                <p class="text-xs text-gray-400 mt-1">Status: <span class="font-medium">{{ exitCardFound()?.status }}</span></p>
              </div>
              <div class="text-right">
                @if (exitCardFound()?.status === 'active' || exitCardFound()?.status === 'pending_gate') {
                  <button (click)="processExit()" [disabled]="processingExit"
                    class="px-4 py-2 bg-red-600 text-white text-sm font-medium rounded-lg hover:bg-red-700 disabled:opacity-50">
                    {{ processingExit ? 'Processing...' : '🚪 Confirm Exit' }}
                  </button>
                } @else {
                  <span class="text-xs text-gray-400 bg-gray-100 px-3 py-1.5 rounded-lg">{{ exitCardFound()?.status === 'revoked' ? 'Already revoked' : 'Cannot process' }}</span>
                }
              </div>
            </div>
          </div>
        }
      </div>
    }

    <!-- ── Discrepancy Report Tab ─────────────────────────── -->
    @if (activeTab === 'discrepancy') {
      <div class="space-y-4">
        <div class="flex items-center gap-3 mb-2">
          <select [(ngModel)]="discrepancyFilter" (ngModelChange)="loadDiscrepancies()"
            class="px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white">
            <option value="">All Types</option>
            <option value="missing_security_exit">Missing Security Exit</option>
            <option value="missing_receptionist_checkout">Missing Receptionist Checkout</option>
            <option value="gap_exceeded">Gap Exceeded Threshold</option>
          </select>
          <button (click)="loadDiscrepancies()" class="px-3 py-2 border border-gray-200 text-sm rounded-lg hover:bg-gray-50">↻ Refresh</button>
        </div>

        @if (discrepancies().length === 0) {
          <div class="text-center py-12 text-gray-400">
            <div class="text-3xl mb-2">✅</div>
            <p class="text-sm font-medium">No discrepancies found</p>
          </div>
        }
        @for (d of discrepancies(); track d.id) {
          <div class="bg-white border rounded-xl p-4 shadow-sm" [class.border-red-300]="d.severity === 'high'" [class.border-amber-300]="d.severity === 'medium'" [class.border-gray-200]="d.severity === 'low'">
            <div class="flex items-start justify-between gap-4">
              <div class="flex-1 min-w-0">
                <div class="flex items-center gap-2 flex-wrap">
                  <span class="text-sm font-semibold text-gray-800">{{ d.guest_name || 'Unknown Guest' }}</span>
                  <span class="text-xs px-2 py-0.5 rounded-full font-medium"
                    [class.bg-red-100]="d.severity === 'high'" [class.text-red-700]="d.severity === 'high'"
                    [class.bg-amber-100]="d.severity === 'medium'" [class.text-amber-700]="d.severity === 'medium'"
                    [class.bg-gray-100]="d.severity === 'low'" [class.text-gray-600]="d.severity === 'low'">
                    {{ d.discrepancy_type | titlecase }}
                  </span>
                </div>
                <p class="text-xs text-gray-400 mt-1">Card: {{ d.card_number }} · Room: {{ d.room_number || '—' }}</p>
                @if (d.receptionist_checkout_at) { <p class="text-xs text-gray-500 mt-0.5">Receptionist checkout: {{ formatTime(d.receptionist_checkout_at) }}</p> }
                @if (d.security_exit_at) { <p class="text-xs text-gray-500 mt-0.5">Security exit: {{ formatTime(d.security_exit_at) }}</p> }
                @if (d.gap_minutes != null) {
                  <p class="text-xs font-medium mt-1"
                    [class.text-red-600]="d.gap_minutes > d.threshold_minutes"
                    [class.text-green-600]="d.gap_minutes <= d.threshold_minutes">
                    Gap: {{ d.gap_minutes }} min (threshold: {{ d.threshold_minutes }} min)
                    {{ d.gap_minutes > d.threshold_minutes ? '⚠️ Exceeded' : '✅ Within threshold' }}
                  </p>
                }
              </div>
              <p class="text-xs text-gray-400 shrink-0">{{ formatTime(d.created_at) }}</p>
            </div>
          </div>
        }
      </div>
    }
  `,
})
export class SecurityPage implements OnInit, OnDestroy {
  private tour = inject(TourService);
  private api = inject(ApiService);
  private auth = inject(AuthService);
  private activeProperty = inject(ActivePropertyService);
  private toast = inject(ToastService);

  passes = signal<any[]>([]);
  movements = signal<any[]>([]);
  onPremise = signal<any[]>([]);
  visitorCodes = signal<any[]>([]);
  stats = signal({ onPremise: 0, pendingPasses: 0, todayVisitors: 0, activeCodes: 0 });

  activeTab = 'passes';
  passFilter = '';
  private timer: any;

  showPassForm = false;
  showMovementForm = false;
  showCodeForm = false;
  savingPass = false;
  savingMovement = false;
  savingCode = false;

  passForm: any = { person_name: '', person_phone: '', pass_type: 'visitor', guest_name: '', room_number: '', expected_at: '', purpose: '' };
  movForm: any = { guest_name: '', room_number: '', direction: 'step_out' };
  codeForm: any = { booking_id: '', guest_id: '', room_number: '', expires_at: '' };

  tabs = [
    { key: 'passes', label: '🎫 Gate Passes' },
    { key: 'movements', label: '🚶 Movements' },
    { key: 'onpremise', label: '🟢 On Premise' },
    { key: 'codes', label: '🔑 Visitor Codes' },
    { key: 'gate_card', label: '🃏 Gate Card Issue' },
    { key: 'exit', label: '🚪 Exit Checkout' },
    { key: 'discrepancy', label: '⚠️ Discrepancies' },
  ];
  passFilters = [
    { label: 'All', value: '' },
    { label: 'Pending', value: 'pending' },
    { label: 'Approved', value: 'approved' },
    { label: 'Checked In', value: 'checked_in' },
    { label: 'Checked Out', value: 'checked_out' },
    { label: 'Denied', value: 'denied' },
  ];

  filteredPasses = signal<any[]>([]);

  ngOnInit() { this.load(); this.timer = setInterval(() => this.load(), 15000); }
  ngOnDestroy() { clearInterval(this.timer); }

  onTabChange() {
    if (this.activeTab === 'codes') this.loadCodes();
    if (this.activeTab === 'discrepancy') this.loadDiscrepancies();
    if (this.activeTab === 'gate_card') { this.cardSearch = ''; this.cardResults.set([]); }
    if (this.activeTab === 'exit') { this.exitCardSearch = ''; this.exitCardFound.set(null); }
  }

  load() {
    const pid = this.activeProperty.propertyId();
    this.api.get(`/security/gate-passes?property_id=${pid}`).subscribe({
      next: (r: any) => {
        const d = r.data || [];
        this.passes.set(d);
        this.applyPassFilter();
        this.stats.update(s => ({
          ...s,
          pendingPasses: d.filter((p: any) => p.status === 'pending').length,
          todayVisitors: d.filter((p: any) => p.status === 'checked_in' || p.status === 'checked_out').length,
        }));
      },
    });
    this.api.get(`/security/movements?property_id=${pid}`).subscribe({
      next: (r: any) => this.movements.set(r.data || []),
    });
    this.api.get(`/security/on-premise?property_id=${pid}`).subscribe({
      next: (r: any) => {
        const d = r.data || [];
        this.onPremise.set(d);
        this.stats.update(s => ({ ...s, onPremise: d.length }));
      },
    });
  }

  loadCodes() {
    const pid = this.activeProperty.propertyId();
    this.api.get(`/security/visitor-codes?property_id=${pid}`).subscribe({
      next: (r: any) => {
        const d = r.data || [];
        this.visitorCodes.set(d);
        this.stats.update(s => ({ ...s, activeCodes: d.filter((c: any) => c.is_active && !this.isExpired(c.expires_at)).length }));
      },
    });
  }

  applyPassFilter() {
    const all = this.passes();
    this.filteredPasses.set(this.passFilter ? all.filter(p => p.status === this.passFilter) : all);
  }

  // Gate Pass
  openCreatePass() {
    this.passForm = { person_name: '', person_phone: '', pass_type: 'visitor', guest_name: '', room_number: '', expected_at: '', purpose: '' };
    this.showPassForm = true;
  }

  savePass() {
    if (!this.passForm.person_name) { this.toast.error('Visitor name is required'); return; }
    this.savingPass = true;
    const pid = this.activeProperty.propertyId();
    const body: any = { ...this.passForm, property_id: pid };
    if (!body.expected_at) delete body.expected_at;
    if (!body.room_number) delete body.room_number;
    if (!body.person_phone) delete body.person_phone;
    this.api.post('/security/gate-passes', body).subscribe({
      next: (r: any) => {
        this.savingPass = false;
        if (r.success) { this.toast.success('Gate pass created'); this.showPassForm = false; this.load(); }
        else { this.toast.error(r.message || 'Failed to create gate pass'); }
      },
      error: () => { this.savingPass = false; this.toast.error('Failed to create gate pass'); },
    });
  }

  approvePass(id: string) {
    this.api.post(`/security/gate-passes/${id}/approve`, {}).subscribe({
      next: (r: any) => { if (r.success) { this.toast.success('Pass approved'); this.load(); } else { this.toast.error(r.message || 'Failed'); } },
      error: () => this.toast.error('Failed to approve pass'),
    });
  }

  denyPass(id: string) {
    this.api.post(`/security/gate-passes/${id}/deny`, { notes: '' }).subscribe({
      next: (r: any) => { if (r.success) { this.toast.success('Pass denied'); this.load(); } else { this.toast.error(r.message || 'Failed'); } },
      error: () => this.toast.error('Failed to deny pass'),
    });
  }

  passCheckIn(id: string) {
    this.api.post(`/security/gate-passes/${id}/check-in`, {}).subscribe({
      next: (r: any) => { if (r.success) { this.toast.success('Visitor checked in'); this.load(); } else { this.toast.error(r.message || 'Failed'); } },
      error: () => this.toast.error('Failed'),
    });
  }

  passCheckOut(id: string) {
    this.api.post(`/security/gate-passes/${id}/check-out`, {}).subscribe({
      next: (r: any) => { if (r.success) { this.toast.success('Visitor checked out'); this.load(); } else { this.toast.error(r.message || 'Failed'); } },
      error: () => this.toast.error('Failed'),
    });
  }

  // Movement
  openRecordMovement() {
    this.movForm = { guest_name: '', room_number: '', direction: 'step_out' };
    this.showMovementForm = true;
  }

  saveMovement() {
    if (!this.movForm.guest_name) { this.toast.error('Guest name is required'); return; }
    this.savingMovement = true;
    const user = this.auth.currentUser;
    const body = {
      ...this.movForm,
      property_id: this.activeProperty.propertyId(),
      recorded_by: [user?.first_name, user?.last_name].filter(Boolean).join(' ') || 'Security',
    };
    this.api.post('/security/movements', body).subscribe({
      next: (r: any) => {
        this.savingMovement = false;
        if (r.success) { this.toast.success('Movement recorded'); this.showMovementForm = false; this.load(); }
        else { this.toast.error(r.message || 'Failed to record'); }
      },
      error: () => { this.savingMovement = false; this.toast.error('Failed to record movement'); },
    });
  }

  // Visitor Codes
  openCreateCode() {
    this.codeForm = { booking_id: '', guest_id: '', room_number: '', expires_at: '' };
    this.showCodeForm = true;
  }

  saveCode() {
    if (!this.codeForm.booking_id || !this.codeForm.guest_id) { this.toast.error('Booking ID and Guest ID are required'); return; }
    this.savingCode = true;
    const body: any = { ...this.codeForm, property_id: this.activeProperty.propertyId() };
    if (!body.expires_at) delete body.expires_at;
    if (!body.room_number) delete body.room_number;
    this.api.post('/security/visitor-codes', body).subscribe({
      next: (r: any) => {
        this.savingCode = false;
        if (r.success) { this.toast.success('Visitor code created'); this.showCodeForm = false; this.loadCodes(); }
        else { this.toast.error(r.message || 'Failed to create code'); }
      },
      error: () => { this.savingCode = false; this.toast.error('Failed to create visitor code'); },
    });
  }

  revokeCode(id: string) {
    this.api.post(`/security/visitor-codes/${id}/revoke`, {}).subscribe({
      next: (r: any) => { if (r.success) { this.toast.success('Code revoked'); this.loadCodes(); } else { this.toast.error(r.message || 'Failed'); } },
      error: () => this.toast.error('Failed to revoke code'),
    });
  }

  // ── Gate Card Issue ─────────────────────────────────────
  cardSearch        = '';
  cardResults       = signal<any[]>([]);
  cardSearchTimer: any;

  showGateIssueModal = false;
  savingGateIssue    = false;
  gateIssueCard: any = null;
  gateIssueForm = { plate_number: '' };

  searchCards(): void {
    clearTimeout(this.cardSearchTimer);
    if (this.cardSearch.trim().length < 2) { this.cardResults.set([]); return; }
    this.cardSearchTimer = setTimeout(() => {
      const pid = this.activeProperty.propertyId();
      this.api.get(`/cards?property_id=${pid}&search=${encodeURIComponent(this.cardSearch.trim())}&status=available&status=pending_gate&limit=20`)
        .subscribe({ next: (r: any) => { if (r.success) this.cardResults.set(r.data ?? []); } });
    }, 300);
  }

  openGateIssueModal(card: any): void {
    this.gateIssueCard = card;
    this.gateIssueForm = { plate_number: '' };
    this.showGateIssueModal = true;
  }

  submitGateIssue(): void {
    this.savingGateIssue = true;
    const payload: any = {
      card_id:     this.gateIssueCard.id,
      property_id: this.activeProperty.propertyId(),
    };
    if (this.gateIssueForm.plate_number) payload.plate_number = this.gateIssueForm.plate_number.trim().toUpperCase();

    this.api.post('/cards/gate-issue', payload).subscribe({
      next: (r: any) => {
        this.savingGateIssue = false;
        if (r.success) {
          this.toast.success('Card issued at gate — Pending Gate pool');
          this.showGateIssueModal = false;
          this.searchCards();
        } else {
          this.toast.error(r.message || 'Failed to issue card');
        }
      },
      error: () => { this.savingGateIssue = false; this.toast.error('Failed to issue card'); },
    });
  }

  // ── Exit Checkout ────────────────────────────────────────
  exitCardSearch  = '';
  exitCardFound   = signal<any>(null);
  processingExit  = false;

  lookupCardForExit(): void {
    if (!this.exitCardSearch.trim()) return;
    const pid = this.activeProperty.propertyId();
    this.api.get(`/cards/lookup?property_id=${pid}&q=${encodeURIComponent(this.exitCardSearch.trim())}`)
      .subscribe({ next: (r: any) => {
        if (r.success && r.data) this.exitCardFound.set(r.data);
        else { this.exitCardFound.set(null); this.toast.error('Card not found'); }
      }});
  }

  processExit(): void {
    if (!this.exitCardFound()) return;
    this.processingExit = true;
    this.api.post('/cards/security-exit', {
      card_id:     this.exitCardFound()!.id,
      property_id: this.activeProperty.propertyId(),
    }).subscribe({
      next: (r: any) => {
        this.processingExit = false;
        if (r.success) {
          this.toast.success('Exit processed — card revoked');
          this.exitCardFound.set(null);
          this.exitCardSearch = '';
          this.loadDiscrepancies();
        } else {
          this.toast.error(r.message || 'Failed to process exit');
        }
      },
      error: () => { this.processingExit = false; this.toast.error('Failed to process exit'); },
    });
  }

  // ── Discrepancy Report ───────────────────────────────────
  discrepancies       = signal<any[]>([]);
  discrepancyFilter   = '';

  loadDiscrepancies(): void {
    const pid = this.activeProperty.propertyId();
    let url = `/security/checkout-discrepancies?property_id=${pid}`;
    if (this.discrepancyFilter) url += `&type=${this.discrepancyFilter}`;
    this.api.get(url).subscribe({ next: (r: any) => { if (r.success) this.discrepancies.set(r.data ?? []); } });
  }

  // Helpers
  isExpired(dt: string | null): boolean {
    if (!dt) return false;
    return new Date(dt) < new Date();
  }

  statusBadge(s: string): string {
    const map: Record<string, string> = {
      approved: 'bg-green-100 text-green-700', checked_in: 'bg-sage-100 text-sage-700',
      denied: 'bg-red-100 text-red-700', checked_out: 'bg-gray-100 text-gray-500',
      pending: 'bg-amber-100 text-amber-700',
    };
    return map[s] || 'bg-gray-100 text-gray-500';
  }

  formatTime(dt: string): string {
    if (!dt) return '';
    try { return new Date(dt).toLocaleString('en-GB', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' }); }
    catch { return dt; }
  }

  startTour(): void {
    this.tour.start(PAGE_TOURS['security'] ?? [], 'security');
  }
}

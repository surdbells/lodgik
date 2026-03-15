import { Component, inject, OnInit, signal, computed } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { DecimalPipe } from '@angular/common';
import {
  ApiService, PageHeaderComponent, LoadingSpinnerComponent,
  ToastService, StatsCardComponent, ActivePropertyService,
  HasPermDirective, PermDisableDirective,
} from '@lodgik/shared';
import { AuthService } from '@lodgik/shared';

const STATUS_CONFIG: Record<string, { color: string; bg: string; border: string; dot: string; label: string }> = {
  vacant_clean:  { color: '#16a34a', bg: 'bg-emerald-50',  border: 'border-emerald-300', dot: 'bg-emerald-500',  label: 'Clean' },
  vacant_dirty:  { color: '#f59e0b', bg: 'bg-amber-50',    border: 'border-amber-300',   dot: 'bg-amber-400',    label: 'Dirty' },
  occupied:      { color: '#3b82f6', bg: 'bg-blue-50',     border: 'border-blue-300',    dot: 'bg-blue-500',     label: 'Occupied' },
  reserved:      { color: '#8b5cf6', bg: 'bg-violet-50',   border: 'border-violet-300',  dot: 'bg-violet-500',   label: 'Reserved' },
  checked_in:    { color: '#3b82f6', bg: 'bg-blue-50',     border: 'border-blue-300',    dot: 'bg-blue-500',     label: 'Checked In' },
  out_of_order:  { color: '#ef4444', bg: 'bg-red-50',      border: 'border-red-300',     dot: 'bg-red-500',      label: 'OOO' },
  maintenance:   { color: '#6b7280', bg: 'bg-gray-50',     border: 'border-gray-300',    dot: 'bg-gray-400',     label: 'Maint.' },
};

@Component({
  selector: 'app-rooms',
  standalone: true,
  imports: [
    FormsModule, DecimalPipe, RouterLink,
    PageHeaderComponent, LoadingSpinnerComponent,
    StatsCardComponent, HasPermDirective, PermDisableDirective,
  ],
  template: `
    <ui-page-header title="Rooms" subtitle="Room status, occupancy & quick actions">
      <div class="flex gap-2 flex-wrap">
        <!-- View toggle -->
        <div class="flex border border-gray-200 rounded-xl overflow-hidden text-sm">
          <button (click)="viewMode.set('grid')" class="px-4 py-2 font-medium transition-colors"
            [class.bg-sage-600]="viewMode() === 'grid'" [class.text-white]="viewMode() === 'grid'"
            [class.text-gray-500]="viewMode() !== 'grid'">⊞ Grid</button>
          <button (click)="viewMode.set('list')" class="px-4 py-2 font-medium border-l border-gray-200 transition-colors"
            [class.bg-sage-600]="viewMode() === 'list'" [class.text-white]="viewMode() === 'list'"
            [class.text-gray-500]="viewMode() !== 'list'">≡ List</button>
        </div>
        <button (click)="showBulk = !showBulk"
          class="px-4 py-2 text-sm font-medium border border-indigo-300 text-indigo-700 rounded-xl hover:bg-indigo-50 transition-colors"
          *hasPerm="'rooms.manage_types'">
          ⚡ Bulk Create
        </button>
        <button (click)="showAdd = !showAdd"
          class="px-4 py-2 bg-sage-600 text-white text-sm font-medium rounded-xl hover:bg-sage-700 transition-colors"
          *hasPerm="'rooms.manage_types'">
          + Add Room
        </button>
      </div>
    </ui-page-header>

    <!-- Stats strip -->
    <div class="grid grid-cols-3 sm:grid-cols-6 gap-3 mb-5">
      <ui-stats-card label="Total"     [value]="statusCounts().total || 0"        icon="hotel"></ui-stats-card>
      <ui-stats-card label="Available" [value]="statusCounts().vacant_clean || 0" icon="circle-check"></ui-stats-card>
      <ui-stats-card label="Occupied"  [value]="statusCounts().occupied || 0"     icon="bed-double"></ui-stats-card>
      <ui-stats-card label="Dirty"     [value]="statusCounts().vacant_dirty || 0" icon="spray-can"></ui-stats-card>
      <ui-stats-card label="Reserved"  [value]="statusCounts().reserved || 0"     icon="calendar-days"></ui-stats-card>
      <ui-stats-card label="OOO/Maint" [value]="(statusCounts().out_of_order || 0) + (statusCounts().maintenance || 0)" icon="wrench"></ui-stats-card>
    </div>

    <!-- ── Legend ── -->
    <div class="flex flex-wrap gap-3 mb-5 items-center">
      @for (entry of legendEntries; track entry.status) {
        <div class="flex items-center gap-1.5 text-xs text-gray-600">
          <div class="w-3 h-3 rounded-full" [style.background]="entry.color"></div>
          {{ entry.label }}
        </div>
      }
      <div class="ml-auto text-xs text-gray-400">{{ filtered().length }} room{{ filtered().length !== 1 ? 's' : '' }}</div>
    </div>

    <!-- ── Filters ── -->
    <div class="flex flex-wrap gap-3 mb-5">
      <select [(ngModel)]="filters.status" (ngModelChange)="applyFilters()"
        class="px-3 py-2 border border-gray-200 rounded-xl text-sm bg-white">
        <option value="">All Statuses</option>
        <option value="vacant_clean">Vacant Clean</option>
        <option value="vacant_dirty">Vacant Dirty</option>
        <option value="occupied">Occupied</option>
        <option value="reserved">Reserved</option>
        <option value="out_of_order">Out of Order</option>
        <option value="maintenance">Maintenance</option>
      </select>
      <select [(ngModel)]="filters.room_type_id" (ngModelChange)="applyFilters()"
        class="px-3 py-2 border border-gray-200 rounded-xl text-sm bg-white">
        <option value="">All Types</option>
        @for (rt of roomTypes(); track rt.id) {
          <option [value]="rt.id">{{ rt.name }}</option>
        }
      </select>
      <select [(ngModel)]="filters.floor" (ngModelChange)="applyFilters()"
        class="px-3 py-2 border border-gray-200 rounded-xl text-sm bg-white">
        <option value="">All Floors</option>
        @for (f of floors(); track f) { <option [value]="f">Floor {{ f }}</option> }
      </select>
      <input [(ngModel)]="filters.search" (ngModelChange)="applyFilters()" placeholder="Search room…"
        class="px-3 py-2 border border-gray-200 rounded-xl text-sm bg-white min-w-36">
    </div>

    <!-- Add / Bulk forms -->
    @if (showAdd) {
      <div class="bg-white rounded-2xl border border-gray-100 shadow-card p-5 mb-5">
        <h3 class="text-sm font-bold text-gray-700 mb-3">Add Room</h3>
        <div class="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-3">
          <select [(ngModel)]="addForm.room_type_id" class="px-3 py-2.5 border border-gray-200 rounded-xl text-sm bg-gray-50">
            <option value="">Room Type *</option>
            @for (rt of roomTypes(); track rt.id) { <option [value]="rt.id">{{ rt.name }}</option> }
          </select>
          <input [(ngModel)]="addForm.room_number" placeholder="Room number *" class="px-3 py-2.5 border border-gray-200 rounded-xl text-sm bg-gray-50">
          <input [(ngModel)]="addForm.floor" type="number" placeholder="Floor" class="px-3 py-2.5 border border-gray-200 rounded-xl text-sm bg-gray-50">
          <input [(ngModel)]="addForm.notes" placeholder="Notes (optional)" class="px-3 py-2.5 border border-gray-200 rounded-xl text-sm bg-gray-50">
        </div>
        <div class="flex flex-wrap gap-2 mb-3">
          @for (a of amenityOptions; track a) {
            <label class="flex items-center gap-1.5 px-2.5 py-1.5 border rounded-lg text-xs cursor-pointer transition-colors"
              [class]="addForm.amenities.includes(a) ? 'bg-sage-50 border-sage-400 text-sage-700' : 'border-gray-200 text-gray-500 hover:bg-gray-50'">
              <input type="checkbox" class="hidden" [checked]="addForm.amenities.includes(a)" (change)="toggleAmenity(addForm, a)">{{ a }}
            </label>
          }
        </div>
        <div class="flex gap-2">
          <button (click)="createRoom()" class="px-4 py-2 bg-sage-600 text-white text-sm font-medium rounded-xl hover:bg-sage-700">Create</button>
          <button (click)="showAdd = false" class="px-4 py-2 text-sm text-gray-500 border border-gray-200 rounded-xl hover:bg-gray-50">Cancel</button>
        </div>
      </div>
    }

    @if (showBulk) {
      <div class="bg-white rounded-2xl border border-indigo-100 shadow-card p-5 mb-5">
        <h3 class="text-sm font-bold text-gray-700 mb-1">Bulk Create Rooms</h3>
        <p class="text-xs text-gray-400 mb-4">Generate multiple rooms with sequential numbering.</p>
        <div class="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-3">
          <select [(ngModel)]="bulkForm.room_type_id" class="px-3 py-2.5 border border-gray-200 rounded-xl text-sm bg-gray-50">
            <option value="">Room Type *</option>
            @for (rt of roomTypes(); track rt.id) { <option [value]="rt.id">{{ rt.name }}</option> }
          </select>
          <input [(ngModel)]="bulkForm.floor" type="number" placeholder="Floor" class="px-3 py-2.5 border border-gray-200 rounded-xl text-sm bg-gray-50">
          <input [(ngModel)]="bulkForm.start_number" type="number" placeholder="Start #" class="px-3 py-2.5 border border-gray-200 rounded-xl text-sm bg-gray-50">
          <input [(ngModel)]="bulkForm.count" type="number" min="1" max="50" placeholder="Count" class="px-3 py-2.5 border border-gray-200 rounded-xl text-sm bg-gray-50">
        </div>
        <div class="mb-3 px-3 py-2 bg-indigo-50 rounded-lg text-xs text-indigo-700">
          Preview: Rooms <strong>{{ bulkForm.start_number }}</strong>–<strong>{{ (bulkForm.start_number || 0) + (bulkForm.count || 0) - 1 }}</strong>, Floor {{ bulkForm.floor || '?' }} ({{ bulkForm.count || 0 }} rooms)
        </div>
        <div class="flex gap-2">
          <button (click)="bulkCreate()" class="px-4 py-2 bg-indigo-600 text-white text-sm font-medium rounded-xl hover:bg-indigo-700">Create {{ bulkForm.count || 0 }} Rooms</button>
          <button (click)="showBulk = false" class="px-4 py-2 text-sm text-gray-500 border border-gray-200 rounded-xl hover:bg-gray-50">Cancel</button>
        </div>
      </div>
    }

    <ui-loading [loading]="loading()"/>

    @if (!loading()) {
      <!-- ══ GRID VIEW ══ -->
      @if (viewMode() === 'grid') {
        @if (filtered().length === 0) {
          <div class="text-center py-16 text-gray-400">No rooms match filters</div>
        } @else {
          <!-- Group by floor -->
          @for (floorGroup of floorGroups(); track floorGroup.floor) {
            <div class="mb-6">
              <p class="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Floor {{ floorGroup.floor }}</p>
              <div class="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8 xl:grid-cols-10 gap-2">
                @for (room of floorGroup.rooms; track room.id) {
                  <div class="relative rounded-xl border-2 p-2.5 cursor-pointer hover:shadow-md transition-all group"
                       [class]="scfg(room).bg + ' ' + scfg(room).border"
                       (click)="openRoomPanel(room)">
                    <!-- Status dot -->
                    <div class="absolute top-1.5 right-1.5 w-2 h-2 rounded-full" [class]="scfg(room).dot"></div>

                    <!-- Room number -->
                    <div class="text-sm font-bold text-gray-900">{{ room.room_number }}</div>

                    <!-- Type name truncated -->
                    <div class="text-[9px] text-gray-500 truncate mt-0.5">{{ getRoomTypeName(room.room_type_id) }}</div>

                    <!-- If occupied: guest name + checkout countdown -->
                    @if (room.current_booking) {
                      <div class="mt-1 pt-1 border-t border-dashed" [style.border-color]="scfg(room).color + '50'">
                        <div class="text-[9px] font-semibold truncate" [style.color]="scfg(room).color">
                          {{ room.current_booking.guest_name || 'Guest' }}
                        </div>
                        <div class="text-[9px] mt-0.5" [class]="room.current_booking.is_overdue ? 'text-red-600 font-bold' : 'text-gray-500'">
                          {{ room.current_booking.is_overdue ? '⚠ Overdue' : '⏱ ' + countdown(room.current_booking.seconds_to_checkout) }}
                        </div>
                      </div>
                    }

                    <!-- Status label at bottom -->
                    <div class="text-[9px] font-medium mt-1" [style.color]="scfg(room).color">{{ scfg(room).label }}</div>
                  </div>
                }
              </div>
            </div>
          }
        }
      }

      <!-- ══ LIST VIEW ══ -->
      @if (viewMode() === 'list') {
        <div class="bg-white rounded-2xl border border-gray-100 overflow-hidden">
          <table class="w-full text-sm">
            <thead>
              <tr class="border-b border-gray-100 bg-gray-50">
                <th class="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Room</th>
                <th class="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider hidden sm:table-cell">Type</th>
                <th class="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider hidden md:table-cell">Floor</th>
                <th class="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Status</th>
                <th class="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Guest</th>
                <th class="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider hidden lg:table-cell">Booking Type</th>
                <th class="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider hidden lg:table-cell">Check-out</th>
                <th class="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider hidden xl:table-cell">Countdown</th>
                <th class="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider hidden xl:table-cell">Balance</th>
                <th class="text-right px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody>
              @for (room of filtered(); track room.id) {
                <tr class="border-b border-gray-50 hover:bg-gray-50 transition-colors">
                  <!-- Room number -->
                  <td class="px-4 py-3">
                    <div class="flex items-center gap-2">
                      <div class="w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold"
                           [class]="scfg(room).bg + ' ' + scfg(room).border + ' border'">
                        {{ room.room_number }}
                      </div>
                      @if (room.amenities?.length) {
                        <div class="text-[10px] text-gray-400 hidden xl:block">
                          {{ room.amenities.slice(0, 3).join(' · ') }}{{ room.amenities.length > 3 ? ' +' + (room.amenities.length - 3) : '' }}
                        </div>
                      }
                    </div>
                  </td>
                  <!-- Type -->
                  <td class="px-4 py-3 hidden sm:table-cell">
                    <div class="text-sm text-gray-700">{{ getRoomTypeName(room.room_type_id) }}</div>
                    <div class="text-xs text-gray-400">₦{{ getRoomRate(room.room_type_id) | number:'1.0-0' }}/night</div>
                  </td>
                  <!-- Floor -->
                  <td class="px-4 py-3 text-sm text-gray-600 hidden md:table-cell">{{ room.floor || '—' }}</td>
                  <!-- Status badge -->
                  <td class="px-4 py-3">
                    <span class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold"
                          [class]="scfg(room).bg + ' ' + scfg(room).border + ' border'">
                      <span class="w-1.5 h-1.5 rounded-full" [class]="scfg(room).dot"></span>
                      <span [style.color]="scfg(room).color">{{ room.status_label }}</span>
                    </span>
                  </td>
                  <!-- Guest -->
                  <td class="px-4 py-3">
                    @if (room.current_booking?.guest_name) {
                      <a [routerLink]="['/bookings', room.current_booking.id]" class="block hover:text-sage-700">
                        <div class="text-sm font-medium text-gray-800">{{ room.current_booking.guest_name }}</div>
                        <div class="text-xs text-gray-400">{{ room.current_booking.adults }}A {{ room.current_booking.children > 0 ? room.current_booking.children + 'C' : '' }}</div>
                      </a>
                    } @else {
                      <span class="text-gray-300 text-sm">—</span>
                    }
                  </td>
                  <!-- Booking type -->
                  <td class="px-4 py-3 hidden lg:table-cell">
                    @if (room.current_booking?.booking_type_label) {
                      <span class="px-2 py-1 text-xs rounded-lg bg-gray-100 text-gray-600">{{ room.current_booking.booking_type_label }}</span>
                    } @else { <span class="text-gray-300">—</span> }
                  </td>
                  <!-- Check-out -->
                  <td class="px-4 py-3 hidden lg:table-cell">
                    @if (room.current_booking?.check_out) {
                      <div class="text-xs font-medium" [class]="room.current_booking.is_overdue ? 'text-red-600' : 'text-gray-700'">
                        {{ formatCheckout(room.current_booking.check_out) }}
                      </div>
                    } @else { <span class="text-gray-300 text-xs">—</span> }
                  </td>
                  <!-- Countdown -->
                  <td class="px-4 py-3 hidden xl:table-cell">
                    @if (room.current_booking) {
                      <span class="text-xs font-bold" [class]="room.current_booking.is_overdue ? 'text-red-600' : 'text-gray-600'">
                        {{ room.current_booking.is_overdue ? '⚠ Overdue' : countdown(room.current_booking.seconds_to_checkout) }}
                      </span>
                    } @else { <span class="text-gray-300 text-xs">—</span> }
                  </td>
                  <!-- Balance placeholder -->
                  <td class="px-4 py-3 hidden xl:table-cell">
                    <span class="text-gray-300 text-xs">—</span>
                  </td>
                  <!-- Actions -->
                  <td class="px-4 py-3 text-right">
                    <div class="flex items-center justify-end gap-1">
                      @if (room.current_booking) {
                        <a [routerLink]="['/bookings', room.current_booking.id]"
                          class="px-2.5 py-1.5 text-xs text-sage-700 border border-sage-200 rounded-lg hover:bg-sage-50 transition-colors whitespace-nowrap">
                          View →
                        </a>
                      }
                      <button (click)="openRoomPanel(room)"
                        class="px-2.5 py-1.5 text-xs text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors">
                        ⋯
                      </button>
                    </div>
                  </td>
                </tr>
              }
            </tbody>
          </table>
          @if (filtered().length === 0) {
            <div class="text-center py-12 text-gray-400">No rooms match filters</div>
          }
        </div>
      }
    }

    <!-- ══ Room detail panel (slide-in) ══ -->
    @if (panelRoom()) {
      <div class="fixed inset-0 z-50 flex justify-end" style="background:rgba(0,0,0,.35)" (click)="panelRoom.set(null)">
        <div class="relative bg-white w-full max-w-sm h-full overflow-y-auto shadow-2xl" (click)="$event.stopPropagation()">
          <!-- Header -->
          <div class="sticky top-0 bg-white border-b border-gray-100 px-5 py-4 flex items-center justify-between z-10">
            <div>
              <h2 class="text-base font-bold text-gray-900">Room {{ panelRoom()!.room_number }}</h2>
              <p class="text-xs text-gray-500 mt-0.5">{{ getRoomTypeName(panelRoom()!.room_type_id) }} · Floor {{ panelRoom()!.floor || '—' }}</p>
            </div>
            <button (click)="panelRoom.set(null)" class="text-gray-400 hover:text-gray-600 w-8 h-8 flex items-center justify-center rounded-lg hover:bg-gray-100 text-xl">×</button>
          </div>

          <div class="px-5 py-4 space-y-5">
            <!-- Status badge -->
            <div class="flex items-center gap-3">
              <span class="px-3 py-1.5 rounded-full text-sm font-semibold border"
                    [class]="scfg(panelRoom()!).bg + ' ' + scfg(panelRoom()!).border"
                    [style.color]="scfg(panelRoom()!).color">
                ● {{ panelRoom()!.status_label }}
              </span>
              @if (panelRoom()!.is_active === false) {
                <span class="px-2 py-1 text-xs bg-gray-100 text-gray-500 rounded-full">Inactive</span>
              }
            </div>

            <!-- Current booking info -->
            @if (panelRoom()!.current_booking) {
              <div class="rounded-xl border-2 p-4 space-y-2" [class]="scfg(panelRoom()!).bg + ' ' + scfg(panelRoom()!).border">
                <p class="text-xs font-bold text-gray-500 uppercase tracking-wider">Current Stay</p>
                <div class="space-y-1.5 text-sm">
                  <div class="flex justify-between">
                    <span class="text-gray-500">Guest</span>
                    <span class="font-semibold text-gray-800">{{ panelRoom()!.current_booking!.guest_name }}</span>
                  </div>
                  <div class="flex justify-between">
                    <span class="text-gray-500">Ref</span>
                    <span class="font-mono text-xs text-gray-700">{{ panelRoom()!.current_booking!.booking_ref }}</span>
                  </div>
                  <div class="flex justify-between">
                    <span class="text-gray-500">Type</span>
                    <span class="text-gray-700">{{ panelRoom()!.current_booking!.booking_type_label }}</span>
                  </div>
                  <div class="flex justify-between">
                    <span class="text-gray-500">Check-in</span>
                    <span class="text-gray-700">{{ formatCheckout(panelRoom()!.current_booking!.check_in) }}</span>
                  </div>
                  <div class="flex justify-between">
                    <span class="text-gray-500">Check-out</span>
                    <span class="font-semibold" [class]="panelRoom()!.current_booking!.is_overdue ? 'text-red-600' : 'text-gray-800'">
                      {{ formatCheckout(panelRoom()!.current_booking!.check_out) }}
                    </span>
                  </div>
                  <div class="flex justify-between">
                    <span class="text-gray-500">Countdown</span>
                    <span class="font-bold" [class]="panelRoom()!.current_booking!.is_overdue ? 'text-red-600' : 'text-sage-700'">
                      {{ panelRoom()!.current_booking!.is_overdue ? '⚠ Overdue' : countdown(panelRoom()!.current_booking!.seconds_to_checkout) }}
                    </span>
                  </div>
                  <div class="flex justify-between">
                    <span class="text-gray-500">Guests</span>
                    <span class="text-gray-700">{{ panelRoom()!.current_booking!.adults }} adult(s) {{ panelRoom()!.current_booking!.children > 0 ? panelRoom()!.current_booking!.children + ' child(ren)' : '' }}</span>
                  </div>
                  <div class="flex justify-between">
                    <span class="text-gray-500">Phone</span>
                    <span class="text-gray-700">{{ panelRoom()!.current_booking!.guest_phone || '—' }}</span>
                  </div>
                </div>
                <a [routerLink]="['/bookings', panelRoom()!.current_booking!.id]" (click)="panelRoom.set(null)"
                   class="mt-3 block text-center px-4 py-2 bg-sage-600 text-white text-sm font-semibold rounded-xl hover:bg-sage-700 transition-colors">
                  Open Booking →
                </a>
              </div>
            }

            <!-- Amenities -->
            @if (panelRoom()!.amenities?.length) {
              <div>
                <p class="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Amenities</p>
                <div class="flex flex-wrap gap-1.5">
                  @for (a of panelRoom()!.amenities; track a) {
                    <span class="px-2 py-1 text-xs bg-gray-100 text-gray-600 rounded-lg">{{ a }}</span>
                  }
                </div>
              </div>
            }

            @if (panelRoom()!.notes) {
              <div>
                <p class="text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">Notes</p>
                <p class="text-sm text-gray-600">{{ panelRoom()!.notes }}</p>
              </div>
            }

            <!-- Status transitions -->
            <div>
              <p class="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Change Status</p>
              <div class="space-y-2" *hasPerm="'rooms.edit_status'">
                @for (s of getTransitions(panelRoom()!.status); track s) {
                  <button (click)="changeStatus(panelRoom()!.id, s)"
                    class="w-full text-left px-4 py-2.5 rounded-xl border border-gray-200 text-sm hover:bg-gray-50 transition-colors flex items-center gap-2">
                    <span class="w-2 h-2 rounded-full" [style.background]="statusLabels[s]?.color || '#ccc'"></span>
                    → {{ statusLabels[s]?.label || s }}
                  </button>
                }
              </div>
            </div>

            <!-- Edit & view actions -->
            <div class="flex gap-2 pb-4">
              <button (click)="openEdit(panelRoom()!)" *hasPerm="'rooms.manage_types'"
                class="flex-1 px-4 py-2.5 border border-gray-200 text-sm font-medium text-gray-700 rounded-xl hover:bg-gray-50 transition-colors">
                ✏ Edit Room
              </button>
              <a [routerLink]="['/rooms', panelRoom()!.id]" (click)="panelRoom.set(null)"
                class="flex-1 px-4 py-2.5 border border-gray-200 text-sm font-medium text-gray-700 rounded-xl hover:bg-gray-50 transition-colors text-center">
                Details →
              </a>
            </div>
          </div>
        </div>
      </div>
    }

    <!-- Edit modal -->
    @if (showEdit && editForm) {
      <div class="fixed inset-0 z-50 flex items-center justify-center p-4" style="background:rgba(0,0,0,.45)" (click)="showEdit = false">
        <div class="bg-white rounded-2xl shadow-2xl w-full max-w-md p-5" (click)="$event.stopPropagation()">
          <h3 class="text-base font-bold mb-4">Edit Room {{ editForm.room_number }}</h3>
          <div class="space-y-3">
            <select [(ngModel)]="editForm.room_type_id" class="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm bg-gray-50">
              @for (rt of roomTypes(); track rt.id) { <option [value]="rt.id">{{ rt.name }}</option> }
            </select>
            <div class="grid grid-cols-2 gap-3">
              <input [(ngModel)]="editForm.room_number" placeholder="Room number" class="px-3 py-2.5 border border-gray-200 rounded-xl text-sm bg-gray-50">
              <input [(ngModel)]="editForm.floor" type="number" placeholder="Floor" class="px-3 py-2.5 border border-gray-200 rounded-xl text-sm bg-gray-50">
            </div>
            <textarea [(ngModel)]="editForm.notes" rows="2" placeholder="Notes" class="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm bg-gray-50 resize-none"></textarea>
            <div class="flex flex-wrap gap-2">
              @for (a of amenityOptions; track a) {
                <label class="flex items-center gap-1.5 px-2.5 py-1.5 border rounded-lg text-xs cursor-pointer transition-colors"
                  [class]="editForm.amenities?.includes(a) ? 'bg-sage-50 border-sage-400 text-sage-700' : 'border-gray-200 text-gray-500 hover:bg-gray-50'">
                  <input type="checkbox" class="hidden" [checked]="editForm.amenities?.includes(a)" (change)="toggleAmenity(editForm, a)">{{ a }}
                </label>
              }
            </div>
            <label class="flex items-center gap-2 text-sm cursor-pointer">
              <input type="checkbox" [(ngModel)]="editForm.is_active" class="accent-sage-600 w-4 h-4">
              <span class="text-gray-700">Active</span>
            </label>
          </div>
          <div class="flex gap-2 mt-5">
            <button (click)="saveEdit()" class="flex-1 py-2.5 bg-sage-600 text-white text-sm font-bold rounded-xl hover:bg-sage-700">Save</button>
            <button (click)="showEdit = false" class="px-5 py-2.5 border border-gray-200 text-sm text-gray-600 rounded-xl hover:bg-gray-50">Cancel</button>
          </div>
        </div>
      </div>
    }
  `,
})
export class RoomsPage implements OnInit {
  private api            = inject(ApiService);
  private toast          = inject(ToastService);
  private auth           = inject(AuthService);
  private activeProperty = inject(ActivePropertyService);

  loading      = signal(true);
  rooms        = signal<any[]>([]);
  roomTypes    = signal<any[]>([]);
  floors       = signal<number[]>([]);
  statusCounts = signal<any>({});
  viewMode     = signal<'grid' | 'list'>('grid');
  panelRoom    = signal<any>(null);

  showAdd    = false;
  showBulk   = false;
  showEdit   = false;
  editForm:  any = null;
  propertyId = '';

  filters = { status: '', room_type_id: '', floor: '', search: '' };
  addForm: any = { room_type_id: '', room_number: '', floor: null, notes: '', amenities: [] as string[] };
  bulkForm: any = { room_type_id: '', floor: 1, start_number: 101, count: 10 };

  amenityOptions = ['Wi-Fi', 'TV', 'AC', 'Mini Bar', 'Safe', 'Balcony', 'Bath Tub', 'Shower', 'Hair Dryer', 'Iron', 'Coffee Maker', 'Desk', 'Room Service', 'Sea View', 'City View', 'Pool Access', 'Parking'];

  legendEntries = [
    { status: 'vacant_clean', color: '#16a34a', label: 'Clean' },
    { status: 'vacant_dirty', color: '#f59e0b', label: 'Dirty' },
    { status: 'occupied',     color: '#3b82f6', label: 'Occupied' },
    { status: 'reserved',     color: '#8b5cf6', label: 'Reserved' },
    { status: 'out_of_order', color: '#ef4444', label: 'Out of Order' },
    { status: 'maintenance',  color: '#6b7280', label: 'Maintenance' },
  ];

  statusLabels: Record<string, { label: string; color: string }> = {
    vacant_clean: { label: 'Vacant Clean', color: '#16a34a' },
    vacant_dirty: { label: 'Vacant Dirty', color: '#f59e0b' },
    occupied:     { label: 'Occupied',     color: '#3b82f6' },
    reserved:     { label: 'Reserved',     color: '#8b5cf6' },
    out_of_order: { label: 'Out of Order', color: '#ef4444' },
    maintenance:  { label: 'Maintenance',  color: '#6b7280' },
  };

  private transitions: Record<string, string[]> = {
    vacant_clean: ['reserved', 'occupied', 'out_of_order', 'maintenance'],
    vacant_dirty: ['vacant_clean', 'out_of_order', 'maintenance'],
    occupied:     ['vacant_dirty', 'out_of_order'],
    reserved:     ['occupied', 'vacant_clean', 'out_of_order'],
    out_of_order: ['vacant_dirty', 'maintenance'],
    maintenance:  ['vacant_dirty', 'out_of_order'],
  };

  filtered = computed(() => {
    let r = this.rooms();
    if (this.filters.status)       r = r.filter(rm => rm.status === this.filters.status);
    if (this.filters.room_type_id) r = r.filter(rm => rm.room_type_id === this.filters.room_type_id);
    if (this.filters.floor)        r = r.filter(rm => String(rm.floor) === String(this.filters.floor));
    if (this.filters.search)       r = r.filter(rm => rm.room_number?.toLowerCase().includes(this.filters.search.toLowerCase()));
    return r;
  });

  floorGroups = computed(() => {
    const groups: Record<string, any[]> = {};
    for (const r of this.filtered()) {
      const f = String(r.floor ?? 'G');
      if (!groups[f]) groups[f] = [];
      groups[f].push(r);
    }
    return Object.entries(groups)
      .sort(([a], [b]) => (+a || 0) - (+b || 0))
      .map(([floor, rooms]) => ({ floor, rooms }));
  });

  ngOnInit(): void {
    const user = this.auth.currentUser;
    if (user?.property_id) this.propertyId = user.property_id;
    this.loadRoomTypes();
    this.loadStatusCounts();
    this.load();
  }

  scfg(room: any) {
    return STATUS_CONFIG[room.status] ?? STATUS_CONFIG['vacant_clean'];
  }

  load(): void {
    this.loading.set(true);
    const params: any = { limit: 500 };
    if (this.propertyId) params.property_id = this.propertyId;
    this.api.get('/rooms', params).subscribe({
      next: r => { if (r.success) this.rooms.set(r.data ?? []); this.loading.set(false); },
      error: () => this.loading.set(false),
    });
  }

  loadRoomTypes(): void {
    if (!this.propertyId) return;
    this.api.get('/room-types', { property_id: this.propertyId, limit: 50 }).subscribe(r => {
      if (r.success) this.roomTypes.set(r.data ?? []);
    });
    this.api.get('/rooms/floors', { property_id: this.propertyId }).subscribe(r => {
      if (r.success) this.floors.set(r.data ?? []);
    });
  }

  loadStatusCounts(): void {
    if (!this.propertyId) return;
    this.api.get('/rooms/status-counts', { property_id: this.propertyId }).subscribe(r => {
      if (r.success) {
        const d: any = r.data;
        d.total = Object.values(d).reduce((a: any, b: any) => a + (Number(b) || 0), 0);
        this.statusCounts.set(d);
      }
    });
  }

  applyFilters(): void {}   // computed handles reactively

  openRoomPanel(room: any): void { this.panelRoom.set(room); }

  getRoomTypeName(id: string): string {
    return this.roomTypes().find((rt: any) => rt.id === id)?.name ?? '—';
  }
  getRoomRate(id: string): string {
    return this.roomTypes().find((rt: any) => rt.id === id)?.base_rate ?? '0';
  }

  getTransitions(status: string): string[] {
    return this.transitions[status] ?? [];
  }

  changeStatus(roomId: string, newStatus: string): void {
    this.api.patch(`/rooms/${roomId}/status`, { status: newStatus }).subscribe(r => {
      if (r.success) {
        this.toast.success('Status updated');
        this.panelRoom.set(null);
        this.load();
        this.loadStatusCounts();
      } else this.toast.error(r.message || 'Failed');
    });
  }

  countdown(seconds: number): string {
    const abs = Math.abs(seconds);
    const d   = Math.floor(abs / 86400);
    const h   = Math.floor((abs % 86400) / 3600);
    const m   = Math.floor((abs % 3600) / 60);
    if (d > 0) return `${d}d ${h}h`;
    if (h > 0) return `${h}h ${m}m`;
    return `${m}m`;
  }

  formatCheckout(dt: string): string {
    if (!dt) return '—';
    return new Date(dt).toLocaleString('en-NG', { weekday: 'short', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit', hour12: true });
  }

  createRoom(): void {
    if (!this.addForm.room_type_id || !this.addForm.room_number) { this.toast.error('Room type and number required'); return; }
    this.api.post('/rooms', { ...this.addForm, property_id: this.propertyId }).subscribe(r => {
      if (r.success) { this.toast.success('Room created'); this.showAdd = false; this.addForm = { room_type_id: '', room_number: '', floor: null, notes: '', amenities: [] }; this.load(); this.loadStatusCounts(); }
      else this.toast.error(r.message || 'Failed');
    });
  }

  bulkCreate(): void {
    if (!this.bulkForm.room_type_id || !this.bulkForm.count) { this.toast.error('Room type and count required'); return; }
    this.api.post('/rooms/bulk-create', { ...this.bulkForm, property_id: this.propertyId }).subscribe(r => {
      if (r.success) { this.toast.success(`${r.data?.created ?? this.bulkForm.count} rooms created`); this.showBulk = false; this.load(); this.loadStatusCounts(); }
      else this.toast.error(r.message || 'Failed');
    });
  }

  openEdit(room: any): void {
    this.editForm = { id: room.id, room_type_id: room.room_type_id, room_number: room.room_number, floor: room.floor, notes: room.notes || '', amenities: [...(room.amenities || [])], is_active: room.is_active ?? true };
    this.showEdit = true;
    this.panelRoom.set(null);
  }

  saveEdit(): void {
    const { id, ...body } = this.editForm;
    this.api.put(`/rooms/${id}`, body).subscribe(r => {
      if (r.success) { this.toast.success('Room updated'); this.showEdit = false; this.editForm = null; this.load(); }
      else this.toast.error(r.message || 'Failed');
    });
  }

  toggleAmenity(form: any, a: string): void {
    if (!form.amenities) form.amenities = [];
    const i = form.amenities.indexOf(a);
    i >= 0 ? form.amenities.splice(i, 1) : form.amenities.push(a);
  }
}

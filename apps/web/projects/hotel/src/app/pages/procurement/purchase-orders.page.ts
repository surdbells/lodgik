import { Component, inject, OnInit, signal, computed } from '@angular/core';
import { FormsModule } from '@angular/forms';
import {
  ApiService, PageHeaderComponent, LoadingSpinnerComponent,
  ToastService, ActivePropertyService
} from '@lodgik/shared';
import { Router, ActivatedRoute } from '@angular/router';

interface Vendor { id: string; name: string; email: string | null; payment_terms: string; }
interface StockItem { id: string; sku: string; name: string; }
interface StockLocation { id: string; name: string; }
interface PrSummary { id: string; reference_number: string; title: string; }

interface PoLine {
  item_id: string; item_sku: string; item_name: string;
  location_id: string; location_name: string;
  ordered_quantity: number | null;
  unit_cost: number | null;        // ₦ for display; → kobo on submit
  notes: string;
}

interface PurchaseOrder {
  id: string;
  reference_number: string;
  property_id: string;
  status: string; status_label: string; status_color: string;
  vendor_id: string | null; vendor_name: string; vendor_email: string | null;
  vendor_contact_person: string | null;
  // Open-market
  is_open_market: boolean;
  open_market_vendor_name: string | null;
  open_market_reason: string | null;
  // Second approval
  second_approval_required: boolean;
  second_approved_by_name: string | null;
  second_approved_at: string | null;
  is_pending_second_approval: boolean;
  // Rest
  request_id: string | null;
  created_by_name: string;
  sent_at: string | null; sent_by_name: string | null; emailed_count: number;
  expected_delivery_date: string | null;
  delivery_address: string | null;
  payment_terms: string;
  subtotal_value: string; tax_value: string; total_value: string;
  notes: string | null; line_count: number;
  created_at: string;
}

const blankLine = (): PoLine => ({
  item_id: '', item_sku: '', item_name: '',
  location_id: '', location_name: '',
  ordered_quantity: null, unit_cost: null, notes: '',
});

@Component({
  selector: 'app-purchase-orders',
  standalone: true,
  imports: [FormsModule, PageHeaderComponent, LoadingSpinnerComponent],
  template: `
<ui-page-header
  title="Purchase Orders"
  icon="file-text"
  [breadcrumbs]="['Inventory & Food Cost', 'Purchase Orders']"
  subtitle="Create, send and track orders to vendors">
  <button (click)="openCreate()"
    class="px-4 py-2 bg-sage-600 text-white text-sm font-medium rounded-xl hover:bg-sage-700 transition-colors">
    + New PO
  </button>
</ui-page-header>

<ui-loading [loading]="loading()"></ui-loading>

@if (!loading()) {
<div class="px-6 max-w-6xl">

  <!-- Filter bar -->
  <div class="flex flex-wrap gap-3 mb-5">
    @for (s of statusTabs; track s.key) {
      <button (click)="filterStatus = s.key; load()"
        [class]="filterStatus === s.key
          ? 'px-3 py-1.5 text-sm rounded-lg bg-sage-600 text-white font-medium'
          : 'px-3 py-1.5 text-sm rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50'">
        {{ s.label }}
      </button>
    }
    <button (click)="filterOpenMarket = !filterOpenMarket; load()"
      [class]="filterOpenMarket
        ? 'px-3 py-1.5 text-sm rounded-lg bg-amber-500 text-white font-medium'
        : 'px-3 py-1.5 text-sm rounded-lg border border-amber-200 text-amber-700 hover:bg-amber-50'">
      🏪 Open Market
    </button>
    <span class="ml-auto text-sm text-gray-500 self-center">{{ total() }} order(s)</span>
  </div>

  <!-- Table -->
  @if (orders().length === 0) {
    <div class="text-center py-16 text-gray-400">
      <p class="text-lg">No purchase orders found</p>
      <p class="text-sm mt-1">{{ filterStatus ? 'Try a different status filter' : 'Create your first PO' }}</p>
    </div>
  } @else {
    <div class="bg-white rounded-xl border border-gray-200 overflow-hidden">
      <table class="w-full text-sm">
        <thead class="bg-gray-50 border-b border-gray-200">
          <tr>
            <th class="px-4 py-3 text-left font-medium text-gray-600">Reference</th>
            <th class="px-4 py-3 text-left font-medium text-gray-600">Vendor / Supplier</th>
            <th class="px-4 py-3 text-left font-medium text-gray-600">Status</th>
            <th class="px-4 py-3 text-right font-medium text-gray-600">Total Value</th>
            <th class="px-4 py-3 text-left font-medium text-gray-600">Expected</th>
            <th class="px-4 py-3 text-left font-medium text-gray-600">Created</th>
            <th class="px-4 py-3 text-right font-medium text-gray-600"></th>
          </tr>
        </thead>
        <tbody class="divide-y divide-gray-100">
          @for (po of orders(); track po.id) {
            <tr class="hover:bg-gray-50">
              <td class="px-4 py-3">
                <p class="font-mono text-xs text-gray-600">{{ po.reference_number }}</p>
                @if (po.is_open_market) {
                  <span class="inline-block mt-0.5 px-1.5 py-0.5 text-xs rounded bg-amber-100 text-amber-700 font-medium">
                    Open Market
                  </span>
                }
              </td>
              <td class="px-4 py-3">
                <p class="font-medium text-gray-800">{{ po.vendor_name }}</p>
                @if (po.is_pending_second_approval) {
                  <p class="text-xs text-red-500 font-medium mt-0.5">⚠ Awaiting 2nd approval</p>
                } @else if (po.emailed_count > 0) {
                  <p class="text-xs text-gray-400">Sent {{ po.emailed_count }}×</p>
                }
              </td>
              <td class="px-4 py-3">
                <span [class]="statusClass(po.status)">{{ po.status_label }}</span>
              </td>
              <td class="px-4 py-3 text-right font-semibold text-gray-800">
                {{ formatValue(po.total_value) }}
              </td>
              <td class="px-4 py-3 text-gray-500 text-xs">
                {{ po.expected_delivery_date ? formatDate(po.expected_delivery_date) : '—' }}
              </td>
              <td class="px-4 py-3 text-gray-400 text-xs">{{ formatDate(po.created_at) }}</td>
              <td class="px-4 py-3 text-right">
                <button (click)="openDetail(po)"
                  class="px-3 py-1.5 text-xs border border-gray-200 rounded-lg hover:bg-gray-50">
                  View
                </button>
              </td>
            </tr>
          }
        </tbody>
      </table>

      @if (lastPage() > 1) {
        <div class="flex items-center justify-between px-4 py-3 border-t border-gray-100">
          <button (click)="changePage(page() - 1)" [disabled]="page() === 1"
            class="px-3 py-1.5 text-sm border border-gray-200 rounded-lg disabled:opacity-40 hover:bg-gray-50">← Prev</button>
          <span class="text-sm text-gray-500">Page {{ page() }} of {{ lastPage() }}</span>
          <button (click)="changePage(page() + 1)" [disabled]="page() === lastPage()"
            class="px-3 py-1.5 text-sm border border-gray-200 rounded-lg disabled:opacity-40 hover:bg-gray-50">Next →</button>
        </div>
      }
    </div>
  }
</div>
}

<!-- ── Detail Drawer ──────────────────────────────────────────────── -->
@if (detailPo()) {
<div class="fixed inset-0 z-40 flex">
  <div class="flex-1 bg-black/30" (click)="closeDetail()"></div>
  <div class="w-full max-w-xl bg-white h-full shadow-2xl overflow-y-auto">

    <div class="px-6 py-4 border-b border-gray-100 flex items-start justify-between gap-4">
      <div>
        <p class="font-mono text-xs text-gray-400">{{ detailPo()!.reference_number }}</p>
        <div class="flex items-center gap-2 mt-1">
          <p class="font-semibold text-gray-800">{{ detailPo()!.vendor_name }}</p>
          @if (detailPo()!.is_open_market) {
            <span class="px-2 py-0.5 text-xs rounded-lg bg-amber-100 text-amber-700 font-medium">Open Market</span>
          }
        </div>
      </div>
      <button (click)="closeDetail()" class="text-gray-400 hover:text-gray-600 text-2xl flex-shrink-0">×</button>
    </div>

    <!-- Second-approval warning banner -->
    @if (detailPo()!.is_pending_second_approval) {
      <div class="mx-6 mt-4 px-4 py-3 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700">
        <p class="font-semibold mb-1">⚠ Second Approval Required</p>
        <p class="text-xs text-red-600">
          This open-market PO exceeds ₦50,000 and must be approved by a Property Admin before it can be sent.
        </p>
        <button (click)="secondApprove()" [disabled]="actioning()"
          class="mt-2 px-4 py-1.5 bg-red-600 text-white text-xs font-medium rounded-lg hover:bg-red-700 disabled:opacity-60">
          {{ actioning() ? 'Approving…' : 'Approve This PO' }}
        </button>
      </div>
    }

    <!-- Second-approval granted info -->
    @if (detailPo()!.second_approval_required && detailPo()!.second_approved_at) {
      <div class="mx-6 mt-4 px-4 py-3 bg-green-50 border border-green-200 rounded-xl text-xs text-green-700">
        ✓ Second-approved by {{ detailPo()!.second_approved_by_name }}
        on {{ formatDate(detailPo()!.second_approved_at!) }}
      </div>
    }

    <!-- Status + actions -->
    <div class="px-6 py-3 border-b border-gray-100 flex items-center gap-3 flex-wrap mt-2">
      <span [class]="statusClass(detailPo()!.status)">{{ detailPo()!.status_label }}</span>

      @if (['draft','sent','partially_delivered'].includes(detailPo()!.status) && !detailPo()!.is_pending_second_approval) {
        <button (click)="openSendModal()" [disabled]="actioning()"
          class="ml-auto px-3 py-1.5 text-xs bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-60">
          {{ detailPo()!.emailed_count > 0 ? 'Re-send Email' : 'Send to Vendor' }}
        </button>
      }
      @if (['sent','partially_delivered'].includes(detailPo()!.status)) {
        <button (click)="recordGrn()" [disabled]="actioning()"
          class="px-3 py-1.5 text-xs bg-sage-600 text-white rounded-lg hover:bg-sage-700 disabled:opacity-60">
          Record Delivery (GRN)
        </button>
      }
      @if (!['delivered','cancelled'].includes(detailPo()!.status)) {
        <button (click)="cancelPo(detailPo()!.id)" [disabled]="actioning()"
          class="px-3 py-1.5 text-xs border border-red-200 text-red-600 rounded-lg hover:bg-red-50 disabled:opacity-60">
          Cancel
        </button>
      }
    </div>

    <!-- Open-market info -->
    @if (detailPo()!.is_open_market) {
      <div class="mx-6 mt-4 mb-2 px-4 py-3 bg-amber-50 border border-amber-200 rounded-xl text-sm">
        <p class="text-xs text-amber-600 font-medium uppercase tracking-wide mb-2">Open-Market Purchase</p>
        <div class="grid grid-cols-1 gap-2">
          <div>
            <p class="text-xs text-gray-400">Supplier Name</p>
            <p class="font-medium text-gray-800">{{ detailPo()!.open_market_vendor_name }}</p>
          </div>
          <div>
            <p class="text-xs text-gray-400">Reason</p>
            <p class="text-sm text-gray-700">{{ detailPo()!.open_market_reason }}</p>
          </div>
        </div>
      </div>
    }

    <!-- Meta -->
    <div class="px-6 py-4 grid grid-cols-2 gap-3 text-sm border-b border-gray-100">
      @if (!detailPo()!.is_open_market) {
        <div>
          <p class="text-xs text-gray-400">Vendor</p>
          <p class="font-medium">{{ detailPo()!.vendor_name }}</p>
          @if (detailPo()!.vendor_email) { <p class="text-xs text-gray-400">{{ detailPo()!.vendor_email }}</p> }
        </div>
      }
      <div>
        <p class="text-xs text-gray-400">Payment Terms</p>
        <p class="font-medium">{{ termsLabel(detailPo()!.payment_terms) }}</p>
      </div>
      <div>
        <p class="text-xs text-gray-400">Created By</p>
        <p class="font-medium">{{ detailPo()!.created_by_name }}</p>
      </div>
      <div>
        <p class="text-xs text-gray-400">Created</p>
        <p class="font-medium">{{ formatDate(detailPo()!.created_at) }}</p>
      </div>
      @if (detailPo()!.expected_delivery_date) {
        <div>
          <p class="text-xs text-gray-400">Expected Delivery</p>
          <p class="font-medium">{{ formatDate(detailPo()!.expected_delivery_date!) }}</p>
        </div>
      }
      @if (detailPo()!.sent_at) {
        <div>
          <p class="text-xs text-gray-400">Sent</p>
          <p class="font-medium">{{ formatDate(detailPo()!.sent_at!) }}</p>
          <p class="text-xs text-gray-400">by {{ detailPo()!.sent_by_name }} (×{{ detailPo()!.emailed_count }})</p>
        </div>
      }
      @if (detailPo()!.delivery_address) {
        <div class="col-span-2">
          <p class="text-xs text-gray-400">Delivery Address</p>
          <p class="text-sm whitespace-pre-line">{{ detailPo()!.delivery_address }}</p>
        </div>
      }
      @if (detailPo()!.notes) {
        <div class="col-span-2">
          <p class="text-xs text-gray-400">Notes</p>
          <p class="text-sm">{{ detailPo()!.notes }}</p>
        </div>
      }
    </div>

    <!-- Financials -->
    <div class="px-6 py-3 border-b border-gray-100 text-sm">
      <div class="flex justify-between text-gray-500 mb-1">
        <span>Subtotal</span><span>{{ formatValue(detailPo()!.subtotal_value) }}</span>
      </div>
      <div class="flex justify-between text-gray-500 mb-1">
        <span>Tax / VAT</span><span>{{ formatValue(detailPo()!.tax_value) }}</span>
      </div>
      <div class="flex justify-between font-bold text-gray-800 pt-1 border-t border-gray-100">
        <span>Total</span><span>{{ formatValue(detailPo()!.total_value) }}</span>
      </div>
    </div>

    <!-- PO Lines -->
    <div class="px-6 py-4">
      <p class="text-xs text-gray-500 font-medium mb-3 uppercase tracking-wide">Order Lines</p>
      <ui-loading [loading]="loadingLines()"></ui-loading>
      @if (!loadingLines()) {
        @for (line of detailLines(); track line.id) {
          <div class="border border-gray-100 rounded-lg p-3 mb-2">
            <div class="flex justify-between items-start gap-2">
              <div>
                <p class="font-medium text-sm">{{ line.item_name }}</p>
                <p class="font-mono text-xs text-gray-400">{{ line.item_sku }}</p>
                @if (line.location_name) { <p class="text-xs text-gray-400 mt-0.5">→ {{ line.location_name }}</p> }
              </div>
              <div class="text-right flex-shrink-0">
                <span [class]="lineStatusClass(line.status)">{{ line.status }}</span>
                <p class="text-xs text-gray-500 mt-1">
                  {{ +line.received_quantity }} / {{ +line.ordered_quantity }} received
                </p>
                <p class="text-xs font-medium text-gray-700 mt-0.5">{{ formatValue(line.line_total) }}</p>
              </div>
            </div>
            <div class="mt-2 h-1.5 bg-gray-100 rounded-full overflow-hidden">
              <div class="h-full bg-sage-500 rounded-full transition-all"
                [style.width.%]="deliveryPct(line)"></div>
            </div>
          </div>
        }
      }
    </div>
  </div>
</div>
}

<!-- ── Send Email Modal ────────────────────────────────────────────── -->
@if (showSendModal()) {
<div class="fixed inset-0 bg-black/40 z-50 flex items-center justify-center px-4">
  <div class="bg-white rounded-2xl shadow-xl w-full max-w-md p-6">
    <h3 class="font-semibold text-gray-800 mb-4">
      {{ detailPo()!.emailed_count > 0 ? 'Re-send PO to Vendor' : 'Send PO to Vendor' }}
    </h3>
    <div class="space-y-3">
      <div>
        <label class="block text-xs text-gray-500 font-medium mb-1">Vendor Email</label>
        <input type="email" [(ngModel)]="sendEmail"
          class="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-sage-500">
      </div>
      <div>
        <label class="block text-xs text-gray-500 font-medium mb-1">Hotel Name</label>
        <input type="text" [(ngModel)]="sendHotelName"
          class="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-sage-500">
      </div>
      <div>
        <label class="block text-xs text-gray-500 font-medium mb-1">Your Name</label>
        <input type="text" [(ngModel)]="sendByName"
          class="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-sage-500">
      </div>
    </div>
    <div class="flex gap-3 mt-5">
      <button (click)="confirmSend()" [disabled]="actioning()"
        class="flex-1 py-2.5 bg-blue-600 text-white text-sm font-medium rounded-xl hover:bg-blue-700 disabled:opacity-60">
        {{ actioning() ? 'Sending…' : 'Send Email' }}
      </button>
      <button (click)="showSendModal.set(false)"
        class="flex-1 py-2.5 border border-gray-200 text-gray-600 text-sm rounded-xl hover:bg-gray-50">
        Cancel
      </button>
    </div>
  </div>
</div>
}

<!-- ── Create PO Modal ────────────────────────────────────────────── -->
@if (showCreate()) {
<div class="fixed inset-0 bg-black/40 z-50 flex items-start justify-center pt-8 px-4">
  <div class="bg-white rounded-2xl shadow-xl w-full max-w-3xl max-h-[90vh] overflow-y-auto">
    <div class="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
      <h2 class="font-semibold text-gray-800">New Purchase Order</h2>
      <button (click)="closeCreate()" class="text-gray-400 hover:text-gray-600 text-xl">×</button>
    </div>
    <div class="px-6 py-5 space-y-4">

      <!-- Open-market toggle -->
      <div class="flex items-center justify-between p-4 rounded-xl border border-amber-200 bg-amber-50">
        <div>
          <p class="text-sm font-medium text-amber-800">Open-Market Purchase</p>
          <p class="text-xs text-amber-600 mt-0.5">
            Use when buying from local markets or one-time suppliers not in the vendor registry.
            POs above ₦50,000 require a second approval from a Property Admin before sending.
          </p>
        </div>
        <button type="button"
          (click)="createForm.is_open_market = !createForm.is_open_market; onOpenMarketToggle()"
          [class]="createForm.is_open_market
            ? 'relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent bg-amber-500 transition-colors'
            : 'relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent bg-gray-200 transition-colors'">
          <span [class]="createForm.is_open_market ? 'translate-x-5' : 'translate-x-0'"
            class="pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition-transform"></span>
        </button>
      </div>

      <!-- Standard: vendor + linked PR -->
      @if (!createForm.is_open_market) {
        <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label class="block text-xs text-gray-500 font-medium mb-1">Vendor <span class="text-red-500">*</span></label>
            <select [(ngModel)]="createForm.vendor_id" (ngModelChange)="onVendorChange()"
              class="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-sage-500">
              <option value="">Select vendor…</option>
              @for (v of vendors(); track v.id) {
                <option [value]="v.id">{{ v.name }}</option>
              }
            </select>
          </div>
          <div>
            <label class="block text-xs text-gray-500 font-medium mb-1">
              Linked PR <span class="text-gray-400">(optional)</span>
            </label>
            <select [(ngModel)]="createForm.request_id"
              class="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-sage-500">
              <option value="">None</option>
              @for (pr of approvedPrs(); track pr.id) {
                <option [value]="pr.id">{{ pr.reference_number }} — {{ pr.title }}</option>
              }
            </select>
          </div>
        </div>
      }

      <!-- Open-market: supplier name + reason -->
      @if (createForm.is_open_market) {
        <div class="grid grid-cols-1 gap-4 p-4 bg-amber-50 rounded-xl border border-amber-200">
          <div>
            <label class="block text-xs text-amber-700 font-medium mb-1">
              Supplier Name <span class="text-red-500">*</span>
            </label>
            <input type="text" [(ngModel)]="createForm.open_market_vendor_name"
              placeholder="e.g. Mile 12 Market, Local Provisions Store…"
              class="w-full border border-amber-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400 bg-white">
          </div>
          <div>
            <label class="block text-xs text-amber-700 font-medium mb-1">
              Reason <span class="text-red-500">*</span>
            </label>
            <textarea [(ngModel)]="createForm.open_market_reason" rows="2"
              placeholder="e.g. Registered vendors out of stock; emergency weekend purchase…"
              class="w-full border border-amber-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400 bg-white"></textarea>
          </div>
        </div>
      }

      <!-- Dates + payment terms -->
      <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label class="block text-xs text-gray-500 font-medium mb-1">Expected Delivery Date</label>
          <input type="date" [(ngModel)]="createForm.expected_delivery_date"
            class="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-sage-500">
        </div>
        <div>
          <label class="block text-xs text-gray-500 font-medium mb-1">Payment Terms</label>
          <select [(ngModel)]="createForm.payment_terms"
            class="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-sage-500">
            <option value="cod">Cash on Delivery</option>
            <option value="net7">Net 7 Days</option>
            <option value="net15">Net 15 Days</option>
            <option value="net30">Net 30 Days</option>
          </select>
        </div>
      </div>

      <div>
        <label class="block text-xs text-gray-500 font-medium mb-1">Delivery Address</label>
        <textarea [(ngModel)]="createForm.delivery_address" rows="2"
          class="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-sage-500"></textarea>
      </div>
      <div>
        <label class="block text-xs text-gray-500 font-medium mb-1">Notes</label>
        <textarea [(ngModel)]="createForm.notes" rows="2"
          class="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-sage-500"></textarea>
      </div>

      <div class="grid grid-cols-2 gap-4">
        <div>
          <label class="block text-xs text-gray-500 font-medium mb-1">Tax / VAT (₦)</label>
          <input type="number" [(ngModel)]="createForm.tax_naira" min="0" step="0.01" placeholder="0.00"
            class="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-sage-500">
        </div>
        <div>
          <label class="block text-xs text-gray-500 font-medium mb-1">Your Name</label>
          <input type="text" [(ngModel)]="createForm.created_by_name"
            class="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-sage-500">
        </div>
      </div>

      <!-- PO Lines -->
      <div>
        <div class="flex items-center justify-between mb-2">
          <p class="text-sm font-medium text-gray-700">Order Items <span class="text-red-500">*</span></p>
          <button (click)="addPoLine()"
            class="px-3 py-1.5 text-xs bg-sage-50 text-sage-700 rounded-lg hover:bg-sage-100">+ Add Item</button>
        </div>
        @if (poLines().length === 0) {
          <p class="text-sm text-gray-400 italic text-center py-4">Add at least one item to order</p>
        }
        @for (line of poLines(); track $index; let i = $index) {
          <div class="border border-gray-200 rounded-lg p-3 mb-2">
            <div class="grid grid-cols-1 sm:grid-cols-4 gap-2">
              <div class="sm:col-span-2">
                <label class="block text-xs text-gray-400 mb-1">Item <span class="text-red-400">*</span></label>
                @if (!line.item_id) {
                  <input type="text" [(ngModel)]="poLineSearch[i]" (ngModelChange)="onPoLineSearch(i)"
                    placeholder="Search item…"
                    class="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-sage-500">
                  @if ((poLineResults[i] ?? []).length > 0) {
                    <div class="border border-gray-200 rounded-lg mt-1 max-h-32 overflow-y-auto bg-white shadow-sm">
                      @for (si of poLineResults[i]; track si.id) {
                        <button type="button" (click)="selectPoItem(i, si)"
                          class="w-full text-left px-3 py-1.5 text-sm hover:bg-sage-50 flex gap-2">
                          <span class="font-mono text-xs text-gray-400">{{ si.sku }}</span>
                          <span>{{ si.name }}</span>
                        </button>
                      }
                    </div>
                  }
                } @else {
                  <div class="flex items-center gap-2 border border-gray-200 rounded-lg px-3 py-2 text-sm bg-sage-50">
                    <span class="flex-1">{{ line.item_name }}</span>
                    <button type="button" (click)="clearPoItem(i)" class="text-xs text-gray-400 hover:text-red-500">✕</button>
                  </div>
                }
              </div>
              <div>
                <label class="block text-xs text-gray-400 mb-1">Qty <span class="text-red-400">*</span></label>
                <input type="number" [(ngModel)]="line.ordered_quantity" min="0.001" step="0.001"
                  class="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-sage-500">
              </div>
              <div>
                <label class="block text-xs text-gray-400 mb-1">Unit Cost (₦) <span class="text-red-400">*</span></label>
                <input type="number" [(ngModel)]="line.unit_cost" min="0" step="0.01"
                  class="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-sage-500">
              </div>
            </div>
            <div class="flex gap-2 mt-2 items-center">
              <select [(ngModel)]="line.location_id" (ngModelChange)="onPoLocationChange(i)"
                class="flex-1 border border-gray-200 rounded-lg px-3 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-sage-500">
                <option value="">No specific location</option>
                @for (loc of locations(); track loc.id) {
                  <option [value]="loc.id">{{ loc.name }}</option>
                }
              </select>
              <span class="text-xs font-medium text-gray-600 whitespace-nowrap">= {{ lineTotal(line) }}</span>
              <button type="button" (click)="removePoLine(i)"
                class="px-2 py-1.5 text-red-500 border border-red-200 rounded-lg text-xs hover:bg-red-50">×</button>
            </div>
          </div>
        }
      </div>

      <!-- Totals -->
      @if (poLines().length > 0) {
        <div class="bg-gray-50 rounded-xl p-4 text-sm space-y-1">
          <div class="flex justify-between text-gray-500">
            <span>Subtotal</span><span>{{ poSubtotal() }}</span>
          </div>
          <div class="flex justify-between text-gray-500">
            <span>Tax / VAT</span>
            <span>{{ '₦' + (+(createForm.tax_naira || 0)).toLocaleString('en-NG', {minimumFractionDigits:2}) }}</span>
          </div>
          <div class="flex justify-between font-bold text-gray-800 border-t border-gray-200 pt-1">
            <span>Total</span><span>{{ poTotal() }}</span>
          </div>
          @if (createForm.is_open_market && poTotalKobo() >= 5000000) {
            <div class="mt-2 pt-2 border-t border-amber-200 flex items-start gap-2 text-xs text-amber-700">
              <span>⚠</span>
              <span>This PO exceeds ₦50,000 and will require a second approval before it can be sent.</span>
            </div>
          }
        </div>
      }
    </div>

    <div class="px-6 pb-5 flex gap-3">
      <button (click)="submitCreate()" [disabled]="creating()"
        class="flex-1 py-2.5 bg-sage-600 text-white text-sm font-medium rounded-xl hover:bg-sage-700 disabled:opacity-60">
        {{ creating() ? 'Saving…' : 'Create Purchase Order' }}
      </button>
      <button (click)="closeCreate()"
        class="flex-1 py-2.5 border border-gray-200 text-gray-600 text-sm rounded-xl hover:bg-gray-50">
        Cancel
      </button>
    </div>
  </div>
</div>
}
  `,
})
export class PurchaseOrdersPage implements OnInit {
  private api     = inject(ApiService);
  private toast   = inject(ToastService);
  private propSvc = inject(ActivePropertyService);
  private route   = inject(ActivatedRoute);
  router          = inject(Router);

  loading       = signal(true);
  actioning     = signal(false);
  creating      = signal(false);
  loadingLines  = signal(false);
  showCreate    = signal(false);
  showSendModal = signal(false);

  orders      = signal<PurchaseOrder[]>([]);
  total       = signal(0);
  page        = signal(1);
  lastPage    = signal(1);
  detailPo    = signal<PurchaseOrder | null>(null);
  detailLines = signal<any[]>([]);

  vendors     = signal<Vendor[]>([]);
  stockItems  = signal<StockItem[]>([]);
  locations   = signal<StockLocation[]>([]);
  approvedPrs = signal<PrSummary[]>([]);

  filterStatus     = '';
  filterOpenMarket = false;

  sendEmail     = '';
  sendHotelName = '';
  sendByName    = '';

  createForm = {
    is_open_market: false,
    vendor_id: '', request_id: '',
    open_market_vendor_name: '', open_market_reason: '',
    expected_delivery_date: '', delivery_address: '', notes: '',
    payment_terms: 'net30', tax_naira: 0, created_by_name: '',
  };

  poLines       = signal<PoLine[]>([]);
  poLineSearch: string[] = [];
  poLineResults: StockItem[][] = [];

  poSubtotal = computed(() => {
    const kobo = this.poLines().reduce((s, l) =>
      s + (l.ordered_quantity ?? 0) * Math.round((l.unit_cost ?? 0) * 100), 0);
    return '₦' + (kobo / 100).toLocaleString('en-NG', { minimumFractionDigits: 2 });
  });

  poTotalKobo = computed(() => {
    const subKobo = this.poLines().reduce((s, l) =>
      s + (l.ordered_quantity ?? 0) * Math.round((l.unit_cost ?? 0) * 100), 0);
    return subKobo + Math.round((this.createForm.tax_naira ?? 0) * 100);
  });

  poTotal = computed(() =>
    '₦' + (this.poTotalKobo() / 100).toLocaleString('en-NG', { minimumFractionDigits: 2 })
  );

  statusTabs = [
    { key: '',                    label: 'All' },
    { key: 'draft',               label: 'Draft' },
    { key: 'sent',                label: 'Sent' },
    { key: 'partially_delivered', label: 'Partial' },
    { key: 'delivered',           label: 'Delivered' },
    { key: 'cancelled',           label: 'Cancelled' },
  ];

  ngOnInit() {
    this.loadReferenceData();
    this.load();
    this.route.queryParams.subscribe(q => {
      if (q['request_id']) { this.createForm.request_id = q['request_id']; this.openCreate(); }
    });
  }

  load(): void {
    this.loading.set(true);
    const pid = this.propSvc.propertyId();
    const params: any = { page: this.page(), per_page: 30 };
    if (this.filterStatus)     params['status']         = this.filterStatus;
    if (this.filterOpenMarket) params['is_open_market']  = true;
    if (pid)                   params['property_id']    = pid;

    this.api.get('/procurement/orders', params).subscribe({
      next: r => {
        this.orders.set(r.data ?? []);
        this.total.set(r.meta?.total ?? 0);
        this.lastPage.set(r.meta?.last_page ?? r.meta?.pages ?? 1);
        this.loading.set(false);
      },
      error: () => { this.toast.error('Failed to load purchase orders'); this.loading.set(false); },
    });
  }

  loadReferenceData(): void {
    this.api.get('/procurement/vendors', { active_only: true }).subscribe({ next: r => this.vendors.set(r.data ?? []) });
    this.api.get('/inventory/items', { per_page: 500, active_only: true }).subscribe({ next: r => this.stockItems.set(r.data ?? []) });
    this.api.get('/inventory/locations', {}).subscribe({ next: r => this.locations.set(r.data ?? []) });
    this.api.get('/procurement/requests', { status: 'approved', per_page: 100 }).subscribe({
      next: r => this.approvedPrs.set((r.data ?? []).map((p: any) => ({
        id: p.id, reference_number: p.reference_number, title: p.title,
      }))),
    });
  }

  changePage(p: number): void { this.page.set(p); this.load(); }

  openDetail(po: PurchaseOrder): void { this.detailPo.set(po); this.loadLines(po.id); }
  closeDetail(): void { this.detailPo.set(null); this.detailLines.set([]); }

  loadLines(poId: string): void {
    this.loadingLines.set(true);
    this.api.get(`/procurement/orders/${poId}`).subscribe({
      next: r => { this.detailLines.set(r.data?.lines ?? []); this.loadingLines.set(false); },
      error: () => this.loadingLines.set(false),
    });
  }

  secondApprove(): void {
    if (!confirm('Approve this open-market purchase order? It will then be sendable.')) return;
    this.actioning.set(true);
    this.api.post(`/procurement/orders/${this.detailPo()!.id}/second-approve`, {}).subscribe({
      next: r => {
        this.toast.success('Purchase order approved');
        this.detailPo.set(r.data);
        this.actioning.set(false);
        this.load();
      },
      error: (e: any) => { this.toast.error(e.error?.message ?? 'Failed to approve'); this.actioning.set(false); },
    });
  }

  openSendModal(): void {
    this.sendEmail = this.detailPo()!.vendor_email ?? '';
    this.sendHotelName = '';
    this.sendByName = '';
    this.showSendModal.set(true);
  }

  confirmSend(): void {
    this.actioning.set(true);
    this.api.post(`/procurement/orders/${this.detailPo()!.id}/send`, {
      override_email: this.sendEmail || null,
      hotel_name:     this.sendHotelName || null,
      sent_by_name:   this.sendByName || 'Staff',
    }).subscribe({
      next: r => {
        this.toast.success(r.message ?? 'PO sent');
        this.detailPo.set(r.data);
        this.showSendModal.set(false);
        this.actioning.set(false);
        this.load();
      },
      error: (e: any) => { this.toast.error(e.error?.message ?? 'Failed to send'); this.actioning.set(false); },
    });
  }

  recordGrn(): void {
    const po = this.detailPo(); if (!po) return;
    this.closeDetail();
    this.router.navigate(['/inventory/grn'], { queryParams: { purchase_order_id: po.id } });
  }

  cancelPo(id: string): void {
    if (!confirm('Cancel this purchase order?')) return;
    this.actioning.set(true);
    this.api.post(`/procurement/orders/${id}/cancel`, {}).subscribe({
      next: r => {
        this.toast.success('Purchase order cancelled');
        this.detailPo.set(r.data);
        this.actioning.set(false);
        this.load();
      },
      error: (e: any) => { this.toast.error(e.error?.message ?? 'Failed'); this.actioning.set(false); },
    });
  }

  openCreate(): void {
    if (!this.createForm.request_id) {
      this.createForm = {
        is_open_market: false, vendor_id: '', request_id: '',
        open_market_vendor_name: '', open_market_reason: '',
        expected_delivery_date: '', delivery_address: '', notes: '',
        payment_terms: 'net30', tax_naira: 0, created_by_name: '',
      };
    }
    this.poLines.set([]); this.poLineSearch = []; this.poLineResults = [];
    this.showCreate.set(true);
  }
  closeCreate(): void { this.showCreate.set(false); }

  onOpenMarketToggle(): void {
    this.createForm.vendor_id = '';
    this.createForm.open_market_vendor_name = '';
    this.createForm.open_market_reason = '';
  }

  onVendorChange(): void {
    const v = this.vendors().find(v => v.id === this.createForm.vendor_id);
    if (v) this.createForm.payment_terms = v.payment_terms;
  }

  addPoLine(): void {
    this.poLines.update(ls => [...ls, blankLine()]);
    this.poLineSearch.push(''); this.poLineResults.push([]);
  }

  removePoLine(i: number): void {
    this.poLines.update(ls => ls.filter((_, idx) => idx !== i));
    this.poLineSearch.splice(i, 1); this.poLineResults.splice(i, 1);
  }

  onPoLineSearch(i: number): void {
    const q = this.poLineSearch[i]?.toLowerCase() ?? '';
    this.poLineResults[i] = q.length < 1 ? [] :
      this.stockItems().filter(s =>
        s.name.toLowerCase().includes(q) || s.sku.toLowerCase().includes(q)
      ).slice(0, 8);
  }

  selectPoItem(i: number, si: StockItem): void {
    this.poLines.update(ls => {
      const copy = [...ls];
      copy[i] = { ...copy[i], item_id: si.id, item_sku: si.sku, item_name: si.name };
      return copy;
    });
    this.poLineSearch[i] = ''; this.poLineResults[i] = [];
  }

  clearPoItem(i: number): void {
    this.poLines.update(ls => {
      const copy = [...ls];
      copy[i] = { ...copy[i], item_id: '', item_sku: '', item_name: '' };
      return copy;
    });
  }

  onPoLocationChange(i: number): void {
    const name = this.locations().find(l => l.id === this.poLines()[i].location_id)?.name ?? '';
    this.poLines.update(ls => { const copy = [...ls]; copy[i] = { ...copy[i], location_name: name }; return copy; });
  }

  lineTotal(line: PoLine): string {
    const kobo = (line.ordered_quantity ?? 0) * Math.round((line.unit_cost ?? 0) * 100);
    return '₦' + (kobo / 100).toLocaleString('en-NG', { minimumFractionDigits: 2 });
  }

  submitCreate(): void {
    const isOM = this.createForm.is_open_market;
    if (!isOM && !this.createForm.vendor_id)                       { this.toast.error('Please select a vendor'); return; }
    if (isOM && !this.createForm.open_market_vendor_name.trim())   { this.toast.error('Supplier name is required'); return; }
    if (isOM && !this.createForm.open_market_reason.trim())        { this.toast.error('Reason is required'); return; }

    const lines = this.poLines();
    if (!lines.length) { this.toast.error('Add at least one item'); return; }
    for (const l of lines) {
      if (!l.item_id)                               { this.toast.error('All lines must have an item selected'); return; }
      if (!l.ordered_quantity || l.ordered_quantity <= 0) { this.toast.error('All quantities must be > 0'); return; }
      if (l.unit_cost === null || l.unit_cost < 0)  { this.toast.error('Unit costs must be ≥ 0'); return; }
    }

    this.creating.set(true);
    const payload: any = {
      is_open_market:         isOM,
      request_id:             this.createForm.request_id || null,
      property_id:            this.propSvc.propertyId() ?? '',
      expected_delivery_date: this.createForm.expected_delivery_date || null,
      delivery_address:       this.createForm.delivery_address || null,
      notes:                  this.createForm.notes || null,
      payment_terms:          this.createForm.payment_terms,
      tax_value:              Math.round((this.createForm.tax_naira ?? 0) * 100),
      created_by_name:        this.createForm.created_by_name || 'Staff',
      lines: lines.map(l => ({
        item_id: l.item_id, item_sku: l.item_sku, item_name: l.item_name,
        location_id: l.location_id || null, location_name: l.location_name || null,
        ordered_quantity: l.ordered_quantity,
        unit_cost: Math.round((l.unit_cost ?? 0) * 100),
        notes: l.notes || null,
      })),
    };

    if (isOM) {
      payload.open_market_vendor_name = this.createForm.open_market_vendor_name.trim();
      payload.open_market_reason      = this.createForm.open_market_reason.trim();
    } else {
      payload.vendor_id = this.createForm.vendor_id;
    }

    this.api.post('/procurement/orders', payload).subscribe({
      next: (r) => {
        const po = r.data as PurchaseOrder;
        if (po.is_pending_second_approval) {
          this.toast.info('PO created — awaiting second approval (total exceeds ₦50,000).');
        } else {
          this.toast.success('Purchase order created');
        }
        this.creating.set(false); this.closeCreate(); this.load();
      },
      error: (e: any) => { this.toast.error(e.error?.message ?? 'Failed to create PO'); this.creating.set(false); },
    });
  }

  formatDate(d: string): string {
    return new Date(d).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
  }
  formatValue(kobo: string | number): string {
    return '₦' + (parseInt(String(kobo ?? '0'), 10) / 100).toLocaleString('en-NG', { minimumFractionDigits: 2 });
  }
  termsLabel(t: string): string {
    return ({ cod: 'Cash on Delivery', net7: 'Net 7', net15: 'Net 15', net30: 'Net 30' } as any)[t] ?? t;
  }
  statusClass(s: string): string {
    return ({
      draft:               'px-2 py-0.5 rounded-lg text-xs font-medium bg-gray-100 text-gray-600',
      sent:                'px-2 py-0.5 rounded-lg text-xs font-medium bg-blue-50 text-blue-700',
      partially_delivered: 'px-2 py-0.5 rounded-lg text-xs font-medium bg-orange-50 text-orange-700',
      delivered:           'px-2 py-0.5 rounded-lg text-xs font-medium bg-green-50 text-green-700',
      cancelled:           'px-2 py-0.5 rounded-lg text-xs font-medium bg-gray-100 text-gray-400',
    } as any)[s] ?? 'px-2 py-0.5 rounded-lg text-xs font-medium bg-gray-100 text-gray-500';
  }
  lineStatusClass(s: string): string {
    return ({
      pending:  'px-1.5 py-0.5 rounded text-xs bg-gray-100 text-gray-500',
      partial:  'px-1.5 py-0.5 rounded text-xs bg-orange-50 text-orange-600',
      received: 'px-1.5 py-0.5 rounded text-xs bg-green-50 text-green-700',
      cancelled:'px-1.5 py-0.5 rounded text-xs bg-gray-100 text-gray-400',
    } as any)[s] ?? 'px-1.5 py-0.5 rounded text-xs bg-gray-100 text-gray-500';
  }
  deliveryPct(line: any): number {
    const o = parseFloat(line.ordered_quantity ?? '0');
    const r = parseFloat(line.received_quantity ?? '0');
    return o === 0 ? 0 : Math.min(100, Math.round((r / o) * 100));
  }
}

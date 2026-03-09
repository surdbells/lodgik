import { Component, inject, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ApiService, PageHeaderComponent, LoadingSpinnerComponent, ToastService, AuthService, StatsCardComponent, ActivePropertyService, ConfirmDialogService, ConfirmDialogComponent, QrFileUploadComponent } from '@lodgik/shared';

@Component({
  selector: 'app-expenses',
  standalone: true,
  imports: [FormsModule, PageHeaderComponent, LoadingSpinnerComponent, StatsCardComponent, ConfirmDialogComponent, QrFileUploadComponent],
  template: `
    <ui-confirm-dialog/>
    <ui-page-header title="Expenses" icon="receipt" [breadcrumbs]="['Finance', 'Expenses']" subtitle="Track and approve operational expenses">
      <div class="flex gap-2">
        <button (click)="showCatMgmt = !showCatMgmt; showForm = false; showVendorMgmt = false" class="px-3 py-2 text-sm border border-gray-300 rounded-lg hover:bg-gray-50">{{ showCatMgmt ? 'Close' : 'Categories' }}</button>
        <button (click)="showVendorMgmt = !showVendorMgmt; showForm = false; showCatMgmt = false" class="px-3 py-2 text-sm border border-gray-300 rounded-lg hover:bg-gray-50">{{ showVendorMgmt ? 'Close' : 'Vendors' }}</button>
        <button (click)="showForm = !showForm; showCatMgmt = false; showVendorMgmt = false" class="px-4 py-2 bg-sage-600 text-white text-sm rounded-xl hover:bg-sage-700">{{ showForm ? 'Cancel' : '+ New Expense' }}</button>
      </div>
    </ui-page-header>

    @if (showCatMgmt) {
      <div class="bg-white rounded-xl border border-gray-100 shadow-card p-5 mb-6">
        <h3 class="text-sm font-semibold text-gray-700 mb-3">Expense Categories</h3>
        <div class="flex flex-wrap gap-2 mb-3">
          @for (c of categories(); track c.id) { <span class="px-3 py-1.5 bg-gray-100 rounded-lg text-sm">{{ c.name }}</span> }
          @if (categories().length === 0) { <span class="text-sm text-gray-400">No categories yet</span> }
        </div>
        <div class="flex gap-2">
          <input [(ngModel)]="newCatName" placeholder="Category name" class="px-3 py-2 border border-gray-200 rounded-xl text-sm bg-gray-50 flex-1" (keyup.enter)="addCategory()">
          <button (click)="addCategory()" class="px-4 py-2 bg-sage-600 text-white text-sm rounded-xl hover:bg-sage-700">Add</button>
        </div>
      </div>
    }

    @if (showVendorMgmt) {
      <div class="bg-white rounded-xl border border-gray-100 shadow-card p-5 mb-6">
        <h3 class="text-sm font-semibold text-gray-700 mb-3">Vendors</h3>
        <div class="flex flex-wrap gap-2 mb-3">
          @for (v of vendors(); track v) {
            <span class="px-3 py-1.5 bg-gray-100 rounded-lg text-sm flex items-center gap-1">{{ v }}
              <button (click)="removeVendor(v)" class="text-gray-400 hover:text-red-500 ml-1">×</button>
            </span>
          }
          @if (vendors().length === 0) { <span class="text-sm text-gray-400">No vendors — add below</span> }
        </div>
        <div class="flex gap-2">
          <input [(ngModel)]="newVendor" placeholder="Vendor name" class="px-3 py-2 border border-gray-200 rounded-xl text-sm bg-gray-50 flex-1" (keyup.enter)="addVendor()">
          <button (click)="addVendor()" class="px-4 py-2 bg-sage-600 text-white text-sm rounded-xl hover:bg-sage-700">Add</button>
        </div>
      </div>
    }

    @if (showForm) {
      <div class="bg-white rounded-xl border border-gray-100 shadow-card p-5 mb-6">
        <h3 class="text-sm font-semibold text-gray-700 mb-3">Submit Expense</h3>
        <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div><label class="block text-xs text-gray-500 mb-1">Category</label>
            <select [(ngModel)]="form.category_id" (ngModelChange)="onCatChange()" class="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm bg-gray-50">
              <option value="">Select category</option>
              @for (c of categories(); track c.id) { <option [value]="c.id">{{ c.name }}</option> }
            </select></div>
          <div><label class="block text-xs text-gray-500 mb-1">Amount (₦)</label>
            <input type="number" [(ngModel)]="form.amount" step="0.01" class="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm bg-gray-50" placeholder="0.00"></div>
          <div><label class="block text-xs text-gray-500 mb-1">Date</label>
            <input type="date" [(ngModel)]="form.expense_date" class="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm bg-gray-50"></div>
          <div><label class="block text-xs text-gray-500 mb-1">Vendor</label>
            <select [(ngModel)]="form.vendor" class="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm bg-gray-50">
              <option value="">Select vendor</option>
              @for (v of vendors(); track v) { <option [value]="v">{{ v }}</option> }
              <option value="__other">+ Other</option>
            </select>
            @if (form.vendor === '__other') {
              <input [(ngModel)]="form.vendorOther" placeholder="Vendor name" class="w-full mt-2 px-3 py-2 border border-gray-200 rounded-xl text-sm bg-gray-50">
            }</div>
          <div><label class="block text-xs text-gray-500 mb-1">Payment Method</label>
            <select [(ngModel)]="form.payment_method" class="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm bg-gray-50">
              <option value="cash">Cash</option><option value="bank_transfer">Bank Transfer</option>
              <option value="card">Card</option><option value="petty_cash">Petty Cash</option>
            </select></div>
          <div><label class="block text-xs text-gray-500 mb-1">Reference #</label>
            <input [(ngModel)]="form.reference" class="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm bg-gray-50" placeholder="Receipt number"></div>

          <!-- Phase 5: Vendor type for market/walk-in purchases -->
          <div class="col-span-full mt-2 pt-3 border-t border-gray-100">
            <label class="block text-xs font-medium text-gray-500 mb-2">Purchase Type</label>
            <div class="flex gap-2">
              @for (vt of vendorTypes; track vt.value) {
                <button type="button" (click)="form.vendor_type = vt.value"
                  class="px-3 py-1.5 text-xs rounded-lg border transition-colors"
                  [class.bg-sage-600]="form.vendor_type === vt.value"
                  [class.text-white]="form.vendor_type === vt.value"
                  [class.border-sage-600]="form.vendor_type === vt.value"
                  [class.text-gray-600]="form.vendor_type !== vt.value"
                  [class.border-gray-200]="form.vendor_type !== vt.value">
                  {{ vt.label }}
                </button>
              }
            </div>
            @if (form.vendor_type === 'market' || form.vendor_type === 'petty_cash') {
              <div class="mt-3 p-3 bg-amber-50 border border-amber-100 rounded-lg space-y-2">
                <p class="text-xs text-amber-700 font-medium">⚠️ Market/petty-cash purchases require a receipt or signed note.</p>
                <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label class="block text-xs font-medium text-gray-500 mb-1">Market Vendor Name *</label>
                    <input [(ngModel)]="form.market_vendor_name" placeholder="e.g. Balogun Market Trader" class="w-full px-3 py-2 border rounded-lg text-sm">
                  </div>
                  <ui-qr-file-upload
                    context="document"
                    label="Receipt Photo"
                    [currentUrl]="form.receipt_url"
                    (uploaded)="form.receipt_url = $event.url; form.receipt_filename = $event.original"
                    (cleared)="form.receipt_url = ''; form.receipt_filename = ''"
                  />
                  <ui-qr-file-upload
                    context="document"
                    label="Signed Note (if no receipt)"
                    [currentUrl]="form.signed_note_url"
                    (uploaded)="form.signed_note_url = $event.url; form.note_filename = $event.original"
                    (cleared)="form.signed_note_url = ''; form.note_filename = ''"
                  />
                </div>
              </div>
            }
          </div>
          <div class="md:col-span-3"><label class="block text-xs text-gray-500 mb-1">Description</label>
            <textarea [(ngModel)]="form.description" rows="2" class="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm bg-gray-50" placeholder="What was purchased and why"></textarea></div>
        </div>
        <div class="flex gap-2 mt-4">
          <button (click)="submitExpense()" class="px-4 py-2 bg-sage-600 text-white text-sm rounded-xl hover:bg-sage-700">Submit</button>
          <button (click)="showForm = false" class="px-4 py-2 text-sm text-gray-500 border border-gray-300 rounded-xl">Cancel</button>
        </div>
      </div>
    }

    <ui-loading [loading]="loading()"></ui-loading>
    @if (!loading()) {
      <div class="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
        <ui-stats-card label="Total Expenses" [value]="'₦' + totalAmt().toLocaleString()" icon="receipt"></ui-stats-card>
        <ui-stats-card label="Pending" [value]="pendingCt()" icon="clock"></ui-stats-card>
        <ui-stats-card label="Approved" [value]="approvedCt()" icon="circle-check"></ui-stats-card>
        <ui-stats-card label="This Month" [value]="'₦' + monthAmt().toLocaleString()" icon="trending-up"></ui-stats-card>
      </div>

      <!-- Phase 5: Pending second-approval alert queue -->
      @if (pendingSecondApproval().length > 0) {
        <div class="mb-4 bg-amber-50 border border-amber-200 rounded-xl p-4">
          <p class="text-xs font-semibold text-amber-800 mb-3">⚠️ {{ pendingSecondApproval().length }} market/petty-cash purchase(s) awaiting admin second approval</p>
          <div class="space-y-2">
            @for (e of pendingSecondApproval(); track e.id) {
              <div class="flex items-center justify-between bg-white border border-amber-100 rounded-lg px-3 py-2">
                <div>
                  <p class="text-xs font-medium text-gray-800">{{ e.description }}</p>
                  <p class="text-xs text-gray-500">₦{{ fmtAmt(e.amount) }} · {{ e.market_vendor_name || e.vendor || 'Unknown vendor' }} · {{ e.expense_date }}</p>
                  @if (e.spending_limit_breach) {
                    <p class="text-xs text-red-600 font-medium mt-0.5">🚨 Exceeds spending limit</p>
                  }
                </div>
                <button (click)="secondApprove(e.id)" class="ml-4 px-3 py-1.5 bg-amber-600 text-white text-xs rounded-lg hover:bg-amber-700">
                  Second Approve
                </button>
              </div>
            }
          </div>
        </div>
      }

      <div class="flex gap-2 mb-4">
        @for (f of statusFilters; track f.value) {
          <button (click)="filterStatus = f.value; loadExpenses()" [class]="filterStatus === f.value ? 'px-3 py-1.5 bg-sage-600 text-white rounded-full text-xs font-medium' : 'px-3 py-1.5 border border-gray-300 text-gray-500 rounded-full text-xs'">{{ f.label }}</button>
        }
      </div>
      <div class="bg-white rounded-xl border border-gray-100 shadow-card overflow-x-auto">
        <table class="w-full text-sm">
          <thead class="bg-gray-50 border-b"><tr>
            <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
            <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Category</th>
            <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Description</th>
            <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Vendor</th>
            <th class="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Amount</th>
            <th class="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">Status</th>
            <th class="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">Actions</th>
          </tr></thead>
          <tbody>
            @for (e of expenses(); track e.id) {
              <tr class="border-t hover:bg-gray-50">
                <td class="px-4 py-3 whitespace-nowrap">{{ e.expense_date }}</td>
                <td class="px-4 py-3">{{ e.category_name }}</td>
                <td class="px-4 py-3 max-w-[200px] truncate">{{ e.description }}</td>
                <td class="px-4 py-3">
                  {{ e.market_vendor_name || e.vendor || '—' }}
                  @if (e.vendor_type === 'market') { <span class="ml-1 text-xs text-amber-600">🛒</span> }
                  @if (e.vendor_type === 'petty_cash') { <span class="ml-1 text-xs text-blue-600">💵</span> }
                  @if (e.second_approval_required && !e.second_approver_id) {
                    <span class="block text-xs text-red-500 mt-0.5">Needs 2nd approval</span>
                  }
                </td>
                <td class="px-4 py-3 text-right font-semibold">₦{{ fmtAmt(e.amount) }}</td>
                <td class="px-4 py-3 text-center"><span class="px-2 py-1 rounded-full text-xs font-medium" [class]="stCls(e.status)">{{ e.status }}</span></td>
                <td class="px-4 py-3 text-center whitespace-nowrap">
                  @if (e.status === 'draft') { <button (click)="doSubmit(e.id)" class="text-sage-600 hover:underline text-xs mr-2">Submit</button> }
                  @if (e.status === 'pending') {
                    <button (click)="approve(e.id)" class="text-green-600 hover:underline text-xs mr-2">Approve</button>
                    <button (click)="openRejectModal(e.id)" class="text-red-600 hover:underline text-xs">Reject</button>
                  }
                  @if (e.status === 'approved') { <button (click)="markPaid(e.id)" class="text-sage-600 hover:underline text-xs">Paid</button> }
                </td>
              </tr>
            } @empty { <tr><td colspan="7" class="px-4 py-12 text-center text-gray-400">No expenses found</td></tr> }
          </tbody>
        </table>
      </div>
    }
  `
})
export default class ExpensesPage implements OnInit {
  private api = inject(ApiService);
  private auth = inject(AuthService);
  private toast = inject(ToastService);
  private activeProperty = inject(ActivePropertyService);

  loading = signal(true); expenses = signal<any[]>([]); categories = signal<any[]>([]); vendors = signal<string[]>([]);
  totalAmt = signal(0); monthAmt = signal(0); pendingCt = signal(0); approvedCt = signal(0);
  pendingSecondApproval = signal<any[]>([]);
  showForm = false; showCatMgmt = false; showVendorMgmt = false; filterStatus = '';
  newCatName = ''; newVendor = '';
  form: any = {
    category_id: '', category_name: '', amount: '', expense_date: new Date().toISOString().split('T')[0],
    vendor: '', vendorOther: '', description: '', payment_method: 'cash', reference: '',
    // Phase 5: Market purchase fields
    vendor_type: 'registered', market_vendor_name: '', signed_note_url: '',
    receipt_url: '', receipt_filename: '', note_filename: '',
  };
  statusFilters = [{ label: 'All', value: '' }, { label: 'Pending', value: 'pending' }, { label: 'Approved', value: 'approved' }, { label: 'Paid', value: 'paid' }];
  vendorTypes = [
    { value: 'registered', label: '🏪 Registered Vendor' },
    { value: 'market',     label: '🛒 Market / Walk-in' },
    { value: 'petty_cash', label: '💵 Petty Cash' },
  ];
  uploadingReceipt = false; // kept for TS compatibility — no longer used in template
  uploadingNote    = false;
  get pid(): string { return this.activeProperty.propertyId(); }

  ngOnInit(): void { this.loadCategories(); this.loadVendors(); this.loadExpenses(); this.loadPendingSecondApproval(); }

  loadExpenses(): void {
    this.loading.set(true);
    const p: any = { property_id: this.pid }; if (this.filterStatus) p.status = this.filterStatus;
    this.api.get('/expenses', p).subscribe((r: any) => {
      const d = r?.data || []; this.expenses.set(d);
      const mo = new Date().toISOString().slice(0, 7);
      this.totalAmt.set(d.reduce((s: number, e: any) => s + (+e.amount || 0), 0) / 100);
      this.monthAmt.set(d.filter((e: any) => e.expense_date?.startsWith(mo)).reduce((s: number, e: any) => s + (+e.amount || 0), 0) / 100);
      this.pendingCt.set(d.filter((e: any) => e.status === 'pending').length);
      this.approvedCt.set(d.filter((e: any) => e.status === 'approved').length);
      this.loading.set(false);
    });
  }
  loadCategories(): void { this.api.get('/expenses/categories').subscribe((r: any) => this.categories.set(r?.data || [])); }
  loadVendors(): void {
    const s = localStorage.getItem(`lodgik_vendors_${this.pid}`);
    this.vendors.set(s ? JSON.parse(s) : ['Shoprite', 'IBEDC', 'MTN', 'Dangote Cement', 'Total Energies']);
  }
  saveVendors(): void { localStorage.setItem(`lodgik_vendors_${this.pid}`, JSON.stringify(this.vendors())); }
  addCategory(): void {
    if (!this.newCatName.trim()) return;
    this.api.post('/expenses/categories', { name: this.newCatName.trim() }).subscribe((r: any) => {
      if (r.success) { this.toast.success('Category added'); this.newCatName = ''; this.loadCategories(); } else this.toast.error(r.message);
    });
  }
  addVendor(): void { if (!this.newVendor.trim()) return; this.vendors.update(v => [...v, this.newVendor.trim()]); this.saveVendors(); this.newVendor = ''; }
  removeVendor(n: string): void { this.vendors.update(v => v.filter(x => x !== n)); this.saveVendors(); }
  onCatChange(): void { this.form.category_name = this.categories().find((c: any) => c.id === this.form.category_id)?.name || ''; }
  submitExpense(): void {
    if (!this.form.category_id || !this.form.amount || !this.form.description) { this.toast.error('Category, amount, description required'); return; }
    const vendor = this.form.vendor === '__other' ? this.form.vendorOther : this.form.vendor;
    if (vendor && !this.vendors().includes(vendor)) { this.vendors.update(v => [...v, vendor]); this.saveVendors(); }

    // Phase 5: require receipt OR signed note for market purchases
    const isMarket = this.form.vendor_type === 'market' || this.form.vendor_type === 'petty_cash';
    if (isMarket && !this.form.receipt_url && !this.form.signed_note_url) {
      this.toast.error('A receipt URL or signed note URL is required for market/petty cash purchases');
      return;
    }

    const payload: any = {
      property_id: this.pid, category_id: this.form.category_id, category_name: this.form.category_name,
      description: this.form.description, amount: String(Math.round(+this.form.amount * 100)),
      expense_date: this.form.expense_date, vendor, payment_method: this.form.payment_method,
      reference: this.form.reference || undefined,
      // Phase 5 fields
      vendor_type: this.form.vendor_type,
    };
    if (this.form.market_vendor_name) payload.market_vendor_name = this.form.market_vendor_name;
    if (this.form.receipt_url)        payload.receipt_url        = this.form.receipt_url;
    if (this.form.signed_note_url)    payload.signed_note_url    = this.form.signed_note_url;

    this.api.post('/expenses', payload).subscribe((r: any) => {
      if (r.success) {
        this.toast.success('Expense submitted');
        this.showForm = false;
        this.form = {
          category_id: '', category_name: '', amount: '', expense_date: new Date().toISOString().split('T')[0],
          vendor: '', vendorOther: '', description: '', payment_method: 'cash', reference: '',
          vendor_type: 'registered', market_vendor_name: '', signed_note_url: '',
          receipt_url: '', receipt_filename: '', note_filename: '',
        };
        this.loadExpenses();
        this.loadPendingSecondApproval();
      } else this.toast.error(r.message);
    });
  }
  loadPendingSecondApproval(): void {
    this.api.get('/expenses/pending-second-approval', { property_id: this.pid }).subscribe((r: any) => {
      this.pendingSecondApproval.set(r?.data || []);
    });
  }
  secondApprove(id: string): void {
    this.api.post(`/expenses/${id}/second-approve`, { approver_name: 'Admin' }).subscribe((r: any) => {
      if (r?.success) { this.toast.success('Second approval recorded'); this.loadExpenses(); this.loadPendingSecondApproval(); }
      else this.toast.error(r?.message || 'Failed');
    });
  }
  doSubmit(id: string): void { this.api.post(`/expenses/${id}/submit`, {}).subscribe(() => { this.toast.success('Submitted'); this.loadExpenses(); }); }
  approve(id: string): void { this.api.post(`/expenses/${id}/approve`, {}).subscribe(() => { this.toast.success('Approved'); this.loadExpenses(); }); }
  rejectingId = '';
  rejectReason = '';
  showRejectModal = false;
  openRejectModal(id: string): void { this.rejectingId = id; this.rejectReason = ''; this.showRejectModal = true; }
  closeRejectModal(): void { this.showRejectModal = false; }
  confirmReject(): void { if (!this.rejectingId) return; this.api.post(`/expenses/${this.rejectingId}/reject`, { reason: this.rejectReason || 'Rejected by manager' }).subscribe(() => { this.toast.success('Rejected'); this.showRejectModal = false; this.loadExpenses(); }); }
  markPaid(id: string): void { this.api.post(`/expenses/${id}/paid`, { payment_method: 'bank_transfer' }).subscribe(() => { this.toast.success('Paid'); this.loadExpenses(); }); }
  fmtAmt(k: any): string { return (+k / 100).toLocaleString('en-NG', { minimumFractionDigits: 2 }); }
  stCls(s: string): string { return ({ draft: 'bg-gray-100 text-gray-600', pending: 'bg-yellow-100 text-yellow-800', approved: 'bg-green-100 text-green-800', rejected: 'bg-red-100 text-red-800', paid: 'bg-sage-100 text-sage-800' } as any)[s] || 'bg-gray-100'; }
}

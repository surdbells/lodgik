import { Component, NO_ERRORS_SCHEMA, OnInit } from '@angular/core';
import { NativeScriptCommonModule, NativeScriptFormsModule, RouterExtensions } from '@nativescript/angular';
import { ApiService } from '../../services/api.service';

@Component({
  selector: 'ChargeTransfer', standalone: true, imports: [NativeScriptCommonModule, NativeScriptFormsModule], schemas: [NO_ERRORS_SCHEMA],
  template: `
    <ActionBar title="Transfer Charges" class="bg-white"><NavigationButton text="Back" (tap)="router.back()"></NavigationButton></ActionBar>
    <ScrollView><StackLayout class="p-4">
      <Label text="Move charges from your room to another room in your group" textWrap="true" class="text-gray-500 text-sm m-b-4"></Label>

      <!-- Transfer Form -->
      <StackLayout class="bg-white border rounded-xl p-4 m-b-4">
        <Label [text]="'From: Room ' + myRoom" class="font-bold m-b-2"></Label>
        <TextField hint="To Room Number *" [(ngModel)]="toRoom" keyboardType="number" class="input border rounded-lg p-3 m-b-2"></TextField>
        <TextField hint="Description (e.g. Restaurant dinner) *" [(ngModel)]="description" class="input border rounded-lg p-3 m-b-2"></TextField>
        <TextField hint="Amount (₦) *" [(ngModel)]="amount" keyboardType="number" class="input border rounded-lg p-3 m-b-2"></TextField>
        <TextField hint="Reason (optional)" [(ngModel)]="reason" class="input border rounded-lg p-3 m-b-3"></TextField>
        <Button text="Request Transfer" (tap)="submit()" [isEnabled]="canSubmit()" class="bg-blue-600 text-white rounded-xl p-3 font-bold"></Button>
        <Label *ngIf="msg" [text]="msg" class="text-center font-bold m-t-2" [class]="msgOk ? 'text-green' : 'text-red'"></Label>
      </StackLayout>

      <!-- Transfer History -->
      <Label text="Transfer History" class="font-bold m-b-2"></Label>
      <StackLayout *ngFor="let t of transfers" class="bg-white border rounded-xl p-3 m-b-2">
        <Label [text]="'Room ' + t.from_room_number + ' → Room ' + t.to_room_number" class="font-bold"></Label>
        <Label [text]="t.description + ' · ₦' + formatAmount(t.amount)" class="text-sm text-gray-500"></Label>
        <Label [text]="statusLabel(t.status)" class="text-xs font-bold m-t-1" [class]="t.status === 'completed' ? 'text-green' : t.status === 'rejected' ? 'text-red' : 'text-amber'"></Label>
        <Label *ngIf="t.rejection_reason" [text]="'Reason: ' + t.rejection_reason" class="text-xs text-red m-t-1"></Label>
      </StackLayout>
    </StackLayout></ScrollView>
  `,
})
export class ChargeTransferComponent implements OnInit {
  transfers: any[] = []; toRoom = ''; description = ''; amount = ''; reason = '';
  msg = ''; msgOk = true; myRoom = '';

  constructor(private api: ApiService, public router: RouterExtensions) {}
  ngOnInit() { const s = this.api.getSession(); this.myRoom = s?.booking?.room_number || ''; this.load(); }

  load() {
    const s = this.api.getSession(); if (!s?.booking?.id) return;
    this.api.get(`/guest-services/transfers?booking_id=${s.booking.id}`).subscribe({ next: (r: any) => this.transfers = r.data || [] });
  }

  canSubmit(): boolean { return !!(this.toRoom && this.description && +this.amount > 0); }

  submit() {
    const s = this.api.getSession(); if (!s) return;
    // Amount in kobo
    const amountKobo = String(Math.round(+this.amount * 100));
    this.api.post('/guest-services/transfers', {
      property_id: s.property_id, from_booking_id: s.booking.id, from_room_number: this.myRoom,
      to_booking_id: '', to_room_number: this.toRoom,
      requested_by: s.guest.id, requested_by_name: s.guest.name,
      description: this.description, amount: amountKobo, reason: this.reason || undefined,
    }).subscribe({
      next: () => { this.msg = '✅ Transfer requested! Pending staff approval.'; this.msgOk = true; this.toRoom = ''; this.description = ''; this.amount = ''; this.reason = ''; this.load(); },
      error: (e: any) => { this.msg = `❌ ${e.error?.message || 'Failed'}`; this.msgOk = false; },
    });
  }

  formatAmount(kobo: any): string { return ((+kobo || 0) / 100).toLocaleString(); }
  statusLabel(s: string): string { return s === 'pending' ? '⏳ Pending Approval' : s === 'approved' ? '✅ Approved' : s === 'completed' ? '✅ Completed' : '❌ Rejected'; }
}

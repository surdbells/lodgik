import { Component, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { RouterExtensions } from '@nativescript/angular';
import { PosApiService } from '../services/pos-api.service';

@Component({
  selector: 'pos-payment',
  standalone: true,
  template: `
    <ActionBar title="Payment"><NavigationButton text="Back" (tap)="router.back()"></NavigationButton></ActionBar>
    <StackLayout class="p-6">
      <Label text="Total Amount" class="text-center text-muted m-b-2"></Label>
      <Label [text]="'₦' + formatAmount(total)" class="text-center text-4xl font-bold m-b-6"></Label>

      <Label text="Payment Method" class="font-bold m-b-3"></Label>
      <Button text="💵 Cash" (tap)="pay('direct', 'cash')" class="btn btn-lg btn-outline m-b-2 p-4"></Button>
      <Button text="🏦 Bank Transfer" (tap)="pay('direct', 'bank_transfer')" class="btn btn-lg btn-outline m-b-2 p-4"></Button>
      <Button text="💳 POS Card" (tap)="pay('direct', 'pos_card')" class="btn btn-lg btn-outline m-b-2 p-4"></Button>
      <Button text="🏨 Charge to Room" (tap)="pay('room_charge', null)" class="btn btn-lg btn-primary m-b-2 p-4"></Button>

      <Label *ngIf="success" text="✅ Payment recorded!" class="text-center text-success text-lg m-t-4"></Label>
      <Label *ngIf="error" [text]="error" class="text-center text-danger m-t-4"></Label>
    </StackLayout>
  `,
})
export class PaymentComponent implements OnInit {
  total = '0';
  success = false;
  error = '';
  private orderId = '';

  constructor(private route: ActivatedRoute, private api: PosApiService, public router: RouterExtensions) {}
  ngOnInit() { this.orderId = this.route.snapshot.params['id']; }

  pay(type: string, method: string | null) {
    this.error = ''; this.success = false;
    this.api.payOrder(this.orderId, { payment_type: type, payment_method: method }).subscribe({
      next: () => { this.success = true; setTimeout(() => this.router.navigate(['/tables'], { clearHistory: true }), 1500); },
      error: (e: any) => this.error = e.error?.message || 'Payment failed',
    });
  }

  formatAmount(kobo: any): string { return ((+kobo || 0) / 100).toLocaleString(); }
}

import { Component, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { RouterExtensions } from '@nativescript/angular';
import { PosApiService } from '../services/pos-api.service';
import { ApplicationSettings } from '@nativescript/core';

@Component({
  selector: 'pos-order',
  standalone: true,
  template: `
    <ActionBar [title]="'Order #' + (order?.order_number || '')">
      <NavigationButton text="Back" (tap)="router.back()"></NavigationButton>
    </ActionBar>
    <GridLayout rows="auto,*,auto">
      <!-- Order Info -->
      <GridLayout row="0" columns="*,*" class="bg-gray-100 p-3">
        <Label col="0" [text]="'Table: ' + (order?.table_number || 'N/A')" class="font-bold"></Label>
        <Label col="1" [text]="'₦' + formatAmount(order?.total_amount)" class="text-right font-bold text-lg"></Label>
      </GridLayout>

      <ScrollView row="1">
        <StackLayout class="p-4">
          <!-- Current Items -->
          <Label text="Order Items" class="font-bold m-b-2"></Label>
          <StackLayout *ngFor="let item of items" class="bg-white rounded-lg p-3 m-b-1">
            <GridLayout columns="*,auto,auto">
              <StackLayout col="0">
                <Label [text]="item.product_name" class="font-bold"></Label>
                <Label [text]="item.notes || ''" class="text-xs text-muted"></Label>
              </StackLayout>
              <Label col="1" [text]="item.quantity + 'x ₦' + formatAmount(item.unit_price)" class="text-sm m-r-3"></Label>
              <Label col="2" [text]="'₦' + formatAmount(item.line_total)" class="font-bold"></Label>
            </GridLayout>
          </StackLayout>

          <!-- Add Items: Category tabs -->
          <Label text="Add Items" class="font-bold m-t-4 m-b-2"></Label>
          <ScrollView orientation="horizontal" class="m-b-2">
            <StackLayout orientation="horizontal">
              <Button *ngFor="let cat of categories" [text]="cat.name" (tap)="selectCategory(cat)" [class]="selectedCat?.id === cat.id ? 'btn btn-primary m-r-2' : 'btn btn-outline m-r-2'"></Button>
            </StackLayout>
          </ScrollView>

          <!-- Products Grid -->
          <WrapLayout>
            <StackLayout *ngFor="let prod of products" (tap)="addProduct(prod)" class="bg-white rounded-lg p-3 m-2 text-center" style="width: 140">
              <Label [text]="prod.name" class="font-bold text-sm"></Label>
              <Label [text]="'₦' + formatAmount(prod.price)" class="text-primary"></Label>
            </StackLayout>
          </WrapLayout>
        </StackLayout>
      </ScrollView>

      <!-- Bottom Actions -->
      <GridLayout row="2" columns="*,*,*" class="bg-white p-3 border-top">
        <Button col="0" text="🍳 Kitchen" (tap)="sendToKitchen()" class="btn btn-primary"></Button>
        <Button col="1" text="💰 Pay" (tap)="openPayment()" class="btn btn-success"></Button>
        <Button col="2" text="📋 Split" (tap)="splitBill()" class="btn btn-outline"></Button>
      </GridLayout>
    </GridLayout>
  `,
})
export class OrderComponent implements OnInit {
  order: any = null;
  items: any[] = [];
  categories: any[] = [];
  products: any[] = [];
  selectedCat: any = null;
  private orderId = '';
  private propertyId = '';

  constructor(private route: ActivatedRoute, private api: PosApiService, public router: RouterExtensions) {
    this.propertyId = ApplicationSettings.getString('pos_property_id', '');
  }

  ngOnInit() {
    this.orderId = this.route.snapshot.params['id'];
    this.loadOrder();
    this.api.getCategories(this.propertyId).subscribe({ next: (r: any) => { this.categories = r.data || []; if (this.categories.length) this.selectCategory(this.categories[0]); } });
  }

  loadOrder() {
    this.api.getOrderItems(this.orderId).subscribe({ next: (r: any) => this.items = r.data?.items || r.data || [] });
  }

  selectCategory(cat: any) {
    this.selectedCat = cat;
    this.api.getProducts(this.propertyId, cat.id).subscribe({ next: (r: any) => this.products = r.data || [] });
  }

  addProduct(prod: any) {
    this.api.addItem(this.orderId, { product_id: prod.id, quantity: 1 }).subscribe({
      next: () => this.loadOrder(),
    });
  }

  sendToKitchen() {
    this.api.sendToKitchen(this.orderId).subscribe({ next: (r: any) => { this.order = r.data; } });
  }

  openPayment() { this.router.navigate(['/payment', this.orderId]); }

  splitBill() {
    this.api.splitOrder(this.orderId).subscribe({ next: (r: any) => { /* Show split groups */ } });
  }

  formatAmount(kobo: any): string { return ((+kobo || 0) / 100).toLocaleString(); }
}

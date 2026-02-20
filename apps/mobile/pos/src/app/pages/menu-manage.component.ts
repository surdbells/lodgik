import { Component, OnInit } from '@angular/core';
import { RouterExtensions } from '@nativescript/angular';
import { PosApiService } from '../services/pos-api.service';
import { ApplicationSettings } from '@nativescript/core';

@Component({
  selector: 'pos-menu',
  standalone: true,
  template: `
    <ActionBar title="Menu Management"><NavigationButton text="Back" (tap)="router.back()"></NavigationButton></ActionBar>
    <ScrollView>
      <StackLayout class="p-4">
        <StackLayout *ngFor="let cat of categories" class="m-b-4">
          <Label [text]="cat.name" class="font-bold text-lg m-b-2"></Label>
          <StackLayout *ngFor="let prod of getProducts(cat.id)" class="bg-white rounded-lg p-3 m-b-1">
            <GridLayout columns="*,auto">
              <StackLayout col="0"><Label [text]="prod.name" class="font-bold"></Label><Label [text]="prod.description || ''" class="text-xs text-muted"></Label></StackLayout>
              <Label col="1" [text]="'₦' + formatAmount(prod.price)" class="text-primary font-bold"></Label>
            </GridLayout>
          </StackLayout>
        </StackLayout>
      </StackLayout>
    </ScrollView>
  `,
})
export class MenuManageComponent implements OnInit {
  categories: any[] = [];
  products: any[] = [];
  private pid = '';

  constructor(private api: PosApiService, public router: RouterExtensions) { this.pid = ApplicationSettings.getString('pos_property_id', ''); }

  ngOnInit() {
    this.api.getCategories(this.pid).subscribe({ next: (r: any) => this.categories = r.data || [] });
    this.api.getProducts(this.pid).subscribe({ next: (r: any) => this.products = r.data || [] });
  }

  getProducts(catId: string): any[] { return this.products.filter(p => p.category_id === catId); }
  formatAmount(kobo: any): string { return ((+kobo || 0) / 100).toLocaleString(); }
}

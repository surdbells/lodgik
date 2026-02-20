import { Component, NO_ERRORS_SCHEMA, OnInit } from '@angular/core';
import { NativeScriptCommonModule, RouterExtensions } from '@nativescript/angular';
import { ApiService } from '../../services/api.service';

@Component({
  selector: 'AmenityVouchers', standalone: true, imports: [NativeScriptCommonModule], schemas: [NO_ERRORS_SCHEMA],
  template: `
    <ActionBar title="Amenity Vouchers" class="bg-white"><NavigationButton text="Back" (tap)="router.back()"></NavigationButton></ActionBar>
    <ScrollView><StackLayout class="p-4">
      <Label text="Your digital access vouchers for hotel amenities" class="text-gray-500 text-sm m-b-4"></Label>
      <StackLayout *ngFor="let v of vouchers" class="bg-white border rounded-xl p-4 m-b-3">
        <GridLayout columns="auto,*,auto">
          <Label col="0" [text]="typeIcon(v.amenity_type)" class="text-3xl m-r-3"></Label>
          <StackLayout col="1"><Label [text]="v.amenity_name" class="font-bold"></Label><Label [text]="'Valid: ' + v.valid_date" class="text-xs text-gray-400"></Label><Label [text]="'Uses: ' + v.use_count + '/' + v.max_uses" class="text-xs text-gray-400"></Label></StackLayout>
          <StackLayout col="2" class="text-center">
            <Label *ngIf="v.status === 'active'" [text]="v.code" class="text-sm font-bold text-blue tracking-wider bg-blue-50 p-2 rounded"></Label>
            <Label *ngIf="v.status === 'used'" text="✅ Used" class="text-green text-xs font-bold"></Label>
            <Label *ngIf="v.status === 'expired'" text="Expired" class="text-gray-400 text-xs"></Label>
          </StackLayout>
        </GridLayout>
      </StackLayout>
      <Label *ngIf="!vouchers.length" text="No vouchers yet\nVouchers will appear here when issued by the hotel" textWrap="true" class="text-center text-gray-400 p-8"></Label>
    </StackLayout></ScrollView>
  `,
})
export class AmenityVouchersComponent implements OnInit {
  vouchers: any[] = [];
  constructor(private api: ApiService, public router: RouterExtensions) {}
  ngOnInit() { const s = this.api.getSession(); if (s?.booking?.id) this.api.get(`/guest-services/vouchers?booking_id=${s.booking.id}`).subscribe({ next: (r: any) => this.vouchers = r.data || [] }); }
  typeIcon(t: string): string { return t === 'gym' ? '🏋️' : t === 'pool' ? '🏊' : t === 'spa' ? '💆' : t === 'sauna' ? '🧖' : t === 'lounge' ? '🛋️' : '🎟️'; }
}

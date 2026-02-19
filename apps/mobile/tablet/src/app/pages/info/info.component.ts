import { Component, NO_ERRORS_SCHEMA } from '@angular/core';
import { NativeScriptCommonModule, RouterExtensions } from '@nativescript/angular';

@Component({
  selector: 'LocalInfo',
  standalone: true,
  imports: [NativeScriptCommonModule],
  schemas: [NO_ERRORS_SCHEMA],
  template: `
    <GridLayout rows="auto, *">
      <GridLayout row="0" columns="auto, *" class="bg-white border-b p-4">
        <Label col="0" text="←" (tap)="router.back()" class="text-2xl m-r-4 p-2"></Label>
        <Label col="1" text="Local Information" class="text-xl font-bold"></Label>
      </GridLayout>

      <ScrollView row="1">
        <GridLayout columns="*, *, *" rows="auto, auto, auto" class="p-6">
          <StackLayout *ngFor="let item of infoItems; let i = index" [col]="i % 3" [row]="Math.floor(i / 3)"
            class="bg-white rounded-2xl p-6 m-2 text-center shadow-sm" (tap)="selectedItem = item">
            <Label [text]="item.icon" class="text-4xl m-b-2"></Label>
            <Label [text]="item.title" class="text-lg font-bold"></Label>
            <Label [text]="item.subtitle" class="text-gray-400 text-sm m-t-1" textWrap="true"></Label>
          </StackLayout>
        </GridLayout>
      </ScrollView>
    </GridLayout>

    <!-- Detail overlay (simple) -->
  `,
})
export class LocalInfoComponent {
  Math = Math;
  selectedItem: any = null;

  infoItems = [
    { icon: '🍽️', title: 'Restaurants', subtitle: 'Nearby dining options' },
    { icon: '🏥', title: 'Hospital', subtitle: 'Emergency & pharmacies' },
    { icon: '🏧', title: 'ATM & Banks', subtitle: 'Cash withdrawal points' },
    { icon: '🛍️', title: 'Shopping', subtitle: 'Markets & malls nearby' },
    { icon: '🕌', title: 'Places of Worship', subtitle: 'Churches & mosques' },
    { icon: '📞', title: 'Emergency', subtitle: 'Police, Fire, Ambulance' },
    { icon: '✈️', title: 'Airport', subtitle: 'Directions & shuttle' },
    { icon: '🎭', title: 'Entertainment', subtitle: 'Cinema, events, nightlife' },
    { icon: '🏊', title: 'Hotel Amenities', subtitle: 'Pool, gym, spa, bar' },
  ];

  constructor(public router: RouterExtensions) {}
}

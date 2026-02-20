import { Component, OnInit } from '@angular/core';
import { RouterExtensions } from '@nativescript/angular';
import { HousekeepingApiService } from '../services/housekeeping-api.service';
import { ApplicationSettings } from '@nativescript/core';

@Component({
  selector: 'hk-lost-found',
  standalone: true,
  template: `
    <ActionBar title="Lost & Found">
      <NavigationButton text="Back" (tap)="router.back()"></NavigationButton>
      <ActionItem text="+ Report" (tap)="showReport = true" ios.position="right"></ActionItem>
    </ActionBar>
    <ScrollView>
      <StackLayout class="p-4">
        <StackLayout *ngFor="let item of items" class="bg-white rounded-lg p-3 m-b-2">
          <Label [text]="item.description" class="font-bold"></Label>
          <Label [text]="'Found: ' + item.found_location" class="text-sm text-muted"></Label>
          <Label [text]="'Status: ' + item.status" class="text-xs"></Label>
        </StackLayout>
        <Label *ngIf="items.length === 0" text="No items reported" class="text-center text-muted p-8"></Label>
      </StackLayout>
    </ScrollView>
  `,
})
export class LostFoundComponent implements OnInit {
  items: any[] = [];
  showReport = false;

  constructor(private api: HousekeepingApiService, public router: RouterExtensions) {}

  ngOnInit() {
    const pid = ApplicationSettings.getString('hk_property_id', '');
    this.api.getLostAndFound(pid).subscribe({ next: (r: any) => this.items = r.data || [] });
  }
}

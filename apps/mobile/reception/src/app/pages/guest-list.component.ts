import { Component, OnInit, NO_ERRORS_SCHEMA } from '@angular/core';
import { NativeScriptCommonModule, NativeScriptFormsModule, RouterExtensions } from '@nativescript/angular';
import { ReceptionApiService } from '../services/reception-api.service';

@Component({
  selector: 'guest-list',
  standalone: true,
  imports: [NativeScriptCommonModule, NativeScriptFormsModule],
  schemas: [NO_ERRORS_SCHEMA],
  template: `
    <ActionBar title="Guests"><NavigationButton text="Back" (tap)="router.back()"></NavigationButton></ActionBar>
    <GridLayout rows="auto,*">
      <SearchBar row="0" hint="Search by name, phone, email..." [(ngModel)]="search" (submit)="doSearch()" class="m-4"></SearchBar>
      <ScrollView row="1">
        <StackLayout class="p-4">
          <StackLayout *ngFor="let g of guests" class="bg-white rounded-xl p-3 m-b-2 border">
            <Label [text]="g.first_name + ' ' + g.last_name" class="font-bold"></Label>
            <Label [text]="(g.phone || '') + (g.email ? ' · ' + g.email : '')" class="text-sm text-gray-500"></Label>
            <Label [text]="'Visits: ' + (g.total_visits || 0) + ' · Spent: ₦' + formatAmount(g.total_spent)" class="text-xs text-gray-400 m-t-1"></Label>
          </StackLayout>
          <Label *ngIf="!guests.length && !loading" text="No guests found" class="text-center text-gray-400 p-8"></Label>
        </StackLayout>
      </ScrollView>
    </GridLayout>
  `,
})
export class GuestListComponent implements OnInit {
  guests: any[] = [];
  search = '';
  loading = true;

  constructor(private api: ReceptionApiService, public router: RouterExtensions) {}

  ngOnInit() { this.load(); }

  load() { this.api.getGuests().subscribe({ next: (r: any) => { this.guests = r.data || []; this.loading = false; } }); }

  doSearch() {
    this.api.getGuests(this.search).subscribe({ next: (r: any) => this.guests = r.data || [] });
  }

  formatAmount(kobo: any): string { return ((+kobo || 0) / 100).toLocaleString(); }
}

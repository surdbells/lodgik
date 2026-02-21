import { Component, OnInit } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { ApplicationSettings } from '@nativescript/core';

@Component({
  selector: 'app-loyalty',
  template: `
    <ActionBar title="My Rewards"></ActionBar>
    <ScrollView>
      <StackLayout class="p-20">
        <Label text="My Loyalty Points" class="h2 text-center"></Label>
        <Label [text]="points + ' points'" class="h1 text-center text-primary m-b-20"></Label>
        <Label *ngIf="tier" [text]="'Tier: ' + tier.name" class="h3 text-center m-b-10"></Label>
        <Label *ngIf="tier?.discount_percentage" [text]="tier.discount_percentage + '% discount'" class="text-center m-b-20"></Label>
        <Label text="Points History" class="h3 m-t-20 m-b-10"></Label>
        <StackLayout *ngFor="let h of history" class="card-sm m-b-5">
          <GridLayout columns="*,auto"><Label col="0" [text]="h.source + ' (' + h.transaction_type + ')'"></Label><Label col="1" [text]="(h.transaction_type==='earn' ? '+' : '-') + h.points" [class]="h.transaction_type==='earn' ? 'text-success' : 'text-danger'"></Label></GridLayout>
          <Label [text]="h.created_at" class="text-muted text-sm"></Label>
        </StackLayout>
      </StackLayout>
    </ScrollView>
  `
})
export class LoyaltyComponent implements OnInit {
  points = 0; tier: any = null; history: any[] = [];
  constructor(private http: HttpClient) {}
  ngOnInit() {
    const guestId = ApplicationSettings.getString('guest_id', '');
    const api = ApplicationSettings.getString('api_url', '');
    if (guestId && api) {
      this.http.get<any>(`${api}/loyalty/guests/${guestId}/tier`).subscribe(r => { this.tier = r.data; this.points = r.data?.current_points || 0; });
      this.http.get<any>(`${api}/loyalty/guests/${guestId}/history`).subscribe(r => this.history = r.data || []);
    }
  }
}

import { Component, NO_ERRORS_SCHEMA, OnInit } from '@angular/core';
import { NativeScriptCommonModule, RouterExtensions } from '@nativescript/angular';
import { TabletApiService } from '../../services/tablet-api.service';

@Component({
  selector: 'TabletLoyalty',
  standalone: true,
  imports: [NativeScriptCommonModule],
  schemas: [NO_ERRORS_SCHEMA],
  template: `
    <GridLayout rows="auto, *" class="bg-gray-50">
      <GridLayout row="0" columns="auto, *" class="bg-amber-600 p-4">
        <Label col="0" text="←" class="text-white text-2xl m-r-4" (tap)="router.back()"></Label>
        <Label col="1" text="🏆 Loyalty Rewards" class="text-white text-xl font-bold"></Label>
      </GridLayout>

      <ScrollView row="1">
        <StackLayout class="p-6">
          <ActivityIndicator *ngIf="loading" busy="true" color="#d97706" class="m-t-8"></ActivityIndicator>

          <StackLayout *ngIf="!loading && loyalty">
            <!-- Points Card -->
            <StackLayout class="bg-amber-500 rounded-2xl p-6 m-b-6 text-center">
              <Label text="Your Points Balance" class="text-amber-100 text-sm"></Label>
              <Label [text]="(loyalty.points_balance || 0).toLocaleString()" class="text-white text-5xl font-bold m-t-2"></Label>
              <Label text="points" class="text-amber-200 text-base"></Label>
              <StackLayout class="bg-amber-400 rounded-xl p-3 m-t-4">
                <Label [text]="'Tier: ' + (loyalty.tier_name || 'Standard')" class="text-white font-bold text-center"></Label>
                <Label [text]="'Member since ' + (loyalty.member_since || '')" class="text-amber-100 text-xs text-center m-t-1"></Label>
              </StackLayout>
            </StackLayout>

            <!-- Points to next tier -->
            <StackLayout *ngIf="loyalty.points_to_next_tier" class="bg-white rounded-xl p-4 m-b-4">
              <Label [text]="loyalty.points_to_next_tier + ' points to ' + (loyalty.next_tier_name || 'next tier')" class="text-sm text-gray-600 text-center"></Label>
              <StackLayout class="bg-gray-200 rounded-full m-t-2" style="height:8;">
                <StackLayout class="bg-amber-500 rounded-full" style="height:8;" [ngStyle]="{'width': tierProgress() + '%'}"></StackLayout>
              </StackLayout>
            </StackLayout>

            <!-- Recent Transactions -->
            <Label text="Recent Activity" class="font-bold text-base m-b-3"></Label>
            <StackLayout *ngFor="let t of transactions" class="bg-white rounded-xl p-4 m-b-2">
              <GridLayout columns="*, auto">
                <StackLayout col="0">
                  <Label [text]="t.description || t.transaction_type" class="font-medium text-sm"></Label>
                  <Label [text]="t.created_at" class="text-xs text-gray-400 m-t-1"></Label>
                </StackLayout>
                <Label col="1" [text]="(t.points > 0 ? '+' : '') + t.points + ' pts'" class="font-bold" [ngStyle]="{'color': t.points > 0 ? '#16a34a' : '#dc2626'}"></Label>
              </GridLayout>
            </StackLayout>
            <Label *ngIf="!transactions.length" text="No transactions yet" class="text-gray-400 text-center m-t-4"></Label>
          </StackLayout>

          <StackLayout *ngIf="!loading && !loyalty" class="text-center m-t-16">
            <Label text="🏆" class="text-5xl m-b-4"></Label>
            <Label text="Loyalty program not available" class="text-gray-400 text-base"></Label>
            <Label text="Ask reception to enroll you" class="text-gray-300 text-sm m-t-2"></Label>
          </StackLayout>
        </StackLayout>
      </ScrollView>
    </GridLayout>
  `,
})
export class TabletLoyaltyComponent implements OnInit {
  loyalty: any = null;
  transactions: any[] = [];
  loading = true;

  constructor(private api: TabletApiService, public router: RouterExtensions) {}

  ngOnInit() {
    const data = this.api.guestData$.value;
    const guestId = data?.session?.guest_id;
    if (!guestId) { this.loading = false; return; }

    this.api.get(`/loyalty/guests/${guestId}`).subscribe({
      next: (r: any) => {
        this.loyalty = r.data;
        this.transactions = r.data?.recent_transactions || [];
        this.loading = false;
      },
      error: () => { this.loading = false; },
    });
  }

  tierProgress(): number {
    if (!this.loyalty) return 0;
    const earned = this.loyalty.tier_points_earned || 0;
    const needed = this.loyalty.tier_points_needed || 1;
    return Math.min(100, Math.round((earned / needed) * 100));
  }
}

import { Component, OnInit } from '@angular/core';
import { SecurityApiService } from '../services/security-api.service';

@Component({
  selector: 'ns-visitors',
  template: `
    <ActionBar title="Visitor Management" class="action-bar" style="background-color:#f57c00; color:white;">
      <NavigationButton text="Back" android.systemIcon="ic_menu_back"/>
    </ActionBar>
    <ScrollView>
      <StackLayout class="p-15">
        <Label text="Pre-Authorized Visitors" class="m-b-10" style="font-weight:bold; font-size:16;"/>
        <StackLayout *ngFor="let v of visitors" style="background-color:#fff; padding:12; margin-bottom:8; border-radius:8;">
          <Label [text]="v.visitor_name" style="font-weight:bold;"/>
          <Label [text]="'Code: ' + v.code + ' · Host: ' + (v.guest_name || 'N/A')" style="font-size:13; color:#666;"/>
          <Label [text]="'Valid until: ' + (v.expires_at || 'N/A')" style="font-size:12; color:#888;"/>
          <Label [text]="'Status: ' + v.status" [style.color]="v.status === 'active' ? '#2e7d32' : '#999'" style="font-size:12; font-weight:bold;"/>
        </StackLayout>
        <Label *ngIf="visitors.length === 0" text="No pre-authorized visitors" class="m-t-20" style="color:#999; text-align:center;"/>
      </StackLayout>
    </ScrollView>
  `
})
export class VisitorsComponent implements OnInit {
  visitors: any[] = [];
  constructor(private api: SecurityApiService) {}
  ngOnInit() { this.api.getVisitorCodes().subscribe({ next: (r: any) => this.visitors = r?.data || [] }); }
}

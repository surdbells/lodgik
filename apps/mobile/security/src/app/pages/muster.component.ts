import { Component, OnInit } from '@angular/core';
import { SecurityApiService } from '../services/security-api.service';

@Component({
  selector: 'ns-muster',
  template: `
    <ActionBar title="Emergency Muster List" class="action-bar" style="background-color:#00695c; color:white;">
      <NavigationButton text="Back" android.systemIcon="ic_menu_back"/>
    </ActionBar>
    <ScrollView>
      <StackLayout class="p-15">
        <Label [text]="'Total on premise: ' + onPremise.length" class="m-b-10" style="font-size:18; font-weight:bold; color:#00695c;"/>
        <Button text="REFRESH" (tap)="load()" class="m-b-15" style="background-color:#00695c; color:white; padding:10; border-radius:8;"/>
        <StackLayout *ngFor="let p of onPremise; let i = index" style="background-color:#fff; padding:10; margin-bottom:4; border-radius:6;">
          <Label [text]="(i+1) + '. ' + (p.guest_name || 'Unknown') + (p.room_number ? ' — Room ' + p.room_number : '')" style="font-size:14;"/>
          <Label [text]="'Since: ' + (p.last_step_in || p.created_at || '')" style="font-size:11; color:#888;"/>
        </StackLayout>
      </StackLayout>
    </ScrollView>
  `
})
export class MusterComponent implements OnInit {
  onPremise: any[] = [];
  constructor(private api: SecurityApiService) {}
  ngOnInit() { this.load(); }
  load() { this.api.getOnPremise().subscribe({ next: (r: any) => this.onPremise = r?.data || [] }); }
}

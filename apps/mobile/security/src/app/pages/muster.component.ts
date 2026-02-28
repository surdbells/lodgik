import { Component, OnInit } from '@angular/core';
import { SecurityApiService } from '../services/security-api.service';

@Component({
  selector: 'ns-muster',
  template: `
    <ActionBar title="Emergency Muster List">
      <NavigationButton text="Back" android.systemIcon="ic_menu_back"/>
    </ActionBar>
    <ScrollView>
      <StackLayout class="p-4">
        <Label [text]="'Total on premise: ' + onPremise.length" class="page-title text-primary m-b-3"/>
        <Button text="↻  REFRESH" (tap)="load()" class="btn-outline m-b-4"/>
        <StackLayout *ngFor="let p of onPremise; let i = index" class="list-item">
          <Label [text]="(i+1) + '.  ' + (p.guest_name || 'Unknown') + (p.room_number ? '  —  Room ' + p.room_number : '')"
            class="list-item-title"/>
          <Label [text]="'Since: ' + (p.last_step_in || p.created_at || '')" class="list-item-meta"/>
        </StackLayout>
        <Label *ngIf="onPremise.length === 0" text="No guests currently on premise" class="empty-state"/>
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

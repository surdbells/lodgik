import { Component, NO_ERRORS_SCHEMA, OnInit } from '@angular/core';
import { NativeScriptCommonModule, NativeScriptFormsModule, RouterExtensions } from '@nativescript/angular';
import { SecurityApiService } from '../services/security-api.service';

@Component({
  selector: 'ns-visitors',
  standalone: true,
  imports: [NativeScriptCommonModule, NativeScriptFormsModule],
  schemas: [NO_ERRORS_SCHEMA],
  template: `
    <ActionBar title="Visitor Management" style="background-color:#f57c00; color:white;">
      <NavigationButton text="Back" android.systemIcon="ic_menu_back"/>
      <ActionItem text="+ Create" (tap)="showForm = !showForm" ios.position="right" style="color:white;"/>
    </ActionBar>

    <ScrollView>
      <StackLayout style="padding:12;">
        <!-- Create Form -->
        <StackLayout *ngIf="showForm" style="background-color:white; border-radius:10; padding:16; margin-bottom:12; border-width:1; border-color:#fed7aa;">
          <Label text="Create Visitor Code" style="font-weight:bold; font-size:15; margin-bottom:12;"/>
          <TextField hint="Visitor Name *" [(ngModel)]="form.visitor_name" style="border-width:1; border-color:#d1d5db; border-radius:8; padding:10; margin-bottom:8; font-size:13;"/>
          <TextField hint="Guest Room / Host Name" [(ngModel)]="form.guest_identifier" style="border-width:1; border-color:#d1d5db; border-radius:8; padding:10; margin-bottom:8; font-size:13;"/>
          <TextField hint="Valid Hours (default 24)" [(ngModel)]="form.valid_hours" keyboardType="number" style="border-width:1; border-color:#d1d5db; border-radius:8; padding:10; margin-bottom:8; font-size:13;"/>
          <TextField hint="Max Uses (default 1)" [(ngModel)]="form.max_uses" keyboardType="number" style="border-width:1; border-color:#d1d5db; border-radius:8; padding:10; margin-bottom:12; font-size:13;"/>
          <GridLayout columns="*,*">
            <Button col="0" text="Cancel" (tap)="showForm = false" style="background-color:#f3f4f6; color:#374151; border-radius:8; padding:10; margin-right:4;"/>
            <Button col="1" text="Create Code" (tap)="createCode()" style="background-color:#f57c00; color:white; border-radius:8; padding:10;"/>
          </GridLayout>
          <Label *ngIf="msg" [text]="msg" style="text-align:center; margin-top:8; font-weight:bold;" [ngStyle]="{'color': msgOk ? '#16a34a' : '#dc2626'}"/>
        </StackLayout>

        <!-- Visitor List -->
        <Label text="Pre-Authorized Visitors" style="font-weight:bold; font-size:15; margin-bottom:8;"/>
        <ActivityIndicator *ngIf="loading" busy="true" style="margin-top:20;"/>

        <StackLayout *ngFor="let v of visitors" style="background-color:white; padding:14; margin-bottom:8; border-radius:10; border-width:1;" [ngStyle]="{'border-color': v.status === 'active' ? '#fed7aa' : '#e5e7eb'}">
          <GridLayout columns="*,auto">
            <StackLayout col="0">
              <Label [text]="v.visitor_name" style="font-weight:bold; font-size:14;"/>
              <Label [text]="'Code: ' + v.code" style="font-size:16; font-weight:bold; color:#f57c00; margin-top:2;"/>
              <Label [text]="'Host: ' + (v.guest_name || v.guest_identifier || 'N/A')" style="font-size:12; color:#6b7280; margin-top:2;"/>
              <Label [text]="'Expires: ' + (v.expires_at || 'N/A') + ' · Uses: ' + (v.use_count || 0) + '/' + (v.max_uses || 1)" style="font-size:11; color:#9ca3af; margin-top:2;"/>
            </StackLayout>
            <Label col="1" [text]="v.status" style="font-size:11; font-weight:bold; padding:4; border-radius:6;" [ngStyle]="{'color': v.status === 'active' ? '#d97706' : '#9ca3af', 'background-color': v.status === 'active' ? '#fef3c7' : '#f3f4f6'}"/>
          </GridLayout>
        </StackLayout>

        <Label *ngIf="!loading && visitors.length === 0" text="No visitor codes created" style="color:#9ca3af; text-align:center; margin-top:30; font-size:14;"/>
      </StackLayout>
    </ScrollView>
  `,
})
export class VisitorsComponent implements OnInit {
  visitors: any[] = [];
  showForm = false;
  loading = true;
  msg = ''; msgOk = true;
  form: any = { visitor_name: '', guest_identifier: '', valid_hours: '24', max_uses: '1' };

  constructor(private api: SecurityApiService) {}

  ngOnInit() { this.load(); }

  load() {
    this.loading = true;
    this.api.getVisitorCodes().subscribe({
      next: (r: any) => { this.visitors = r?.data || []; this.loading = false; },
      error: () => { this.loading = false; },
    });
  }

  createCode() {
    if (!this.form.visitor_name) { this.msg = 'Visitor name is required'; this.msgOk = false; return; }
    this.api.createVisitorCode({
      visitor_name: this.form.visitor_name,
      guest_identifier: this.form.guest_identifier || undefined,
      valid_hours: +this.form.valid_hours || 24,
      max_uses: +this.form.max_uses || 1,
    }).subscribe({
      next: (r: any) => {
        this.msg = 'Code created: ' + (r.data?.code || '');
        this.msgOk = true;
        this.form = { visitor_name: '', guest_identifier: '', valid_hours: '24', max_uses: '1' };
        this.load();
        setTimeout(() => this.msg = '', 5000);
      },
      error: (e: any) => { this.msg = e.error?.message || 'Failed to create code'; this.msgOk = false; },
    });
  }
}

import { Component, NO_ERRORS_SCHEMA, OnInit } from '@angular/core';
import { NativeScriptCommonModule, NativeScriptFormsModule, RouterExtensions } from '@nativescript/angular';
import { SecurityApiService } from '../services/security-api.service';

@Component({
  selector: 'ns-visitors',
  standalone: true,
  imports: [NativeScriptCommonModule, NativeScriptFormsModule],
  schemas: [NO_ERRORS_SCHEMA],
  template: `
    <ActionBar title="Visitor Management">
      <NavigationButton text="Back" android.systemIcon="ic_menu_back"/>
      <ActionItem text="+ Create" (tap)="showForm = !showForm" ios.position="right"/>
    </ActionBar>

    <ScrollView>
      <StackLayout class="p-4">

        <!-- Create Form -->
        <StackLayout *ngIf="showForm" class="card m-b-4">
          <Label text="Create Visitor Code" class="page-title" style="font-size:15;"/>
          <Label text="VISITOR NAME" class="input-label m-t-3"/>
          <TextField hint="Full name *" [(ngModel)]="form.visitor_name" class="input m-b-2"/>
          <Label text="GUEST ROOM / HOST" class="input-label"/>
          <TextField hint="Room number or host name" [(ngModel)]="form.guest_identifier" class="input m-b-2"/>
          <GridLayout columns="*,*">
            <StackLayout col="0" class="m-r-2">
              <Label text="VALID HOURS" class="input-label"/>
              <TextField hint="24" [(ngModel)]="form.valid_hours" keyboardType="number" class="input"/>
            </StackLayout>
            <StackLayout col="1">
              <Label text="MAX USES" class="input-label"/>
              <TextField hint="1" [(ngModel)]="form.max_uses" keyboardType="number" class="input"/>
            </StackLayout>
          </GridLayout>
          <GridLayout columns="*,*" class="m-t-3">
            <Button col="0" text="Cancel" (tap)="showForm = false" class="btn-secondary m-r-2"/>
            <Button col="1" text="Create Code" (tap)="createCode()" class="btn-primary"/>
          </GridLayout>
          <Label *ngIf="msg" [text]="msg" class="text-center m-t-2 font-bold"
            [style.color]="msgOk ? '#16a34a' : '#dc2626'"/>
        </StackLayout>

        <!-- List -->
        <Label text="PRE-AUTHORIZED VISITORS" class="section-title"/>
        <ActivityIndicator *ngIf="loading" busy="true"/>

        <StackLayout *ngFor="let v of visitors" class="list-item">
          <GridLayout columns="*,auto">
            <StackLayout col="0">
              <Label [text]="v.visitor_name" class="list-item-title"/>
              <Label [text]="'Code: ' + v.code" class="text-primary" style="font-size:18; font-weight:bold; margin-top:2;"/>
              <Label [text]="'Host: ' + (v.guest_name || v.guest_identifier || 'N/A')" class="list-item-subtitle"/>
              <Label [text]="'Expires: ' + (v.expires_at || 'N/A') + ' · Uses: ' + (v.use_count||0) + '/' + (v.max_uses||1)" class="list-item-meta"/>
            </StackLayout>
            <Label col="1" [text]="v.status"
              class="badge"
              [class]="v.status === 'active' ? 'badge badge-amber' : 'badge badge-gray'"/>
          </GridLayout>
        </StackLayout>

        <Label *ngIf="!loading && visitors.length === 0" text="No visitor codes created" class="empty-state"/>
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

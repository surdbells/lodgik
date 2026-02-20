import { Component, NO_ERRORS_SCHEMA, OnInit } from '@angular/core';
import { NativeScriptCommonModule, NativeScriptFormsModule, RouterExtensions } from '@nativescript/angular';
import { ApiService } from '../../services/api.service';

@Component({
  selector: 'VisitorCodes', standalone: true, imports: [NativeScriptCommonModule, NativeScriptFormsModule], schemas: [NO_ERRORS_SCHEMA],
  template: `
    <ActionBar title="Visitor Access" class="bg-white"><NavigationButton text="Back" (tap)="router.back()"></NavigationButton></ActionBar>
    <ScrollView><StackLayout class="p-4">
      <Label text="Generate a time-limited access code for your visitor" class="text-gray-500 text-sm m-b-4"></Label>
      <!-- Form -->
      <TextField hint="Visitor Name *" [(ngModel)]="form.visitor_name" class="input border rounded-lg p-3 m-b-2"></TextField>
      <TextField hint="Visitor Phone" [(ngModel)]="form.visitor_phone" keyboardType="phone" class="input border rounded-lg p-3 m-b-2"></TextField>
      <TextField hint="Purpose (e.g. Business meeting)" [(ngModel)]="form.purpose" class="input border rounded-lg p-3 m-b-2"></TextField>
      <Label text="Valid for:" class="font-bold m-t-2 m-b-1"></Label>
      <SegmentedBar [selectedIndex]="durationIdx" (selectedIndexChanged)="durationIdx = $event.object?.selectedIndex || 0" class="m-b-3">
        <SegmentedBarItem title="2 hrs"></SegmentedBarItem><SegmentedBarItem title="4 hrs"></SegmentedBarItem>
        <SegmentedBarItem title="8 hrs"></SegmentedBarItem><SegmentedBarItem title="24 hrs"></SegmentedBarItem>
      </SegmentedBar>
      <Button text="Generate Visitor Code" (tap)="generate()" [isEnabled]="!!form.visitor_name" class="bg-blue-600 text-white p-4 rounded-xl font-bold text-lg m-b-4"></Button>

      <!-- Generated Code -->
      <StackLayout *ngIf="generatedCode" class="bg-green-50 border border-green-300 rounded-xl p-4 m-b-4 text-center">
        <Label text="Visitor Code" class="text-green text-sm"></Label>
        <Label [text]="generatedCode" class="text-3xl font-bold text-green-800 tracking-widest m-y-2"></Label>
        <Label [text]="'Valid: ' + validFrom + ' → ' + validUntil" class="text-xs text-green-600"></Label>
        <Label text="Share this code with your visitor" class="text-xs text-gray-500 m-t-2"></Label>
      </StackLayout>

      <!-- Existing codes -->
      <Label text="Your Visitor Codes" class="font-bold m-t-4 m-b-2"></Label>
      <StackLayout *ngFor="let code of codes" class="bg-white border rounded-xl p-3 m-b-2">
        <GridLayout columns="*,auto">
          <StackLayout col="0"><Label [text]="code.visitor_name" class="font-bold"></Label><Label [text]="code.code" class="text-lg tracking-wider text-blue"></Label><Label [text]="code.valid_from + ' → ' + code.valid_until" class="text-xs text-gray-400"></Label></StackLayout>
          <StackLayout col="1" class="text-center">
            <Label [text]="code.status" class="text-xs font-bold" [class]="code.status === 'active' ? 'text-green' : 'text-gray-400'"></Label>
            <Button *ngIf="code.status === 'active'" text="Revoke" (tap)="revoke(code.id)" class="text-red text-xs m-t-1"></Button>
          </StackLayout>
        </GridLayout>
      </StackLayout>
    </StackLayout></ScrollView>
  `,
})
export class VisitorCodesComponent implements OnInit {
  form = { visitor_name: '', visitor_phone: '', purpose: '' };
  durationIdx = 1; codes: any[] = []; generatedCode = ''; validFrom = ''; validUntil = '';
  private durations = [2, 4, 8, 24];
  constructor(private api: ApiService, public router: RouterExtensions) {}
  ngOnInit() { this.load(); }
  load() { const s = this.api.getSession(); if (!s?.booking?.id) return; this.api.get(`/security/visitor-codes?booking_id=${s.booking.id}`).subscribe({ next: (r: any) => this.codes = r.data || [] }); }
  generate() {
    const s = this.api.getSession(); if (!s) return;
    const now = new Date(); const until = new Date(now.getTime() + this.durations[this.durationIdx] * 3600000);
    this.api.post('/security/visitor-codes', {
      booking_id: s.booking.id, property_id: s.property_id, guest_id: s.guest.id,
      visitor_name: this.form.visitor_name, visitor_phone: this.form.visitor_phone, purpose: this.form.purpose,
      valid_from: now.toISOString(), valid_until: until.toISOString(),
      room_number: s.booking.room_number, guest_name: s.guest.name,
    }).subscribe({ next: (r: any) => { this.generatedCode = r.data.code; this.validFrom = r.data.valid_from; this.validUntil = r.data.valid_until; this.form = { visitor_name: '', visitor_phone: '', purpose: '' }; this.load(); } });
  }
  revoke(id: string) { this.api.post(`/security/visitor-codes/${id}/revoke`, {}).subscribe({ next: () => this.load() }); }
}

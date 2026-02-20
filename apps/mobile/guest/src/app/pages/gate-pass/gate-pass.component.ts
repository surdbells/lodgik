import { Component, NO_ERRORS_SCHEMA, OnInit } from '@angular/core';
import { NativeScriptCommonModule, RouterExtensions } from '@nativescript/angular';
import { ApiService } from '../../services/api.service';

@Component({
  selector: 'GatePass', standalone: true, imports: [NativeScriptCommonModule], schemas: [NO_ERRORS_SCHEMA],
  template: `
    <ActionBar title="Gate Pass & Tracking" class="bg-white"><NavigationButton text="Back" (tap)="router.back()"></NavigationButton></ActionBar>
    <ScrollView><StackLayout class="p-4">
      <!-- Step In/Out -->
      <Label text="Your Status" class="font-bold m-b-2"></Label>
      <GridLayout columns="*,*" class="m-b-4">
        <Button col="0" text="🚶 Step Out" (tap)="recordMovement('step_out')" class="bg-orange-500 text-white rounded-xl p-4 m-r-2 font-bold"></Button>
        <Button col="1" text="🏠 Step In" (tap)="recordMovement('step_in')" class="bg-green-600 text-white rounded-xl p-4 font-bold"></Button>
      </GridLayout>
      <Label *ngIf="movementMsg" [text]="movementMsg" class="text-center text-green font-bold m-b-4"></Label>

      <!-- Gate Passes -->
      <Label text="Visitor Gate Passes" class="font-bold m-b-2"></Label>
      <StackLayout *ngFor="let gp of passes" class="bg-white border rounded-xl p-3 m-b-2">
        <GridLayout columns="*,auto">
          <StackLayout col="0">
            <Label [text]="gp.person_name" class="font-bold"></Label>
            <Label [text]="gp.pass_type.replace('_', ' ') + ' · ' + (gp.purpose || '')" class="text-xs text-gray-400"></Label>
            <Label [text]="'Expected: ' + (gp.expected_at || 'Not set')" class="text-xs text-gray-400"></Label>
          </StackLayout>
          <Label col="1" [text]="statusLabel(gp.status)" class="text-xs font-bold" [class]="statusClass(gp.status)"></Label>
        </GridLayout>
      </StackLayout>
      <Label *ngIf="!passes.length" text="No gate passes" class="text-center text-gray-400 p-4"></Label>

      <!-- Recent Movements -->
      <Label text="Movement Log" class="font-bold m-t-4 m-b-2"></Label>
      <StackLayout *ngFor="let m of movements" class="bg-gray-50 rounded-lg p-2 m-b-1">
        <Label [text]="(m.direction === 'step_out' ? '🚶 Out' : '🏠 In') + ' · ' + m.created_at?.substring(11, 16)" class="text-sm"></Label>
      </StackLayout>
    </StackLayout></ScrollView>
  `,
})
export class GatePassComponent implements OnInit {
  passes: any[] = []; movements: any[] = []; movementMsg = '';
  constructor(private api: ApiService, public router: RouterExtensions) {}
  ngOnInit() { this.load(); }
  load() {
    const s = this.api.getSession(); if (!s?.booking?.id) return;
    this.api.get(`/security/gate-passes?booking_id=${s.booking.id}`).subscribe({ next: (r: any) => this.passes = r.data || [] });
    this.api.get(`/security/movements?property_id=${s.property_id}&booking_id=${s.booking.id}`).subscribe({ next: (r: any) => this.movements = (r.data || []).slice(0, 10) });
  }
  recordMovement(dir: string) {
    const s = this.api.getSession(); if (!s) return;
    this.api.post('/security/movements', { property_id: s.property_id, booking_id: s.booking.id, guest_id: s.guest.id, guest_name: s.guest.name, direction: dir, room_number: s.booking.room_number, recorded_by: 'guest_app' }).subscribe({
      next: () => { this.movementMsg = dir === 'step_out' ? '🚶 Recorded: Stepped Out' : '🏠 Recorded: Stepped In'; this.load(); setTimeout(() => this.movementMsg = '', 3000); },
    });
  }
  statusLabel(s: string): string { return s === 'approved' ? '✅ Approved' : s === 'checked_in' ? '🟢 On Site' : s === 'checked_out' ? '👋 Left' : s === 'denied' ? '❌ Denied' : '⏳ Pending'; }
  statusClass(s: string): string { return s === 'approved' || s === 'checked_in' ? 'text-green' : s === 'denied' ? 'text-red' : 'text-gray-500'; }
}

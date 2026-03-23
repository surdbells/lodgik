import { Component, NO_ERRORS_SCHEMA, OnInit, OnDestroy } from '@angular/core';
import { NativeScriptCommonModule, RouterExtensions } from '@nativescript/angular';
import { ApiService } from '../../services/api.service';
import { Subscription, interval } from 'rxjs';

@Component({
  selector: 'GuestIoTControls',
  standalone: true,
  imports: [NativeScriptCommonModule],
  schemas: [NO_ERRORS_SCHEMA],
  template: `
    <ActionBar title="Smart Room" class="bg-blue-600">
      <NavigationButton text="Back" (tap)="router.back()"></NavigationButton>
    </ActionBar>

    <ScrollView>
      <StackLayout class="p-4">
        <!-- Status bar -->
        <StackLayout *ngIf="msg" class="rounded-lg p-3 m-b-4 text-center"
          [class]="msgOk ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'">
          <Label [text]="msg" [class]="msgOk ? 'text-green-700 font-medium' : 'text-red-600 font-medium'" textWrap="true"></Label>
        </StackLayout>

        <!-- AC Control -->
        <GridLayout columns="auto, *, auto" class="bg-white border border-gray-100 rounded-xl p-4 m-b-3">
          <Label col="0" text="❄️" class="text-3xl m-r-3"></Label>
          <StackLayout col="1">
            <Label text="Air Conditioning" class="font-bold"></Label>
            <Label [text]="acTemp + '°C'" class="text-blue-600 text-xl font-bold m-t-1"></Label>
          </StackLayout>
          <StackLayout col="2" class="text-center">
            <Button text="+" (tap)="adjustTemp(1)" class="bg-blue-600 text-white rounded-full m-b-1 font-bold" style="width:36;height:36;"></Button>
            <Button text="-" (tap)="adjustTemp(-1)" class="bg-blue-600 text-white rounded-full font-bold" style="width:36;height:36;"></Button>
          </StackLayout>
        </GridLayout>

        <!-- Lights -->
        <GridLayout columns="auto, *, auto" class="bg-white border border-gray-100 rounded-xl p-4 m-b-3">
          <Label col="0" text="💡" class="text-3xl m-r-3"></Label>
          <StackLayout col="1">
            <Label text="Room Lights" class="font-bold"></Label>
            <Label [text]="lightsOn ? 'On — ' + lightBrightness + '%' : 'Off'" class="text-gray-500 text-sm m-t-1"></Label>
          </StackLayout>
          <Button col="2" [text]="lightsOn ? 'Turn Off' : 'Turn On'"
            [class]="lightsOn ? 'bg-yellow-500 text-white p-2 rounded-lg text-sm' : 'bg-gray-200 text-gray-700 p-2 rounded-lg text-sm'"
            (tap)="toggleLights()"></Button>
        </GridLayout>

        <!-- Curtains -->
        <GridLayout columns="auto, *, auto" class="bg-white border border-gray-100 rounded-xl p-4 m-b-3">
          <Label col="0" text="🪟" class="text-3xl m-r-3"></Label>
          <StackLayout col="1">
            <Label text="Curtains" class="font-bold"></Label>
            <Label [text]="curtainsOpen ? 'Open' : 'Closed'" class="text-gray-500 text-sm m-t-1"></Label>
          </StackLayout>
          <Button col="2" [text]="curtainsOpen ? 'Close' : 'Open'"
            class="bg-gray-200 text-gray-700 p-2 rounded-lg text-sm" (tap)="toggleCurtains()"></Button>
        </GridLayout>

        <!-- TV -->
        <GridLayout columns="auto, *, auto" class="bg-white border border-gray-100 rounded-xl p-4 m-b-3">
          <Label col="0" text="📺" class="text-3xl m-r-3"></Label>
          <StackLayout col="1">
            <Label text="Television" class="font-bold"></Label>
            <Label [text]="tvOn ? 'On' : 'Off'" class="text-gray-500 text-sm m-t-1"></Label>
          </StackLayout>
          <Button col="2" [text]="tvOn ? 'Turn Off' : 'Turn On'"
            [class]="tvOn ? 'bg-green-500 text-white p-2 rounded-lg text-sm' : 'bg-gray-200 text-gray-700 p-2 rounded-lg text-sm'"
            (tap)="toggleTV()"></Button>
        </GridLayout>

        <!-- DND -->
        <GridLayout columns="auto, *, auto" class="bg-white border border-gray-100 rounded-xl p-4 m-b-3">
          <Label col="0" text="🔕" class="text-3xl m-r-3"></Label>
          <StackLayout col="1">
            <Label text="Do Not Disturb" class="font-bold"></Label>
            <Label [text]="dnd ? 'Active — staff will not enter' : 'Inactive'" [class]="dnd ? 'text-red-600 text-sm m-t-1' : 'text-gray-500 text-sm m-t-1'"></Label>
          </StackLayout>
          <Button col="2" [text]="dnd ? 'Disable' : 'Enable'"
            [class]="dnd ? 'bg-red-500 text-white p-2 rounded-lg text-sm' : 'bg-gray-200 text-gray-700 p-2 rounded-lg text-sm'"
            (tap)="toggleDND()"></Button>
        </GridLayout>

        <!-- Loading indicator -->
        <Label *ngIf="!loaded" text="Loading room devices..." class="text-gray-400 text-center m-t-4 text-sm"></Label>
      </StackLayout>
    </ScrollView>
  `,
})
export class GuestIoTControlsComponent implements OnInit, OnDestroy {
  acTemp = 22;
  lightsOn = true;
  lightBrightness = 80;
  curtainsOpen = true;
  tvOn = false;
  dnd = false;
  loaded = false;
  msg = '';
  msgOk = true;
  private poller?: Subscription;

  constructor(private api: ApiService, public router: RouterExtensions) {}

  ngOnInit() {
    this.loadState();
    this.poller = interval(15000).subscribe(() => this.loadState());
  }

  ngOnDestroy() { this.poller?.unsubscribe(); }

  loadState() {
    const s = this.api.getSession();
    if (!s?.booking?.room_id) return;
    this.api.get('/iot/room-devices', { room_id: s.booking.room_id }).subscribe({
      next: (r: any) => {
        this.loaded = true;
        const devices = r?.data || [];
        for (const d of devices) {
          const state = d.current_state || {};
          if (d.device_type === 'ac') this.acTemp = state.temperature ?? 22;
          if (d.device_type === 'light') { this.lightsOn = state.power === 'on'; this.lightBrightness = state.brightness ?? 80; }
          if (d.device_type === 'curtain') this.curtainsOpen = state.position === 'open';
          if (d.device_type === 'tv') this.tvOn = state.power === 'on';
        }
        if (!devices.length) this.loaded = true;
      },
      error: () => { this.loaded = true; },
    });
  }

  private sendControl(deviceType: string, action: string, params: any) {
    const s = this.api.getSession();
    if (!s) return;
    this.api.post('/iot/trigger', {
      event_type: 'manual',
      context: { device_type: deviceType, action, params, room_id: s.booking?.room_id, guest_id: s.guest?.id },
    }).subscribe({
      next: () => this.flash('✅ Updated', true),
      error: () => this.flash('Failed to update device', false),
    });
  }

  adjustTemp(delta: number) {
    this.acTemp = Math.max(16, Math.min(30, this.acTemp + delta));
    this.sendControl('ac', 'set_temp', { temperature: this.acTemp });
  }

  toggleLights() {
    this.lightsOn = !this.lightsOn;
    this.sendControl('light', this.lightsOn ? 'on' : 'off', { brightness: this.lightBrightness });
  }

  toggleCurtains() {
    this.curtainsOpen = !this.curtainsOpen;
    this.sendControl('curtain', this.curtainsOpen ? 'open' : 'close', {});
  }

  toggleTV() {
    this.tvOn = !this.tvOn;
    this.sendControl('tv', this.tvOn ? 'on' : 'off', {});
  }

  toggleDND() {
    const s = this.api.getSession();
    if (!s) return;
    const active = !this.dnd;
    this.api.post('/guest/room-controls/dnd', {
      property_id: s.property_id, booking_id: s.booking.id,
      guest_id: s.guest.id, room_id: s.booking.room_id,
      room_number: s.booking.room_number, active,
    }).subscribe({
      next: () => { this.dnd = active; this.flash(active ? '🔕 DND activated' : '🔔 DND deactivated', true); },
      error: () => this.flash('Failed to toggle DND', false),
    });
  }

  private flash(message: string, ok: boolean) {
    this.msg = message; this.msgOk = ok;
    setTimeout(() => this.msg = '', 2500);
  }
}

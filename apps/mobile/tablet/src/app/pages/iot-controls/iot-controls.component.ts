import { Component, NO_ERRORS_SCHEMA, OnInit, OnDestroy } from '@angular/core';
import { NativeScriptCommonModule } from '@nativescript/angular';
import { TabletApiService } from '../../services/tablet-api.service';
import { Subscription, interval } from 'rxjs';

@Component({
  selector: 'TabletIoT',
  standalone: true,
  imports: [NativeScriptCommonModule],
  schemas: [NO_ERRORS_SCHEMA],
  template: `
    <GridLayout rows="auto, *" class="bg-gray-50">
      <GridLayout row="0" columns="auto, *" class="bg-blue-700 p-4">
        <Label col="0" text="← Back" class="text-white text-lg" (tap)="goBack()"></Label>
        <Label col="1" text="Smart Room Controls" class="text-white text-xl font-bold text-center"></Label>
      </GridLayout>

      <ScrollView row="1">
        <StackLayout class="p-6">
          <!-- AC Control -->
          <GridLayout columns="auto, *, auto" class="bg-white rounded-2xl p-6 m-b-4 shadow-sm">
            <Label col="0" text="❄️" class="text-4xl"></Label>
            <StackLayout col="1" class="m-l-4">
              <Label text="Air Conditioning" class="text-lg font-bold"></Label>
              <Label [text]="acTemp + '°C'" class="text-blue-600 text-2xl font-bold"></Label>
            </StackLayout>
            <StackLayout col="2" class="text-center">
              <Button text="+" class="bg-blue-600 text-white w-10 h-10 rounded-full m-b-2" (tap)="adjustTemp(1)"></Button>
              <Button text="-" class="bg-blue-600 text-white w-10 h-10 rounded-full" (tap)="adjustTemp(-1)"></Button>
            </StackLayout>
          </GridLayout>

          <!-- Lights -->
          <GridLayout columns="auto, *, auto" class="bg-white rounded-2xl p-6 m-b-4 shadow-sm">
            <Label col="0" text="💡" class="text-4xl"></Label>
            <StackLayout col="1" class="m-l-4">
              <Label text="Room Lights" class="text-lg font-bold"></Label>
              <Label [text]="lightsOn ? 'On — ' + lightBrightness + '%' : 'Off'" class="text-gray-500"></Label>
            </StackLayout>
            <StackLayout col="2">
              <Button [text]="lightsOn ? 'Turn Off' : 'Turn On'" [class]="lightsOn ? 'bg-yellow-500 text-white p-2 rounded-lg' : 'bg-gray-300 text-gray-700 p-2 rounded-lg'" (tap)="toggleLights()"></Button>
            </StackLayout>
          </GridLayout>

          <!-- Curtains -->
          <GridLayout columns="auto, *, auto" class="bg-white rounded-2xl p-6 m-b-4 shadow-sm">
            <Label col="0" text="🪟" class="text-4xl"></Label>
            <StackLayout col="1" class="m-l-4">
              <Label text="Curtains" class="text-lg font-bold"></Label>
              <Label [text]="curtainsOpen ? 'Open' : 'Closed'" class="text-gray-500"></Label>
            </StackLayout>
            <Button col="2" [text]="curtainsOpen ? 'Close' : 'Open'" class="bg-gray-200 text-gray-700 p-2 rounded-lg" (tap)="toggleCurtains()"></Button>
          </GridLayout>

          <!-- TV -->
          <GridLayout columns="auto, *, auto" class="bg-white rounded-2xl p-6 m-b-4 shadow-sm">
            <Label col="0" text="📺" class="text-4xl"></Label>
            <StackLayout col="1" class="m-l-4">
              <Label text="Television" class="text-lg font-bold"></Label>
              <Label [text]="tvOn ? 'On' : 'Off'" class="text-gray-500"></Label>
            </StackLayout>
            <Button col="2" [text]="tvOn ? 'Turn Off' : 'Turn On'" [class]="tvOn ? 'bg-green-500 text-white p-2 rounded-lg' : 'bg-gray-300 text-gray-700 p-2 rounded-lg'" (tap)="toggleTV()"></Button>
          </GridLayout>

          <!-- Do Not Disturb -->
          <GridLayout columns="auto, *, auto" class="bg-white rounded-2xl p-6 m-b-4 shadow-sm">
            <Label col="0" text="🔕" class="text-4xl"></Label>
            <StackLayout col="1" class="m-l-4">
              <Label text="Do Not Disturb" class="text-lg font-bold"></Label>
              <Label [text]="dnd ? 'Active' : 'Inactive'" [class]="dnd ? 'text-red-600' : 'text-gray-500'"></Label>
            </StackLayout>
            <Button col="2" [text]="dnd ? 'Disable' : 'Enable'" [class]="dnd ? 'bg-red-500 text-white p-2 rounded-lg' : 'bg-gray-300 text-gray-700 p-2 rounded-lg'" (tap)="toggleDND()"></Button>
          </GridLayout>
        </StackLayout>
      </ScrollView>
    </GridLayout>
  `
})
export class IoTControlsComponent implements OnInit, OnDestroy {
  acTemp = 22; lightsOn = true; lightBrightness = 80; curtainsOpen = true; tvOn = false; dnd = false;
  private poller?: Subscription;

  constructor(private api: TabletApiService) {}

  ngOnInit() {
    this.loadState();
    this.poller = interval(10000).subscribe(() => this.loadState());
  }
  ngOnDestroy() { this.poller?.unsubscribe(); }

  loadState() {
    this.api.get('/iot/room-devices').subscribe((r: any) => {
      const devices = r?.data || [];
      for (const d of devices) {
        const state = d.current_state || {};
        if (d.device_type === 'ac') this.acTemp = state.temperature || 22;
        if (d.device_type === 'light') { this.lightsOn = state.power === 'on'; this.lightBrightness = state.brightness || 80; }
        if (d.device_type === 'curtain') this.curtainsOpen = state.position === 'open';
        if (d.device_type === 'tv') this.tvOn = state.power === 'on';
      }
    });
  }

  adjustTemp(delta: number) { this.acTemp = Math.max(16, Math.min(30, this.acTemp + delta)); this.sendControl('ac', 'set_temp', { temperature: this.acTemp }); }
  toggleLights() { this.lightsOn = !this.lightsOn; this.sendControl('light', this.lightsOn ? 'on' : 'off', { brightness: this.lightBrightness }); }
  toggleCurtains() { this.curtainsOpen = !this.curtainsOpen; this.sendControl('curtain', this.curtainsOpen ? 'open' : 'close', {}); }
  toggleTV() { this.tvOn = !this.tvOn; this.sendControl('tv', this.tvOn ? 'on' : 'off', {}); }
  toggleDND() { this.dnd = !this.dnd; }

  private sendControl(deviceType: string, action: string, params: any) {
    this.api.post('/iot/trigger', { event_type: 'manual', context: { device_type: deviceType, action, params } }).subscribe();
  }

  goBack() { /* routerExtensions.back() */ }
}

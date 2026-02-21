import { Component, inject, OnInit, signal } from '@angular/core';
import { JsonPipe } from '@angular/common';
import { ApiService, PageHeaderComponent, LoadingSpinnerComponent } from '@lodgik/shared';
@Component({
  selector: 'app-iot', standalone: true, imports: [JsonPipe, PageHeaderComponent, LoadingSpinnerComponent],
  template: `
    <ui-page-header title="IoT Smart Rooms" subtitle="Connected devices, automations, and energy monitoring">
      <div class="flex gap-2">
        <button (click)="tab = 'devices'" [class]="tab === 'devices' ? 'bg-blue-600 text-white' : 'bg-gray-200'" class="px-3 py-2 text-sm rounded-lg">Devices</button>
        <button (click)="tab = 'automations'" [class]="tab === 'automations' ? 'bg-blue-600 text-white' : 'bg-gray-200'" class="px-3 py-2 text-sm rounded-lg">Automations</button>
        <button (click)="tab = 'energy'" [class]="tab === 'energy' ? 'bg-green-600 text-white' : 'bg-gray-200'" class="px-3 py-2 text-sm rounded-lg">Energy</button>
      </div>
    </ui-page-header>
    <ui-loading [loading]="loading()"></ui-loading>
    <div class="grid grid-cols-3 gap-4 mb-6">
      @for (s of Object.entries(statusSummary()); track s[0]) {
        <div class="bg-white rounded-lg border p-4"><p class="text-xs text-gray-500 uppercase">{{s[0]}}</p><p class="text-2xl font-bold">{{s[1]}}</p></div>
      }
    </div>
    @if (tab === 'devices') {
      <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        @for (d of devices(); track d.id) {
          <div class="bg-white rounded-lg border p-4">
            <div class="flex items-start justify-between"><div><p class="font-semibold">{{d.name}}</p><p class="text-sm text-gray-500">{{d.device_type}} • Room {{d.room_number || 'N/A'}}</p></div>
              <span [class]="d.status === 'online' ? 'bg-green-500' : 'bg-gray-400'" class="w-2.5 h-2.5 rounded-full"></span></div>
            <div class="mt-3 text-xs text-gray-500"><p>MQTT: {{d.mqtt_topic || '-'}}</p><p>Energy: {{d.energy_kwh}} kWh</p><p>Last: {{d.last_seen || 'never'}}</p></div>
            @if (d.current_state) { <pre class="mt-2 text-xs bg-gray-50 p-2 rounded overflow-x-auto">{{d.current_state | json}}</pre> }
          </div>
        } @empty { <p class="col-span-3 text-center text-gray-400 py-8">No IoT devices</p> }
      </div>
    }
    @if (tab === 'automations') {
      <div class="bg-white rounded-lg border overflow-x-auto"><table class="w-full text-sm"><thead class="bg-gray-50"><tr>
        <th class="px-4 py-3 text-left">Name</th><th class="px-4 py-3 text-left">Trigger</th><th class="px-4 py-3 text-left">Actions</th><th class="px-4 py-3 text-center">Active</th>
      </tr></thead><tbody>
        @for (a of automations(); track a.id) {
          <tr class="border-t hover:bg-gray-50"><td class="px-4 py-3 font-medium">{{a.name}}</td><td class="px-4 py-3">{{a.trigger_type}}</td>
            <td class="px-4 py-3 text-xs">{{a.actions.length}} action(s)</td>
            <td class="px-4 py-3 text-center"><button (click)="toggleAuto(a)" [class]="a.is_active ? 'bg-green-500' : 'bg-gray-300'" class="w-10 h-5 rounded-full relative"><span [class]="'absolute top-0.5 w-4 h-4 bg-white rounded-full transition-all ' + (a.is_active ? 'left-5' : 'left-0.5')"></span></button></td></tr>
        } @empty { <tr><td colspan="4" class="px-4 py-8 text-center text-gray-400">No automations</td></tr> }
      </tbody></table></div>
    }
    @if (tab === 'energy') {
      <div class="bg-white rounded-lg border overflow-x-auto"><table class="w-full text-sm"><thead class="bg-gray-50"><tr>
        <th class="px-4 py-3 text-left">Room</th><th class="px-4 py-3 text-left">Device</th><th class="px-4 py-3 text-left">Type</th>
        <th class="px-4 py-3 text-right">Energy (kWh)</th><th class="px-4 py-3 text-center">Status</th>
      </tr></thead><tbody>
        @for (e of energyReport(); track e.name) {
          <tr class="border-t"><td class="px-4 py-3">{{e.roomNumber || '-'}}</td><td class="px-4 py-3 font-medium">{{e.name}}</td><td class="px-4 py-3">{{e.deviceType}}</td>
            <td class="px-4 py-3 text-right font-mono">{{e.energyKwh}}</td><td class="px-4 py-3 text-center"><span [class]="e.status === 'online' ? 'text-green-600' : 'text-gray-400'">●</span></td></tr>
        } @empty { <tr><td colspan="5" class="px-4 py-8 text-center text-gray-400">No energy data</td></tr> }
      </tbody></table></div>
    }
  `
})
export default class IoTPage implements OnInit {
  private api = inject(ApiService); loading = signal(true); devices = signal<any[]>([]); automations = signal<any[]>([]); energyReport = signal<any[]>([]); statusSummary = signal<any>({}); tab = 'devices'; Object = Object;
  ngOnInit() { this.api.get('/iot/devices').subscribe((r: any) => { this.devices.set(r?.data || []); this.loading.set(false); });
    this.api.get('/iot/automations').subscribe((r: any) => this.automations.set(r?.data || []));
    this.api.get('/iot/energy').subscribe((r: any) => this.energyReport.set(r?.data || []));
    this.api.get('/iot/status-summary').subscribe((r: any) => this.statusSummary.set(r?.data || {})); }
  toggleAuto(a: any) { this.api.post(`/iot/automations/${a.id}/toggle`, { active: !a.is_active }).subscribe(() => this.ngOnInit()); }
}

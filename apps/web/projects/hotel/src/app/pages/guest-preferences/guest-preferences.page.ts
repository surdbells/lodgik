import { Component, inject, OnInit, signal } from '@angular/core';
import { ApiService, PageHeaderComponent, LoadingSpinnerComponent } from '@lodgik/shared';
@Component({
  selector: 'app-guest-preferences', standalone: true, imports: [PageHeaderComponent, LoadingSpinnerComponent],
  template: `
    <ui-page-header title="Guest Preferences" subtitle="Manage VIP preferences, dietary needs, and communication settings"></ui-page-header>
    <ui-loading [loading]="loading()"></ui-loading>
    <div class="bg-white rounded-lg border overflow-x-auto">
      <table class="w-full text-sm"><thead class="bg-gray-50"><tr>
        <th class="px-4 py-3 text-left">Guest</th><th class="px-4 py-3 text-center">VIP</th><th class="px-4 py-3 text-left">Room Prefs</th>
        <th class="px-4 py-3 text-left">Dietary</th><th class="px-4 py-3 text-left">Comm.</th><th class="px-4 py-3 text-left">Language</th>
      </tr></thead><tbody>
        @for (p of prefs(); track p.id) {
          <tr class="border-t hover:bg-gray-50"><td class="px-4 py-3 font-medium">{{p.guest_name || p.guest_id}}</td>
            <td class="px-4 py-3 text-center">{{p.vip_status ? '⭐' : ''}}</td>
            <td class="px-4 py-3 text-xs">{{formatJson(p.room_preferences)}}</td>
            <td class="px-4 py-3 text-xs">{{(p.dietary_restrictions || []).join(', ') || '-'}}</td>
            <td class="px-4 py-3">{{p.communication_preference}}</td><td class="px-4 py-3">{{p.preferred_language}}</td></tr>
        } @empty { <tr><td colspan="6" class="px-4 py-8 text-center text-gray-400">No guest preferences recorded</td></tr> }
      </tbody></table>
    </div>
  `
})
export default class GuestPreferencesPage implements OnInit {
  private api = inject(ApiService); loading = signal(true); prefs = signal<any[]>([]);
  ngOnInit() { this.api.get('/loyalty/guests/preferences').subscribe({ next: (r: any) => { this.prefs.set(r?.data || []); this.loading.set(false); }, error: () => this.loading.set(false) }); }
  formatJson(obj: any): string { if (!obj) return '-'; return Object.entries(obj).map(([k, v]) => `${k}: ${v}`).join(', '); }
}

import { Component, inject, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ApiService, PageHeaderComponent, LoadingSpinnerComponent } from '@lodgik/shared';
@Component({
  selector: 'app-engineers', standalone: true, imports: [FormsModule, PageHeaderComponent, LoadingSpinnerComponent],
  template: `
    <ui-page-header title="Service Engineers" subtitle="Internal and external maintenance engineers">
      <button (click)="showForm = !showForm" class="px-4 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700">+ Add Engineer</button>
    </ui-page-header>
    <ui-loading [loading]="loading()"></ui-loading>
    @if (showForm) {
      <div class="bg-white rounded-lg border p-6 mb-6">
        <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div><label class="block text-sm font-medium mb-1">Name</label><input type="text" [(ngModel)]="form.name" class="w-full border rounded-lg px-3 py-2 text-sm"></div>
          <div><label class="block text-sm font-medium mb-1">Type</label><select [(ngModel)]="form.type" class="w-full border rounded-lg px-3 py-2 text-sm"><option value="internal">Internal</option><option value="external">External</option><option value="oem">OEM</option></select></div>
          <div><label class="block text-sm font-medium mb-1">Specialization</label><select [(ngModel)]="form.specialization" class="w-full border rounded-lg px-3 py-2 text-sm"><option value="hvac">HVAC</option><option value="electrical">Electrical</option><option value="plumbing">Plumbing</option><option value="elevator">Elevator</option><option value="it">IT</option><option value="general">General</option></select></div>
          <div><label class="block text-sm font-medium mb-1">Phone</label><input type="tel" [(ngModel)]="form.phone" class="w-full border rounded-lg px-3 py-2 text-sm"></div>
          <div><label class="block text-sm font-medium mb-1">Email</label><input type="email" [(ngModel)]="form.email" class="w-full border rounded-lg px-3 py-2 text-sm"></div>
          <div><label class="block text-sm font-medium mb-1">Availability</label><select [(ngModel)]="form.availability" class="w-full border rounded-lg px-3 py-2 text-sm"><option value="24x7">24/7</option><option value="business_hours">Business Hours</option><option value="on_call">On Call</option></select></div>
        </div>
        <div class="flex gap-2 mt-4"><button (click)="create()" class="px-4 py-2 bg-blue-600 text-white text-sm rounded-lg">Add</button><button (click)="showForm = false" class="px-4 py-2 bg-gray-200 text-sm rounded-lg">Cancel</button></div>
      </div>
    }
    <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      @for (e of engineers(); track e.id) {
        <div class="bg-white rounded-lg border p-4">
          <div class="flex items-start justify-between"><div><p class="font-semibold">{{e.name}}</p><p class="text-sm text-gray-500">{{e.specialization}} • {{e.type}}</p></div>
            <span [class]="e.is_active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'" class="px-2 py-0.5 rounded text-xs font-medium">{{e.is_active ? 'Active' : 'Inactive'}}</span></div>
          <div class="mt-3 text-sm text-gray-600 space-y-1"><p>📞 {{e.phone || '-'}}</p><p>📧 {{e.email || '-'}}</p><p>⏱ SLA: {{e.sla_response_minutes}}m response / {{e.sla_resolution_minutes}}m resolve</p><p>🕐 {{e.availability}}</p></div>
        </div>
      } @empty { <p class="col-span-3 text-center text-gray-400 py-8">No engineers registered</p> }
    </div>
  `
})
export default class EngineersPage implements OnInit {
  private api = inject(ApiService); loading = signal(true); engineers = signal<any[]>([]); showForm = false;
  form: any = { name: '', type: 'internal', specialization: 'general', phone: '', email: '', availability: '24x7' };
  ngOnInit() { this.api.get('/engineers').subscribe((r: any) => { this.engineers.set(r?.data || []); this.loading.set(false); }); }
  create() { this.api.post('/engineers', this.form).subscribe(() => { this.showForm = false; this.ngOnInit(); }); }
}

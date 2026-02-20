import { Component, inject, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { ApiService, PageHeaderComponent, LoadingSpinnerComponent, AuthService } from '@lodgik/shared';

@Component({
  selector: 'app-gym-members',
  standalone: true,
  imports: [FormsModule, RouterLink, PageHeaderComponent, LoadingSpinnerComponent],
  template: `
    <ui-page-header title="Gym Members" subtitle="Member directory and registration">
      <button (click)="showForm = true; editMember = null; resetForm()" class="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700">+ Register Member</button>
    </ui-page-header>

    <ui-loading [loading]="loading()"></ui-loading>

    <!-- Search -->
    <div class="mb-4 flex gap-3">
      <input [(ngModel)]="search" (ngModelChange)="load()" placeholder="Search by name, phone, or email..." class="flex-1 border rounded-lg px-4 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"/>
      <select [(ngModel)]="filterType" (ngModelChange)="load()" class="border rounded-lg px-3 py-2 text-sm">
        <option value="">All Types</option>
        <option value="external">External</option>
        <option value="guest">Hotel Guest</option>
      </select>
    </div>

    <!-- Members Table -->
    <div class="bg-white rounded-lg border border-gray-200 overflow-hidden">
      <table class="w-full text-sm">
        <thead class="bg-gray-50 border-b">
          <tr>
            <th class="text-left px-4 py-3 font-medium text-gray-600">Member</th>
            <th class="text-left px-4 py-3 font-medium text-gray-600">Phone</th>
            <th class="text-left px-4 py-3 font-medium text-gray-600">Type</th>
            <th class="text-left px-4 py-3 font-medium text-gray-600">QR Code</th>
            <th class="text-left px-4 py-3 font-medium text-gray-600">Membership</th>
            <th class="px-4 py-3"></th>
          </tr>
        </thead>
        <tbody>
          @for (m of members(); track m.id) {
            <tr class="border-b hover:bg-gray-50">
              <td class="px-4 py-3">
                <div class="font-medium">{{ m.full_name }}</div>
                <div class="text-xs text-gray-400">{{ m.email || '—' }}</div>
              </td>
              <td class="px-4 py-3">{{ m.phone }}</td>
              <td class="px-4 py-3">
                <span [class]="m.member_type === 'guest' ? 'bg-purple-100 text-purple-700 px-2 py-0.5 rounded text-xs' : 'bg-gray-100 text-gray-700 px-2 py-0.5 rounded text-xs'">{{ m.member_type }}</span>
              </td>
              <td class="px-4 py-3 font-mono text-xs">{{ m.qr_code }}</td>
              <td class="px-4 py-3">
                @if (m._membership) {
                  <span class="text-xs px-2 py-0.5 rounded" [style.background]="m._membership.status_color + '20'" [style.color]="m._membership.status_color">{{ m._membership.status_label }}</span>
                  <span class="text-xs text-gray-400 ml-1">{{ m._membership.days_remaining }}d</span>
                } @else {
                  <span class="text-xs text-gray-400">None</span>
                }
              </td>
              <td class="px-4 py-3 text-right">
                <button (click)="editMemberFn(m)" class="text-blue-600 text-xs hover:underline mr-2">Edit</button>
                <button (click)="viewProfile(m)" class="text-gray-500 text-xs hover:underline">Profile</button>
              </td>
            </tr>
          }
        </tbody>
      </table>
      @if (!loading() && members().length === 0) {
        <div class="p-8 text-center text-gray-400">No members found</div>
      }
    </div>

    <!-- Register/Edit Modal -->
    @if (showForm) {
      <div class="fixed inset-0 bg-black/40 flex items-center justify-center z-50" (click)="showForm = false">
        <div class="bg-white rounded-xl shadow-xl w-full max-w-lg p-6" (click)="$event.stopPropagation()">
          <h3 class="text-lg font-semibold mb-4">{{ editMember ? 'Edit Member' : 'Register New Member' }}</h3>
          <div class="grid grid-cols-2 gap-3">
            <div>
              <label class="text-xs text-gray-500">First Name *</label>
              <input [(ngModel)]="form.first_name" class="w-full border rounded-lg px-3 py-2 text-sm"/>
            </div>
            <div>
              <label class="text-xs text-gray-500">Last Name *</label>
              <input [(ngModel)]="form.last_name" class="w-full border rounded-lg px-3 py-2 text-sm"/>
            </div>
            <div>
              <label class="text-xs text-gray-500">Phone *</label>
              <input [(ngModel)]="form.phone" class="w-full border rounded-lg px-3 py-2 text-sm"/>
            </div>
            <div>
              <label class="text-xs text-gray-500">Email</label>
              <input [(ngModel)]="form.email" type="email" class="w-full border rounded-lg px-3 py-2 text-sm"/>
            </div>
            <div>
              <label class="text-xs text-gray-500">Gender</label>
              <select [(ngModel)]="form.gender" class="w-full border rounded-lg px-3 py-2 text-sm">
                <option value="">—</option><option value="M">Male</option><option value="F">Female</option>
              </select>
            </div>
            <div>
              <label class="text-xs text-gray-500">Date of Birth</label>
              <input [(ngModel)]="form.date_of_birth" type="date" class="w-full border rounded-lg px-3 py-2 text-sm"/>
            </div>
            <div class="col-span-2">
              <label class="text-xs text-gray-500">Emergency Contact</label>
              <input [(ngModel)]="form.emergency_contact" class="w-full border rounded-lg px-3 py-2 text-sm"/>
            </div>
            <div class="col-span-2">
              <label class="text-xs text-gray-500">Notes</label>
              <textarea [(ngModel)]="form.notes" rows="2" class="w-full border rounded-lg px-3 py-2 text-sm"></textarea>
            </div>
          </div>
          <div class="flex justify-end gap-2 mt-4">
            <button (click)="showForm = false" class="px-4 py-2 border rounded-lg text-sm">Cancel</button>
            <button (click)="saveMember()" [disabled]="saving" class="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium">{{ saving ? 'Saving...' : 'Save' }}</button>
          </div>
        </div>
      </div>
    }

    <!-- Profile Drawer -->
    @if (selectedMember) {
      <div class="fixed inset-0 bg-black/40 flex justify-end z-50" (click)="selectedMember = null">
        <div class="bg-white w-full max-w-md h-full overflow-y-auto p-6" (click)="$event.stopPropagation()">
          <div class="flex justify-between items-center mb-4">
            <h3 class="text-lg font-semibold">{{ selectedMember.full_name }}</h3>
            <button (click)="selectedMember = null" class="text-gray-400 text-xl">&times;</button>
          </div>
          <div class="space-y-3 text-sm">
            <div><span class="text-gray-400">Phone:</span> {{ selectedMember.phone }}</div>
            <div><span class="text-gray-400">Email:</span> {{ selectedMember.email || '—' }}</div>
            <div><span class="text-gray-400">Type:</span> {{ selectedMember.member_type }}</div>
            <div><span class="text-gray-400">QR Code:</span> <span class="font-mono">{{ selectedMember.qr_code }}</span></div>
            <div><span class="text-gray-400">Gender:</span> {{ selectedMember.gender || '—' }}</div>
            <div><span class="text-gray-400">DOB:</span> {{ selectedMember.date_of_birth || '—' }}</div>
            <div><span class="text-gray-400">Emergency:</span> {{ selectedMember.emergency_contact || '—' }}</div>
            <div><span class="text-gray-400">Notes:</span> {{ selectedMember.notes || '—' }}</div>
            <div><span class="text-gray-400">Joined:</span> {{ selectedMember.created_at }}</div>
          </div>
          @if (selectedMember._membership) {
            <div class="mt-4 p-3 bg-gray-50 rounded-lg">
              <div class="text-xs text-gray-500 mb-1">Active Membership</div>
              <div class="font-medium">{{ selectedMember._membership.plan_name }}</div>
              <div class="text-xs text-gray-500">Expires: {{ selectedMember._membership.expires_at }}</div>
              <div class="text-xs">{{ selectedMember._membership.days_remaining }} days remaining</div>
            </div>
          }
        </div>
      </div>
    }
  `,
})
export class GymMembersPage implements OnInit {
  private api = inject(ApiService);
  private auth = inject(AuthService);
  loading = signal(true);
  members = signal<any[]>([]);
  search = '';
  filterType = '';
  showForm = false;
  saving = false;
  editMember: any = null;
  selectedMember: any = null;
  form: any = {};

  ngOnInit() { this.load(); }

  load() {
    const pid = this.auth.currentUser?.property_id || '';
    let url = `/gym/members?property_id=${pid}`;
    if (this.search) url += `&search=${this.search}`;
    this.api.get(url).subscribe({
      next: (r: any) => {
        const members = r.data || [];
        // Load active memberships for each
        members.forEach((m: any) => {
          this.api.get(`/gym/members/${m.id}`).subscribe({
            next: (mr: any) => { m._membership = mr.data?.active_membership; },
          });
        });
        if (this.filterType) {
          this.members.set(members.filter((m: any) => m.member_type === this.filterType));
        } else {
          this.members.set(members);
        }
        this.loading.set(false);
      },
    });
  }

  resetForm() { this.form = { first_name: '', last_name: '', phone: '', email: '', gender: '', date_of_birth: '', emergency_contact: '', notes: '' }; }

  editMemberFn(m: any) {
    this.editMember = m;
    this.form = { ...m };
    this.showForm = true;
  }

  viewProfile(m: any) { this.selectedMember = m; }

  saveMember() {
    const pid = this.auth.currentUser?.property_id || '';
    this.saving = true;
    if (this.editMember) {
      this.api.put(`/gym/members/${this.editMember.id}`, this.form).subscribe({
        next: () => { this.saving = false; this.showForm = false; this.load(); },
        error: () => this.saving = false,
      });
    } else {
      this.api.post('/gym/members', { ...this.form, property_id: pid }).subscribe({
        next: () => { this.saving = false; this.showForm = false; this.load(); },
        error: () => this.saving = false,
      });
    }
  }
}

import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { TabletService } from './tablet.service';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { environment } from '../../../environments/environment';

@Component({ selector: 'app-tablet-setup', standalone: true, imports: [FormsModule],
  template: `
    <div class="h-screen w-screen flex items-center justify-center bg-slate-950 p-8">
      <div class="w-full max-w-md bg-slate-900 rounded-3xl p-8 border border-slate-800">
        <div class="text-center mb-8">
          <div class="text-5xl mb-4">⚙️</div>
          <h1 class="text-white text-2xl font-bold">Register Tablet</h1>
          <p class="text-slate-400 text-sm mt-2">Enter the property ID and room to bind this tablet</p>
        </div>

        <div class="space-y-4">
          <div>
            <label class="text-slate-400 text-xs uppercase tracking-wider">Property ID</label>
            <input [(ngModel)]="form.property_id" placeholder="Enter property UUID"
              class="w-full mt-1.5 px-4 py-3 bg-slate-800 border border-slate-700 rounded-xl text-white text-sm focus:outline-none focus:border-blue-500">
          </div>
          <div>
            <label class="text-slate-400 text-xs uppercase tracking-wider">Room ID</label>
            <input [(ngModel)]="form.room_id" placeholder="Enter room UUID"
              class="w-full mt-1.5 px-4 py-3 bg-slate-800 border border-slate-700 rounded-xl text-white text-sm focus:outline-none focus:border-blue-500">
          </div>
          <div>
            <label class="text-slate-400 text-xs uppercase tracking-wider">Tablet Name</label>
            <input [(ngModel)]="form.name" placeholder="e.g. Room 101 Tablet"
              class="w-full mt-1.5 px-4 py-3 bg-slate-800 border border-slate-700 rounded-xl text-white text-sm focus:outline-none focus:border-blue-500">
          </div>
          <div>
            <label class="text-slate-400 text-xs uppercase tracking-wider">Staff Auth Token</label>
            <input [(ngModel)]="form.auth_token" type="password" placeholder="Paste your JWT token"
              class="w-full mt-1.5 px-4 py-3 bg-slate-800 border border-slate-700 rounded-xl text-white text-sm focus:outline-none focus:border-blue-500">
          </div>
        </div>

        @if (error()) {
          <div class="mt-4 px-4 py-3 bg-red-900/50 border border-red-700 rounded-xl text-red-300 text-sm">{{ error() }}</div>
        }

        <button (click)="register()" [disabled]="loading()"
          class="w-full mt-6 py-4 bg-blue-600 text-white font-bold text-lg rounded-2xl hover:bg-blue-500 disabled:opacity-50 active:scale-95 transition-all">
          {{ loading() ? 'Registering…' : 'Register Tablet' }}
        </button>
      </div>
    </div>
  `,
})
export class TabletSetupPage {
  private svc    = inject(TabletService);
  private router = inject(Router);
  private http   = inject(HttpClient);
  private base   = environment.apiUrl.replace(/\/+$/, '');

  form = { property_id: '', room_id: '', name: 'Concierge Tablet', auth_token: '' };
  loading = signal(false);
  error   = signal('');

  register(): void {
    if (!this.form.property_id || !this.form.room_id || !this.form.auth_token) {
      this.error.set('All fields are required'); return;
    }
    this.loading.set(true);
    this.error.set('');
    const headers = new HttpHeaders({ Authorization: `Bearer ${this.form.auth_token}` });
    this.http.post(`${this.base}/api/tablets`, {
      property_id: this.form.property_id,
      room_id: this.form.room_id,
      name: this.form.name,
    }, { headers }).subscribe({
      next: (r: any) => {
        this.svc.deviceToken = r.data?.device_token ?? r.data?.id ?? '';
        this.loading.set(false);
        this.router.navigate(['/tablet/idle']);
      },
      error: (e: any) => {
        this.error.set(e?.error?.message ?? 'Registration failed');
        this.loading.set(false);
      },
    });
  }
}

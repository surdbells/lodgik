import { Component, inject, signal, OnInit } from '@angular/core';
import { DatePipe } from '@angular/common';
import { PageHeaderComponent, LoadingSpinnerComponent, ToastService } from '@lodgik/shared';
import { MerchantApiService } from '../../services/merchant-api.service';

@Component({
  selector: 'app-notifications',
  standalone: true,
  imports: [DatePipe, PageHeaderComponent, LoadingSpinnerComponent],
  template: `
    <ui-page-header title="Notifications" subtitle="Stay updated on your merchant activity">
      <button (click)="markAll()" class="px-4 py-2 bg-gray-100 text-gray-700 text-sm rounded-lg hover:bg-gray-200">Mark All Read</button>
    </ui-page-header>
    <ui-loading [loading]="loading()"></ui-loading>
    @if (!loading()) {
      <div class="space-y-2">
        @for (n of notifications(); track n.id) {
          <div [class.bg-emerald-50]="!n.is_read" [class.border-emerald-200]="!n.is_read" class="bg-white rounded-lg border p-4 flex items-start gap-3 hover:shadow-sm transition-shadow cursor-pointer" (click)="markOne(n)">
            <div class="text-lg">{{ typeIcon(n.type) }}</div>
            <div class="flex-1 min-w-0">
              <div class="flex items-center gap-2 mb-0.5">
                <h4 class="text-sm font-medium" [class.font-semibold]="!n.is_read">{{ n.title }}</h4>
                @if (!n.is_read) { <span class="w-2 h-2 rounded-full bg-emerald-500 shrink-0"></span> }
              </div>
              <p class="text-xs text-gray-600 line-clamp-2">{{ n.body }}</p>
              <p class="text-[10px] text-gray-400 mt-1">{{ n.sent_at | date:'medium' }}</p>
            </div>
          </div>
        } @empty { <div class="text-center py-12 text-gray-400">No notifications</div> }
      </div>
    }
  `,
})
export class NotificationsPage implements OnInit {
  private api = inject(MerchantApiService);
  private toast = inject(ToastService);
  loading = signal(true); notifications = signal<any[]>([]);

  ngOnInit(): void { this.load(); }
  load(): void { this.api.listNotifications().subscribe({ next: (n: any[]) => { this.notifications.set(n); this.loading.set(false); } }); }
  markOne(n: any): void { if (!n.is_read) { this.api.markRead(n.id).subscribe({ next: () => { n.is_read = true; } }); } }
  markAll(): void { this.api.markAllRead().subscribe({ next: () => { this.toast.success('All marked read'); this.load(); } }); }
  typeIcon(t: string): string { return ({ commission_approved: '💰', commission_paid: '🏦', kyc_update: '✅', policy_change: '📋', new_resource: '📁' } as any)[t] || '🔔'; }
}

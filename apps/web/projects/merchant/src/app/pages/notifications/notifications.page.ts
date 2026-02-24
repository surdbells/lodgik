import { Component, inject, signal, OnInit } from '@angular/core';
import { DatePipe } from '@angular/common';
import { PageHeaderComponent, LoadingSpinnerComponent, ToastService } from '@lodgik/shared';
import { MerchantApiService } from '../../services/merchant-api.service';

@Component({
  selector: 'app-notifications',
  standalone: true,
  imports: [DatePipe, PageHeaderComponent, LoadingSpinnerComponent],
  template: `
    <ui-page-header title="Notifications" icon="bell" [breadcrumbs]="['Notifications']" subtitle="Stay updated on your merchant activity">
      <button (click)="markAll()" class="px-3 py-2 bg-gray-100 text-gray-700 text-sm rounded-lg hover:bg-gray-200">Mark all read</button>
    </ui-page-header>
    <ui-loading [loading]="loading()"></ui-loading>
    @if (!loading()) {
      <div class="space-y-2">
        @for (n of notifications(); track n.id) {
          <div [class.bg-emerald-50]="!n.is_read" [class.border-emerald-200]="!n.is_read" class="bg-white rounded-xl border border-gray-100 shadow-card p-4 flex items-start gap-3 cursor-pointer hover:shadow-sm transition-shadow" (click)="markRead(n)">
            <span class="text-xl shrink-0">{{ typeIcon(n.type) }}</span>
            <div class="flex-1 min-w-0">
              <div class="flex items-center justify-between">
                <h4 class="text-sm font-medium" [class.text-emerald-800]="!n.is_read">{{ n.title }}</h4>
                <span class="text-[10px] text-gray-400 shrink-0">{{ n.sent_at | date:'short' }}</span>
              </div>
              <p class="text-xs text-gray-500 mt-0.5">{{ n.body }}</p>
            </div>
            @if (!n.is_read) { <span class="w-2 h-2 bg-emerald-500 rounded-full shrink-0 mt-1.5"></span> }
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

  ngOnInit(): void { this.api.listNotifications().subscribe({ next: (n: any[]) => { this.notifications.set(n || []); this.loading.set(false); }, error: () => this.loading.set(false) }); }
  markRead(n: any): void { if (!n.is_read) { this.api.markRead(n.id).subscribe({ next: () => { n.is_read = true; }, error: () => {} }); } }
  markAll(): void { this.api.markAllRead().subscribe({ next: () => { this.notifications().forEach(n => n.is_read = true); this.toast.success('All notifications marked read'); }, error: () => {} }); }
  typeIcon(type: string): string { return { commission_approved: '💰', commission_paid: '🏦', kyc_update: '📋', new_resource: '📁', policy_change: '⚠️' }[type] || '🔔'; }
}

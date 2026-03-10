import { Component, inject, OnInit, signal } from '@angular/core';
import { ApiService, PageHeaderComponent, LoadingSpinnerComponent, AuthService, ActivePropertyService} from '@lodgik/shared';

@Component({
  selector: 'app-notifications',
  standalone: true,
  imports: [PageHeaderComponent, LoadingSpinnerComponent],
  template: `
    <ui-page-header title="Notifications" subtitle="Alerts and activity updates">
      <div class="flex gap-2">
        @if (unreadCount() > 0) {
          <button (click)="markAllRead()" class="px-3 py-2 text-sm border border-gray-300 rounded-lg hover:bg-gray-50">Mark All Read</button>
        }
      </div>
    </ui-page-header>

    <ui-loading [loading]="loading()"></ui-loading>

    @if (!loading()) {
      <!-- Filter -->
      <div class="flex gap-2 mb-4">
        @for (f of filters; track f.value) {
          <button (click)="filter = f.value" [class]="filter === f.value ? 'px-3 py-1.5 bg-sage-600 text-white rounded-full text-xs font-medium' : 'px-3 py-1.5 border border-gray-300 text-gray-500 rounded-full text-xs'">{{ f.label }}</button>
        }
      </div>

      <div class="space-y-2">
        @for (n of filtered(); track n.id) {
          <div class="bg-white rounded-xl border p-4 flex gap-3 cursor-pointer hover:bg-gray-50 transition-colors"
               [class.border-sage-200]="!n.read" [class.bg-sage-50/30]="!n.read" [class.border-gray-100]="n.read"
               (click)="markRead(n)">
            <div class="w-10 h-10 rounded-full flex items-center justify-center text-lg shrink-0"
                 [style.background]="typeColor(n.type) + '20'" [style.color]="typeColor(n.type)">
              {{ typeIcon(n.type) }}
            </div>
            <div class="flex-1 min-w-0">
              <div class="flex items-center justify-between mb-0.5">
                <h4 class="text-sm font-medium text-gray-800" [class.font-semibold]="!n.read">{{ n.title }}</h4>
                <span class="text-xs text-gray-400 shrink-0 ml-2">{{ timeAgo(n.created_at) }}</span>
              </div>
              <p class="text-sm text-gray-500 line-clamp-2">{{ n.message }}</p>
              @if (n.action_url) {
                <a [href]="n.action_url" class="text-xs text-sage-600 hover:underline mt-1 inline-block">View details →</a>
              }
            </div>
            @if (!n.read) {
              <div class="w-2 h-2 bg-sage-500 rounded-full shrink-0 mt-2"></div>
            }
          </div>
        } @empty {
          <div class="text-center py-16 text-gray-400">
            <div class="text-4xl mb-3">🔔</div>
            <p class="text-sm">No notifications yet</p>
          </div>
        }
      </div>
    }
  `,
})
export class NotificationsPage implements OnInit {
  private api = inject(ApiService);
  private auth = inject(AuthService);
  private activeProperty = inject(ActivePropertyService);
  loading = signal(true);
  notifications = signal<any[]>([]);
  unreadCount = signal(0);
  filter = '';

  filters = [
    { label: 'All', value: '' }, { label: 'Unread', value: 'unread' },
    { label: 'Bookings', value: 'booking' }, { label: 'System', value: 'system' },
    { label: 'Finance', value: 'finance' }, { label: 'Housekeeping', value: 'housekeeping' },
  ];

  ngOnInit(): void { this.load(); }

  load(): void {
    const pid = this.activeProperty.propertyId();
    this.api.get('/notifications', { property_id: pid }).subscribe({
      next: (r: any) => {
        const raw = r?.data || [];
        // Map API fields to frontend fields
        const data = raw.map((n: any) => ({
          ...n,
          type: n.type || n.channel || 'system',
          message: n.message || n.body || '',
          read: n.read ?? n.is_read ?? false,
          action_url: n.action_url || n.data?.action_url || null,
        }));
        this.notifications.set(data);
        this.unreadCount.set(data.filter((n: any) => !n.read).length);
        this.loading.set(false);
      },
      error: () => {
        this.notifications.set([]);
        this.unreadCount.set(0);
        this.loading.set(false);
      },
    });
  }

  filtered(): any[] {
    const all = this.notifications();
    if (!this.filter) return all;
    if (this.filter === 'unread') return all.filter(n => !n.read);
    return all.filter(n => n.type === this.filter);
  }

  markRead(n: any): void {
    if (n.read) return;
    n.read = true;
    this.unreadCount.update(c => Math.max(0, c - 1));
    this.api.post(`/notifications/${n.id}/read`, {}).subscribe();
  }

  markAllRead(): void {
    this.notifications().forEach(n => n.read = true);
    this.unreadCount.set(0);
    this.api.post('/notifications/read-all', {}).subscribe();
  }

  typeIcon(type: string): string {
    return { booking: '📋', system: '⚙️', finance: '💰', housekeeping: '🧹', guest: '👤', security: '🔒', maintenance: '🔧' }[type] || '🔔';
  }

  typeColor(type: string): string {
    return { booking: '#3b82f6', system: '#6b7280', finance: '#22c55e', housekeeping: '#f59e0b', guest: '#8b5cf6', security: '#ef4444', maintenance: '#dc2626' }[type] || '#6b7280';
  }

  timeAgo(date: string): string {
    if (!date) return '';
    const diff = Date.now() - new Date(date).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return 'Just now';
    if (mins < 60) return `${mins}m ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h ago`;
    const days = Math.floor(hrs / 24);
    return days === 1 ? 'Yesterday' : `${days}d ago`;
  }

  private getSampleNotifications(): any[] {
    const now = new Date();
    return [
      { id: '1', type: 'booking', title: 'New Booking', message: 'A new reservation has been made for Room 203, checking in tomorrow.', created_at: new Date(+now - 3600000).toISOString(), read: false },
      { id: '2', type: 'housekeeping', title: 'Task Completed', message: 'Room 105 checkout cleaning has been completed and inspected.', created_at: new Date(+now - 7200000).toISOString(), read: false },
      { id: '3', type: 'finance', title: 'Payment Received', message: 'Payment of ₦45,000 received for invoice INV-20260226-001.', created_at: new Date(+now - 14400000).toISOString(), read: true },
      { id: '4', type: 'system', title: 'System Update', message: 'Lodgik platform has been updated with new features. Check the changelog.', created_at: new Date(+now - 86400000).toISOString(), read: true },
      { id: '5', type: 'guest', title: 'Guest Request', message: 'Guest in Room 301 requested extra towels via the concierge app.', created_at: new Date(+now - 172800000).toISOString(), read: true },
    ];
  }
}

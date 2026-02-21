import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { OfflineStorageService } from '../services/offline-storage.service';

@Component({
  selector: 'app-offline-indicator',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div *ngIf="!isOnline" class="offline-banner">
      <span class="offline-dot"></span>
      <span>You are offline</span>
      <span *ngIf="pendingCount > 0" class="pending-badge">{{ pendingCount }} pending</span>
      <button (click)="manualSync()" class="sync-btn">Sync Now</button>
    </div>
    <div *ngIf="isOnline && showSyncSuccess" class="sync-success-banner">
      Synced successfully!
    </div>
  `,
  styles: [`
    .offline-banner { position: fixed; top: 0; left: 0; right: 0; z-index: 9999; background: #f44336; color: white; padding: 8px 16px; display: flex; align-items: center; gap: 10px; font-size: 13px; font-weight: 500; }
    .offline-dot { width: 8px; height: 8px; border-radius: 50%; background: #ffcdd2; animation: pulse 1.5s infinite; }
    @keyframes pulse { 0%,100% { opacity: 1; } 50% { opacity: 0.4; } }
    .pending-badge { background: rgba(255,255,255,0.2); padding: 2px 8px; border-radius: 10px; font-size: 11px; }
    .sync-btn { background: rgba(255,255,255,0.2); border: 1px solid rgba(255,255,255,0.4); color: white; padding: 4px 12px; border-radius: 4px; cursor: pointer; font-size: 12px; margin-left: auto; }
    .sync-btn:hover { background: rgba(255,255,255,0.3); }
    .sync-success-banner { position: fixed; top: 0; left: 0; right: 0; z-index: 9999; background: #4caf50; color: white; padding: 8px 16px; text-align: center; font-size: 13px; animation: fadeOut 3s forwards; }
    @keyframes fadeOut { 0%,70% { opacity: 1; } 100% { opacity: 0; } }
  `]
})
export class OfflineIndicatorComponent implements OnInit, OnDestroy {
  isOnline = true;
  pendingCount = 0;
  showSyncSuccess = false;
  private checkTimer: any;

  constructor(private offlineStorage: OfflineStorageService) {}

  ngOnInit(): void {
    this.checkStatus();
    this.checkTimer = setInterval(() => this.checkStatus(), 5000);
  }

  ngOnDestroy(): void {
    if (this.checkTimer) clearInterval(this.checkTimer);
  }

  private async checkStatus(): Promise<void> {
    this.isOnline = this.offlineStorage.isOnline;
    this.pendingCount = await this.offlineStorage.getSyncQueueCount();
  }

  async manualSync(): Promise<void> {
    const result = await this.offlineStorage.processSync(async (method, url, body) => {
      try {
        const resp = await fetch(url, {
          method, headers: { 'Content-Type': 'application/json' },
          body: body ? JSON.stringify(body) : undefined
        });
        return resp.ok;
      } catch { return false; }
    });
    if (result.synced > 0) {
      this.showSyncSuccess = true;
      setTimeout(() => this.showSyncSuccess = false, 3000);
    }
    await this.checkStatus();
  }
}

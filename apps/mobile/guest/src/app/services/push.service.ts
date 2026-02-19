import { Injectable, NgZone } from '@angular/core';
import { ApplicationSettings } from '@nativescript/core';
import { ApiService } from './api.service';

const FCM_TOKEN_KEY = 'fcm_token';
const PUSH_ENABLED_KEY = 'push_enabled';

/**
 * Push notification service for guest app.
 * Registers FCM token with backend and handles incoming notifications.
 */
@Injectable({ providedIn: 'root' })
export class PushService {
  private initialized = false;
  onNotification: ((data: any) => void) | null = null;

  constructor(private api: ApiService, private zone: NgZone) {}

  /**
   * Initialize push notifications.
   * Should be called after successful login.
   */
  async init(): Promise<void> {
    if (this.initialized) return;

    try {
      const firebase = await import('nativescript-plugin-firebase');
      await firebase.init({
        showNotifications: true,
        showNotificationsWhenInForeground: true,
        onPushTokenReceivedCallback: (token: string) => {
          this.zone.run(() => this.registerToken(token));
        },
        onMessageReceivedCallback: (message: any) => {
          this.zone.run(() => this.handleMessage(message));
        },
      });

      this.initialized = true;
      ApplicationSettings.setBoolean(PUSH_ENABLED_KEY, true);

      // Get current token if available
      const currentToken = await firebase.getCurrentPushToken();
      if (currentToken) {
        this.registerToken(currentToken);
      }
    } catch (err: any) {
      console.error('[PushService] init error:', err);
      // Push not available (emulator, permissions denied, etc.)
    }
  }

  /**
   * Register FCM token with the backend.
   */
  private registerToken(token: string) {
    const existingToken = ApplicationSettings.getString(FCM_TOKEN_KEY, '');
    if (token === existingToken) return; // Already registered

    ApplicationSettings.setString(FCM_TOKEN_KEY, token);

    const session = this.api.getSession();
    if (!session) return;

    this.api.post('/device-tokens', {
      token: token,
      platform: this.detectPlatform(),
      owner_type: 'guest',
      owner_id: session.guest?.id || '',
    }).subscribe({
      next: () => console.log('[PushService] Token registered'),
      error: (err: any) => console.error('[PushService] Token registration failed:', err),
    });
  }

  /**
   * Handle incoming push notification.
   */
  private handleMessage(message: any) {
    console.log('[PushService] Message received:', JSON.stringify(message));

    const data = message.data || message;
    if (this.onNotification) {
      this.onNotification(data);
    }
  }

  /**
   * Unregister token on logout.
   */
  async unregister(): Promise<void> {
    const token = ApplicationSettings.getString(FCM_TOKEN_KEY, '');
    if (token) {
      this.api.post('/device-tokens/remove', { token }).subscribe();
      ApplicationSettings.remove(FCM_TOKEN_KEY);
    }
  }

  /**
   * Check if push is enabled and token is registered.
   */
  isEnabled(): boolean {
    return ApplicationSettings.getBoolean(PUSH_ENABLED_KEY, false) && !!ApplicationSettings.getString(FCM_TOKEN_KEY, '');
  }

  private detectPlatform(): string {
    try {
      const { isAndroid, isIOS } = require('@nativescript/core');
      if (isAndroid) return 'android';
      if (isIOS) return 'ios';
    } catch { /* ignore */ }
    return 'android';
  }
}

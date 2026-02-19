import { Injectable, NgZone } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { BehaviorSubject, Observable } from 'rxjs';
import { ApplicationSettings } from '@nativescript/core';

const API_URL_KEY = 'tablet_api_url';
const DEVICE_TOKEN_KEY = 'tablet_device_token';
const SESSION_TOKEN_KEY = 'tablet_session_token';
const GUEST_KEY = 'tablet_guest';

@Injectable({ providedIn: 'root' })
export class TabletApiService {
  private baseUrl = '';
  hasGuest$ = new BehaviorSubject<boolean>(false);
  guestData$ = new BehaviorSubject<any>(null);
  private pollTimer: any;

  constructor(private http: HttpClient, private zone: NgZone) {
    this.baseUrl = ApplicationSettings.getString(API_URL_KEY, 'https://api.lodgik.app');
    const cached = ApplicationSettings.getString(GUEST_KEY, '');
    if (cached) {
      try {
        const g = JSON.parse(cached);
        this.guestData$.next(g);
        this.hasGuest$.next(g?.has_guest || false);
      } catch { /* ignore */ }
    }
  }

  setBaseUrl(url: string) {
    this.baseUrl = url;
    ApplicationSettings.setString(API_URL_KEY, url);
  }

  getBaseUrl(): string { return this.baseUrl; }

  // ─── Device Token ────────────────────────────────────────

  setDeviceToken(token: string) { ApplicationSettings.setString(DEVICE_TOKEN_KEY, token); }
  getDeviceToken(): string { return ApplicationSettings.getString(DEVICE_TOKEN_KEY, ''); }
  isRegistered(): boolean { return !!this.getDeviceToken(); }

  // ─── Session Token (for guest-scoped API calls) ──────────

  private get sessionToken(): string { return ApplicationSettings.getString(SESSION_TOKEN_KEY, ''); }
  private set sessionToken(v: string) { ApplicationSettings.setString(SESSION_TOKEN_KEY, v); }

  private headers(): HttpHeaders {
    let h = new HttpHeaders({ 'Content-Type': 'application/json' });
    if (this.sessionToken) h = h.set('Authorization', `Bearer ${this.sessionToken}`);
    return h;
  }

  get<T = any>(path: string, params?: any): Observable<T> {
    let url = `${this.baseUrl}${path}`;
    if (params) {
      const qs = Object.entries(params).filter(([, v]) => v != null && v !== '').map(([k, v]) => `${k}=${encodeURIComponent(String(v))}`).join('&');
      if (qs) url += `?${qs}`;
    }
    return this.http.get<T>(url, { headers: this.headers() });
  }

  post<T = any>(path: string, body: any): Observable<T> {
    return this.http.post<T>(`${this.baseUrl}${path}`, body, { headers: this.headers() });
  }

  // ─── Tablet Auth Polling ──────────────────────────────────

  /** Authenticate tablet and check for guest binding */
  authenticate(): Observable<any> {
    return this.post('/guest-auth/tablet', { device_token: this.getDeviceToken() });
  }

  /** Start polling every 15s to detect guest check-in/check-out */
  startPolling() {
    this.stopPolling();
    this.pollOnce();
    this.pollTimer = setInterval(() => this.zone.run(() => this.pollOnce()), 15000);
  }

  stopPolling() {
    if (this.pollTimer) { clearInterval(this.pollTimer); this.pollTimer = null; }
  }

  private pollOnce() {
    if (!this.isRegistered()) return;
    this.authenticate().subscribe({
      next: (r: any) => {
        const data = r.data;
        const hadGuest = this.hasGuest$.value;
        const hasGuest = data?.has_guest || false;

        if (hasGuest && data.session?.token) {
          this.sessionToken = data.session.token;
        }

        this.guestData$.next(data);
        this.hasGuest$.next(hasGuest);
        ApplicationSettings.setString(GUEST_KEY, JSON.stringify(data));

        // Trigger auto-reset if guest checked out
        if (hadGuest && !hasGuest) {
          this.sessionToken = '';
          ApplicationSettings.remove(GUEST_KEY);
        }
      },
      error: () => { /* silent — tablet keeps polling */ },
    });
  }

  /** Clear guest state on checkout */
  resetGuest() {
    this.sessionToken = '';
    this.hasGuest$.next(false);
    this.guestData$.next(null);
    ApplicationSettings.remove(GUEST_KEY);
  }
}

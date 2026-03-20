import { Injectable, signal } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { inject } from '@angular/core';
import { environment } from '../../../environments/environment';

const DEVICE_TOKEN_KEY = 'tablet_device_token';
const SESSION_TOKEN_KEY = 'tablet_session_token';
const GUEST_KEY        = 'tablet_guest';

@Injectable({ providedIn: 'root' })
export class TabletService {
  private http = inject(HttpClient);
  private base = environment.apiUrl.replace(/\/+$/, '');

  // Reactive state
  hasGuest  = signal(false);
  guestData = signal<any>(null);
  sessionToken = signal('');

  constructor() {
    const token = localStorage.getItem(SESSION_TOKEN_KEY) ?? '';
    this.sessionToken.set(token);
    const cached = localStorage.getItem(GUEST_KEY);
    if (cached) {
      try {
        const g = JSON.parse(cached);
        this.guestData.set(g);
        this.hasGuest.set(g?.has_guest ?? false);
      } catch {}
    }
  }

  get deviceToken(): string { return localStorage.getItem(DEVICE_TOKEN_KEY) ?? ''; }
  set deviceToken(v: string) { localStorage.setItem(DEVICE_TOKEN_KEY, v); }
  get isRegistered(): boolean { return !!this.deviceToken; }

  private headers(): HttpHeaders {
    const t = this.sessionToken();
    return new HttpHeaders(t ? { Authorization: `Bearer ${t}` } : {});
  }

  get<T = any>(path: string, params?: any) {
    let url = `${this.base}${path}`;
    if (params) {
      const qs = Object.entries(params).filter(([,v]) => v != null)
        .map(([k,v]) => `${k}=${encodeURIComponent(String(v))}`).join('&');
      if (qs) url += '?' + qs;
    }
    return this.http.get<T>(url, { headers: this.headers() });
  }

  post<T = any>(path: string, body: any = {}) {
    return this.http.post<T>(`${this.base}${path}`, body, { headers: this.headers() });
  }

  /** Poll for guest check-in */
  poll() {
    return this.post('/guest-auth/tablet', { device_token: this.deviceToken });
  }

  updateSession(data: any) {
    const hasGuest = data?.has_guest ?? false;
    this.hasGuest.set(hasGuest);
    this.guestData.set(data);
    localStorage.setItem(GUEST_KEY, JSON.stringify(data));
    if (hasGuest && data?.session?.token) {
      this.sessionToken.set(data.session.token);
      localStorage.setItem(SESSION_TOKEN_KEY, data.session.token);
    } else if (!hasGuest) {
      this.sessionToken.set('');
      localStorage.setItem(SESSION_TOKEN_KEY, '');
    }
  }

  clearSession() {
    this.sessionToken.set('');
    this.hasGuest.set(false);
    this.guestData.set(null);
    localStorage.removeItem(SESSION_TOKEN_KEY);
    localStorage.removeItem(GUEST_KEY);
  }
}

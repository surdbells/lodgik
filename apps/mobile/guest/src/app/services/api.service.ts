import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';
import { ApplicationSettings } from '@nativescript/core';

const API_URL_KEY = 'api_url';
const TOKEN_KEY = 'guest_token';
const SESSION_KEY = 'guest_session';

@Injectable({ providedIn: 'root' })
export class ApiService {
  private baseUrl = '';

  constructor(private http: HttpClient) {
    this.baseUrl = ApplicationSettings.getString(API_URL_KEY, 'https://api.lodgik.app');
  }

  setBaseUrl(url: string) {
    this.baseUrl = url;
    ApplicationSettings.setString(API_URL_KEY, url);
  }

  getBaseUrl(): string { return this.baseUrl; }

  private headers(): HttpHeaders {
    const token = ApplicationSettings.getString(TOKEN_KEY, '');
    let h = new HttpHeaders({ 'Content-Type': 'application/json' });
    if (token) h = h.set('Authorization', `Bearer ${token}`);
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

  put<T = any>(path: string, body: any): Observable<T> {
    return this.http.put<T>(`${this.baseUrl}${path}`, body, { headers: this.headers() });
  }

  // ─── Token Management ─────────────────────────────────────

  setToken(token: string) { ApplicationSettings.setString(TOKEN_KEY, token); }
  getToken(): string { return ApplicationSettings.getString(TOKEN_KEY, ''); }
  clearToken() { ApplicationSettings.remove(TOKEN_KEY); }
  isLoggedIn(): boolean { return !!this.getToken(); }

  // ─── Session Data ─────────────────────────────────────────

  setSession(session: any) { ApplicationSettings.setString(SESSION_KEY, JSON.stringify(session)); }
  getSession(): any {
    const raw = ApplicationSettings.getString(SESSION_KEY, '');
    return raw ? JSON.parse(raw) : null;
  }
  clearSession() {
    ApplicationSettings.remove(SESSION_KEY);
    ApplicationSettings.remove(TOKEN_KEY);
  }
}

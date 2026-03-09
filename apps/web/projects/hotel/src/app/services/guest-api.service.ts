import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

/**
 * GuestApiService
 *
 * Wrapper around HttpClient for the guest-facing PWA endpoints.
 * Automatically:
 *  - Uses the correct backend base URL (environment.apiUrl)
 *  - Attaches the guest session token from localStorage as Bearer
 *
 * Used exclusively by guest portal pages (/guest/*).
 * All guest API endpoints are under /api/guest/** and are authenticated
 * by GuestMiddleware (session token), NOT the staff JWT.
 */
@Injectable({ providedIn: 'root' })
export class GuestApiService {
  private http = inject(HttpClient);
  // environment.apiUrl is already 'https://api.lodgik.co/api'
  private readonly base = environment.apiUrl.replace(/\/+$/, '');

  get<T = any>(path: string): Observable<T> {
    return this.http.get<T>(`${this.base}${path}`, { headers: this.headers() });
  }

  post<T = any>(path: string, body: any = {}): Observable<T> {
    return this.http.post<T>(`${this.base}${path}`, body, { headers: this.headers() });
  }

  private headers(): HttpHeaders {
    const token = localStorage.getItem('guest_token') ?? '';
    return new HttpHeaders(token ? { Authorization: `Bearer ${token}` } : {});
  }
}

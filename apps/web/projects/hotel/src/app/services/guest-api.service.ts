import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

@Injectable({ providedIn: 'root' })
export class GuestApiService {
  private http = inject(HttpClient);
  private readonly base = environment.apiUrl.replace(/\/+$/, '');

  get<T = any>(path: string): Observable<T> {
    return this.http.get<T>(`${this.base}${path}`, { headers: this.headers() });
  }

  post<T = any>(path: string, body: any = {}): Observable<T> {
    return this.http.post<T>(`${this.base}${path}`, body, { headers: this.headers() });
  }

  delete<T = any>(path: string): Observable<T> {
    return this.http.delete<T>(`${this.base}${path}`, { headers: this.headers() });
  }

  private headers(): HttpHeaders {
    const token = localStorage.getItem('guest_token') ?? '';
    return new HttpHeaders(token ? { Authorization: `Bearer ${token}` } : {});
  }
}

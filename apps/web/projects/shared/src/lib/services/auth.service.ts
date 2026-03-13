import { Injectable, inject } from '@angular/core';
import { Router } from '@angular/router';
import { Observable, tap, catchError, of, switchMap } from 'rxjs';
import { ApiService } from './api.service';
import { TokenService } from './token.service';
import { ApiResponse, AuthResponse, LoginRequest, User } from '../models';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private api = inject(ApiService);
  private token = inject(TokenService);
  private router = inject(Router);

  login(credentials: LoginRequest): Observable<ApiResponse<AuthResponse>> {
    return this.api.post<AuthResponse>('/auth/login', credentials).pipe(
      tap(res => {
        if (res.success && res.data) {
          this.token.setTokens(res.data.access_token, res.data.refresh_token);
          this.token.setUser(res.data.user);
          // Fetch permissions immediately after login
          const propertyId = res.data.user.property_id ?? '';
          this.token.fetchPermissions(propertyId);
        }
      })
    );
  }

  logout(): Observable<ApiResponse> {
    return this.api.post('/auth/logout').pipe(
      tap(() => this.token.clear()),
      catchError(() => {
        this.token.clear();
        return of({ success: true, data: null } as ApiResponse);
      })
    );
  }

  refresh(): Observable<ApiResponse<AuthResponse>> {
    const refreshToken = this.token.getRefreshToken();
    if (!refreshToken) {
      this.token.clear();
      return of({ success: false, data: null as any } as ApiResponse<AuthResponse>);
    }

    return this.api.post<AuthResponse>('/auth/refresh', { refresh_token: refreshToken }).pipe(
      tap(res => {
        if (res.success && res.data) {
          this.token.setTokens(res.data.access_token, res.data.refresh_token);
          if (res.data.user) this.token.setUser(res.data.user);
        }
      }),
      catchError(() => {
        this.token.clear();
        return of({ success: false, data: null as any } as ApiResponse<AuthResponse>);
      })
    );
  }

  getMe(): Observable<ApiResponse<User>> {
    return this.api.get<User>('/auth/me').pipe(
      tap(res => {
        if (res.success && res.data) {
          this.token.setUser(res.data);
        }
      })
    );
  }

  forgotPassword(email: string): Observable<ApiResponse> {
    return this.api.post('/auth/forgot-password', { email });
  }

  resetPassword(token: string, password: string, passwordConfirmation: string): Observable<ApiResponse> {
    return this.api.post('/auth/reset-password', { token, password, password_confirmation: passwordConfirmation });
  }

  navigateToLogin(): void {
    this.router.navigate(['/login']);
  }

  get isAuthenticated(): boolean {
    return this.token.isAuthenticated();
  }

  get currentUser(): User | null {
    return this.token.user();
  }
}

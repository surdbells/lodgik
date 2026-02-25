import { Component, inject, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { TokenService } from '@lodgik/shared';

@Component({
  selector: 'app-impersonate',
  standalone: true,
  template: `<div class="min-h-screen flex items-center justify-center"><p class="text-gray-500">Logging in...</p></div>`,
})
export class ImpersonatePage implements OnInit {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private token = inject(TokenService);

  ngOnInit(): void {
    const params = this.route.snapshot.queryParamMap;
    const accessToken = params.get('token');
    const refreshToken = params.get('refresh');

    if (accessToken && refreshToken) {
      this.token.setTokens(accessToken, refreshToken);
      // Decode JWT to get user info
      try {
        const payload = JSON.parse(atob(accessToken.split('.')[1]));
        this.token.setUser({
          id: payload.user_id,
          email: '',
          first_name: 'Admin',
          last_name: 'Impersonation',
          full_name: 'Admin Impersonation',
          role: payload.role,
          tenant_id: payload.tenant_id,
          property_id: payload.property_id,
          is_active: true,
          email_verified: true,
        } as any);
      } catch (e) { /* ignore decode errors */ }
      this.router.navigate(['/dashboard']);
    } else {
      this.router.navigate(['/login']);
    }
  }
}

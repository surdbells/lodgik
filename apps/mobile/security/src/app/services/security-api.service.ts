import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';
import { ApplicationSettings } from '@nativescript/core';

const API_KEY = 'api_base_url';
const TOKEN_KEY = 'auth_token';
const PID_KEY = 'property_id';

@Injectable({ providedIn: 'root' })
export class SecurityApiService {
  private baseUrl = ApplicationSettings.getString(API_KEY, 'http://10.0.2.2:8080');
  constructor(private http: HttpClient) {}
  private h(): HttpHeaders {
    return new HttpHeaders({ 'Content-Type': 'application/json', Authorization: `Bearer ${ApplicationSettings.getString(TOKEN_KEY, '')}` });
  }
  get propertyId(): string { return ApplicationSettings.getString(PID_KEY, ''); }

  // Gate Passes
  getGatePasses(status?: string): Observable<any> { let url = `${this.baseUrl}/security/gate-passes?property_id=${this.propertyId}`; if (status) url += `&status=${status}`; return this.http.get(url, { headers: this.h() }); }
  approveGatePass(id: string): Observable<any> { return this.http.post(`${this.baseUrl}/security/gate-passes/${id}/approve`, {}, { headers: this.h() }); }
  denyGatePass(id: string): Observable<any> { return this.http.post(`${this.baseUrl}/security/gate-passes/${id}/deny`, {}, { headers: this.h() }); }
  checkInGatePass(id: string): Observable<any> { return this.http.post(`${this.baseUrl}/security/gate-passes/${id}/check-in`, {}, { headers: this.h() }); }
  checkOutGatePass(id: string): Observable<any> { return this.http.post(`${this.baseUrl}/security/gate-passes/${id}/check-out`, {}, { headers: this.h() }); }

  // Visitor Codes
  validateVisitorCode(code: string): Observable<any> { return this.http.post(`${this.baseUrl}/security/visitor-codes/validate`, { code, property_id: this.propertyId }, { headers: this.h() }); }
  getVisitorCodes(): Observable<any> { return this.http.get(`${this.baseUrl}/security/visitor-codes?property_id=${this.propertyId}`, { headers: this.h() }); }

  // Guest Movements
  recordMovement(data: any): Observable<any> { return this.http.post(`${this.baseUrl}/security/movements`, { ...data, property_id: this.propertyId }, { headers: this.h() }); }
  getMovements(): Observable<any> { return this.http.get(`${this.baseUrl}/security/movements?property_id=${this.propertyId}`, { headers: this.h() }); }
  getOnPremise(): Observable<any> { return this.http.get(`${this.baseUrl}/security/on-premise?property_id=${this.propertyId}`, { headers: this.h() }); }

  // Asset Incidents
  reportIncident(data: any): Observable<any> { return this.http.post(`${this.baseUrl}/asset-incidents`, { ...data, property_id: this.propertyId }, { headers: this.h() }); }
  getIncidents(): Observable<any> { return this.http.get(`${this.baseUrl}/asset-incidents?property_id=${this.propertyId}`, { headers: this.h() }); }

  // Dashboard + Bookings (for checkout enforcement)
  getDashboard(): Observable<any> { return this.http.get(`${this.baseUrl}/dashboard/overview?property_id=${this.propertyId}`, { headers: this.h() }); }
  getBookings(status?: string): Observable<any> { let url = `${this.baseUrl}/bookings?property_id=${this.propertyId}`; if (status) url += `&status=${status}`; return this.http.get(url, { headers: this.h() }); }
  getFolioBalance(bookingId: string): Observable<any> { return this.http.get(`${this.baseUrl}/folios/by-booking/${bookingId}`, { headers: this.h() }); }

  // Auth
  login(email: string, password: string): Observable<any> { return this.http.post(`${this.baseUrl}/auth/login`, { email, password }); }
}

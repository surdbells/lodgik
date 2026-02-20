import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { ApplicationSettings } from '@nativescript/core';
import { Observable } from 'rxjs';

const API_KEY = 'reception_api_url';
const TOKEN_KEY = 'reception_token';
const PID_KEY = 'reception_property_id';

@Injectable({ providedIn: 'root' })
export class ReceptionApiService {
  private baseUrl = ApplicationSettings.getString(API_KEY, 'http://10.0.2.2:8080');

  constructor(private http: HttpClient) {}

  private h(): HttpHeaders {
    return new HttpHeaders({
      Authorization: `Bearer ${ApplicationSettings.getString(TOKEN_KEY, '')}`,
      'Content-Type': 'application/json',
    });
  }

  get propertyId(): string { return ApplicationSettings.getString(PID_KEY, ''); }

  configure(url: string, token: string, propertyId: string): void {
    this.baseUrl = url;
    ApplicationSettings.setString(API_KEY, url);
    ApplicationSettings.setString(TOKEN_KEY, token);
    ApplicationSettings.setString(PID_KEY, propertyId);
  }

  // ─── Dashboard ────────────────────────────────────────────
  getDashboard(): Observable<any> {
    return this.http.get(`${this.baseUrl}/dashboard/overview?property_id=${this.propertyId}`, { headers: this.h() });
  }

  // ─── Rooms ────────────────────────────────────────────────
  getRooms(): Observable<any> {
    return this.http.get(`${this.baseUrl}/rooms?property_id=${this.propertyId}`, { headers: this.h() });
  }

  updateRoomStatus(roomId: string, status: string): Observable<any> {
    return this.http.put(`${this.baseUrl}/rooms/${roomId}/status`, { status }, { headers: this.h() });
  }

  // ─── Bookings ─────────────────────────────────────────────
  getBookings(status?: string): Observable<any> {
    let url = `${this.baseUrl}/bookings?property_id=${this.propertyId}`;
    if (status) url += `&status=${status}`;
    return this.http.get(url, { headers: this.h() });
  }

  checkIn(bookingId: string): Observable<any> {
    return this.http.post(`${this.baseUrl}/bookings/${bookingId}/check-in`, {}, { headers: this.h() });
  }

  checkOut(bookingId: string): Observable<any> {
    return this.http.post(`${this.baseUrl}/bookings/${bookingId}/check-out`, {}, { headers: this.h() });
  }

  createBooking(data: any): Observable<any> {
    return this.http.post(`${this.baseUrl}/bookings`, { ...data, property_id: this.propertyId }, { headers: this.h() });
  }

  // ─── Guests ───────────────────────────────────────────────
  getGuests(search?: string): Observable<any> {
    let url = `${this.baseUrl}/guests?property_id=${this.propertyId}`;
    if (search) url += `&search=${search}`;
    return this.http.get(url, { headers: this.h() });
  }

  createGuest(data: any): Observable<any> {
    return this.http.post(`${this.baseUrl}/guests`, { ...data, property_id: this.propertyId }, { headers: this.h() });
  }

  // ─── Chat ─────────────────────────────────────────────────
  getActiveChats(): Observable<any> {
    return this.http.get(`${this.baseUrl}/chat/active?property_id=${this.propertyId}`, { headers: this.h() });
  }

  getChatMessages(bookingId: string): Observable<any> {
    return this.http.get(`${this.baseUrl}/chat/messages/${bookingId}`, { headers: this.h() });
  }

  sendChatMessage(data: any): Observable<any> {
    return this.http.post(`${this.baseUrl}/chat/messages`, data, { headers: this.h() });
  }

  markChatRead(bookingId: string): Observable<any> {
    return this.http.post(`${this.baseUrl}/chat/messages/${bookingId}/read`, { reader_type: 'staff' }, { headers: this.h() });
  }

  getUnreadCount(bookingId: string): Observable<any> {
    return this.http.get(`${this.baseUrl}/chat/unread/${bookingId}?for_type=staff`, { headers: this.h() });
  }

  // ─── Housekeeping ─────────────────────────────────────────
  getHousekeepingTasks(status?: string): Observable<any> {
    let url = `${this.baseUrl}/housekeeping/tasks?property_id=${this.propertyId}`;
    if (status) url += `&status=${status}`;
    return this.http.get(url, { headers: this.h() });
  }

  getHousekeepingStats(): Observable<any> {
    return this.http.get(`${this.baseUrl}/housekeeping/stats/today?property_id=${this.propertyId}`, { headers: this.h() });
  }

  // ─── Folios ───────────────────────────────────────────────
  getFolio(bookingId: string): Observable<any> {
    return this.http.get(`${this.baseUrl}/folios/booking/${bookingId}`, { headers: this.h() });
  }
}

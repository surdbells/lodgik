import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { ApplicationSettings } from '@nativescript/core';
import { Observable } from 'rxjs';

const API_URL_KEY = 'hk_api_url';
const TOKEN_KEY = 'hk_auth_token';

@Injectable({ providedIn: 'root' })
export class HousekeepingApiService {
  private baseUrl = ApplicationSettings.getString(API_URL_KEY, 'https://api.lodgik.co/api');

  constructor(private http: HttpClient) {}

  private headers(): HttpHeaders {
    return new HttpHeaders({ Authorization: `Bearer ${ApplicationSettings.getString(TOKEN_KEY, '')}`, 'Content-Type': 'application/json' });
  }

  configure(url: string, token: string) {
    this.baseUrl = url;
    ApplicationSettings.setString(API_URL_KEY, url);
    ApplicationSettings.setString(TOKEN_KEY, token);
  }

  // Tasks
  getTasks(propertyId: string, status?: string, assignedTo?: string): Observable<any> {
    let url = `${this.baseUrl}/housekeeping/tasks?property_id=${propertyId}`;
    if (status) url += `&status=${status}`;
    if (assignedTo) url += `&assigned_to=${assignedTo}`;
    return this.http.get(url, { headers: this.headers() });
  }

  startTask(taskId: string): Observable<any> {
    return this.http.post(`${this.baseUrl}/housekeeping/tasks/${taskId}/start`, {}, { headers: this.headers() });
  }

  completeTask(taskId: string, data: any): Observable<any> {
    return this.http.post(`${this.baseUrl}/housekeeping/tasks/${taskId}/complete`, data, { headers: this.headers() });
  }

  uploadPhoto(taskId: string, data: any): Observable<any> {
    return this.http.post(`${this.baseUrl}/housekeeping/tasks/${taskId}/photos`, data, { headers: this.headers() });
  }

  inspectTask(taskId: string, data: any): Observable<any> {
    return this.http.post(`${this.baseUrl}/housekeeping/tasks/${taskId}/inspect`, data, { headers: this.headers() });
  }

  todayStats(propertyId: string): Observable<any> {
    return this.http.get(`${this.baseUrl}/housekeeping/stats/today?property_id=${propertyId}`, { headers: this.headers() });
  }

  // Lost & Found
  reportLostItem(data: any): Observable<any> {
    return this.http.post(`${this.baseUrl}/housekeeping/lost-and-found`, data, { headers: this.headers() });
  }

  getLostAndFound(propertyId: string): Observable<any> {
    return this.http.get(`${this.baseUrl}/housekeeping/lost-and-found?property_id=${propertyId}`, { headers: this.headers() });
  }

  assignTask(taskId: string, staffId: string): Observable<any> {
    return this.http.post(`${this.baseUrl}/housekeeping/tasks/${taskId}/assign`, { assigned_to: staffId }, { headers: this.headers() });
  }

  selfAssignTask(taskId: string): Observable<any> {
    return this.http.post(`${this.baseUrl}/housekeeping/tasks/${taskId}/assign`, {}, { headers: this.headers() });
  }

  claimLostItem(itemId: string, data: any): Observable<any> {
    return this.http.post(`${this.baseUrl}/housekeeping/lost-and-found/${itemId}/claim`, data, { headers: this.headers() });
  }

  getNotifications(): Observable<any> {
    return this.http.get(`${this.baseUrl}/notifications?limit=50`, { headers: this.headers() });
  }

  markNotificationRead(id: string): Observable<any> {
    return this.http.post(`${this.baseUrl}/notifications/${id}/read`, {}, { headers: this.headers() });
  }

  markAllNotificationsRead(): Observable<any> {
    return this.http.post(`${this.baseUrl}/notifications/read-all`, {}, { headers: this.headers() });
  }
}

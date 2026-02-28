import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { ApplicationSettings } from '@nativescript/core';
import { Observable } from 'rxjs';

@Injectable({ providedIn: 'root' })
export class PosApiService {
  private baseUrl = ApplicationSettings.getString('pos_api_url', 'http://10.0.2.2:8080');

  constructor(private http: HttpClient) {}

  private h(): HttpHeaders { return new HttpHeaders({ Authorization: `Bearer ${ApplicationSettings.getString('pos_token', '')}`, 'Content-Type': 'application/json' }); }

  configure(url: string, token: string) { this.baseUrl = url; ApplicationSettings.setString('pos_api_url', url); ApplicationSettings.setString('pos_token', token); }

  getTables(pid: string): Observable<any> { return this.http.get(`${this.baseUrl}/pos/tables?property_id=${pid}`, { headers: this.h() }); }
  getCategories(pid: string): Observable<any> { return this.http.get(`${this.baseUrl}/pos/categories?property_id=${pid}`, { headers: this.h() }); }
  getProducts(pid: string, catId?: string): Observable<any> {
    let url = `${this.baseUrl}/pos/products?property_id=${pid}`;
    if (catId) url += `&category_id=${catId}`;
    return this.http.get(url, { headers: this.h() });
  }
  createOrder(data: any): Observable<any> { return this.http.post(`${this.baseUrl}/pos/orders`, data, { headers: this.h() }); }
  addItem(orderId: string, data: any): Observable<any> { return this.http.post(`${this.baseUrl}/pos/orders/${orderId}/items`, data, { headers: this.h() }); }
  removeItem(orderId: string, itemId: string): Observable<any> { return this.http.post(`${this.baseUrl}/pos/orders/${orderId}/items/${itemId}/remove`, {}, { headers: this.h() }); }
  getOrderItems(orderId: string): Observable<any> { return this.http.get(`${this.baseUrl}/pos/orders/${orderId}/items`, { headers: this.h() }); }
  sendToKitchen(orderId: string): Observable<any> { return this.http.post(`${this.baseUrl}/pos/orders/${orderId}/send`, {}, { headers: this.h() }); }
  payOrder(orderId: string, data: any): Observable<any> { return this.http.post(`${this.baseUrl}/pos/orders/${orderId}/pay`, data, { headers: this.h() }); }
  splitOrder(orderId: string): Observable<any> { return this.http.get(`${this.baseUrl}/pos/orders/${orderId}/split`, { headers: this.h() }); }
  cancelOrder(orderId: string, reason: string): Observable<any> { return this.http.post(`${this.baseUrl}/pos/orders/${orderId}/cancel`, { reason }, { headers: this.h() }); }
  postToFolio(orderId: string, bookingId: string): Observable<any> { return this.http.post(`${this.baseUrl}/pos/orders/${orderId}/post-to-folio`, { booking_id: bookingId }, { headers: this.h() }); }
  getBookings(pid: string): Observable<any> { return this.http.get(`${this.baseUrl}/bookings?property_id=${pid}&status=checked_in`, { headers: this.h() }); }
  getNotifications(pid: string): Observable<any> { return this.http.get(`${this.baseUrl}/notifications?property_id=${pid}&limit=50`, { headers: this.h() }); }
  markNotificationRead(id: string): Observable<any> { return this.http.post(`${this.baseUrl}/notifications/${id}/read`, {}, { headers: this.h() }); }
  markAllNotificationsRead(pid: string): Observable<any> { return this.http.post(`${this.baseUrl}/notifications/read-all`, { property_id: pid }, { headers: this.h() }); }
}

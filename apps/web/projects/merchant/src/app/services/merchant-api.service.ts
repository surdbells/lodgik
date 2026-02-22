import { Injectable, inject } from '@angular/core';
import { ApiService } from '@lodgik/shared';
import { Observable } from 'rxjs';

@Injectable({ providedIn: 'root' })
export class MerchantApiService {
  private api = inject(ApiService);

  // Dashboard
  dashboard(): Observable<any> { return this.api.get('/merchant/dashboard'); }
  profile(): Observable<any> { return this.api.get('/merchant/profile'); }

  // Hotels
  listHotels(status?: string): Observable<any> { return this.api.get('/merchant/hotels' + (status ? `?status=${status}` : '')); }
  registerHotel(data: any): Observable<any> { return this.api.post('/merchant/hotels', data); }
  hotelDetail(id: string): Observable<any> { return this.api.get(`/merchant/hotels/${id}`); }

  // Commissions
  listCommissions(params?: any): Observable<any> { return this.api.get('/merchant/commissions', { params }); }
  earnings(): Observable<any> { return this.api.get('/merchant/earnings'); }

  // Payouts
  listPayouts(): Observable<any> { return this.api.get('/merchant/payouts'); }

  // Leads
  listLeads(status?: string): Observable<any> { return this.api.get('/merchant/leads' + (status ? `?status=${status}` : '')); }
  createLead(data: any): Observable<any> { return this.api.post('/merchant/leads', data); }
  updateLead(id: string, data: any): Observable<any> { return this.api.put(`/merchant/leads/${id}`, data); }
  convertLead(id: string, data: any): Observable<any> { return this.api.post(`/merchant/leads/${id}/convert`, data); }

  // Resources
  listResources(params?: any): Observable<any> { return this.api.get('/merchant/resources', { params }); }
  downloadResource(id: string): Observable<any> { return this.api.post(`/merchant/resources/${id}/download`, {}); }

  // Support
  listTickets(status?: string): Observable<any> { return this.api.get('/merchant/tickets' + (status ? `?status=${status}` : '')); }
  createTicket(data: any): Observable<any> { return this.api.post('/merchant/tickets', data); }

  // KYC
  submitKyc(data: any): Observable<any> { return this.api.post('/merchant/kyc', data); }
  kycStatus(): Observable<any> { return this.api.get('/merchant/kyc'); }

  // Bank
  addBank(data: any): Observable<any> { return this.api.post('/merchant/bank', data); }
  updateBank(id: string, data: any): Observable<any> { return this.api.put(`/merchant/bank/${id}`, data); }

  // Notifications
  listNotifications(unread?: boolean): Observable<any> { return this.api.get('/merchant/notifications' + (unread ? '?unread=1' : '')); }
  markRead(id: string): Observable<any> { return this.api.post(`/merchant/notifications/${id}/read`, {}); }
  markAllRead(): Observable<any> { return this.api.post('/merchant/notifications/read-all', {}); }

  // Statements
  listStatements(): Observable<any> { return this.api.get('/merchant/statements'); }
  generateStatement(data: any): Observable<any> { return this.api.post('/merchant/statements', data); }
}

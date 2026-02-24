import { Injectable, inject } from '@angular/core';
import { ApiService } from '@lodgik/shared';
import { Observable, map } from 'rxjs';

/** Extracts .data from the API response wrapper { success, data, message } */
function unwrap<T>(): (source: Observable<any>) => Observable<T> {
  return (source: Observable<any>) => source.pipe(map((r: any) => r.data ?? r));
}

@Injectable({ providedIn: 'root' })
export class MerchantApiService {
  private api = inject(ApiService);

  // Dashboard
  dashboard(): Observable<any> { return this.api.get('/merchant/dashboard').pipe(unwrap()); }
  profile(): Observable<any> { return this.api.get('/merchant/profile').pipe(unwrap()); }

  // Hotels
  listHotels(status?: string): Observable<any[]> { return this.api.get('/merchant/hotels' + (status ? `?status=${status}` : '')).pipe(unwrap()); }
  registerHotel(data: any): Observable<any> { return this.api.post('/merchant/hotels', data).pipe(unwrap()); }
  hotelDetail(id: string): Observable<any> { return this.api.get(`/merchant/hotels/${id}`).pipe(unwrap()); }

  // Commissions
  listCommissions(params?: any): Observable<any[]> {
    const qs = params ? '?' + Object.entries(params).filter(([_, v]) => v).map(([k, v]) => `${k}=${v}`).join('&') : '';
    return this.api.get('/merchant/commissions' + qs).pipe(unwrap());
  }
  earnings(): Observable<any> { return this.api.get('/merchant/earnings').pipe(unwrap()); }

  // Payouts
  listPayouts(): Observable<any[]> { return this.api.get('/merchant/payouts').pipe(unwrap()); }

  // Leads
  listLeads(status?: string): Observable<any[]> { return this.api.get('/merchant/leads' + (status ? `?status=${status}` : '')).pipe(unwrap()); }
  createLead(data: any): Observable<any> { return this.api.post('/merchant/leads', data).pipe(unwrap()); }
  updateLead(id: string, data: any): Observable<any> { return this.api.put(`/merchant/leads/${id}`, data).pipe(unwrap()); }
  convertLead(id: string, data: any): Observable<any> { return this.api.post(`/merchant/leads/${id}/convert`, data).pipe(unwrap()); }

  // Resources
  listResources(params?: any): Observable<any[]> {
    const qs = params ? '?' + Object.entries(params).filter(([_, v]) => v).map(([k, v]) => `${k}=${v}`).join('&') : '';
    return this.api.get('/merchant/resources' + qs).pipe(unwrap());
  }
  downloadResource(id: string): Observable<any> { return this.api.post(`/merchant/resources/${id}/download`, {}).pipe(unwrap()); }

  // Support
  listTickets(status?: string): Observable<any[]> { return this.api.get('/merchant/tickets' + (status ? `?status=${status}` : '')).pipe(unwrap()); }
  createTicket(data: any): Observable<any> { return this.api.post('/merchant/tickets', data).pipe(unwrap()); }

  // KYC
  submitKyc(data: any): Observable<any> { return this.api.post('/merchant/kyc', data).pipe(unwrap()); }
  kycStatus(): Observable<any> { return this.api.get('/merchant/kyc').pipe(unwrap()); }

  // Bank
  addBank(data: any): Observable<any> { return this.api.post('/merchant/bank', data).pipe(unwrap()); }
  updateBank(id: string, data: any): Observable<any> { return this.api.put(`/merchant/bank/${id}`, data).pipe(unwrap()); }

  // Notifications
  listNotifications(unread?: boolean): Observable<any[]> { return this.api.get('/merchant/notifications' + (unread ? '?unread=1' : '')).pipe(unwrap()); }
  markRead(id: string): Observable<any> { return this.api.post(`/merchant/notifications/${id}/read`, {}).pipe(unwrap()); }
  markAllRead(): Observable<any> { return this.api.post('/merchant/notifications/read-all', {}).pipe(unwrap()); }

  // Statements
  listStatements(): Observable<any[]> { return this.api.get('/merchant/statements').pipe(unwrap()); }
  generateStatement(data: any): Observable<any> { return this.api.post('/merchant/statements', data).pipe(unwrap()); }
}

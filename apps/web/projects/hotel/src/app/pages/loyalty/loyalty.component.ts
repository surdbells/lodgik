import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../environments/environment';

@Component({
  selector: 'app-loyalty',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="page-header"><h1>Loyalty & Promotions</h1></div>
    <div class="tab-bar">
      <button [class.active]="tab==='tiers'" (click)="tab='tiers'">Loyalty Tiers</button>
      <button [class.active]="tab==='promotions'" (click)="tab='promotions';loadPromotions()">Promotions</button>
      <button [class.active]="tab==='lookup'" (click)="tab='lookup'">Guest Lookup</button>
    </div>

    <div *ngIf="tab==='tiers'">
      <button (click)="showTierForm=!showTierForm" class="btn-primary mb-3">+ New Tier</button>
      <div *ngIf="showTierForm" class="card form-card mb-3">
        <div class="form-grid">
          <div><label>Name</label><input [(ngModel)]="tierForm.name" placeholder="e.g. Gold"></div>
          <div><label>Min Points</label><input type="number" [(ngModel)]="tierForm.min_points"></div>
          <div><label>Discount %</label><input type="number" [(ngModel)]="tierForm.discount_percentage"></div>
          <div><label>Color</label><input [(ngModel)]="tierForm.color" placeholder="#FFD700"></div>
        </div>
        <div class="form-actions"><button (click)="createTier()" class="btn-primary">Save</button></div>
      </div>
      <div class="tier-grid"><div *ngFor="let t of tiers" class="tier-card" [style.borderColor]="t.color || '#ccc'"><h3>{{t.name}}</h3><p>{{t.min_points | number}} points</p><p>{{t.discount_percentage}}% discount</p><div *ngIf="t.benefits"><small *ngFor="let b of t.benefits">✓ {{b}} </small></div></div></div>
    </div>

    <div *ngIf="tab==='promotions'">
      <button (click)="showPromoForm=!showPromoForm" class="btn-primary mb-3">+ New Promotion</button>
      <div *ngIf="showPromoForm" class="card form-card mb-3">
        <div class="form-grid">
          <div><label>Code</label><input [(ngModel)]="promoForm.code" placeholder="SUMMER20"></div>
          <div><label>Name</label><input [(ngModel)]="promoForm.name" placeholder="Summer Sale"></div>
          <div><label>Type</label><select [(ngModel)]="promoForm.type"><option value="percentage">Percentage</option><option value="fixed">Fixed Amount</option><option value="free_night">Free Night</option></select></div>
          <div><label>Value</label><input type="number" [(ngModel)]="promoForm.value"></div>
          <div><label>Start</label><input type="date" [(ngModel)]="promoForm.start_date"></div>
          <div><label>End</label><input type="date" [(ngModel)]="promoForm.end_date"></div>
          <div><label>Usage Limit</label><input type="number" [(ngModel)]="promoForm.usage_limit"></div>
        </div>
        <div class="form-actions"><button (click)="createPromo()" class="btn-primary">Save</button></div>
      </div>
      <table class="data-table"><thead><tr><th>Code</th><th>Name</th><th>Type</th><th>Value</th><th>Dates</th><th>Usage</th><th>Active</th></tr></thead>
        <tbody><tr *ngFor="let p of promotions"><td><code>{{p.code}}</code></td><td>{{p.name}}</td><td>{{p.type}}</td><td>{{p.value}}</td><td>{{p.start_date}} — {{p.end_date}}</td><td>{{p.usage_count}}/{{p.usage_limit || '∞'}}</td><td>{{p.is_active ? '✅' : '❌'}}</td></tr></tbody>
      </table>
    </div>

    <div *ngIf="tab==='lookup'" class="card form-card">
      <h3>Guest Loyalty Lookup</h3>
      <div class="form-grid"><div><label>Guest ID</label><input [(ngModel)]="lookupGuestId"><button (click)="lookupGuest()" class="btn-primary ml-2">Look Up</button></div></div>
      <div *ngIf="guestTier" class="mt-3"><h4>{{guestTier.name || 'No tier yet'}}</h4><p>Points: {{guestTier.current_points | number}}</p></div>
    </div>
  `
})
export class LoyaltyComponent implements OnInit {
  tab = 'tiers'; tiers: any[] = []; promotions: any[] = []; showTierForm = false; showPromoForm = false; guestTier: any = null; lookupGuestId = '';
  tierForm: any = { name: '', min_points: 0, discount_percentage: 0, color: '' };
  promoForm: any = { code: '', name: '', type: 'percentage', value: 0, start_date: '', end_date: '', usage_limit: null };
  constructor(private http: HttpClient) {}
  ngOnInit() { this.loadTiers(); }
  loadTiers() { this.http.get<any>(`${environment.apiUrl}/loyalty/tiers`).subscribe(r => this.tiers = r.data || []); }
  loadPromotions() { this.http.get<any>(`${environment.apiUrl}/loyalty/promotions`).subscribe(r => this.promotions = r.data || []); }
  createTier() { this.http.post(`${environment.apiUrl}/loyalty/tiers`, this.tierForm).subscribe(() => { this.showTierForm = false; this.loadTiers(); }); }
  createPromo() { this.http.post(`${environment.apiUrl}/loyalty/promotions`, this.promoForm).subscribe(() => { this.showPromoForm = false; this.loadPromotions(); }); }
  lookupGuest() { if (this.lookupGuestId) this.http.get<any>(`${environment.apiUrl}/loyalty/guests/${this.lookupGuestId}/tier`).subscribe(r => this.guestTier = r.data); }
}

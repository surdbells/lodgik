import { Component, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
interface Plan { tier:string; monthly:string|null; annual:string|null; desc:string; popular?:boolean; features:string[]; dimFrom?:number; cta:string; href:string; }
@Component({ selector:'app-pricing', standalone:true, imports:[CommonModule], templateUrl:'./pricing.component.html', styleUrl:'./pricing.component.scss' })
export class PricingComponent {
  annual = signal(false);
  toggleAnnual(): void { this.annual.update(v => !v); }
  price(p:Plan): string { return (this.annual() ? p.annual : p.monthly) ?? 'Custom'; }
  isDim(p:Plan, i:number): boolean { return p.dimFrom !== undefined && i >= p.dimFrom; }
  plans: Plan[] = [
    { tier:'Starter', monthly:'49,000', annual:'39,000', desc:'For small guest houses and budget hotels.',
      features:['Up to 20 rooms','Up to 10 staff','Booking & room management','Folio & manual payments','Basic dashboard','— Housekeeping','— F&B POS','— HR & Payroll'], dimFrom:5, cta:'Start Free', href:'https://hotel.lodgik.co/register?plan=starter' },
    { tier:'Professional', monthly:'129,000', annual:'103,000', popular:true, desc:'For 2-4 star hotels wanting a complete platform.',
      features:['Up to 80 rooms','Up to 50 staff','Everything in Starter','Housekeeping & inventory','F&B POS + Kitchen Display','Guest PWA + NFC portal','Invoicing & VAT','Dynamic pricing','All staff apps','— HR & Payroll'], dimFrom:9, cta:'Start Free', href:'https://hotel.lodgik.co/register?plan=professional' },
    { tier:'Business', monthly:'249,000', annual:'199,000', desc:'For larger hotels needing HR, payroll, and analytics.',
      features:['Up to 200 rooms','Up to 200 staff','Everything in Professional','HR & Payroll (PAYE)','Attendance & leave','WhatsApp (Termii)','Advanced analytics','OTA channel manager','Audit logging','3 properties'], cta:'Start Free', href:'https://hotel.lodgik.co/register?plan=business' },
    { tier:'Enterprise', monthly:null, annual:null, desc:'For hotel groups with complex multi-site requirements.',
      features:['Unlimited rooms & staff','Everything in Business','Unlimited properties','White-label branding','Concierge tablet kiosk','Custom reports','Multi-language','Dedicated onboarding','Priority SLA'], cta:'Contact Sales', href:'mailto:hello@lodgik.co' },
  ];
}


import { Component, signal } from '@angular/core';
import { CommonModule } from '@angular/common';

interface Plan { tier:string; monthly:string|null; annual:string|null; desc:string; popular?:boolean; features:string[]; dimFrom?:number; cta:string; ctaClass:string; href:string; }

@Component({
  selector: 'app-pricing',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './pricing.component.html',
  styleUrl: './pricing.component.scss'
})
export class PricingComponent {
  annual = signal(false);
  toggle(): void { this.annual.update(v => !v); }

  price(p: Plan): string {
    const v = this.annual() ? p.annual : p.monthly;
    return v ?? 'Custom';
  }
  isDim(p: Plan, i: number): boolean { return p.dimFrom !== undefined && i >= p.dimFrom; }

  plans: Plan[] = [
    { tier:'Starter', monthly:'49,000', annual:'39,000',
      desc:'For small guest houses and budget hotels getting started.',
      features:['Up to 20 rooms','Up to 10 staff accounts','Booking & room management',
                'Guest management','Folio & manual payments','Basic dashboard',
                'Email notifications','— Housekeeping module','— F&B POS','— HR & Payroll'],
      dimFrom:7, cta:'Start Free Trial', ctaClass:'btn-outline', href:'https://hotel.lodgik.co/register?plan=starter' },
    { tier:'Professional', monthly:'129,000', annual:'103,000', popular:true,
      desc:'For 2–4 star hotels that want a complete operational platform.',
      features:['Up to 80 rooms','Up to 50 staff accounts','Everything in Starter',
                'Housekeeping & inventory','F&B POS + Kitchen Display',
                'Guest PWA + NFC portal','Guest chat (live)','Invoicing & VAT',
                'Dynamic pricing','Gym & Spa module','Security module',
                'All staff mobile apps','— HR & Payroll','— Multi-property'],
      dimFrom:12, cta:'Start Free Trial', ctaClass:'btn-primary', href:'https://hotel.lodgik.co/register?plan=professional' },
    { tier:'Business', monthly:'249,000', annual:'199,000',
      desc:'For larger hotels needing HR, payroll, analytics, and WhatsApp.',
      features:['Up to 200 rooms','Up to 200 staff accounts','Everything in Professional',
                'HR & Payroll (Nigeria PAYE)','Attendance & leave',
                'Performance reviews','WhatsApp (Termii)','Advanced analytics',
                'OTA channel manager','Loyalty program','Audit logging','3 properties'],
      cta:'Start Free Trial', ctaClass:'btn-outline', href:'https://hotel.lodgik.co/register?plan=business' },
    { tier:'Enterprise', monthly:null, annual:null,
      desc:'For hotel groups and chains with complex multi-site requirements.',
      features:['Unlimited rooms & staff','Everything in Business','Unlimited properties',
                'White-label branding','Concierge tablet kiosk','IoT room controls',
                'Custom report builder','Multi-language','Dedicated onboarding','Priority SLA'],
      cta:'Contact Sales', ctaClass:'btn-primary', href:'mailto:hello@lodgik.co' },
  ];
}

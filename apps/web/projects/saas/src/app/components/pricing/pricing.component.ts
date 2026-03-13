
import { Component, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';

interface Plan {
  tier: string;
  monthlyPrice: string | null;
  annualPrice:  string | null;
  desc: string;
  popular?: boolean;
  features: string[];
  dimFrom?: number;
  ctaText: string;
  ctaClass: string;
  ctaHref: string;
}

@Component({
  selector: 'app-pricing',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './pricing.component.html',
  styleUrl: './pricing.component.scss'
})
export class PricingComponent {
  isAnnual = signal(false);

  toggleBilling(): void { this.isAnnual.update(v => !v); }

  plans: Plan[] = [
    {
      tier: 'Starter',
      monthlyPrice: '49,000', annualPrice: '39,000',
      desc: 'For small guest houses and budget hotels getting started with digital management.',
      features: [
        'Up to 20 rooms', 'Up to 10 staff accounts',
        'Booking & room management', 'Guest management',
        'Folio & manual payments', 'Basic dashboard & reports',
        'Email notifications (ZeptoMail)',
        '— Housekeeping module', '— F&B POS', '— HR & Payroll'
      ],
      dimFrom: 7,
      ctaText: 'Start Free Trial', ctaClass: 'btn-outline',
      ctaHref: 'https://hotel.lodgik.co/register?plan=starter'
    },
    {
      tier: 'Professional', popular: true,
      monthlyPrice: '129,000', annualPrice: '103,000',
      desc: 'For 2–4 star hotels that want a complete operational platform with guest experience.',
      features: [
        'Up to 80 rooms', 'Up to 50 staff accounts',
        'Everything in Starter', 'Housekeeping & inventory',
        'F&B POS + Kitchen Display', 'Guest PWA + NFC portal',
        'Guest chat (live)', 'Invoicing & VAT',
        'Dynamic pricing', 'Gym & Spa module',
        'Security & visitor management', 'All staff mobile apps',
        '— HR & Payroll', '— Multi-property'
      ],
      dimFrom: 12,
      ctaText: 'Start Free Trial', ctaClass: 'btn-primary',
      ctaHref: 'https://hotel.lodgik.co/register?plan=professional'
    },
    {
      tier: 'Business',
      monthlyPrice: '249,000', annualPrice: '199,000',
      desc: 'For larger hotels and groups that need HR, payroll, advanced analytics, and WhatsApp.',
      features: [
        'Up to 200 rooms', 'Up to 200 staff accounts',
        'Everything in Professional', 'HR & Payroll (Nigeria PAYE)',
        'Attendance & leave management', 'Performance reviews',
        'WhatsApp integration (Termii)', 'Advanced analytics & BI',
        'OTA channel manager', 'Loyalty program',
        'Audit logging', 'Up to 3 properties'
      ],
      ctaText: 'Start Free Trial', ctaClass: 'btn-outline',
      ctaHref: 'https://hotel.lodgik.co/register?plan=business'
    },
    {
      tier: 'Enterprise',
      monthlyPrice: null, annualPrice: null,
      desc: 'For hotel groups, chains, and properties with complex multi-site requirements.',
      features: [
        'Unlimited rooms & staff', 'Everything in Business',
        'Unlimited properties', 'White-label branding',
        'Concierge tablet kiosk', 'IoT room controls',
        'Custom reports builder', 'Multi-language support',
        'Dedicated onboarding', 'Priority SLA support',
        'Custom integrations'
      ],
      ctaText: 'Contact Sales', ctaClass: 'btn-teal',
      ctaHref: 'mailto:hello@lodgik.co'
    }
  ];

  isDim(plan: Plan, idx: number): boolean {
    return plan.dimFrom !== undefined && idx >= plan.dimFrom;
  }

  displayPrice(plan: Plan): string {
    const p = this.isAnnual() ? plan.annualPrice : plan.monthlyPrice;
    return p ?? 'Custom';
  }
}

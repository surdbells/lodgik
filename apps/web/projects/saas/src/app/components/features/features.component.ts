
import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-features',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './features.component.html',
  styleUrl: './features.component.scss'
})
export class FeaturesComponent {
  features = [
    { icon: '🏨', title: 'Reservations & Bookings',
      desc: 'Full booking lifecycle — reservations, walk-ins, group and corporate bookings, short-rest hourly stays, and OTA channel management. Conflict-free room assignment.' },
    { icon: '💳', title: 'Folio & Billing',
      desc: 'Auto-generated guest folios on check-in. Post room, service, minibar, laundry, and F&B charges. Staff-confirmed payments via cash, bank transfer, or POS card.' },
    { icon: '📋', title: 'Invoicing & VAT',
      desc: 'Nigeria VAT-compliant PDF invoices with your hotel bank account displayed. Auto-email via ZeptoMail. Full invoice history and credit notes.' },
    { icon: '🧹', title: 'Housekeeping',
      desc: 'Auto-assign cleaning tasks on checkout. Real-time room status tracking. Photo before/after verification. Lost & found log. Consumables reconciliation.' },
    { icon: '🍽️', title: 'Food & Beverage POS',
      desc: 'Table management, order taking, kitchen display, and bill splitting. Post F&B charges directly to guest folios for seamless room-charge billing.' },
    { icon: '👥', title: 'HR & Payroll',
      desc: 'Employee profiles, shift scheduling, attendance, leave management, and full Nigeria PAYE payroll with automatic CRA, tax bracket, pension, and NHF calculations.' },
    { icon: '🔐', title: 'Security & Access Control',
      desc: 'Guest card issuance, QR gate verification, security incident logging, visitor management with overstay detection, and muster point tracking.' },
    { icon: '💪', title: 'Gym & Facilities',
      desc: 'Gym membership plans, member profiles, QR check-in, class scheduling, and payment tracking. A standalone revenue stream for hotels with fitness facilities.' },
    { icon: '📊', title: 'Analytics & Reports',
      desc: 'Night audit, RevPAR, ADR, occupancy rates, revenue by room type, and custom reports. No external chart dependencies — all built-in SVG charts.' },
  ];
}

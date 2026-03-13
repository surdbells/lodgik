
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
    { icon: '🏨', color: 'gold', title: 'Reservations & Bookings',
      desc: 'Full booking lifecycle — new reservations, walk-ins, group bookings, corporate accounts, short-rest hourly stays, and OTA channel management. Conflict-free room assignment.' },
    { icon: '💳', color: 'teal', title: 'Folio & Billing',
      desc: 'Auto-generated guest folios on check-in. Post charges for room, room service, minibar, laundry, and F&B. Staff-confirmed payments via cash, bank transfer, or POS card.' },
    { icon: '📋', color: 'navy', title: 'Invoicing & VAT',
      desc: 'Nigeria VAT-compliant PDF invoices with your hotel bank account details displayed. Auto-email via ZeptoMail. Full invoice history, partial payments, and credit notes.' },
    { icon: '🧹', color: 'gold', title: 'Housekeeping',
      desc: 'Auto-assign cleaning tasks on checkout. Track room status in real time. Photo before/after verification. Lost & found log. Consumables inventory reconciliation.' },
    { icon: '🍽️', color: 'teal', title: 'Food & Beverage POS',
      desc: 'Table management, menu management, order taking, kitchen display system, and bill splitting. Post F&B charges directly to guest folios for seamless room-charge billing.' },
    { icon: '👥', color: 'navy', title: 'HR & Payroll',
      desc: 'Employee profiles, shift scheduling, attendance tracking, leave management, and full Nigeria PAYE payroll — CRA, tax brackets, pension, NHF — with payslip PDF generation.' },
    { icon: '🔐', color: 'teal', title: 'Security & Access Control',
      desc: 'Guest card issuance, QR-code gate verification, security incident logging, visitor management with overstay detection, muster point tracking, and room exit verification.' },
    { icon: '💪', color: 'gold', title: 'Gym & Facilities',
      desc: 'Gym membership plans, member profiles, visit log with QR check-in, class scheduling, and payment tracking. A separate revenue stream for hotels with fitness facilities.' },
    { icon: '📊', color: 'navy', title: 'Analytics & Reports',
      desc: 'Night audit reports, RevPAR, ADR, occupancy rates, revenue by room type, police reports, and custom reports. SVG charts built in — no external dependencies.' },
  ];
}

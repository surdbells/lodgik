
import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-modules',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './modules.component.html',
  styleUrl: './modules.component.scss'
})
export class ModulesComponent {
  modules: { name: string; accent: 'gold' | 'teal' }[] = [
    { name: 'Booking Management', accent: 'gold' },
    { name: 'Room Management', accent: 'gold' },
    { name: 'Guest Management', accent: 'gold' },
    { name: 'Folio & Billing', accent: 'teal' },
    { name: 'Invoice Generation', accent: 'teal' },
    { name: 'Manual Payment Confirmation', accent: 'teal' },
    { name: 'Night Audit', accent: 'gold' },
    { name: 'Housekeeping Management', accent: 'gold' },
    { name: 'Inventory Management', accent: 'teal' },
    { name: 'Bar / Restaurant POS', accent: 'teal' },
    { name: 'Kitchen Display System', accent: 'teal' },
    { name: 'Menu Management', accent: 'gold' },
    { name: 'Employee Management', accent: 'gold' },
    { name: 'Attendance & Shifts', accent: 'gold' },
    { name: 'Leave Management', accent: 'gold' },
    { name: 'Payroll (Nigeria PAYE)', accent: 'teal' },
    { name: 'Performance Reviews', accent: 'teal' },
    { name: 'Asset Management', accent: 'gold' },
    { name: 'Guest Access Codes', accent: 'gold' },
    { name: 'Guest Chat (Live)', accent: 'gold' },
    { name: 'Concierge Tablet', accent: 'teal' },
    { name: 'Guest PWA', accent: 'teal' },
    { name: 'Loyalty Program', accent: 'gold' },
    { name: 'Stay Extensions', accent: 'gold' },
    { name: 'Gym Membership', accent: 'teal' },
    { name: 'Spa & Pool', accent: 'teal' },
    { name: 'Security Incidents', accent: 'gold' },
    { name: 'Visitor Management', accent: 'gold' },
    { name: 'Gate Card System', accent: 'gold' },
    { name: 'Audit Logging', accent: 'teal' },
    { name: 'Dynamic Pricing', accent: 'gold' },
    { name: 'OTA Channel Manager', accent: 'teal' },
    { name: 'Corporate Profiles', accent: 'gold' },
    { name: 'Group Bookings', accent: 'gold' },
    { name: 'Multi-Property Support', accent: 'teal' },
    { name: 'White-Label Branding', accent: 'teal' },
    { name: 'VAT & Tax Engine', accent: 'teal' },
    { name: 'Email Notifications', accent: 'gold' },
    { name: 'WhatsApp Messaging', accent: 'gold' },
    { name: 'Push Notifications', accent: 'gold' },
    { name: 'Advanced Analytics', accent: 'teal' },
    { name: 'Custom Reports', accent: 'gold' },
    { name: 'Procurement & Vendors', accent: 'teal' },
  ];
}

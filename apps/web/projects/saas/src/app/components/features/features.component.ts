import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
@Component({ selector:'app-features', standalone:true, imports:[CommonModule], templateUrl:'./features.component.html', styleUrl:'./features.component.scss' })
export class FeaturesComponent {
  features = [
    { icon:'🏨', title:'Reservations & Bookings', desc:'Full booking lifecycle — reservations, walk-ins, group and corporate bookings, short-rest hourly stays, and OTA channel management.' },
    { icon:'💳', title:'Folio & Manual Billing', desc:'Auto-generated guest folios on check-in. Staff-confirmed payments via cash, bank transfer, or POS card. Your hotel bank account displayed on every invoice.' },
    { icon:'📋', title:'Invoicing & VAT', desc:'Nigeria VAT-compliant PDF invoices. VAT-inclusive or exclusive per room type. Auto-email via ZeptoMail. Full invoice history.' },
    { icon:'🧹', title:'Housekeeping', desc:'Auto-assign cleaning tasks on checkout. Real-time room status. Photo verification. Lost & found. Consumables reconciliation.' },
    { icon:'🍽️', title:'F&B POS', desc:'Table management, order taking, kitchen display system, and bill splitting. Post charges directly to guest folios.' },
    { icon:'👥', title:'HR & Payroll', desc:'Employee profiles, shift scheduling, attendance, leave management, and full Nigeria PAYE payroll — CRA, tax brackets, pension, NHF.' },
    { icon:'🔐', title:'Security & Access', desc:'Guest card issuance, QR gate verification, security incident logging, visitor management with overstay detection.' },
    { icon:'💪', title:'Gym & Facilities', desc:'Gym membership plans, QR check-in, class scheduling, and payment tracking — a standalone revenue stream for hotels with fitness facilities.' },
  ];
}


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
  modules: {name:string;accent:'p'|'s'}[] = [
    {name:'Booking Management',accent:'p'},{name:'Room Management',accent:'p'},{name:'Guest Management',accent:'p'},
    {name:'Folio & Billing',accent:'s'},{name:'Invoice Generation',accent:'s'},{name:'Manual Payment Confirmation',accent:'s'},
    {name:'Night Audit',accent:'p'},{name:'Housekeeping Management',accent:'p'},{name:'Inventory Management',accent:'s'},
    {name:'Bar / Restaurant POS',accent:'s'},{name:'Kitchen Display System',accent:'s'},{name:'Menu Management',accent:'p'},
    {name:'Employee Management',accent:'p'},{name:'Attendance & Shifts',accent:'p'},{name:'Leave Management',accent:'p'},
    {name:'Payroll (Nigeria PAYE)',accent:'s'},{name:'Performance Reviews',accent:'s'},{name:'Asset Management',accent:'p'},
    {name:'Guest Access Codes',accent:'p'},{name:'Guest Chat (Live)',accent:'p'},{name:'Concierge Tablet',accent:'s'},
    {name:'Guest PWA',accent:'s'},{name:'Loyalty Program',accent:'p'},{name:'Stay Extensions',accent:'p'},
    {name:'Gym Membership',accent:'s'},{name:'Spa & Pool',accent:'s'},{name:'Security Incidents',accent:'p'},
    {name:'Visitor Management',accent:'p'},{name:'Gate Card System',accent:'p'},{name:'Audit Logging',accent:'s'},
    {name:'Dynamic Pricing',accent:'p'},{name:'OTA Channel Manager',accent:'s'},{name:'Corporate Profiles',accent:'p'},
    {name:'Group Bookings',accent:'p'},{name:'Multi-Property Support',accent:'s'},{name:'White-Label Branding',accent:'s'},
    {name:'VAT & Tax Engine',accent:'s'},{name:'Email Notifications',accent:'p'},{name:'WhatsApp Messaging',accent:'p'},
    {name:'Push Notifications',accent:'p'},{name:'Advanced Analytics',accent:'s'},{name:'Custom Reports',accent:'p'},
    {name:'Procurement & Vendors',accent:'s'},
  ];
}


import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-integrations',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './integrations.component.html',
  styleUrl: './integrations.component.scss'
})
export class IntegrationsComponent {
  integrations = [
    { icon: '💳', name: 'Paystack',    type: 'SaaS Subscription Billing' },
    { icon: '📧', name: 'ZeptoMail',   type: 'Transactional Email' },
    { icon: '💬', name: 'Termii',      type: 'WhatsApp & SMS' },
    { icon: '🔥', name: 'Firebase FCM',type: 'Push Notifications' },
    { icon: '🌐', name: 'OTA Channels',type: 'Booking.com, Expedia' },
    { icon: '📡', name: 'NFC / QR',    type: 'Guest Access & Cards' },
  ];
}

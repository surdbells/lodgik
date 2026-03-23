
import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-platform',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './platform.component.html',
  styleUrl: './platform.component.scss'
})
export class PlatformComponent {
  apps = [
    { icon: '💼', title: 'Hotel PMS', desc: 'Full management web app for all staff roles', badge: 'Web App', badgeClass: 'web' },
    { icon: '🛎️', title: 'Reception App', desc: 'Quick check-in/out, walk-ins, NFC card programming', badge: 'Android', badgeClass: 'android' },
    { icon: '🧹', title: 'Housekeeping App', desc: 'Task queue, room status, photo verification', badge: 'Android', badgeClass: 'android' },
    { icon: '👨‍🍳', title: 'Kitchen Display', desc: 'Order queue, prep timers, ready alerts', badge: 'Android', badgeClass: 'android' },
    { icon: '💰', title: 'POS Terminal', desc: 'F&B ordering, menu management, table billing', badge: 'Android', badgeClass: 'android' },
    { icon: '🛡️', title: 'Security App', desc: 'Gate access, incidents, patrol, visitors', badge: 'Android', badgeClass: 'android' },
    { icon: '📟', title: 'Concierge Tablet', desc: 'In-room self-service kiosk for guests', badge: 'Android', badgeClass: 'android' },
    { icon: '🖥️', title: 'Desktop App', desc: 'Native app for Windows, macOS, and Linux', badge: 'Win / Mac / Linux', badgeClass: 'desktop' },
  ];
}

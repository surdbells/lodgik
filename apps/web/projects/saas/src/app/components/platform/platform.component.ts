
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
    { icon: '💼', title: 'Hotel PMS', desc: 'Full management web app for all staff roles', badge: 'Web', cls: 'web' },
    { icon: '🛎️', title: 'Reception App', desc: 'Quick check-in/out, walk-ins, NFC card writing', badge: 'Android', cls: 'android' },
    { icon: '🧹', title: 'Housekeeping', desc: 'Task queue, room status, photo verification', badge: 'Android', cls: 'android' },
    { icon: '👨‍🍳', title: 'Kitchen Display', desc: 'Order queue, prep timers, ready alerts', badge: 'Android', cls: 'android' },
    { icon: '💰', title: 'POS Terminal', desc: 'F&B ordering, menu management, billing', badge: 'Android', cls: 'android' },
    { icon: '🛡️', title: 'Security App', desc: 'Gate access, incidents, patrol, visitors', badge: 'Android', cls: 'android' },
    { icon: '📟', title: 'Concierge Tablet', desc: 'In-room self-service kiosk for guests', badge: 'Android', cls: 'android' },
    { icon: '🖥️', title: 'Desktop App', desc: 'Native Windows, macOS, Linux wrapper', badge: 'Desktop', cls: 'desktop' },
  ];
}


import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-guest-pwa',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './guest-pwa.component.html',
  styleUrl: './guest-pwa.component.scss'
})
export class GuestPwaComponent {
  methods = [
    { icon: '📷', title: 'QR Code on Welcome Card', desc: 'Printed on the guest welcome card. One scan opens the portal pre-authenticated — no code entry required.' },
    { icon: '📡', title: 'NFC Room Card Tap', desc: 'Programme any NTAG213 NFC card. iPhone 7+ and Android open the portal instantly — zero app installation.' },
    { icon: '💬', title: 'WhatsApp / SMS Deep Link', desc: 'Sent automatically at check-in via Termii. Guest taps the link and lands straight on their portal home screen.' },
    { icon: '🌐', title: 'Direct Domain', desc: 'guest.lodgik.app — a branded URL. Fully installable as a PWA (Add to Home Screen) without visiting any app store.' },
  ];
  qrPattern = [true,true,true,true,true, true,false,false,false,true, true,false,true,false,true, true,false,false,false,true, true,true,true,true,true];
}

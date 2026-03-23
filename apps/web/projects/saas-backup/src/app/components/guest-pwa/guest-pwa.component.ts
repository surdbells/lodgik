
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
    { icon: '📷', title: 'QR Code on Welcome Card',
      desc: 'Printed on the guest welcome card. One scan opens the portal pre-authenticated — no code entry required.' },
    { icon: '📡', title: 'NFC Room Card Tap',
      desc: 'Programme any NTAG213 card. iPhone 7+ and Android open the portal instantly — no app installation needed.' },
    { icon: '💬', title: 'WhatsApp / SMS Deep Link',
      desc: 'Sent automatically at check-in. Guest taps the link and lands straight on their portal home screen.' },
    { icon: '🌐', title: 'Direct Domain — guest.lodgik.app',
      desc: 'A branded, memorable URL. Fully installable as a PWA (Add to Home Screen) without visiting an app store.' },
  ];

  qrCells = Array.from({length: 25}, (_, i) =>
    [0,1,2,3,4,5,9,14,19,20,21,22,23,24,6,12,18].includes(i)
  );
}

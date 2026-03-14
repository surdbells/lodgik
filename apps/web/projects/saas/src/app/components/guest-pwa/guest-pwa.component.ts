import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
@Component({ selector:'app-guest-pwa', standalone:true, imports:[CommonModule], templateUrl:'./guest-pwa.component.html', styleUrl:'./guest-pwa.component.scss' })
export class GuestPwaComponent {
  methods=[
    {icon:'📷',title:'QR Code on Welcome Card',desc:'One scan opens the portal pre-authenticated. Printed on every guest welcome card at reception.'},
    {icon:'📡',title:'NFC Room Card Tap',desc:'Programme any NTAG213 NFC card. Works on iPhone 7+ and all Android devices. Zero installation.'},
    {icon:'💬',title:'WhatsApp / SMS Link',desc:'Sent automatically at check-in. Guest taps the link and lands on their portal home screen.'},
    {icon:'🌐',title:'guest.lodgik.app Domain',desc:'A branded PWA. Guests can Add to Home Screen — works exactly like a native app, no app store.'},
  ];
  qr=[1,1,1,1,1,1,0,0,0,1,1,0,1,0,1,1,0,0,0,1,1,1,1,1,1];
}
